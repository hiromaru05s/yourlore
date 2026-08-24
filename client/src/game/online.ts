// ============================================================
// LORE — OnlineController. Authoritative server: we send Actions
// and apply the redacted {state, events} snapshots it returns.
// Reconnects on transient drops (the room keeps state for a grace
// period) rather than ending the game on every blip.
// ============================================================
import type { Action, Side } from "../shared/types";
import type { GameClientMsg, GameServerMsg } from "../shared/protocol";
import { Sock } from "../net/socket";
import { BaseController, type ControllerExits } from "./controller";
import { closeOverlay, noticeModal, marketPreview } from "../ui/modal";
import { clearActiveGame } from "../net/resume";
import { eventBanner } from "../ui/anim";
import { t } from "../i18n";

const MAX_RETRIES = 6;

export class OnlineController extends BaseController {
  private sock!: Sock<GameServerMsg, GameClientMsg>;
  private roomId: string;
  private started = false;
  private closing = false;
  private retries = 0;
  private openedAt = 0; // when the current socket opened; 0 = never opened
  private hb?: ReturnType<typeof setInterval>;
  private preview?: { setUntil(u: number | null): void; close(): void };
  private lastMsgAt = 0; // last time ANY server message (incl. pong) arrived
  private onVisible = (): void => {
    // back from a background tab (mobile app switch): timers were throttled, so
    // the socket may have died silently. Probe it NOW instead of waiting a tick.
    if (document.visibilityState !== "visible" || this.closing || this.state?.over) return;
    this.sock?.send({ type: "ping" });
    setTimeout(() => {
      if (!this.closing && !this.state?.over && Date.now() - this.lastMsgAt > 4_500) this.sock?.close();
    }, 5_000);
  };

  constructor(root: HTMLElement, you: Side, roomId: string, exits: ControllerExits) {
    super(root, you, exits);
    this.roomId = roomId;
    document.addEventListener("visibilitychange", this.onVisible);
    this.connect();
  }

  private connect(): void {
    this.sock = new Sock<GameServerMsg, GameClientMsg>(`/ws/room/${this.roomId}`, {
      onOpen: () => { this.openedAt = Date.now(); this.lastMsgAt = Date.now(); this.sock.send({ type: "ready" }); this.startHb(); },
      onMessage: (msg) => { this.lastMsgAt = Date.now(); this.onServer(msg); },
      onClose: () => this.onSockClose(),
    });
  }

  private onSockClose(): void {
    this.stopHb();
    if (this.closing || this.state?.over) return;
    // only a connection that STAYED UP resets the retry budget — resetting on every
    // successful open let two tabs evict each other ("replaced") in an infinite
    // reconnect ping-pong that burned the DO request quota.
    if (this.openedAt && Date.now() - this.openedAt > 15_000) this.retries = 0;
    this.openedAt = 0;
    if (this.retries < MAX_RETRIES) {
      this.retries++;
      this.banner(t("net.reconnecting"));
      setTimeout(() => { if (!this.closing && !this.state?.over) this.connect(); }, 800 * this.retries);
    } else {
      this.banner(null);
      noticeModal(t("notice.disc.title"), t("notice.disc.body"), t("modal.home"), () => this.exits.onHome());
    }
  }

  private onServer(msg: GameServerMsg): void {
    if (msg.type === "init") {
      const firstInit = !this.started; // 이 클라이언트가 처음 받는 init (새로고침/크래시 복귀 포함)
      this.started = true;
      this.banner(null); // reconnected & resynced
      this.preview?.close(); this.preview = undefined; // preview phase over → game begins (coin toss shows on turn 1)
      closeOverlay();
      this.applyResult({ state: msg.state, events: msg.events }, false);
      if (this.state?.over) clearActiveGame(); // rejoined a game that already finished
      // 진행 중인 게임에 처음 합류(=크래시/탭 종료 후 복귀): 안심 배너 + 현황 파악 시간
      else if (firstInit && this.state && this.state.turn > 1) {
        void eventBanner(`↩ ${t("fx.resume")}`, `${t("game.turn")} ${this.state.turn}`, "info", 1700);
      }
    } else if (msg.type === "update") {
      this.applyResult({ state: msg.state, events: msg.events });
      if (this.state?.over) clearActiveGame(); // game ended → nothing to rejoin
    } else if (msg.type === "oppConn") {
      this.banner(msg.connected ? null : t("net.oppwait"));
    } else if (msg.type === "opponentLeft") {
      // server already sent the deciding update; just make sure the result shows
      if (this.state?.over) this.showWin();
    } else if (msg.type === "voided") {
      // the match never really started (opponent never joined) → no rank change, back to home
      this.closing = true;
      clearActiveGame();
      noticeModal(t("notice.voided.title"), t("notice.voided.body"), t("modal.home"), () => this.exits.onHome());
    } else if (msg.type === "preview") {
      // ranked pre-game market study (before coin toss). until=null → still waiting for the opponent.
      if (!this.preview) this.preview = marketPreview(msg.market, () => this.sock.send({ type: "startReady" }));
      this.preview.setUntil(msg.until);
    } else if (msg.type === "rankResult") {
      // ranked game settled — remember my MMR change and paint it onto the (already-open) result screen
      this.rankChange = { before: msg.before, after: msg.after };
      this.renderRankDelta();
    } else if (msg.type === "error") {
      console.warn("[server]", msg.message);
    }
  }

  protected submit(action: Action): void {
    if (!this.started || this.state?.over) return;
    this.sock.send({ type: "action", action });
  }

  // heartbeat: keep the WS path warm through idle thinking time (edge/NAT timeouts kill silent sockets).
  // Doubles as a DEAD-SOCKET WATCHDOG: pings are answered (auto-response pairs), so a
  // connection with no message for 2+ intervals is half-dead even if readyState still
  // says OPEN — force-close it so the reconnect path (and the server's 30s forfeit
  // resync) takes over instead of leaving a zombie "still playing" board.
  private startHb(): void {
    this.stopHb();
    this.hb = setInterval(() => {
      if (this.lastMsgAt && Date.now() - this.lastMsgAt > 45_000) { this.sock.close(); return; }
      this.sock.send({ type: "ping" });
    }, 20000);
  }
  private stopHb(): void { if (this.hb) clearInterval(this.hb); this.hb = undefined; }

  /** Non-blocking connection banner at the top of the board (null hides it). */
  private banner(text: string | null): void {
    let el = document.getElementById("net-banner");
    if (!text) { el?.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "net-banner";
      el.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:999;background:#1d2735;color:#ffd166;border:1px solid #ffd16655;border-radius:8px;padding:8px 16px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.4)";
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  destroy(): void { this.closing = true; document.removeEventListener("visibilitychange", this.onVisible); this.stopHb(); this.preview?.close(); this.preview = undefined; this.banner(null); this.sock?.close(); super.destroy(); }
}
