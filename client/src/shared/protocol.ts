// ============================================================
// LORE — WebSocket protocol shared by client and server.
// The server is authoritative: clients send Actions, receive
// redacted GameState snapshots + event streams to animate.
// ============================================================
import type { Action, CardInst, GameEvent, GameState, Side } from "./types";

// ---- matchmaking (Matchmaker Durable Object) ----
export type QueueClientMsg =
  | { type: "queue" }
  | { type: "cancel" };

export type QueueServerMsg =
  | { type: "queued"; position: number }
  | { type: "matched"; roomId: string; you: Side; oppName: string; oppAvatar?: string | null }
  | { type: "error"; message: string };

// ---- in-game (GameRoom Durable Object) ----
export type GameClientMsg =
  | { type: "action"; action: Action }
  | { type: "ready" }
  | { type: "startReady" } // ranked market-preview: this player wants to start early
  | { type: "ping" };

export type GameServerMsg =
  | { type: "init"; you: Side; state: GameState; events: GameEvent[] }
  | { type: "update"; state: GameState; events: GameEvent[] }
  | { type: "opponentLeft" }
  | { type: "oppConn"; connected: boolean } // opponent dropped / came back (reconnect window)
  | { type: "voided"; message?: string }    // match cancelled (opponent never joined) — no rank change
  | { type: "preview"; until: number | null; market: CardInst[] } // ranked pre-game: study the fixed market (until=null → waiting for opponent)
  | { type: "rankResult"; before: number; after: number } // ranked game settled — this player's MMR before/after
  | { type: "error"; message: string }
  | { type: "pong" };

/**
 * Redact a full server-side GameState into the view a given player may see.
 * Hides opponent hand/deck contents and face-down trap identities so an
 * authoritative server never leaks hidden information to a client.
 */
export function redactFor(state: GameState, you: Side): GameState {
  const g: GameState = structuredClone(state);
  g._wheelSnap = null; // 운명의 수레바퀴 스냅샷은 서버 전용 (클라 불필요 + 숨김정보 보호)
  const opp = g.players[1 - you];
  const placeholder = (uid: string): GameState["players"][0]["hand"][0] => ({
    uid, id: "HIDDEN", t: "mon", cost: 0, name: "", text: "",
  });
  // the multiset of hidden cards is public knowledge (starter deck + buy log),
  // so expose it as a sorted aggregate — no order/position information leaks
  opp.collection = [...opp.hand, ...opp.deck, ...opp.traps.map((tr) => tr.card)].map((c) => c.id).sort();
  opp.hand = opp.hand.map((c) => placeholder(c.uid));
  opp.deck = opp.deck.map((c) => placeholder(c.uid));
  // discard is public (purchases are shown in the log too); only hand/deck/traps hidden
  opp.traps = opp.traps.map((t) => ({ card: placeholder(t.card.uid) }));
  // opponent's offered supply is only visible on their own turn
  if (g.cur === you) opp.supply = opp.supply.map((c) => (c ? placeholder(c.uid) : null));
  return g;
}
