import type { Action, GameState, PlayerState, Side } from './types';
import { actingSide, reduce, curHp, effAtk, playCost, buyCost } from './engine';
import { cardPower } from './cardEval';
import { learnedValue } from './botValue';
import { hasPassive } from './cards';
import { safeGreedy, greedyStep } from './bot';
import { observationSample } from './botObservation';
import { botActions, actionChangesState } from './botActions';
import { forcedWin } from './botTactics';
export const TACTICS = { proof: true, targets: true, horizon: 4 };

export const SEARCH = {
  hard: { width: 8, samples: 2, turns: 2, finalists: 3, extraSamples: 2 },
  hell: { width: 12, samples: 3, turns: 2, finalists: 4, extraSamples: 8 },
};
export const VALUE = { hp: 1, attack: 1.7, health: 0.65, mana: 3.5, deck: 0.65, hand: 0.8, enchant: 0.55, learned: 0.6 };

function strength(g: GameState, p: PlayerState): number {
  let value = VALUE.hp * (Math.min(100, p.hp) + Math.log1p(Math.max(0, p.hp - 100)) * 10 + (p.shield ?? 0) * 0.8 + (p.dew ?? 0) * 2.5);
  value += Math.min(p.maxMana, 20) * VALUE.mana;
  for (const m of p.field) {
    if (m.hatch != null) { value += 3 + (m.dur ?? 1) * 2 + Math.max(0, (m.hatchTurns ?? 8) - m.hatch) * 2; continue; }
    const atk = Math.max(0, effAtk(p, m, g));
    value += atk * VALUE.attack + curHp(p, m) * VALUE.health + 2;
    if (m.directOnly) value += atk * 0.5;
    if (hasPassive(m, 'dual')) value += atk * 0.8;
    if (hasPassive(m, 'counter')) value += atk * 0.45;
    if (hasPassive(m, 'evade')) value += 2;
    if (m.aura || m.turnFx) value += Math.min(20, cardPower(m) * 0.22);
  }
  for (const e of p.enchants) value += Math.min(30, cardPower(e.card)) * VALUE.enchant;
  value += p.traps.length * 4;
  for (const q of p.quests ?? []) value += 2 + (q.progress / Math.max(1, q.card.quest?.target ?? 1)) * 6;
  const deck = [...p.deck, ...p.hand, ...p.discard];
  const quality = (c: typeof deck[number]): number => Math.max(0, Math.min(55, cardPower(c))) / (1 + Math.max(0, playCost(c, p) - p.maxMana) * 0.7);
  value += deck.reduce((sum, c) => sum + quality(c), 0) / Math.max(5, deck.length) * 5 * VALUE.deck;
  value += p.hand.reduce((sum, c) => sum + quality(c), 0) * VALUE.hand * 0.15;
  value -= (p.bleed ?? 0) * 2;
  return value;
}
export function positionValue(g: GameState, s: Side): number {
  if (g.over) return g.winner === s ? 1 : g.winner == null ? 0.5 : 0;
  const material = 1 / (1 + Math.exp(-(strength(g, g.players[s]) - strength(g, g.players[1 - s])) / 28));
  return material * (1 - VALUE.learned) + learnedValue(g, s) * VALUE.learned;
}

/** Compare complete own-turn / opponent-reply sequences under common random samples. */
export function searchDecide(g: GameState, level: 'hard' | 'hell', prove = true, onProgress?: (action: Action) => void): Action {
  if (prove && TACTICS.proof) { const win = forcedWin(g, level === 'hell' ? 900 : 350); if (win) return win; }
  const side = actingSide(g), cfg = SEARCH[level];
  // Hell retains Hard's move as its expert baseline. More breadth alone can
  // overfit a lucky hidden-card sample and make an otherwise strong move worse.
  const base = level === 'hell' ? searchDecide(g, 'hard', false, onProgress) : safeGreedy(g);
  // A completed lower-cost policy remains available if the worker hits its deadline.
  onProgress?.(base);
  const seenPlays = new Set<string>();
  const root = botActions(g).filter(a => {
    if (a.type !== 'play') return true;
    const card = g.players[g.cur].hand[a.idx];
    const signature = JSON.stringify({ ...card, uid: '' });
    if (seenPlays.has(signature)) return false;
    seenPlays.add(signature); return true;
  });
  if (root.length <= 1) return base;
  // Outcome-insensitive guesses do not deserve expensive rollouts.
  if (g.pending?.reason === 'gamblerGuess') return base;
  const key = (a: Action) => JSON.stringify(a);
  const baseKey = key(base);
  const firstSample = observationSample(g, side, 1);
  // Finish forced, deterministic face attacks without re-searching equivalent orders.
  if (!g.pending && !g.players[1 - side].field.length && !g.players[1 - side].traps.length && root.every(a => a.type === 'attack' || a.type === 'endTurn')) {
    for (const a of root) if (a.type === 'attack') {
      const next = reduce(firstSample, a).state;
      if (next.rng === firstSample.rng && next.players[side].hp >= firstSample.players[side].hp && next.players[1 - side].hp < firstSample.players[1 - side].hp) return a;
    }
  }
  const ranked = root.map(a => {
    const next = reduce(firstSample, a).state;
    const legal = actionChangesState(firstSample, next);
    let prior = positionValue(next, side);
    const p = g.players[g.cur];
    if (a.type === 'buyMarket' || a.type === 'buySupply') {
      const c = a.type === 'buyMarket' ? g.market[a.i] : p.supply[a.i];
      if (c) prior += Math.max(-0.08, Math.min(0.08, (cardPower(c) - buyCost(p, c) - 10) / 300));
    }
    if (key(a) === baseKey) prior += 0.08;
    return { a, legal, prior, winsNow: !g.players[1 - side].traps.length && next.over && next.winner === side && next.rng === firstSample.rng, sum: 0, n: 0 };
  }).filter(x => x.legal).sort((a, b) => b.prior - a.prior);
  const win = ranked.find(arm => arm.winsNow);
  if (win) return win.a;
  const arms = ranked.slice(0, cfg.width);
  const baseline = ranked.find(x => key(x.a) === baseKey);
  if (baseline && !arms.includes(baseline)) arms[arms.length - 1] = baseline;
  if (!arms.length) return base;
  for (let i = 0; i < cfg.samples; i++) {
    const sample = observationSample(g, side, i + 17);
    for (const arm of arms) { arm.sum += rollout(sample, arm.a, side, cfg.turns); arm.n++; }
  }
  arms.sort((a, b) => b.sum / b.n - a.sum / a.n);
  if (cfg.finalists) {
    const finalists = arms.slice(0, cfg.finalists);
    if (baseline && !finalists.includes(baseline)) finalists.push(baseline);
    // Re-evaluate finalists on the same deeper horizon; do not mix horizons.
    finalists.forEach(a => { a.sum = 0; a.n = 0; });
    for (let i = 0; i < cfg.extraSamples; i++) {
      const sample = observationSample(g, side, i + 101);
      for (const arm of finalists) { arm.sum += rollout(sample, arm.a, side, TACTICS.horizon); arm.n++; }
    }
    finalists.sort((a, b) => b.sum / b.n - a.sum / a.n);
    if (level === 'hell' && baseline && finalists[0].sum / finalists[0].n < baseline.sum / baseline.n + 0.02) return base;
    return finalists[0].a;
  }
  return arms[0].a;
}

function rollout(sample: GameState, action: Action, side: Side, turns: number): number {
  let st = reduce(sample, action).state;
  if (!actionChangesState(sample, st)) return -1;
  const endTurn = sample.turn + turns;
  for (let steps = 0; !st.over && st.turn < endTurn && steps < 120; steps++) {
    const next = tacticalStep(st).state;
    if (!actionChangesState(st, next)) break;
    st = next;
  }
  return positionValue(st, side);
}

/** Rollout opponents choose valuable targets instead of always hitting the first
 * permanent or the highest printed-cost card. Both seats use the same policy. */
export function tacticalStep(g: GameState): {action: Action; state: GameState} {
  const base = greedyStep(g);
  if (!TACTICS.targets || !g.pending || g.pending.reason === 'gamblerGuess') return base;
  const side = actingSide(g);
  let best = base, value = positionValue(base.state, side) + 0.002;
  const targets = new Set<string>();
  for (const action of botActions(g)) {
    if ((action.type === 'pick' || action.type === 'chooseTarget') && ['purge','recall','seek'].includes(g.pending.kind)) {
      const card = [...g.players[g.cur].hand,...g.players[g.cur].deck,...g.players[g.cur].discard].find(c => c.uid === action.uid);
      if (card) { const key = JSON.stringify({...card,uid:''}); if (targets.has(key)) continue; targets.add(key); }
    }
    if (JSON.stringify(action) === JSON.stringify(base.action)) continue;
    const state = reduce(g, action).state;
    if (!actionChangesState(g,state)) continue;
    const score = positionValue(state,side);
    if (score > value) { best = {action,state}; value = score; }
  }
  return best;
}
