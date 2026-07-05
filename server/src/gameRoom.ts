// ============================================================
// LORE server — GameRoom Durable Object: the AUTHORITATIVE game.
// Holds the real GameState, validates every action, and pushes
// per-player redacted snapshots so hidden info never leaks.
// Reuses the exact same shared engine the client uses.
//
// Uses the WebSocket HIBERNATION API: the object is evicted from
// memory between messages (turn-based games are idle ~99% of the
// time), so duration (GB-s) billing is ~zero. Everything the room
// needs lives in storage; sockets carry their side/gen as an
// attachment that survives hibernation. Client heartbeat pings are
// answered by setWebSocketAutoResponse WITHOUT waking the object.
// Forfeit grace periods use the Alarms API (in-memory timers would
// not survive hibernation, and pending timers block it).
// ============================================================
import type { Env } from "./env";
import type { Action, GameEvent, GameState, Side } from "../../client/src/shared/types";
import type { GameClientMsg, GameServerMsg } from "../../client/src/shared/protocol";
import { createGame, reduce } from "../../client/src/shared/engine";
import { redactFor } from "../../client/src/shared/protocol";
import { BALANCE_VERSION } from "../../client/src/shared/cards";
import { applyRanked, applyRankedDraw } from "./rank";

interface PlayerRef { id: string; name: string; sleeve?: string | null; }

/** Everything the room needs — persisted so deploys/evictions/hibernation can't kill a live game. */
interface RoomData {
  players: [PlayerRef, PlayerRef];
  game: GameState;
  initEvents: GameEvent[];
  readied: [boolean, boolean];
  recorded: boolean;
  /** Ranked match — result also updates the seasonal Elo ladder. */
  ranked: boolean;
  /** Connection generation per side — a close from an older gen is a replaced socket, not a disconnect. */
  gen: [number, number];
  /** Pending forfeit deadlines (ms epoch) per side; enforced by alarm(). */
  forfeitAt: [number | null, number | null];
  /** ms epoch when the CURRENT turn began — server-authoritative turn clock, so a
      reconnecting/reopened client resumes with the correct remaining time (not a fresh 50s). */
  turnStartAt: number;
  /** Deadline for BOTH players to join (send "ready"). If it passes with a side still
      absent, the match is VOID (no rank, no W/L) — prevents phantom-match rank loss.
      Cleared to null once both have joined. */
  joinBy: number | null;
  /** RANKED-only pre-game market preview: both players study the fixed market for up to
      PREVIEW_MS before the coin toss. previewDone=true means we're past it (or non-ranked,
      which skips it entirely). previewUntil = auto-start deadline (null until both joined).
      startReady = each side pressed "ready to start early"; both → begin immediately.
      initSent = whether the opening `init` (with initEvents) has gone to each side yet. */
  previewUntil: number | null;
  previewDone: boolean;
  startReady: [boolean, boolean];
  initSent: [boolean, boolean];
}

const TURN_MS_RANKED = 50000; // ranked: tighter clock
const TURN_MS_CASUAL = 90000; // everything else: 90s per turn
const turnMsFor = (ranked: boolean): number => (ranked ? TURN_MS_RANKED : TURN_MS_CASUAL);

/** Attached to each socket; survives hibernation. */
interface Att { side: Side; gen: number; }

const FORFEIT_GRACE_MS = 30000;
const JOIN_GRACE_MS = 45000; // both players must connect within this or the match is voided
const PREVIEW_MS = 15000;    // ranked: fixed-market study window before the coin toss

export class GameRoom {
  private env: Env;
  private state: DurableObjectState;
  private room: RoomData | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private persist(): void {
    if (this.room) void this.state.storage.put("room", this.room).catch(() => { /* best effort */ });
  }

  private async restore(): Promise<RoomData | null> {
    if (this.room) return this.room;
    const r = await this.state.storage.get<Partial<RoomData>>("room");
    if (r?.game && r.players) {
      // defaults cover blobs written by the pre-hibernation version
      this.room = {
        players: r.players as [PlayerRef, PlayerRef],
        game: r.game as GameState,
        initEvents: r.initEvents ?? [],
        readied: r.readied ?? [false, false],
        joinBy: r.joinBy ?? null,
        recorded: r.recorded ?? false,
        ranked: r.ranked ?? false,
        gen: r.gen ?? [0, 0],
        forfeitAt: r.forfeitAt ?? [null, null],
        turnStartAt: r.turnStartAt ?? Date.now(),
        previewUntil: r.previewUntil ?? null,
        previewDone: r.previewDone ?? true, // pre-existing rooms are already in-game → no preview
        startReady: r.startReady ?? [false, false],
        initSent: r.initSent ?? [true, true],
      };
    }
    return this.room;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    await this.restore();

    // provisioning call from the matchmaker
    if (url.pathname.endsWith("/setup")) {
      const body = (await req.json()) as { players: [PlayerRef, PlayerRef]; seed: number; ranked?: boolean };
      const res = createGame({
        mode: "online",
        seed: body.seed,
        p0: { id: body.players[0].id, name: body.players[0].name },
        p1: { id: body.players[1].id, name: body.players[1].name },
        starting: (body.seed & 1) as Side, // coin toss: seed parity decides who goes first (fair, server-authoritative)
      });
      this.room = {
        players: body.players,
        game: res.state,
        initEvents: res.events,
        readied: [false, false],
        joinBy: Date.now() + JOIN_GRACE_MS,
        recorded: false,
        ranked: body.ranked ?? false,
        gen: [0, 0],
        forfeitAt: [null, null],
        turnStartAt: Date.now(),
        previewUntil: null,
        previewDone: !(body.ranked ?? false), // ranked → run the 15s market preview; else start on ready
        startReady: [false, false],
        initSent: [false, false],
      };
      this.persist();
      void this.state.storage.setAlarm(this.room.joinBy!).catch(() => { /* best effort */ });
      return new Response("ok");
    }

    // player WebSocket
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const room = this.room;
    if (!room) return new Response("room not ready", { status: 409 });

    const userId = url.searchParams.get("uid") || "";
    const side = room.players.findIndex((p) => p.id === userId) as Side | -1;
    if (side === -1) return new Response("not a participant", { status: 403 });
    const sd = side as Side;

    // heartbeat pings answered by the runtime without waking the object (exact-string match)
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(JSON.stringify({ type: "ping" }), JSON.stringify({ type: "pong" })),
    );

    // this socket supersedes any previous one for this side; a reconnect cancels a pending forfeit
    const hadPendingForfeit = room.forfeitAt[sd] != null;
    room.forfeitAt[sd] = null;
    room.gen[sd]++;
    this.persist();
    this.syncAlarm();
    for (const old of this.state.getWebSockets(String(sd))) {
      try { old.close(1000, "replaced"); } catch { /* already gone */ }
    }

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.state.acceptWebSocket(server, [String(sd)]);
    server.serializeAttachment({ side: sd, gen: room.gen[sd] } satisfies Att);

    // tell the other player their opponent is (back) online
    if (hadPendingForfeit) {
      const other = this.sockFor((1 - sd) as Side);
      if (other) { try { this.send(other, { type: "oppConn", connected: true }); } catch { /* dropped */ } }
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /** The one live socket for a side (current generation), if connected. */
  private sockFor(side: Side): WebSocket | undefined {
    const room = this.room;
    if (!room) return undefined;
    for (const ws of this.state.getWebSockets(String(side))) {
      if (this.att(ws)?.gen === room.gen[side]) return ws;
    }
    return undefined;
  }

  private att(ws: WebSocket): Att | null {
    try { return (ws.deserializeAttachment() as Att) ?? null; } catch { return null; }
  }

  private send(ws: WebSocket, msg: GameServerMsg): void { ws.send(JSON.stringify(msg)); }

  // -------- hibernation handlers (wake the object from storage) --------

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const room = await this.restore();
    const att = this.att(ws);
    if (!room || !att) return;
    let msg: GameClientMsg;
    try { msg = JSON.parse(String(message)); } catch { return; }

    if (msg.type === "ping") { try { this.send(ws, { type: "pong" }); } catch { /* dropped */ } return; } // autoResponse fallback
    if (msg.type === "ready") {
      room.readied[att.side] = true;
      if (room.readied[0] && room.readied[1]) room.joinBy = null; // both joined → no join-timeout void
      // a reconnect cancels this side's pending forfeit and un-pauses the opponent
      if (room.forfeitAt[att.side] != null) { room.forfeitAt[att.side] = null; }
      this.syncAlarm();
      const other = this.sockFor((1 - att.side) as Side);
      if (other) { try { this.send(other, { type: "oppConn", connected: true }); } catch { /* dropped */ } }

      // RANKED pre-game phase: show the fixed market (no coin toss / no board yet).
      // Arm the 15s auto-start deadline once BOTH have joined; players may skip it via startReady.
      if (!room.previewDone) {
        const bothIn = room.readied[0] && room.readied[1];
        if (bothIn && room.previewUntil == null) { room.previewUntil = Date.now() + PREVIEW_MS; this.syncAlarm(); }
        this.persist();
        const targets: Side[] = bothIn ? [0, 1] : [att.side];
        for (const s of targets) {
          const w = this.sockFor(s);
          if (w) { try { this.send(w, { type: "preview", until: room.previewUntil, market: room.game.market }); } catch { /* dropped */ } }
        }
        return;
      }

      // normal start (non-ranked) or a mid-game reconnect resync
      this.persist();
      this.sendInit(att.side);
      return;
    }
    if (msg.type === "startReady") {
      if (room.previewDone) return;
      room.startReady[att.side] = true;
      this.persist();
      if (room.startReady[0] && room.startReady[1]) this.endPreview(); // both agreed → begin now
      return;
    }
    if (msg.type === "action") this.handleAction(att.side, msg.action);
  }

  async webSocketClose(ws: WebSocket): Promise<void> { await this.dropped(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.dropped(ws); }

  private async dropped(ws: WebSocket): Promise<void> {
    const room = await this.restore();
    const att = this.att(ws);
    if (!room || !att) return;
    if (att.gen !== room.gen[att.side]) return; // an older socket that was already replaced
    if (room.game.over || room.forfeitAt[att.side] != null) return;
    // tell the other player we're waiting for a reconnect
    const other = this.sockFor((1 - att.side) as Side);
    if (other) { try { this.send(other, { type: "oppConn", connected: false }); } catch { /* dropped */ } }
    // grace period: the alarm declares the forfeit unless a reconnect clears it first
    room.forfeitAt[att.side] = Date.now() + FORFEIT_GRACE_MS;
    this.persist();
    this.syncAlarm();
  }

  /** Keep the storage alarm pointed at the earliest pending deadline (forfeit or join). */
  private syncAlarm(): void {
    const room = this.room;
    if (!room) return;
    const times = [...room.forfeitAt, room.joinBy, room.previewUntil].filter((t): t is number => t != null);
    if (times.length) void this.state.storage.setAlarm(Math.min(...times)).catch(() => { /* best effort */ });
    else void this.state.storage.deleteAlarm().catch(() => { /* best effort */ });
  }

  async alarm(): Promise<void> {
    const room = await this.restore();
    if (!room) return;
    const now = Date.now();
    const bothJoined = room.readied[0] && room.readied[1];

    // ---- join timeout: a side never showed up → VOID the match (no rank, no W/L) ----
    if (room.joinBy != null && room.joinBy <= now + 250 && !bothJoined && !room.game.over) {
      room.joinBy = null;
      room.game.over = true; room.game.phase = "over"; room.game.winner = null;
      room.recorded = true; // no-contest — never touch the ladder
      for (const s of [0, 1] as Side[]) {
        const ws = this.sockFor(s);
        if (ws) { try { this.send(ws, { type: "voided", message: "상대가 참가하지 않아 매칭이 취소되었습니다 (점수 변동 없음)" }); } catch { /* dropped */ } }
      }
      this.persist();
      this.syncAlarm();
      return;
    }

    // ---- ranked preview auto-start: 15s elapsed with no mutual early-start → begin the game ----
    if (room.previewUntil != null && room.previewUntil <= now + 250 && !room.previewDone) {
      this.endPreview(); // persists + re-arms the alarm and sends init to both
      return;
    }

    for (const s of [0, 1] as Side[]) {
      const at = room.forfeitAt[s];
      if (at == null || at > now + 250) continue; // not due yet (alarm re-armed below)
      room.forfeitAt[s] = null;
      if (room.game.over || this.sockFor(s)) continue; // already decided, or they reconnected
      const winner = (1 - s) as Side;
      // If the "winner" never actually joined, this was never a real game → void, don't award rank.
      if (!room.readied[winner]) { room.game.over = true; room.game.phase = "over"; room.game.winner = null; room.recorded = true; continue; }
      room.game.over = true; room.game.phase = "over"; room.game.winner = winner;
      const remaining = this.sockFor(winner);
      if (remaining) {
        try {
          this.send(remaining, { type: "update", state: redactFor(room.game, winner), events: [{ type: "win", winner }] });
          this.send(remaining, { type: "opponentLeft" });
        } catch { /* dropped */ }
      }
      await this.recordResult();
    }
    this.persist();
    this.syncAlarm();
  }

  // -------- game logic (unchanged) --------

  private handleAction(side: Side, action: Action): void {
    const room = this.room!;
    const g = room.game;
    if (g.over) return;
    // authorization
    if (action.type === "surrender") {
      if (action.player !== side) return;
    } else if (g.cur !== side) {
      return; // not this player's turn
    }
    const prevCur = g.cur;
    const prevTurn = g.turn;
    const res = reduce(g, action);
    room.game = res.state;
    // Restart the server clock whenever a NEW turn begins. Keying off turn NUMBER (not just
    // cur) is essential: a skip (e.g. TIMEWARP) runs endTurn twice, so cur returns to the same
    // player while turn advances by 2 — checking cur alone would leave a stale turnStartAt,
    // making the resumed turn's clock read ~0 and instantly auto-end (cascading turn skips).
    if (res.state.turn !== prevTurn || res.state.cur !== prevCur) room.turnStartAt = Date.now();
    this.persist();
    // A rejected play (condition not met, sealed, etc.) produces only "log" events and
    // no state advance. Don't broadcast it to the OPPONENT — otherwise their client logs
    // the blocked attempt and their timer blinks, leaking that the actor spammed a card.
    // Send the rejection privately to the actor so they still get the friendly popup.
    const rejected = (action.type === "play" || action.type === "attack")
      && res.state.cur === prevCur && !res.state.over
      && !res.events.some((e) => e.type !== "log");
    if (rejected) {
      const ws = this.sockFor(side);
      if (ws) { try { this.send(ws, { type: "update", state: this.redact(side), events: res.events }); } catch { /* dropped */ } }
    } else {
      this.broadcast(res.events);
    }
    if (room.game.over) void this.recordResult();
  }

  /** Redacted state for `side`, stamped with the turn's remaining/total ms (server-authoritative clock). */
  private redact(side: Side): GameState {
    const s = redactFor(this.room!.game, side) as GameState & { turnLeftMs?: number; turnTotalMs?: number; sleeves?: [string | null, string | null] };
    const total = turnMsFor(this.room!.ranked);
    s.turnTotalMs = total;
    s.turnLeftMs = Math.max(0, total - (Date.now() - this.room!.turnStartAt));
    const pl = this.room!.players;
    s.sleeves = [pl[0].sleeve ?? null, pl[1].sleeve ?? null];
    return s;
  }

  private broadcast(events: GameEvent[]): void {
    const room = this.room!;
    for (const side of [0, 1] as Side[]) {
      const ws = this.sockFor(side);
      if (!ws) continue;
      try { this.send(ws, { type: "update", state: this.redact(side), events }); } catch { /* dropped */ }
    }
  }

  /** Send the opening snapshot to a side; the initEvents (draw animations) ride along only once. */
  private sendInit(side: Side): void {
    const room = this.room!;
    const ws = this.sockFor(side);
    if (!ws) return;
    const events = room.initSent[side] ? [] : room.initEvents;
    room.initSent[side] = true;
    this.persist();
    try { this.send(ws, { type: "init", you: side, state: this.redact(side), events }); } catch { /* dropped */ }
  }

  /** End the ranked market-preview phase → the game truly begins (coin toss happens client-side on init). */
  private endPreview(): void {
    const room = this.room;
    if (!room || room.previewDone) return;
    room.previewDone = true;
    room.previewUntil = null;
    room.turnStartAt = Date.now(); // fresh turn-1 clock (don't count the preview seconds)
    this.persist();
    this.syncAlarm();
    for (const s of [0, 1] as Side[]) this.sendInit(s);
  }

  private async recordResult(): Promise<void> {
    const room = this.room;
    if (!room || room.recorded || !room.game.over) return;
    room.recorded = true;
    this.persist();
    // No-contest guard: a game only counts (rank + W/L + match row) if BOTH players actually
    // joined. If a side never connected (phantom match), leaving costs nothing.
    if (!(room.readied[0] && room.readied[1])) return;
    // per-player card usage (played) + buys → card analytics in the admin dashboard
    const usesOf = (s: Side) => { try { return JSON.stringify(room.game.players[s].uses ?? {}); } catch { return "{}"; } };
    const buysOf = (s: Side) => { try { return JSON.stringify(room.game.players[s].buys ?? {}); } catch { return "{}"; } };
    const matchRow = (winnerId: string | null) =>
      this.env.DB.prepare(`INSERT INTO matches (id, player_a, player_b, winner, mode, created_at, ended_at, cards_a, cards_b, turns, buys_a, buys_b, bver) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(), room.players[0].id, room.players[1].id, winnerId, room.ranked ? "ranked" : "online", Date.now(), Date.now(), usesOf(0), usesOf(1), room.game.turn ?? null, buysOf(0), buysOf(1), BALANCE_VERSION);
    // push each connected player their own MMR before/after so the result screen can show ±delta
    const sendRank = (outcome: Record<string, { before: number; after: number }>): void => {
      for (const s of [0, 1] as Side[]) {
        const chg = outcome[room.players[s].id];
        const ws = this.sockFor(s);
        if (chg && ws) { try { this.send(ws, { type: "rankResult", before: chg.before, after: chg.after }); } catch { /* dropped */ } }
      }
    };
    try {
      if (room.game.winner == null) {
        // 75-turn DRAW: no win/loss counts; ranked → symmetric Elo with S=0.5
        await matchRow(null).run();
        if (room.ranked) sendRank(await applyRankedDraw(this.env, room.players[0].id, room.players[1].id));
        return;
      }
      const winner = room.players[room.game.winner];
      const loser = room.players[(1 - room.game.winner) as Side];
      await this.env.DB.batch([
        this.env.DB.prepare(`UPDATE users SET wins = wins + 1 WHERE id = ?`).bind(winner.id),
        this.env.DB.prepare(`UPDATE users SET losses = losses + 1 WHERE id = ?`).bind(loser.id),
        matchRow(winner.id),
      ]);
      if (room.ranked) sendRank(await applyRanked(this.env, winner.id, loser.id));
    } catch { /* records are best-effort */ }
  }
}
