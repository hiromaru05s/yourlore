// ============================================================
// LORE — OnlineController. Authoritative server: we send Actions
// and apply the redacted {state, events} snapshots it returns.
// No local reduce, no bot.
// ============================================================
import type { Action, Side } from "../shared/types";
import type { GameClientMsg, GameServerMsg } from "../shared/protocol";
import { Sock } from "../net/socket";
import { BaseController, type ControllerExits } from "./controller";
import { closeOverlay } from "../ui/modal";

export class OnlineController extends BaseController {
  private sock: Sock<GameServerMsg, GameClientMsg>;
  private started = false;

  constructor(root: HTMLElement, you: Side, roomId: string, exits: ControllerExits) {
    super(root, you, exits);
    this.sock = new Sock<GameServerMsg, GameClientMsg>(`/ws/room/${roomId}`, {
      onOpen: () => this.sock.send({ type: "ready" }),
      onMessage: (msg) => this.onServer(msg),
      onClose: () => { if (!this.state?.over) this.opponentGone("연결이 끊어졌습니다."); },
    });
  }

  private onServer(msg: GameServerMsg): void {
    if (msg.type === "init") {
      this.started = true;
      this.applyResult({ state: msg.state, events: msg.events }, false);
    } else if (msg.type === "update") {
      this.applyResult({ state: msg.state, events: msg.events });
    } else if (msg.type === "opponentLeft") {
      this.opponentGone("상대가 게임을 떠났습니다.");
    } else if (msg.type === "error") {
      console.warn("[server]", msg.message);
    }
  }

  private opponentGone(_reason: string): void {
    if (this.state?.over) return;
    closeOverlay();
    // server marks us the winner; just surface the win screen if not already
    this.showWin();
  }

  protected submit(action: Action): void {
    if (!this.started || this.state?.over) return;
    this.sock.send({ type: "action", action });
    // optimistic UX off: server is authoritative and echoes the update
  }

  destroy(): void { this.sock.close(); super.destroy(); }
}
