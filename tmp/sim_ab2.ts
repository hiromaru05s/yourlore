/* eslint-disable */
// Paired A/B (common random numbers) card power sim — v2.
//  - fastclone (identical outcomes, 2.7x faster) ; optional lethal search (LETHAL=1)
//  - deck environment: 50% bot archetype presets (with botTune) / 50% random DECK_POOL
//  - starter: slot8 = X vs STARTER_TRASH (1 copy) and slots 6-8 = X (3 copies)
//  - buy: force-buy X at first affordable own turn vs nothing
//  - per-pair outcomes stored for block bootstrap of rank intervals
import "./fastclone";
import { createGame, reduce, buyCost } from "../client/src/shared/engine";
import { greedyDecide, BOT_DECKS } from "../client/src/shared/bot";
import { DB, STARTERS, DECK_POOL, BUYABLE_POOL } from "../client/src/shared/cards";
import type { GameState, CardInst } from "../client/src/shared/types";
import * as fs from "fs";

const SHARD = Number(process.argv[2] || 0), NSHARD = Number(process.argv[3] || 1);
const PAIRS = Number(process.argv[4] || 300);
const MODE = (process.argv[5] || "both") as "starter" | "buy" | "both";
const OUT = process.argv[6] || `/tmp/out_${SHARD}.json`;
const KOFF = Number(process.env.KOFF || 100000); // seed family offset (independent of run 1)
const LETHAL = !!process.env.LETHAL;

function mkRnd(seed: number) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
type Preset = { cards: string[]; tune?: { minBuy?: number; minBuyEarly?: number; chestTurn?: number } };
const PRESETS: Preset[] = [
  ...BOT_DECKS.map((d) => ({ cards: d.cards, tune: d.tune })),
  { cards: ["STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"] },
  { cards: ["ANCIENT_CIV","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST","STARTER_CHEST"] },
  { cards: ["TRIAL_AREA","CHOSEN_AREA","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH"] },
  { cards: ["MIMIC_PARTY","MIMIC_PARTY","RUST_SHROOM","RUST_SHROOM","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"] },
  { cards: ["FORESIGHT","FORESIGHT","CROSSROADS","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"].map((c) => (DB[c] || STARTERS[c]) ? c : "STARTER_TRASH") },
  { cards: ["COUNTERCALC","COUNTERCALC","RUST_SHROOM","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"] },
];
type Ctx = { seed: number; d0: Preset; d1: Preset; treated: 0 | 1; starting: 0 | 1 };
function ctxOf(k: number): Ctx {
  const r = mkRnd((k + KOFF) * 2654435761 + 12345);
  const rnd = () => ({ cards: Array.from({ length: 8 }, () => DECK_POOL[Math.floor(r() * DECK_POOL.length)]) });
  const roll = (): Preset => (r() < 0.5 ? PRESETS[Math.floor(r() * PRESETS.length)] : rnd());
  return { seed: Math.floor(r() * 2 ** 31), d0: roll(), d1: roll(), treated: (k % 2) as 0 | 1, starting: ((k >> 1) % 2) as 0 | 1 };
}

type Res = { win: number; used: boolean; buyTurn: number; turns: number; draw: boolean };
function play(c: Ctx, dOverride: string[] | null, inject: string | null, watch: string | null): Res {
  const d0 = c.treated === 0 && dOverride ? dOverride : c.d0.cards, d1 = c.treated === 1 && dOverride ? dOverride : c.d1.cards;
  let st: GameState = createGame({ seed: c.seed, mode: "bot", starting: c.starting, p0: { id: "a", name: "A", isBot: true, deck: d0 }, p1: { id: "b", name: "B", isBot: true, deck: d1 } }).state;
  if (c.d0.tune) st.players[0].botTune = c.d0.tune;
  if (c.d1.tune) st.players[1].botTune = c.d1.tune;
  let steps = 0, last = "", rep = 0, done = !inject, buyTurn = -1, used = false;
  const isTrap = !!watch && DB[watch]?.t === "trap";
  while (!st.over && steps++ < 4000) {
    if (!done && st.cur === c.treated && !st.pending) {
      const p = st.players[c.treated];
      const cc = { uid: "x", ...DB[inject!] } as CardInst;
      if (p.mana >= buyCost(p, cc)) {
        const s2 = structuredClone(st) as GameState;
        const orig = s2.market[0];
        s2.market[0] = { uid: "u" + ++s2.uidSeq, ...structuredClone(DB[inject!]) } as CardInst;
        const s3 = reduce(s2, { type: "buyMarket", i: 0 }).state;
        if (s3.players[c.treated].buys?.[inject!]) { s3.market[0] = orig; st = s3; done = true; buyTurn = st.turn; continue; }
      }
    }
    if (isTrap && !used && st.players[c.treated].traps.some((t) => t.card.id === watch)) used = true;
    const a = greedyDecide(st, LETHAL); const j = JSON.stringify(a);
    if (j === last) { if (++rep >= 20) { st = reduce(st, { type: "endTurn" }).state; rep = 0; last = ""; continue; } } else { last = j; rep = 0; }
    st = reduce(st, a).state;
  }
  const draw = !st.over;
  const win = draw ? 0.5 : st.winner === c.treated ? 1 : 0;
  if (watch && !isTrap) used = (st.players[c.treated].uses?.[watch] ?? 0) > 0;
  return { win, used, buyTurn, turns: st.turn, draw };
}

type Acc = { n: number; wA: number; wB: number; used: number; buyTurn: number; nBuy: number; turnsB: number; drawsB: number; d: number[] };
const mk = (): Acc => ({ n: 0, wA: 0, wB: 0, used: 0, buyTurn: 0, nBuy: 0, turnsB: 0, drawsB: 0, d: [] });
const acc: Record<string, Record<string, Acc>> = { starter1: {}, starter3: {}, buy: {} };
const ctrl: Record<string, { n: number; w: number; turns: number; draws: number }> = { starter: { n: 0, w: 0, turns: 0, draws: 0 }, buy: { n: 0, w: 0, turns: 0, draws: 0 } };
const t0 = Date.now();
let games = 0;
const rec = (m: string, id: string, A: Res, B: Res) => {
  const a = (acc[m][id] ??= mk());
  a.n++; a.wA += A.win; a.wB += B.win; a.turnsB += B.turns; if (B.draw) a.drawsB++; a.d.push((B.win - A.win) * 2);
  if (B.buyTurn >= 0) { a.nBuy++; a.buyTurn += B.buyTurn; }
  if (B.used) a.used++;
};
const log = (m: string, k: number) => { if (k % 50 === 0) console.error(`[${SHARD}] ${m} k=${k} games=${games} ${((Date.now() - t0) / 1000).toFixed(0)}s`); };

if (MODE !== "buy") {
  const ids = DECK_POOL.filter((id) => id !== "STARTER_TRASH").filter((_, i) => i % NSHARD === SHARD);
  for (let k = 0; k < PAIRS; k++) {
    const c = ctxOf(k);
    const base = c.treated === 0 ? c.d0.cards : c.d1.cards;
    const withX = (x: string, copies: number) => { const d = [...base]; for (let i = 8 - copies; i < 8; i++) d[i] = x; return d; };
    games += 2;
    const A1 = play(c, withX("STARTER_TRASH", 1), null, null);
    const A3 = play(c, withX("STARTER_TRASH", 3), null, null);
    ctrl.starter.n++; ctrl.starter.w += A1.win; ctrl.starter.turns += A1.turns; if (A1.draw) ctrl.starter.draws++;
    for (const id of ids) {
      games += 2;
      rec("starter1", id, A1, play(c, withX(id, 1), null, id));
      rec("starter3", id, A3, play(c, withX(id, 3), null, id));
    }
    log("starter", k);
  }
}
if (MODE !== "starter") {
  const ids = BUYABLE_POOL.filter((_, i) => i % NSHARD === SHARD);
  for (let k = 0; k < PAIRS; k++) {
    const c = ctxOf(k);
    games++;
    const A = play(c, null, null, null);
    ctrl.buy.n++; ctrl.buy.w += A.win; ctrl.buy.turns += A.turns; if (A.draw) ctrl.buy.draws++;
    for (const id of ids) { games++; rec("buy", id, A, play(c, null, id, id)); }
    log("buy", k);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ shard: SHARD, pairs: PAIRS, koff: KOFF, lethal: LETHAL, games, sec: (Date.now() - t0) / 1000, ctrl, acc }));
console.error(`[${SHARD}] done games=${games} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
