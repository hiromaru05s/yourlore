// ============================================================
// LORE server — Matchmaker Durable Object.
// One global instance holds the waiting queues.
//   · casual: first two waiters are paired immediately.
//   · ranked: MMR-band matching — starts at ±100 and widens by
//     +200 every 30s; after 90s anyone matches anyone. A 5s sweep
//     re-checks the queue while anyone is waiting (the open sockets
//     keep this DO pinned in memory, so setInterval is safe here).
// ============================================================
import type { Env } from "./env";
import type { QueueClientMsg, QueueServerMsg } from "../../client/src/shared/protocol";

interface Waiter { ws: WebSocket; id: string; name: string; avatar: string | null; sleeve: string | null; deck: string | null; ranked: boolean; mmr: number; since: number; }

const SWEEP_MS = 5000;
const BAND_START = 100;
const BAND_STEP = 200;   // widened every 30s
const BAND_STEP_MS = 30_000;
const BAND_ANY_MS = 90_000;

export class Matchmaker {
  private env: Env;
  private casual: Waiter | null = null;
  private ranked: Waiter[] = [];
  private sweep: ReturnType<typeof setInterval> | null = null;

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
      avatar: url.searchParams.get("avatar") || null,
      sleeve: url.searchParams.get("sleeve") || null,
      deck: url.searchParams.get("deck") || null,
      ranked: url.searchParams.get("mode") === "ranked",
      mmr: Number(url.searchParams.get("mmr")) || 1000,
      since: 0,
    };
    server.accept();
    server.addEventListener("message", (e) => this.onMsg(me, e));
    server.addEventListener("close", () => this.remove(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: QueueServerMsg): void { ws.send(JSON.stringify(msg)); }

  private remove(ws: WebSocket): void {
    if (this.casual?.ws === ws) this.casual = null;
    this.ranked = this.ranked.filter((w) => w.ws !== ws);
    this.syncSweep();
  }

  private onMsg(me: Waiter, e: MessageEvent): void {
    let msg: QueueClientMsg;
    try { msg = JSON.parse(e.data as string); } catch { return; }
    if (msg.type === "cancel") { this.remove(me.ws); return; }
    if (msg.type !== "queue") return;

    if (me.ranked) { this.enqueueRanked(me); return; }

    if (this.casual && this.casual.ws !== me.ws && this.casual.id !== me.id) {
      const other = this.casual;
      this.casual = null;
      void this.pair(other, me);
    } else {
      this.casual = me;
      this.send(me.ws, { type: "queued", position: 1 });
    }
  }

  // ---- ranked queue ----
  private enqueueRanked(me: Waiter): void {
    if (this.ranked.some((w) => w.ws === me.ws)) return; // already queued
    me.since = Date.now();
    const other = this.findRankedMatch(me);
    if (other) {
      this.ranked = this.ranked.filter((w) => w !== other);
      this.syncSweep();
      void this.pair(other, me);
      return;
    }
    this.ranked.push(me);
    this.send(me.ws, { type: "queued", position: this.ranked.length });
    this.syncSweep();
  }

  private band(w: Waiter, now: number): number {
    const waited = now - w.since;
    if (waited >= BAND_ANY_MS) return Infinity;
    return BAND_START + BAND_STEP * Math.floor(waited / BAND_STEP_MS);
  }

  private findRankedMatch(me: Waiter): Waiter | null {
    const now = Date.now();
    let best: Waiter | null = null;
    for (const w of this.ranked) {
      if (w.ws === me.ws || w.id === me.id) continue; // never self / same account
      if (w.ws.readyState !== WebSocket.OPEN) continue;
      const gap = Math.abs(w.mmr - me.mmr);
      // the more patient side's band applies (generous), so long waits resolve
      if (gap <= Math.max(this.band(w, now), this.band(me, now)) && (!best || gap < Math.abs(best.mmr - me.mmr))) best = w;
    }
    return best;
  }

  private sweepRanked(): void {
    // drop dead sockets, then greedily match the longest-waiting first
    this.ranked = this.ranked.filter((w) => w.ws.readyState === WebSocket.OPEN);
    let matched = true;
    while (matched) {
      matched = false;
      for (const w of [...this.ranked].sort((a, b) => a.since - b.since)) {
        if (!this.ranked.includes(w)) continue;
        const other = this.findRankedMatch(w);
        if (other) {
          this.ranked = this.ranked.filter((x) => x !== w && x !== other);
          void this.pair(w, other);
          matched = true;
        }
      }
    }
    this.syncSweep();
  }

  private syncSweep(): void {
    if (this.ranked.length > 0 && !this.sweep) this.sweep = setInterval(() => this.sweepRanked(), SWEEP_MS);
    if (this.ranked.length === 0 && this.sweep) { clearInterval(this.sweep); this.sweep = null; }
  }

  /** Put a still-connected waiter back in the queue (used when a pairing aborts). */
  private requeue(w: Waiter): void {
    if (w.ws.readyState !== WebSocket.OPEN) return;
    if (w.ranked) { if (!this.ranked.some((x) => x.ws === w.ws)) this.ranked.push(w); }
    else this.casual = w;
    try { this.send(w.ws, { type: "queued", position: w.ranked ? this.ranked.length : 1 }); } catch { /* dropped */ }
    this.syncSweep();
  }

  private async pair(a: Waiter, b: Waiter): Promise<void> {
    // Both sockets must be live at commit time. If one vanished (lag/close) between selection
    // and now, abort and requeue the survivor — never create a phantom one-sided match.
    if (a.ws.readyState !== WebSocket.OPEN || b.ws.readyState !== WebSocket.OPEN) {
      this.requeue(a.ws.readyState === WebSocket.OPEN ? a : b);
      return;
    }
    const roomId = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    const ranked = a.ranked && b.ranked;
    const stub = this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(roomId));
    try {
      await stub.fetch("https://do/setup", {
        method: "POST",
        body: JSON.stringify({ players: [{ id: a.id, name: a.name, sleeve: a.sleeve, deck: a.deck }, { id: b.id, name: b.name, sleeve: b.sleeve, deck: b.deck }], seed, ranked }),
      });
    } catch {
      if (a.ws.readyState === WebSocket.OPEN) try { this.send(a.ws, { type: "error", message: "방 생성 실패" }); } catch { /* dropped */ }
      if (b.ws.readyState === WebSocket.OPEN) try { this.send(b.ws, { type: "error", message: "방 생성 실패" }); } catch { /* dropped */ }
      return;
    }
    // room exists; if a "matched" send fails the room's join-timeout voids it (no rank), so this is safe
    try { this.send(a.ws, { type: "matched", roomId, you: 0, oppName: b.name, oppAvatar: b.avatar }); } catch { /* dropped */ }
    try { this.send(b.ws, { type: "matched", roomId, you: 1, oppName: a.name, oppAvatar: a.avatar }); } catch { /* dropped */ }
  }
}
