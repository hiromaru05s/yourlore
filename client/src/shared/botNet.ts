// ============================================================
// LORE — value network for the HELL bot.
//   netEval(g, s)  → P(side s eventually wins), a learned position evaluator
//   determinize(g, s) → replace hidden info with a public-consistent sample
// The net is a small feature-standardized MLP (see botNetWeights.ts), trained on
// self-play outcomes. It replaces the old stale linear eval so that the rollout
// search in bot.ts (hell tier) actually improves on the greedy policy.
// Inference is a few hundred multiply-adds — microseconds, no dependencies.
// ============================================================
import type { GameState, Side } from "./types";
import { features } from "./botFeatures";
import { NET_WEIGHTS as W } from "./botNetWeights";

const relu = (z: number): number => (z > 0 ? z : 0);

/** Learned value: probability that side `s` wins from this position (0..1). */
export function netEval(g: GameState, s: Side): number {
  const raw = features(g, s);
  const F = W.F, H1 = W.H1, H2 = W.H2;
  const x = new Float64Array(F);
  for (let j = 0; j < F; j++) x[j] = (raw[j] - W.mean[j]) / W.std[j];
  const h1 = new Float64Array(H1);
  for (let i = 0; i < H1; i++) { let a = W.b1[i]; const o = i * F; for (let j = 0; j < F; j++) a += W.W1[o + j] * x[j]; h1[i] = relu(a); }
  const h2 = new Float64Array(H2);
  for (let i = 0; i < H2; i++) { let a = W.b2[i]; const o = i * H1; for (let j = 0; j < H1; j++) a += W.W2[o + j] * h1[j]; h2[i] = relu(a); }
  let a = W.b3[0];
  for (let j = 0; j < H2; j++) a += W.W3[j] * h2[j];
  return 1 / (1 + Math.exp(-a));
}

// ---- fair play: imperfect-information search must NOT read hidden state. Before
// simulating, replace everything side s couldn't legitimately know with a random
// sample consistent with PUBLIC information (deck order, opponent hand/deck/traps).
export function determinize(g: GameState, s: Side): void {
  let seed = (g.rng ^ 0x51f15eed) >>> 0;
  const rnd = (): number => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const shuf = <T,>(arr: T[]): void => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
  const me = g.players[s], op = g.players[1 - s];
  shuf(me.deck);
  const pool = [...op.hand, ...op.deck, ...op.traps.map((t) => t.card)];
  shuf(pool);
  for (let i = 0; i < op.traps.length; i++) {
    const k = pool.findIndex((c) => c.t === "trap");
    if (k < 0) break;
    op.traps[i] = { ...op.traps[i], card: pool.splice(k, 1)[0] };
  }
  const handN = op.hand.length;
  op.hand = pool.slice(0, handN);
  op.deck = pool.slice(handN);
}
