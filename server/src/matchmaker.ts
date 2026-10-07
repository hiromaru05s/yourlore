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
import { ensureMatchBots, MATCH_BOTS, MATCH_BOT_WAIT_MS, matchBotsEnabled } from './matchBots';

interface Waiter { ws: WebSocket; id: string; name: string; avatar: string | null; sleeve: string | null; furniture:string|null; deck: string | null; ranked: boolean; mmr: number; since: number; phase?:'pairing'|'matched'; messages?:number[]; }

const SWEEP_MS = 5000;
const BAND_START = 100;
const BAND_STEP = 200;   // widened every 30s
const BAND_STEP_MS = 30_000;
const BAND_ANY_MS = 90_000;

export class Matchmaker {
  private env: Env;
  private connections = new Map<string,Waiter>();
  private casual: Waiter | null = null;
  private ranked: Waiter[] = [];
  private sweep: ReturnType<typeof setInterval> | null = null;
  private botCursor = 0;
  private botsReady: Promise<void> | null = null;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const url = new URL(req.url);
    if (!url.searchParams.get("uid")) return new Response("unauthorized", { status: 401 });
    const account=url.searchParams.get('uid')!;
    if(this.connections.has(account))return new Response('queue already connected',{status:409});
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    const me: Waiter = {
      ws: server,
      id: url.searchParams.get("uid") || "anon-" + crypto.randomUUID().slice(0, 8),
      name: url.searchParams.get("name") || "Player",
      avatar: url.searchParams.get("avatar") || null,
      sleeve: url.searchParams.get("sleeve") || null,
      furniture:url.searchParams.get("furniture")||null,
      deck: url.searchParams.get("deck") || null,
      ranked: url.searchParams.get("mode") === "ranked",
      mmr: url.searchParams.has("mmr") && Number.isFinite(Number(url.searchParams.get("mmr"))) ? Math.max(0,Number(url.searchParams.get("mmr"))) : 1000,
      since: 0,
    };
    this.connections.set(account,me);
    server.accept();
    server.addEventListener("message", (e) => this.onMsg(me, e));
    server.addEventListener("close", () => this.remove(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: QueueServerMsg): void { ws.send(JSON.stringify(msg)); }

  private remove(ws: WebSocket): void {
    for(const [id,w] of this.connections)if(w.ws===ws&&w.phase!=='pairing')this.connections.delete(id);
    if (this.casual?.ws === ws) this.casual = null;
    this.ranked = this.ranked.filter((w) => w.ws !== ws);
    this.syncSweep();
  }

  private onMsg(me: Waiter, e: MessageEvent): void {
    const now=Date.now();me.messages=(me.messages??[]).filter(t=>now-t<10000);me.messages.push(now);
    if(me.messages.length>60){me.ws.close(1008,'rate limit');this.remove(me.ws);return;}
    let msg: QueueClientMsg;
    if (typeof e.data !== 'string' || e.data.length > 4096) return;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    if (msg.type === "ping") { try { this.send(me.ws, { type: "pong" }); } catch { /* dropped */ } return; }
    if(me.phase)return;
    if (msg.type === "cancel") { this.remove(me.ws); me.ws.close(1000,'cancelled'); return; }
    if (msg.type !== "queue") return;

    if (me.ranked) { this.enqueueRanked(me); return; }

    if (this.casual && this.casual.ws !== me.ws && this.casual.id !== me.id) {
      const other = this.casual;
      this.casual = null;
      void this.pair(other, me);
    } else {
      if (this.casual?.ws === me.ws) return;
      me.since = Date.now();
      this.casual = me;
      this.send(me.ws, { type: "queued", position: 1 });
      this.syncSweep();
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
    // Humans always get the first chance to pair, in both queues.
    if (matchBotsEnabled(this.env)) {
      if (this.casual?.ws.readyState !== WebSocket.OPEN) this.casual = null;
      const waiters = [...this.ranked, ...(this.casual ? [this.casual] : [])];
      for (const w of waiters) if (!w.phase && Date.now() - w.since >= MATCH_BOT_WAIT_MS) {
        if (this.casual === w) this.casual = null;
        this.ranked = this.ranked.filter(other => other !== w);
        void this.pairBot(w);
      }
    }
    this.syncSweep();
  }

  private syncSweep(): void {
    const waiting = this.ranked.length > 0 || (matchBotsEnabled(this.env) && this.casual != null);
    if (waiting && !this.sweep) this.sweep = setInterval(() => this.sweepRanked(), SWEEP_MS);
    if (!waiting && this.sweep) { clearInterval(this.sweep); this.sweep = null; }
  }

  private async pairBot(human: Waiter): Promise<void> {
    human.phase = 'pairing';
    const bot = MATCH_BOTS[this.botCursor++ % MATCH_BOTS.length];
    const roomId = crypto.randomUUID();
    try {
      this.botsReady ??= ensureMatchBots(this.env).catch(error => { this.botsReady = null; throw error; });
      await this.botsReady;
      if (human.ws.readyState !== WebSocket.OPEN) { human.phase = undefined; this.remove(human.ws); return; }
      const setup = await this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(roomId)).fetch('https://do/setup', {
        method: 'POST', body: JSON.stringify({
          players: [{id:human.id,name:human.name,sleeve:human.sleeve,furniture:human.furniture,deck:human.deck},
            {id:bot.id,name:bot.name,deck:bot.deck.cards.join(',')}],
          seed: crypto.getRandomValues(new Uint32Array(1))[0], ranked: human.ranked, botId: bot.id,
        }),
      });
      if (!setup.ok) throw new Error('Bot room setup failed');
      human.phase = 'matched';
      this.send(human.ws, {type:'matched',roomId,you:0,oppName:bot.name,oppAvatar:bot.avatar});
    } catch {
      human.phase = undefined;
      console.error('matchmaker_bot_setup_failed');
      if (human.ws.readyState === WebSocket.OPEN) {
        try { this.send(human.ws, {type:'error',message:'BOTとの対戦を準備できませんでした。再度お試しください。'}); } catch { /* dropped */ }
      }
    } finally {
      if (human.ws.readyState !== WebSocket.OPEN) { human.phase = undefined; this.remove(human.ws); }
    }
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
    a.phase=b.phase='pairing';
    if (a.ws.readyState !== WebSocket.OPEN || b.ws.readyState !== WebSocket.OPEN) {
      a.phase=b.phase=undefined;
      if(a.ws.readyState!==WebSocket.OPEN)this.remove(a.ws);
      if(b.ws.readyState!==WebSocket.OPEN)this.remove(b.ws);
      this.requeue(a.ws.readyState === WebSocket.OPEN ? a : b);
      return;
    }
    const roomId = crypto.randomUUID();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    const ranked = a.ranked && b.ranked;
    const stub = this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(roomId));
    try {
      const setup=await stub.fetch("https://do/setup", {
        method: "POST",
        body: JSON.stringify({ players: [{ id: a.id, name: a.name, sleeve: a.sleeve, furniture:a.furniture, deck: a.deck }, { id: b.id, name: b.name, sleeve: b.sleeve, furniture:b.furniture, deck: b.deck }], seed, ranked }),
      });
      if(!setup.ok)throw new Error('room setup failed');
    } catch {
      a.phase=b.phase=undefined;
      if(a.ws.readyState!==WebSocket.OPEN)this.remove(a.ws);
      if(b.ws.readyState!==WebSocket.OPEN)this.remove(b.ws);
      console.error('matchmaker_setup_failed');
      if (a.ws.readyState === WebSocket.OPEN) try { this.send(a.ws, { type: "error", message: "방 생성 실패" }); } catch { /* dropped */ }
      if (b.ws.readyState === WebSocket.OPEN) try { this.send(b.ws, { type: "error", message: "방 생성 실패" }); } catch { /* dropped */ }
      return;
    }
    a.phase=b.phase='matched';
    if(a.ws.readyState!==WebSocket.OPEN)this.remove(a.ws);
    if(b.ws.readyState!==WebSocket.OPEN)this.remove(b.ws);
    // room exists; if a "matched" send fails the room's join-timeout voids it (no rank), so this is safe
    try { this.send(a.ws, { type: "matched", roomId, you: 0, oppName: b.name, oppAvatar: b.avatar }); } catch { /* dropped */ }
    try { this.send(b.ws, { type: "matched", roomId, you: 1, oppName: a.name, oppAvatar: a.avatar }); } catch { /* dropped */ }
  }
}
