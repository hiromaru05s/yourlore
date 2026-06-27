// ============================================================
// LORE server — Matchmaker Durable Object.
// One global instance holds the waiting queue. When two players
// are queued it provisions a GameRoom and tells both where to go.
// ============================================================
import type { Env } from "./env";
import type { QueueClientMsg, QueueServerMsg } from "../../client/src/shared/protocol";

interface Waiter { ws: WebSocket; id: string; name: string; }

export class Matchmaker {
  private env: Env;
  private waiting: Waiter | null = null;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const url = new URL(req.url);
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    const me: Waiter = {
      ws: server,
      id: url.searchParams.get("uid") || "anon-" + crypto.randomUUID().slice(0, 8),
      name: url.searchParams.get("name") || "Player",
    };
    server.accept();
    server.addEventListener("message", (e) => this.onMsg(me, e));
    server.addEventListener("close", () => { if (this.waiting?.ws === server) this.waiting = null; });
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: QueueServerMsg): void { ws.send(JSON.stringify(msg)); }

  private onMsg(me: Waiter, e: MessageEvent): void {
    let msg: QueueClientMsg;
    try { msg = JSON.parse(e.data as string); } catch { return; }
    if (msg.type === "cancel") { if (this.waiting?.ws === me.ws) this.waiting = null; return; }
    if (msg.type !== "queue") return;

    if (this.waiting && this.waiting.ws !== me.ws) {
      const other = this.waiting;
      this.waiting = null;
      void this.pair(other, me);
    } else {
      this.waiting = me;
      this.send(me.ws, { type: "queued", position: 1 });
    }
  }

  private async pair(a: Waiter, b: Waiter): Promise<void> {
    const roomId = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    const stub = this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(roomId));
    try {
      await stub.fetch("https://do/setup", {
        method: "POST",
        body: JSON.stringify({ players: [{ id: a.id, name: a.name }, { id: b.id, name: b.name }], seed }),
      });
      this.send(a.ws, { type: "matched", roomId, you: 0, oppName: b.name });
      this.send(b.ws, { type: "matched", roomId, you: 1, oppName: a.name });
    } catch {
      this.send(a.ws, { type: "error", message: "방 생성 실패" });
      this.send(b.ws, { type: "error", message: "방 생성 실패" });
    }
  }
}
