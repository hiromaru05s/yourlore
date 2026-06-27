// ============================================================
// LORE server — GameRoom Durable Object: the AUTHORITATIVE game.
// Holds the real GameState, validates every action, and pushes
// per-player redacted snapshots so hidden info never leaks.
// Reuses the exact same shared engine the client uses.
// ============================================================
import type { Env } from "./env";
import type { Action, GameEvent, GameState, Side } from "../../client/src/shared/types";
import type { GameClientMsg, GameServerMsg } from "../../client/src/shared/protocol";
import { createGame, reduce } from "../../client/src/shared/engine";
import { redactFor } from "../../client/src/shared/protocol";

interface PlayerRef { id: string; name: string; }

export class GameRoom {
  private env: Env;
  private players: [PlayerRef, PlayerRef] | null = null;
  private game: GameState | null = null;
  private initEvents: GameEvent[] = [];
  private sockets = new Map<Side, WebSocket>();
  private forfeitTimers = new Map<Side, ReturnType<typeof setTimeout>>();
  private readied = new Set<Side>();
  private recorded = false;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // provisioning call from the matchmaker
    if (url.pathname.endsWith("/setup")) {
      const body = (await req.json()) as { players: [PlayerRef, PlayerRef]; seed: number };
      this.players = body.players;
      const res = createGame({
        mode: "online",
        seed: body.seed,
        p0: { id: body.players[0].id, name: body.players[0].name },
        p1: { id: body.players[1].id, name: body.players[1].name },
      });
      this.game = res.state;
      this.initEvents = res.events;
      return new Response("ok");
    }

    // player WebSocket
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    if (!this.players || !this.game) return new Response("room not ready", { status: 409 });

    const userId = url.searchParams.get("uid") || "";
    const side = this.players.findIndex((p) => p.id === userId) as Side | -1;
    if (side === -1) return new Response("not a participant", { status: 403 });

    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    const sd = side as Side;
    const ft = this.forfeitTimers.get(sd); // a reconnect cancels a pending forfeit
    if (ft) { clearTimeout(ft); this.forfeitTimers.delete(sd); }
    this.sockets.set(sd, server);
    server.addEventListener("message", (e) => this.onMsg(sd, server, e));
    server.addEventListener("close", () => this.onClose(sd, server));
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: GameServerMsg): void { ws.send(JSON.stringify(msg)); }

  private onMsg(side: Side, ws: WebSocket, e: MessageEvent): void {
    if (!this.game) return;
    let msg: GameClientMsg;
    try { msg = JSON.parse(e.data as string); } catch { return; }

    if (msg.type === "ping") { this.send(ws, { type: "pong" }); return; }
    if (msg.type === "ready") {
      // opening events only on the first ready; a reconnect just resyncs state
      const events = this.readied.has(side) ? [] : this.initEvents;
      this.readied.add(side);
      this.send(ws, { type: "init", you: side, state: redactFor(this.game, side), events });
      return;
    }
    if (msg.type === "action") this.handleAction(side, msg.action);
  }

  private handleAction(side: Side, action: Action): void {
    const g = this.game!;
    if (g.over) return;
    // authorization
    if (action.type === "surrender") {
      if (action.player !== side) return;
    } else if (g.cur !== side) {
      return; // not this player's turn
    }
    const res = reduce(g, action);
    this.game = res.state;
    this.broadcast(res.events);
    if (this.game.over) void this.recordResult();
  }

  private broadcast(events: GameEvent[]): void {
    for (const [side, ws] of this.sockets) {
      try { this.send(ws, { type: "update", state: redactFor(this.game!, side), events }); } catch { /* dropped */ }
    }
  }

  private onClose(side: Side, ws: WebSocket): void {
    if (this.sockets.get(side) !== ws) return; // a newer socket already replaced this one
    this.sockets.delete(side);
    const g = this.game;
    if (!g || g.over) return;
    // grace period: wait for a reconnect before declaring a forfeit
    const t = setTimeout(() => {
      this.forfeitTimers.delete(side);
      if (this.sockets.has(side) || !this.game || this.game.over) return;
      const winner = (1 - side) as Side;
      this.game.over = true; this.game.phase = "over"; this.game.winner = winner;
      const remaining = this.sockets.get(winner);
      if (remaining) {
        this.send(remaining, { type: "update", state: redactFor(this.game, winner), events: [{ type: "win", winner }] });
        this.send(remaining, { type: "opponentLeft" });
      }
      void this.recordResult();
    }, 25000);
    this.forfeitTimers.set(side, t);
  }

  private async recordResult(): Promise<void> {
    if (this.recorded || !this.game || this.game.winner == null || !this.players) return;
    this.recorded = true;
    const winner = this.players[this.game.winner];
    const loser = this.players[(1 - this.game.winner) as Side];
    try {
      await this.env.DB.batch([
        this.env.DB.prepare(`UPDATE users SET wins = wins + 1 WHERE id = ?`).bind(winner.id),
        this.env.DB.prepare(`UPDATE users SET losses = losses + 1 WHERE id = ?`).bind(loser.id),
        this.env.DB.prepare(`INSERT INTO matches (id, player_a, player_b, winner, mode, created_at, ended_at) VALUES (?,?,?,?,?,?,?)`)
          .bind(crypto.randomUUID(), this.players[0].id, this.players[1].id, winner.id, "online", Date.now(), Date.now()),
      ]);
    } catch { /* records are best-effort */ }
  }
}
