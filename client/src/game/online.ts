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
      setTimeout(() => { if (!this.closing && !this.state?.over) this.connect(); }, 800 * this.retries);
    } else {
      noticeModal("연결 끊김", "상대 또는 서버와의 연결이 끊어졌습니다.", "홈으로", () => this.exits.onHome());
    }
  }

  private onServer(msg: GameServerMsg): void {
    if (msg.type === "init") {
      this.started = true;
      closeOverlay();
      this.applyResult({ state: msg.state, events: msg.events }, false);
    } else if (msg.type === "update") {
      this.applyResult({ state: msg.state, events: msg.events });
    } else if (msg.type === "opponentLeft") {
      // server already sent the deciding update; just make sure the result shows
      if (this.state?.over) this.showWin();
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

  destroy(): void { this.closing = true; this.stopHb(); this.sock?.close(); super.destroy(); }
}
