/* eslint-disable */
// Causal card value: greedy bot, but purchases are chosen UNIFORMLY AT RANDOM among
// affordable options (≈ randomized assignment). Per-card winrate is then compared to
// the baseline of games where that card was NOT bought, controlling for cost band.
// Also records game length / draw stats to spot stall problems.
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import { DB, DECK_POOL, BUYABLE_POOL } from "../client/src/shared/cards";
import type { Action, GameState } from "../client/src/shared/types";
import * as fs from "fs";

type St = { n: number; w: number };
const file = process.env.OUT || "/tmp/sim/cardvalue.json";
const acc: { games: number; draws: number; turns: number[]; card: Record<string, St>; base: Record<string, St> } =
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { games: 0, draws: 0, turns: [], card: {}, base: {} };

let seed = (Number(process.argv[2]) || 1) * 1000003 + 7;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const randomDeck = (): string[] => Array.from({ length: 8 }, () => pick(DECK_POOL));

/** greedy for everything EXCEPT buys: when greedy wants to buy, pick a random affordable one. */
function randomBuyDecide(g: GameState): Action {
  const a = greedyDecide(g) as Action & { type: string };
  if (a.type !== "buy") return a;
  // enumerate affordable market buys and pick uniformly
  const alts: Action[] = [];
  const anyG = g as never as { market?: unknown[]; players: { mana: number }[] };
  try {
    const { candidates } = require("../client/src/shared/bot") as { candidates: (s: GameState) => Action[] };
    for (const c of candidates(g)) if ((c as { type: string }).type === "buy") alts.push(c);
  } catch { /* fall through */ }
  return alts.length ? alts[Math.floor(rnd() * alts.length)] : a;
}

const N = Number(process.argv[3]) || 100;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  let st = createGame({ seed: Math.floor(rnd() * 2 ** 31), mode: "bot", starting: rnd() < 0.5 ? 0 : 1,
    p0: { id: "a", name: "A", isBot: true, deck: randomDeck() }, p1: { id: "b", name: "B", isBot: true, deck: randomDeck() } } as never).state;
  let steps = 0;
  while (!st.over && steps++ < 4000) st = reduce(st, randomBuyDecide(st)).state;
  acc.games++;
  acc.turns.push(st.turn);
  const winner = st.over ? st.winner : null;
  if (winner === null) { acc.draws++; continue; }
  for (const s of [0, 1] as const) {
    const won = winner === s ? 1 : 0;
    const p = st.players[s] as never as { uses?: Record<string, number>; buys?: Record<string, number> };
    const owned = new Set([...Object.keys(p.uses ?? {}), ...Object.keys(p.buys ?? {})].filter((id) => BUYABLE_POOL.includes(id)));
    for (const id of BUYABLE_POOL) {
      const bucket = owned.has(id) ? acc.card : acc.base;
      (bucket[id] ??= { n: 0, w: 0 }); bucket[id].n++; bucket[id].w += won;
    }
  }
}
fs.writeFileSync(file, JSON.stringify(acc));
const avg = acc.turns.reduce((s, t) => s + t, 0) / acc.turns.length;
console.log(`games=${acc.games} draws=${acc.draws} (${(acc.draws / acc.games * 100).toFixed(1)}%) avgTurns=${avg.toFixed(1)} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
