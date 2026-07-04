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
import { applyRanked } from "./rank";

interface PlayerRef { id: string; name: string; }

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
}

/** Attached to each socket; survives hibernation. */
interface Att { side: Side; gen: number; }

const FORFEIT_GRACE_MS = 30000;

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
        recorded: r.recorded ?? false,
        ranked: r.ranked ?? false,
        gen: r.gen ?? [0, 0],
        forfeitAt: r.forfeitAt ?? [null, null],
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
      });
      this.room = {
        players: body.players,
        game: res.state,
        initEvents: res.events,
        readied: [false, false],
        recorded: false,
        ranked: body.ranked ?? false,
        gen: [0, 0],
        forfeitAt: [null, null],
      };
      this.persist();
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
      // opening events only on the first ready; a reconnect just resyncs state
      const events = room.readied[att.side] ? [] : room.initEvents;
      room.readied[att.side] = true;
      this.persist();
      this.send(ws, { type: "init", you: att.side, state: redactFor(room.game, att.side), events });
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

  /** Keep the storage alarm pointed at the earliest pending forfeit deadline. */
  private syncAlarm(): void {
    const room = this.room;
    if (!room) return;
    const times = room.forfeitAt.filter((t): t is number => t != null);
    if (times.length) void this.state.storage.setAlarm(Math.min(...times)).catch(() => { /* best effort */ });
    else void this.state.storage.deleteAlarm().catch(() => { /* best effort */ });
  }

  async alarm(): Promise<void> {
    const room = await this.restore();
    if (!room) return;
    const now = Date.now();
    for (const s of [0, 1] as Side[]) {
      const at = room.forfeitAt[s];
      if (at == null || at > now + 250) continue; // not due yet (alarm re-armed below)
      room.forfeitAt[s] = null;
      if (room.game.over || this.sockFor(s)) continue; // already decided, or they reconnected
      const winner = (1 - s) as Side;
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
    const res = reduce(g, action);
    room.game = res.state;
    this.persist();
    this.broadcast(res.events);
    if (room.game.over) void this.recordResult();
  }

  private broadcast(events: GameEvent[]): void {
    const room = this.room!;
    for (const side of [0, 1] as Side[]) {
      const ws = this.sockFor(side);
      if (!ws) continue;
      try { this.send(ws, { type: "update", state: redactFor(room.game, side), events }); } catch { /* dropped */ }
    }
  }

  private async recordResult(): Promise<void> {
    const room = this.room;
    if (!room || room.recorded || room.game.winner == null) return;
    room.recorded = true;
    this.persist();
    const winner = room.players[room.game.winner];
    const loser = room.players[(1 - room.game.winner) as Side];
    try {
      await this.env.DB.batch([
        this.env.DB.prepare(`UPDATE users SET wins = wins + 1 WHERE id = ?`).bind(winner.id),
        this.env.DB.prepare(`UPDATE users SET losses = losses + 1 WHERE id = ?`).bind(loser.id),
        this.env.DB.prepare(`INSERT INTO matches (id, player_a, player_b, winner, mode, created_at, ended_at) VALUES (?,?,?,?,?,?,?)`)
          .bind(crypto.randomUUID(), room.players[0].id, room.players[1].id, winner.id, room.ranked ? "ranked" : "online", Date.now(), Date.now()),
      ]);
      if (room.ranked) await applyRanked(this.env, winner.id, loser.id);
    } catch { /* records are best-effort */ }
  }
}
