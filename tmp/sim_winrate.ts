/* eslint-disable */
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide, BOT_DECKS } from "../client/src/shared/bot";
import { DB, DECK_POOL, BUYABLE_POOL } from "../client/src/shared/cards";
import * as fs from "fs";

type St = Record<string, { n: number; w: number }>;
const file = "/tmp/sim/stats2.json";
const acc: { games: number; draws: number; card: St; starter: St } =
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { games: 0, draws: 0, card: {}, starter: {} };

let seed = (Number(process.argv[2]) || 1) * 1000003 + 7;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];

const PRESETS: string[][] = [
  ...BOT_DECKS.map((d) => d.cards),
  ["STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"],
  ["GAMBLER","GAMBLER","GAMBLER","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"],
  ["ELF_HAVEN","HALF_ELF","HALF_ELF","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"],
  ["ANCIENT_CIV","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST","STARTER_CHEST"],
  ["TRIAL_AREA","CHOSEN_AREA","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH"],
  ["MIMIC_PARTY","MIMIC_PARTY","RUST_SHROOM","RUST_SHROOM","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"],
  ["FORESIGHT","FORESIGHT","CROSSROADS","STARTER_TRASH","STARTER_TRASH","STARTER_TRASH","STARTER_CHEST","STARTER_CHEST"],
];
const randomDeck = (): string[] => Array.from({ length: 8 }, () => pick(DECK_POOL));
const rollDeck = (): string[] => (rnd() < 0.5 ? pick(PRESETS) : randomDeck());

const N = Number(process.argv[3]) || 200;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const d0 = rollDeck(), d1 = rollDeck();
  let st = createGame({ seed: Math.floor(rnd() * 2 ** 31), mode: "bot", starting: rnd() < 0.5 ? 0 : 1,
    p0: { id: "a", name: "A", isBot: true, deck: d0 }, p1: { id: "b", name: "B", isBot: true, deck: d1 } } as never).state;
  let steps = 0;
  while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
  acc.games++;
  const winner = st.over ? st.winner : null;
  if (winner === null) acc.draws++;
  else for (const s of [0, 1] as const) {
    const won = winner === s ? 1 : 0;
    const p = st.players[s];
    for (const id of new Set([...Object.keys(p.uses ?? {}), ...Object.keys((p as never as { buys?: Record<string, number> }).buys ?? {})])) {
      if (!BUYABLE_POOL.includes(id)) continue;
      (acc.card[id] ??= { n: 0, w: 0 }); acc.card[id].n++; acc.card[id].w += won;
    }
    for (const id of new Set(s === 0 ? d0 : d1)) {
      (acc.starter[id] ??= { n: 0, w: 0 }); acc.starter[id].n++; acc.starter[id].w += won;
    }
  }
}
fs.writeFileSync(file, JSON.stringify(acc));
console.log(`games=${acc.games} draws=${acc.draws} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s (${N} this run)`);
