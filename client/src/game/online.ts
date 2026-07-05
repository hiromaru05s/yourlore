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
import { closeOverlay, noticeModal } from "../ui/modal";
import { clearActiveGame } from "../net/resume";
import { t } from "../i18n";

const MAX_RETRIES = 6;

export class OnlineController extends BaseController {
  private sock!: Sock<GameServerMsg, GameClientMsg>;
  private roomId: string;
  private started = false;
  private closing = false;
  private retries = 0;
  private hb?: ReturnType<typeof setInterval>;

  constructor(root: HTMLElement, you: Side, roomId: string, exits: ControllerExits) {
    super(root, you, exits);
    this.roomId = roomId;
    this.connect();
  }

  private connect(): void {
    this.sock = new Sock<GameServerMsg, GameClientMsg>(`/ws/room/${this.roomId}`, {
      onOpen: () => { this.retries = 0; this.sock.send({ type: "ready" }); this.startHb(); },
      onMessage: (msg) => this.onServer(msg),
      onClose: () => this.onSockClose(),
    });
  }

  private onSockClose(): void {
    this.stopHb();
    if (this.closing || this.state?.over) return;
    if (this.retries < MAX_RETRIES) {
      this.retries++;
      this.banner(t("net.reconnecting"));
      setTimeout(() => { if (!this.closing && !this.state?.over) this.connect(); }, 800 * this.retries);
    } else {
      this.banner(null);
      noticeModal("연결 끊김", "상대 또는 서버와의 연결이 끊어졌습니다.", "홈으로", () => this.exits.onHome());
    }
  }

  private onServer(msg: GameServerMsg): void {
    if (msg.type === "init") {
      this.started = true;
      this.banner(null); // reconnected & resynced
      closeOverlay();
      this.applyResult({ state: msg.state, events: msg.events }, false);
      if (this.state?.over) clearActiveGame(); // rejoined a game that already finished
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
      noticeModal("매칭 취소", msg.message || "상대가 참가하지 않아 매칭이 취소되었습니다 (점수 변동 없음).", "홈으로", () => this.exits.onHome());
    } else if (msg.type === "error") {
      console.warn("[server]", msg.message);
    }
  }

  protected submit(action: Action): void {
    if (!this.started || this.state?.over) return;
    this.sock.send({ type: "action", action });
  }

  // heartbeat: keep the WS path warm through idle thinking time (edge/NAT timeouts kill silent sockets)
  private startHb(): void { this.stopHb(); this.hb = setInterval(() => this.sock.send({ type: "ping" }), 20000); }
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

  destroy(): void { this.closing = true; this.stopHb(); this.banner(null); this.sock?.close(); super.destroy(); }
}
