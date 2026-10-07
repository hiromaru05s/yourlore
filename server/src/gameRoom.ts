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
import { createGame, reduce, actingSide } from "../../client/src/shared/engine";
import { redactFor } from "../../client/src/shared/protocol";
import { BALANCE_VERSION } from "../../client/src/shared/cards";
import { settleRanked, type RankOutcome } from "./rank";
import { DUEL_OPENING_MS, OPENING_PREPARE_MS, OPENING_LEAD_MS, OPENING_VERSION } from "../../client/src/shared/opening";
import { isClientMessage, resolveTurnTimeout } from "./gameInput";
import { matchBot, matchBotActions, matchBotsEnabled, MATCH_BOT_ACTION_MS } from './matchBots';

interface PlayerRef { id: string; name: string; sleeve?: string | null; furniture?:string|null; deck?: string | null; }

/** Everything the room needs — persisted so deploys/evictions/hibernation can't kill a live game. */
interface RoomData {
  players: [PlayerRef, PlayerRef];
  game: GameState;
  initEvents: GameEvent[];
  readied: [boolean, boolean];
  recorded: boolean;
  resultAt?: number;
  rankOutcome?: RankOutcome;
  /** Ranked match — result also updates the seasonal Elo ladder. */
  ranked: boolean;
  /** Connection generation per side — a close from an older gen is a replaced socket, not a disconnect. */
  gen: [number, number];
  /** Pending forfeit deadlines (ms epoch) per side; enforced by alarm(). */
  forfeitAt: [number | null, number | null];
  /** ms epoch when the CURRENT turn began — server-authoritative turn clock, so a
      reconnecting/reopened client resumes with the correct remaining time (not a fresh 50s). */
  turnStartAt: number;
  /** v42: extra ms granted to the CURRENT turn once the end-turn hand-discard choice (pending
      handCap) appears — the player gets +10s to pick; on expiry the engine discards from the right. */
  turnBonusMs: number;
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
  /** ms epoch when the room was provisioned — recorded as matches.created_at so
      the admin dashboard can chart real game duration (ended_at − created_at). */
  startedAt: number;
  opening?: {version?:number;capable:[boolean,boolean];ready:[boolean,boolean];prepareBy:number|null;startsAt:number|null};
  bot?: { id: string; side: Side; nextAt: number | null };
}

const TURN_MS_RANKED = 50000; // ranked: tighter clock
const TURN_MS_CASUAL = 90000; // everything else: 90s per turn
const turnMsFor = (ranked: boolean): number => (ranked ? TURN_MS_RANKED : TURN_MS_CASUAL);
const HAND_CAP_BONUS_MS = 10000; // v42: end-turn hand-discard choice grants +10s
/** Server-side slack past the client's clock before the room force-ends a turn.
 *  Honest clients auto-end themselves at 0 — this only catches stalled/modified
 *  ones, so the opponent can never be frozen indefinitely. */
const TURN_ENFORCE_GRACE_MS = 7000;

/** Attached to each socket; survives hibernation. */
interface Att { side: Side; gen: number; }

const FORFEIT_GRACE_MS = 30000;
const JOIN_GRACE_MS = 45000; // both players must connect within this or the match is voided
const PREVIEW_MS = 15000;    // ranked: fixed-market study window before the coin toss

export class GameRoom {
  private env: Env;
  private state: DurableObjectState;
  private room: RoomData | null = null;
  // ---- flood guards (in-memory: reset on hibernation, which is fine — a flood keeps the DO awake) ----
  /** recent join (WS upgrade) timestamps per side — two tabs of one user evict each
   *  other in an infinite "replaced"→reconnect ping-pong; cap the join rate. */
  private joinTimes: [number[], number[]] = [[], []];
  /** recent message timestamps per socket — a looping client must not burn the DO request budget. */
  private recording: Promise<void> | null = null;
  private msgTimes = new Map<WebSocket, number[]>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async persist(): Promise<void> {
    if (!this.room) return;
    try { await this.state.storage.put("room", this.room); }
    catch { this.room=null; console.error('room_persistence_failed'); throw new Error('room persistence failed'); }
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
        resultAt: r.resultAt,
        rankOutcome: r.rankOutcome,
        ranked: r.ranked ?? false,
        gen: r.gen ?? [0, 0],
        forfeitAt: r.forfeitAt ?? [null, null],
        turnStartAt: r.turnStartAt ?? Date.now(),
        turnBonusMs: r.turnBonusMs ?? 0,
        previewUntil: r.previewUntil ?? null,
        previewDone: r.previewDone ?? true, // pre-existing rooms are already in-game → no preview
        startReady: r.startReady ?? [false, false],
        initSent: r.initSent ?? [true, true],
        opening: r.opening,
        bot: r.bot,
        startedAt: r.startedAt ?? Date.now(), // old blobs: degrade to duration≈0 (excluded by admin query)
      };
    }
    return this.room;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    await this.restore();

    // provisioning call from the matchmaker
    if (url.pathname === "/setup") {
      if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
      if (this.room) return new Response("already provisioned", { status: 409 });
      const body = (await req.json()) as { players: [PlayerRef, PlayerRef]; seed: number; ranked?: boolean; botId?: string };
      const bot = body.botId ? matchBot(body.botId) : undefined;
      if (body.botId && (!matchBotsEnabled(this.env) || !bot || body.players[1]?.id !== bot.id || body.players[0]?.id === bot.id)) return new Response('invalid test bot', {status:403});
      if (bot) body.players[1] = {id:bot.id,name:bot.name,deck:bot.deck.cards.join(',')};
      const res = createGame({
        mode: "online",
        seed: body.seed,
        p0: { id: body.players[0].id, name: body.players[0].name, deck: body.players[0].deck ? body.players[0].deck.split(",") : undefined },
        p1: { id: body.players[1].id, name: body.players[1].name, deck: body.players[1].deck ? body.players[1].deck.split(",") : undefined },
        starting: (body.seed & 1) as Side, // coin toss: seed parity decides who goes first (fair, server-authoritative)
      });
      this.room = {
        players: body.players,
        game: res.state,
        initEvents: res.events,
        readied: [false, !!bot],
        joinBy: Date.now() + JOIN_GRACE_MS,
        recorded: false,
        ranked: body.ranked ?? false,
        gen: [0, 0],
        forfeitAt: [null, null],
        turnStartAt: Date.now(),
        turnBonusMs: 0,
        previewUntil: null,
        previewDone: !(body.ranked ?? false), // ranked → run the 15s market preview; else start on ready
        startReady: [false, !!bot],
        initSent: [false, false],
        startedAt: Date.now(),
        opening: {version:OPENING_VERSION,capable:[false,!!bot],ready:[false,!!bot],prepareBy:null,startsAt:null},
        bot: bot ? {id:bot.id,side:1,nextAt:null} : undefined,
      };
      if (bot) this.room.game.players[1].botTune = {...bot.deck.tune};
      await this.persist();
      await this.state.storage.setAlarm(this.room.joinBy!);
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
    if (room.bot?.side === sd) return new Response('server controlled participant', {status:403});

    // heartbeat pings answered by the runtime without waking the object (exact-string match)
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(JSON.stringify({ type: "ping" }), JSON.stringify({ type: "pong" })),
    );

    // join-flood guard: >8 joins per side / 30s = a reconnect loop, not a human. 429 makes the
    // client's retry counter run out (429 closes before onOpen, so retries never reset).
    {
      const now = Date.now();
      const jt = this.joinTimes[sd].filter((t2) => now - t2 < 30_000);
      jt.push(now);
      this.joinTimes[sd] = jt;
      if (jt.length > 8) return new Response("too many reconnects", { status: 429 });
    }

    // this socket supersedes any previous one for this side; a reconnect cancels a pending forfeit
    const hadPendingForfeit = room.forfeitAt[sd] != null;
    room.forfeitAt[sd] = null;
    room.gen[sd]++;
    await this.persist();
    await this.syncAlarm();
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
    // message-flood guard: >60 msgs / 10s from one socket = a client-side loop → drop the socket.
    // (normal play incl. multi-pick auto-submits stays far below; pings are auto-responded and never land here)
    {
      const now = Date.now();
      const times = (this.msgTimes.get(ws) ?? []).filter((t2) => now - t2 < 10_000);
      times.push(now);
      this.msgTimes.set(ws, times);
      if (times.length > 60) { try { ws.close(1011, "rate limited"); } catch { /* gone */ } return; }
    }
    const room = await this.restore();
    const att = this.att(ws);
    if (!room || !att) return;
    let msg: GameClientMsg;
    if (typeof message !== "string" || message.length > 4096) return;
    try { const value: unknown = JSON.parse(message); if (!isClientMessage(value)) return; msg = value; } catch { return; }

    if (msg.type === "ping") { try { this.send(ws, { type: "pong" }); } catch { /* dropped */ } return; } // autoResponse fallback
    if (att.gen !== room.gen[att.side]) return;
    if (msg.type === "openingReady") {
      if (!room.game.over && room.opening && room.previewDone) {
        room.opening.ready[att.side] = true;
        await this.state.storage.put("room", room);
        if (room.readied.every(Boolean) && room.opening.ready.every(Boolean)) await this.startOpening();
      }
      return;
    }
    if (msg.type === "ready") {
      if (room.opening && room.opening.startsAt == null) room.opening.capable[att.side] = msg.openingVersion === OPENING_VERSION;
      room.readied[att.side] = true;
      if (room.readied[0] && room.readied[1]) room.joinBy = null; // both joined → no join-timeout void
      // a reconnect cancels this side's pending forfeit and un-pauses the opponent
      if (room.forfeitAt[att.side] != null) { room.forfeitAt[att.side] = null; }
      await this.syncAlarm();
      const other = this.sockFor((1 - att.side) as Side);
      if (other) { try { this.send(other, { type: "oppConn", connected: true }); } catch { /* dropped */ } }

      // RANKED pre-game phase: show the fixed market (no coin toss / no board yet).
      // Arm the 15s auto-start deadline once BOTH have joined; players may skip it via startReady.
      if (!room.previewDone) {
        const bothIn = room.readied[0] && room.readied[1];
        if (bothIn && room.previewUntil == null) { room.previewUntil = Date.now() + PREVIEW_MS; await this.syncAlarm(); }
        await this.persist();
        const targets: Side[] = bothIn ? [0, 1] : [att.side];
        for (const s of targets) {
          const w = this.sockFor(s);
          if (w) { try { this.send(w, { type: "preview", until: room.previewUntil, market: room.game.market }); } catch { /* dropped */ } }
        }
        return;
      }

      if (room.opening && room.opening.startsAt == null && room.readied.every(Boolean)) {
        await this.prepareOpening();
        return;
      }
      // normal start (non-ranked) or a mid-game reconnect resync
      await this.persist();
      await this.sendInit(att.side);
      const outcome=room.rankOutcome?.[room.players[att.side].id];
      if (room.game.over && outcome) this.send(ws,{type:"rankResult",...outcome});
      return;
    }
    if (msg.type === "startReady") {
      if (room.previewDone) return;
      room.startReady[att.side] = true;
      await this.persist();
      if (room.startReady[0] && room.startReady[1]) await this.endPreview(); // both agreed → begin now
      return;
    }
    if (msg.type === "action") await this.handleAction(att.side, msg.action);
  }

  async webSocketClose(ws: WebSocket): Promise<void> { await this.dropped(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.dropped(ws); }

  private async dropped(ws: WebSocket): Promise<void> {
    this.msgTimes.delete(ws); // flood-guard bookkeeping
    const room = await this.restore();
    const att = this.att(ws);
    if (!room || !att) return;
    if (att.gen !== room.gen[att.side]) return; // an older socket that was already replaced
    if (room.game.over || room.forfeitAt[att.side] != null) return;
    // grace period: the alarm declares the forfeit unless a reconnect clears it first
    room.forfeitAt[att.side] = Date.now() + FORFEIT_GRACE_MS;
    // tell the other player we're waiting for a reconnect — with the forfeit
    // deadline so their client can show a live countdown instead of a vague wait
    const other = this.sockFor((1 - att.side) as Side);
    if (other) { try { this.send(other, { type: "oppConn", connected: false, deadline: room.forfeitAt[att.side]! }); } catch { /* dropped */ } }
    await this.persist();
    await this.syncAlarm();
  }

  /** Keep the storage alarm pointed at the earliest pending deadline (forfeit or join). */
  private async syncAlarm(): Promise<void> {
    try {
    const room = this.room;
    if (!room) return;
    if (room.game.over) {
      if (!room.recorded) await this.state.storage.setAlarm(Date.now() + 5000);
      else await this.state.storage.deleteAlarm();
      return;
    }
    const times = [...room.forfeitAt, room.joinBy, room.previewUntil, room.opening?.prepareBy].filter((t): t is number => t != null);
    if (room.bot) {
      const bot = room.bot;
      const canAct = room.readied.every(Boolean) && room.previewDone &&
        (!room.opening || room.opening.startsAt != null) && room.forfeitAt[1-bot.side] == null && actingSide(room.game) === bot.side;
      const next = canAct ? bot.nextAt ?? Math.max(Date.now(), room.turnStartAt) + MATCH_BOT_ACTION_MS : null;
      if (next !== bot.nextAt) { bot.nextAt = next; await this.persist(); }
      if (next != null) times.push(next);
    }
    // authoritative turn clock: arm the force-end deadline for the running turn
    if (!room.game.over && room.previewDone && room.readied[0] && room.readied[1] && (!room.opening || room.opening.startsAt != null)) {
      times.push(room.turnStartAt + turnMsFor(room.ranked) + (room.turnBonusMs || 0) + TURN_ENFORCE_GRACE_MS);
    }
    if (times.length) await this.state.storage.setAlarm(Math.min(...times));
    else await this.state.storage.deleteAlarm();
      } catch { this.room=null;console.error('room_alarm_failed');throw new Error('room alarm failed'); }
  }

  async alarm(): Promise<void> {
    const room = await this.restore();
    if (!room) return;
    if (room.game.over) { await this.recordResult(); await this.syncAlarm(); return; }
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
      await this.persist();
      await this.syncAlarm();
      return;
    }

    // ---- ranked preview auto-start: 15s elapsed with no mutual early-start → begin the game ----
    if (room.previewUntil != null && room.previewUntil <= now + 250 && !room.previewDone) {
      await this.endPreview(); // persists + re-arms the alarm and sends init to both
      return;
    }

    if (room.opening?.prepareBy != null && room.opening.prepareBy <= now && bothJoined && room.previewDone) await this.startOpening();

    // process due forfeits in DEADLINE order: if both sides are due in one (late)
    // alarm firing, the side that disconnected FIRST forfeits — not side 0 by index.
    const forfeitOrder = ([0, 1] as Side[]).sort((a, b) => (room.forfeitAt[a] ?? Infinity) - (room.forfeitAt[b] ?? Infinity));
    for (const s of forfeitOrder) {
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

    // ---- server-side turn timeout: force-end a turn the active client never ended.
    // The clock was previously display-only — a stalled or modified client on its
    // turn could freeze the opponent forever (no action → no forfeit, no end).
    if (!room.game.over && room.previewDone && bothJoined && (!room.opening || room.opening.startsAt != null)) {
      const dl = room.turnStartAt + turnMsFor(room.ranked) + (room.turnBonusMs || 0) + TURN_ENFORCE_GRACE_MS;
      if (dl <= now + 250) {
        const prevTurn = room.game.turn, prevCur = room.game.cur;
        const { state: st, events: evs } = resolveTurnTimeout(room.game);
        room.game = st;
        if (st.turn !== prevTurn || st.cur !== prevCur) {
          room.turnStartAt = Date.now(); room.turnBonusMs = 0;
          this.broadcast(evs);
        } else {
          // engine refused (unclearable pending) — retry in 10s instead of hot-looping
          room.turnStartAt += 10_000;
        }
        if (room.game.over) await this.recordResult();
      }
    }

    if (!room.game.over && room.bot?.nextAt != null && room.bot.nextAt <= now) await this.runBot();
    await this.persist();
    await this.syncAlarm();
  }

  /** One public-information decision per durable alarm; resumes after hibernation. */
  private async runBot(): Promise<void> {
    const room = this.room!, bot = room.bot!;
    bot.nextAt = null;
    if (actingSide(room.game) !== bot.side || room.forfeitAt[1-bot.side] != null || Date.now() < room.turnStartAt) return;
    for (const action of matchBotActions(room.game, bot.side)) {
      // Engine validation uses the authoritative state, never the strategy's redacted copy.
      const result = reduce(room.game, action);
      if (result.state.turn === room.game.turn && result.state.cur === room.game.cur &&
          !result.state.over && !result.events.some(event => event.type !== 'log') &&
          JSON.stringify(result.state.pending) === JSON.stringify(room.game.pending)) continue;
      await this.handleAction(bot.side, action);
      return;
    }
    console.error('match_bot_no_action', bot.id, room.game.pending?.reason);
    // The normal server turn timeout remains armed if an unknown future card has no valid choice.
    bot.nextAt = Date.now() + 10000;
  }

  // -------- game logic --------

  private async handleAction(side: Side, action: Action): Promise<void> {
    const room = this.room!;
    const g = room.game;
    if (g.over) return;
    // No gameplay before both players have joined, studied the market and reached the shared start.
    if (action.type !== "surrender" && (!room.readied.every(Boolean) || !room.previewDone || (room.opening && (room.opening.startsAt == null || Date.now() < room.turnStartAt)))) return;
    // authorization
    if (action.type === "surrender") {
      if (action.player !== side) return;
    } else if (actingSide(g) !== side) {
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
    if (res.state.turn !== prevTurn || res.state.cur !== prevCur) { room.turnStartAt = Date.now(); room.turnBonusMs = 0; await this.syncAlarm(); } // re-arm the turn-timeout alarm
    else if (res.state.pending?.reason === "handCap" && !room.turnBonusMs) { room.turnBonusMs = HAND_CAP_BONUS_MS; await this.syncAlarm(); } // v42: +10s to choose the discards
    await this.persist();
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
    // AWAITED: fire-and-forget let the DO hibernate mid-write after `recorded=true`
    // persisted, permanently dropping the W/L + Elo + match row for the common
    // in-game ending (lethal/surrender). Awaiting keeps the object alive.
    if (room.game.over) await this.recordResult();
    if (room.bot) await this.syncAlarm();
  }

  /** Redacted state for `side`, stamped with the turn's remaining/total ms (server-authoritative clock). */
  private redact(side: Side): GameState {
    const s = redactFor(this.room!.game, side) as GameState & { turnLeftMs?: number; turnTotalMs?: number; sleeves?: [string | null, string | null] };
    const total = turnMsFor(this.room!.ranked) + (this.room!.turnBonusMs || 0);
    s.ranked = this.room!.ranked;
    s.turnTotalMs = total;
    s.turnLeftMs = Math.min(total, Math.max(0, total - (Date.now() - this.room!.turnStartAt)));
    if (this.room!.opening && s.turn === 1) {
      const startsAt=this.room!.opening.startsAt;
      s.opening={startsAt,playableAt:startsAt==null?null:this.room!.turnStartAt,serverNow:Date.now()};
      if(startsAt==null)s.turnLeftMs=total;
    }
    const pl = this.room!.players;
    s.sleeves = [this.room!.players[0].sleeve||"default",this.room!.players[1].sleeve||"default"];
    s.furnitures = [this.room!.players[0].furniture||"default",this.room!.players[1].furniture||"default"];
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
  private async sendInit(side: Side): Promise<void> {
    const room = this.room!;
    const ws = this.sockFor(side);
    if (!ws) return;
    const events = room.initSent[side] ? [] : room.initEvents;
    room.initSent[side] = true;
    await this.persist();
    try { this.send(ws, { type: "init", you: side, state: this.redact(side), events }); } catch { /* dropped */ }
  }

  /** End the ranked market-preview phase → the game truly begins (coin toss happens client-side on init). */
  private async endPreview(): Promise<void> {
    const room = this.room;
    if (!room || room.previewDone) return;
    room.previewDone = true;
    room.previewUntil = null;
    if(room.opening){await this.prepareOpening();return;}
    room.turnStartAt = Date.now(); room.turnBonusMs = 0; // legacy room
    await this.persist();
    await this.syncAlarm();
    for (const s of [0, 1] as Side[]) await this.sendInit(s);
  }

  /** Resource readiness is bounded and persisted; repeated messages never restart it. */
  private async prepareOpening(): Promise<void> {
    const room=this.room!;const opening=room.opening;
    if(!opening||opening.startsAt!=null||!room.readied.every(Boolean)||!room.previewDone)return;
    if(opening.version!==OPENING_VERSION||!opening.capable.every(Boolean)) {
      // Mixed/older clients keep the legacy immediate-start path; never use a mismatched cinematic clock.
      delete room.opening;room.turnStartAt=Date.now();
    } else if(opening.prepareBy==null) opening.prepareBy=Date.now()+OPENING_PREPARE_MS;
    await this.state.storage.put("room",room);
    await this.syncAlarm();
    for(const side of [0,1] as Side[])await this.sendInit(side);
    if(room.opening?.ready.every(Boolean))await this.startOpening();
  }

  private async startOpening(): Promise<void> {
    const room=this.room!;const opening=room.opening;
    if(!opening||opening.startsAt!=null||!room.readied.every(Boolean)||!room.previewDone||room.game.over)return;
    opening.startsAt=Date.now()+OPENING_LEAD_MS;opening.prepareBy=null;
    // Pending pre-release rooms may still have v1 clients and an already-armed alarm.
    room.turnStartAt=opening.startsAt+(opening.version===OPENING_VERSION?DUEL_OPENING_MS:10450);room.turnBonusMs=0;
    await this.state.storage.put("room",room);
    await this.syncAlarm();
    for(const side of [0,1] as Side[])await this.sendInit(side);
  }

  private async recordResult(): Promise<void> {
    if (this.recording) return this.recording;
    this.recording = this.settleResult();
    try { await this.recording; } finally { this.recording = null; }
  }

  private async settleResult(): Promise<void> {
    const room = this.room;
    if (!room || room.recorded || !room.game.over) return;
    if (!(room.readied[0] && room.readied[1])) { room.recorded = true; await this.state.storage.put("room",room); return; }
    room.resultAt ??= Date.now();
    await this.state.storage.put("room",room);
    // The DO id is stable across reconnects, eviction and retries.
    const matchId = this.state.id.toString();
    const winner = room.game.winner == null ? null : room.players[room.game.winner].id;
    const loser = room.game.winner == null ? null : room.players[(1-room.game.winner) as Side].id;
    const usesOf = (s: Side) => JSON.stringify(room.game.players[s].uses ?? {});
    const buysOf = (s: Side) => JSON.stringify(room.game.players[s].buys ?? {});
    try {
      // Gate totals on the same match row. Retrying telemetry never increments twice.
      await this.env.DB.batch([
        this.env.DB.prepare(`UPDATE users SET wins=wins+1 WHERE id=? AND NOT EXISTS (SELECT 1 FROM matches WHERE id=?)`).bind(winner,matchId),
        this.env.DB.prepare(`UPDATE users SET losses=losses+1 WHERE id=? AND NOT EXISTS (SELECT 1 FROM matches WHERE id=?)`).bind(loser,matchId),
        this.env.DB.prepare(`INSERT OR IGNORE INTO matches (id,player_a,player_b,winner,mode,created_at,ended_at,cards_a,cards_b,turns,buys_a,buys_b,bver) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(matchId,room.players[0].id,room.players[1].id,winner,room.ranked?"ranked":"online",room.startedAt,room.resultAt,usesOf(0),usesOf(1),room.game.turn??null,buysOf(0),buysOf(1),BALANCE_VERSION),
      ]);
      if (room.ranked) {
        const outcome = await settleRanked(this.env,matchId,room.players[0].id,room.players[1].id,winner,room.resultAt);
        room.rankOutcome=outcome;
        for (const side of [0,1] as Side[]) {
          const ws=this.sockFor(side), change=outcome[room.players[side].id];
          if (ws && change) try { this.send(ws,{type:"rankResult",...change}); } catch { /* disconnected */ }
        }
      }
      room.recorded = true;
      await this.state.storage.put("room",room);
    } catch (error) {
      room.recorded = false;
      console.error("match_settlement_retry", matchId, String(error));
      await this.state.storage.setAlarm(Date.now()+5000);
    }
  }
}
