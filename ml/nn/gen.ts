// ============================================================
// LORE HELL-bot training — STEP 1: self-play data generation.
// Plays greedy + epsilon-exploration games on the real engine and records
// (features, eventual winner) at every decision point → compact binary.
//
// Run:  npx esbuild ml/nn/gen.ts --bundle --platform=node --format=cjs --outfile=ml/nn/gen.cjs
//       node ml/nn/gen.cjs <games> <out.bin>      e.g. node ml/nn/gen.cjs 3500 ml/nn/data.bin
// ============================================================
import { writeFileSync } from "fs";
import { createGame, reduce } from "../../client/src/shared/engine";
import { greedyDecide, candidates } from "../../client/src/shared/bot";
import { features, NUM_FEATURES } from "../../client/src/shared/botFeatures";
import type { GameState, Side } from "../../client/src/shared/types";

const GAMES = Number(process.argv[2] ?? 3500);
const OUT = process.argv[3] ?? "ml/nn/data.bin";
const EPS = 0.18;    // exploration rate (random legal move)
const SAMPLE = 0.5;  // record ~half of decision states (decorrelate)

let rs = 12345 >>> 0;
const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };

type Sample = { x: number[]; side: Side };

function playGame(seed: number, out: Sample[]): 0 | 1 | null {
  let st: GameState = createGame({
    seed, mode: "bot", starting: rnd() < 0.5 ? 0 : 1,
    p0: { id: "A", name: "A", isBot: true }, p1: { id: "B", name: "B", isBot: true },
  }).state;
  const rec: Sample[] = [];
  let guard = 0;
  while (!st.over && guard < 20000) {
    if (!st.pending && rnd() < SAMPLE) {
      rec.push({ x: features(st, 0), side: 0 });
      rec.push({ x: features(st, 1), side: 1 });
    }
    const action = rnd() < EPS ? candidates(st)[Math.floor(rnd() * candidates(st).length)] : greedyDecide(st);
    st = reduce(st, action).state; guard++;
  }
  if (!st.over) return null;
  for (const s of rec) out.push(s);
  return st.winner as 0 | 1;
}

const X: number[] = [], Y: number[] = [];
let games = 0, draws = 0;
for (let i = 0; i < GAMES; i++) {
  const batch: Sample[] = [];
  const w = playGame(100000 + i, batch);
  if (w === null) { draws++; continue; }
  for (const s of batch) { X.push(...s.x); Y.push(s.side === w ? 1 : 0); }
  games++;
  if ((i + 1) % 1000 === 0) console.error(`  ${i + 1}/${GAMES} games, ${Y.length} samples`);
}

const n = Y.length, F = NUM_FEATURES;
const header = Buffer.alloc(8);
header.writeInt32LE(n, 0); header.writeInt32LE(F, 4);
writeFileSync(OUT, Buffer.concat([header, Buffer.from(new Float32Array(X).buffer), Buffer.from(new Float32Array(Y).buffer)]));
console.error(`done: ${games} decided, ${draws} draws, ${n} samples, F=${F}, wrote ${OUT}`);
