import type { Action, GameState, PlayerState, Side } from './types';
import { actingSide, reduce, curHp, effAtk, playCost } from './engine';
import { cardPower } from './cardEval';
import { learnedValue } from './botValue';
import { resilience, matchupPlan, removalHits } from './botMatchup';
import { hasPassive } from './cards';
import { safeGreedy, greedyStep, TUNE } from './bot';
import { observationSample } from './botObservation';
import { botActions, actionChangesState } from './botActions';
import { purchaseEvaluator, publicInventory } from './botEconomy';
import { forcedWin, forcedWinPlan } from './botTactics';
import { lastingValue, recoveryEngine, recoveryPerTurn, unproductiveOpponentHeal } from './botStrategy';
export const TACTICS = { proof: true, targets: true, horizon: 4, replyNodes: 64 };

export const SEARCH = {
  normal: { width: 4, samples: 1, turns: 2, finalists: 0, extraSamples: 0 },
  hard: { width: 8, samples: 2, turns: 2, finalists: 3, extraSamples: 2 },
  hell: { width: 12, samples: 3, turns: 2, finalists: 4, extraSamples: 8 },
};
export const VALUE = { hp: 1, attack: 1.7, health: 0.65, mana: 3.5, deck: 0.65, hand: 0.8, enchant: 0.55, learned: 0.25 };

function strength(g: GameState, p: PlayerState): number {
  let value = VALUE.hp * (Math.min(100, p.hp) + Math.log1p(Math.max(0, p.hp - 100)) * 10 + (p.shield ?? 0) * 0.8 + (p.dew ?? 0) * 2.5);
  value += Math.min(p.maxMana, 20) * VALUE.mana;
  for (const m of p.field) {
    if (m.hatch != null) { value += 3 + (m.dur ?? 1) * 2 + Math.max(0, (m.hatchTurns ?? 8) - m.hatch) * 2; continue; }
    const atk = Math.max(0, effAtk(p, m, g));
    value += atk * VALUE.attack + curHp(p, m) * VALUE.health + (atk>0 || m.aura || m.turnFx ? 2 : 0);
    if (m.directOnly) value += atk * 0.5;
    if (hasPassive(m, 'dual')) value += atk * 0.8;
    if (hasPassive(m, 'counter')) value += atk * 0.45;
    if (hasPassive(m, 'evade')) value += 2;
    value += resilience(g,p,m);
    if (m.aura || m.turnFx) value += Math.min(20, cardPower(m) * 0.22);
  }
  for (const e of p.enchants) value += Math.min(30, cardPower(e.card)) * VALUE.enchant;
  value += p.traps.length * 4;
  for (const q of p.quests ?? []) value += 2 + (q.progress / Math.max(1, q.card.quest?.target ?? 1)) * 6;
  const deck = [...p.deck, ...p.hand, ...p.discard];
  const evaluate = purchaseEvaluator(g, p, TUNE);
  const power = (c: typeof deck[number]): number => {
    const v = evaluate(c);
    // Owned material needs its usable build/matchup value, not the marginal
    // cost, redundancy or buy-delay penalty for adding another copy.
    return Math.max(0, v.base + v.synergy + v.matchup + v.readiness);
  };
  const quality = (c: typeof deck[number]): number => Math.max(0, Math.min(55, power(c))) / (1 + Math.max(0, playCost(c, p) - p.maxMana) * 0.7);
  value += deck.reduce((sum, c) => sum + quality(c), 0) / Math.max(5, deck.length) * 5 * VALUE.deck;
  value += p.hand.reduce((sum, c) => sum + quality(c), 0) * VALUE.hand * 0.15;
  value -= (p.bleed ?? 0) * 2;
  value += lastingValue(g, p);
  return value;
}
export function positionValue(g: GameState, s: Side): number {
  if (g.over) return g.winner === s ? 1 : g.winner == null ? 0.5 : 0;
  const material = 1 / (1 + Math.exp(-(strength(g, g.players[s]) - strength(g, g.players[1 - s])) / 28));
  return material * (1 - VALUE.learned) + learnedValue(g, s) * VALUE.learned;
}

/** Compare complete own-turn / opponent-reply sequences under common random samples. */
export function searchDecide(g: GameState, level: 'normal' | 'hard' | 'hell', prove = true, onProgress?: (action: Action) => void): Action {
  if (prove && TACTICS.proof) { const win = forcedWin(g, level === 'hell' ? 1400 : level === 'hard' ? 550 : 160); if (win) return win; }
  const side = actingSide(g), cfg = SEARCH[level];
  // Preserve the greedy policy's public, currently affordable escape from a
  // stalled board. Sampled refreshes must not spend its reserved purchase mana.
  const policy = safeGreedy(g), owner = g.players[side], opponent = g.players[1-side];
  if (policy.type === 'buyMarket' || policy.type === 'buySupply' || policy.type === 'play') {
    // An answer already in hand needs its casting mana just as a market
    // answer needs its purchase mana. Speculative refreshes must not spend it.
    const card = policy.type === 'play' ? owner.hand[policy.idx] : policy.type === 'buyMarket' ? g.market[policy.i] : owner.supply[policy.i];
    const plan = matchupPlan(g, owner, publicInventory(opponent));
    // Reserve an available Dew wipe against a large public recovery engine.
    // Desertification is now permanent and symmetric: this shortcut applies
    // only when our side has no active recovery engine to suppress.
    if (policy.type === 'play' && card?.act === 'desertification'
        && recoveryPerTurn(g, opponent) >= 4 && recoveryPerTurn(g, owner) === 0
        && ![...owner.field, ...owner.enchants.map(e => e.card)].some(c => recoveryEngine(c) > 0)) return policy;
    if (card && ((plan.blocked && (card.act === 'destroyEnch' || card.id === 'DISARM3' || card.id === 'ADVANCE'))
        || plan.walls.some(m => removalHits(g, opponent, card, m)))) return policy;
  }
  // Hell retains Hard's move as its expert baseline. More breadth alone can
  // overfit a lucky hidden-card sample and make an otherwise strong move worse.
  const base = level === 'hell' ? searchDecide(g, 'hard', false, onProgress) : policy;
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
  const purchase = purchaseEvaluator(g, g.players[g.cur], TUNE);
  const ranked = root.map(a => {
    const next = reduce(firstSample, a).state;
    let legal = actionChangesState(firstSample, next) && !unproductiveOpponentHeal(firstSample,a,next);
    let prior = positionValue(next, side);
    const p = g.players[g.cur];
    if (a.type === 'buyMarket' || a.type === 'buySupply') {
      const c = a.type === 'buyMarket' ? g.market[a.i] : p.supply[a.i];
      if (c) {
        const margin=purchase(c,a.type==='buyMarket'?a.i:undefined).margin;
        prior += Math.max(-0.08,Math.min(0.08,margin/150));
        // Uncastable speculation must not gain deck-material points merely by
        // being purchased. Immediate engine-proven wins retain their priority.
        if(margin<=0 && !(next.over&&next.winner===side))legal=false;
      }
    }
    if (key(a) === baseKey) prior += 0.08;
    return { a, legal, prior, winsNow: !g.players[1 - side].traps.length && next.over && next.winner === side && next.rng === firstSample.rng, sum: 0, n: 0, worst: 1 };
  }).filter(x => x.legal).sort((a, b) => b.prior - a.prior);
  const win = ranked.find(arm => arm.winsNow);
  if (win) return win.a;
  const arms = ranked.slice(0, cfg.width);
  const baseline = ranked.find(x => key(x.a) === baseKey);
  if (baseline && !arms.includes(baseline)) arms[arms.length - 1] = baseline;
  if (!arms.length) return base;
  const score=(arm: typeof arms[number]):number=>.85*arm.sum/arm.n+.15*arm.worst;
  const record=(arm:typeof arms[number],v:number):void=>{arm.sum+=v;arm.n++;arm.worst=Math.min(arm.worst,v);};
  for (let i = 0; i < cfg.samples; i++) {
    const sample = observationSample(g, side, i + 17);
    for (const arm of arms) { record(arm,rollout(sample, arm.a, side, cfg.turns)); }
  }
  arms.sort((a, b) => score(b) - score(a));
  // Publish completed comparisons so a busy device keeps the searched move
  // if the worker deadline arrives during the deeper finalist evaluation.
  if (level === 'hard') onProgress?.(arms[0].a);
  if (cfg.finalists) {
    const finalists = arms.slice(0, cfg.finalists);
    if (baseline && !finalists.includes(baseline)) finalists.push(baseline);
    // Re-evaluate finalists on the same deeper horizon; do not mix horizons.
    finalists.forEach(a => { a.sum = 0; a.n = 0; a.worst=1; });
    for (let i = 0; i < cfg.extraSamples; i++) {
      const sample = observationSample(g, side, i + 101);
      for (const arm of finalists) { record(arm,rollout(sample, arm.a, side, TACTICS.horizon, level==='hell'?3:2, level==='hell'?6:4)); }
      if (onProgress) {
        const best = finalists.reduce((a, b) => score(b) > score(a) ? b : a);
        onProgress(level === 'hell' && baseline && score(best) < score(baseline) + 0.01 ? base : best.a);
      }
    }
    finalists.sort((a, b) => score(b) - score(a));
    if (level === 'hell' && baseline && score(finalists[0]) < score(baseline) + 0.01) return base;
    return finalists[0].a;
  }
  return arms[0].a;
}

export function rollout(sample: GameState, action: Action, side: Side, turns: number, replyWidth = 0, continuationTurns = 0): number {
  let st = reduce(sample, action).state;
  if (!actionChangesState(sample, st)) return -1;
  const endTurn = sample.turn + turns;
  let checkedTurn = -1, plannedTurn=-1;
  for (let steps = 0; !st.over && st.turn < endTurn && steps < 120; steps++) {
    // Both seats can find lethal combinations rather than wasting their mana
    // on a greedy summon before a winning buff/burn. This is a prediction on
    // the already-sampled observation, never proof about a real hidden hand.
    // Include a pending root target: choosing it greedily can already throw
    // away the winning line. Opponent-owned reactions are not proof nodes.
    if (actingSide(st) === st.cur && checkedTurn !== st.turn) {
      checkedTurn = st.turn;
      const plan = forcedWinPlan(st, TACTICS.replyNodes);
      if (plan) {
        for (const move of plan) st = reduce(st, move).state;
        return positionValue(st, side);
      }
    }
    // At most one sequence comparison per side/turn. The reply is selected
    // for that side, so our branch must survive a purposeful opposing turn.
    if (replyWidth && !st.pending && plannedTurn!==st.turn) {
      plannedTurn=st.turn;
      st=plannedContinuation(st,replyWidth);
      continue;
    }
    const next = tacticalStep(st).state;
    if (!actionChangesState(st, next)) break;
    st = next;
  }
  const near = positionValue(st, side);
  if (!continuationTurns || st.over) return near;
  // Delayed engines need more than two own turns to demonstrate their payoff.
  // Extend each paired hypothetical world cheaply, without further branching.
  // Keep the near-term estimate as well: distant sampled markets are uncertain.
  const strategicEnd = sample.turn + turns + continuationTurns;
  for(let steps=0;!st.over&&st.turn<strategicEnd&&steps<180;steps++) {
    const next=greedyStep(st).state;
    if(!actionChangesState(st,next))break;
    st=next;
  }
  return near*.35 + positionValue(st,side)*.65;
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


/** Compare complete continuations, not just the material after one summon.
 * One alternative first move followed by target-aware play can preserve mana
 * for an answer, set an engine before its payoff, or decline an overextension.
 * This runs inside sampled worlds only and never returns a hidden-state plan.
 */
function plannedContinuation(g: GameState, width: number): GameState {
  const side=g.cur, base=greedyStep(g);
  const candidates=[base], purchase=purchaseEvaluator(g,g.players[side],TUNE);
  const seen=new Set<string>();
  for(const action of botActions(g)) {
    if (JSON.stringify(action)===JSON.stringify(base.action)) continue;
    if(action.type==='play') {
      const c=g.players[side].hand[action.idx];
      if(seen.has(c.id))continue;seen.add(c.id);
    }
    // Refresh sampling is already covered by the main search, not a reason to
    // pick a lucky single-roll outcome in the tactical reply model.
    if(action.type==='refresh')continue;
    if(action.type==='buyMarket'||action.type==='buySupply'){const c=action.type==='buyMarket'?g.market[action.i]:g.players[side].supply[action.i];if(c&&purchase(c,action.type==='buyMarket'?action.i:undefined).margin<=0)continue;}
    const state=reduce(g,action).state;
    if(actionChangesState(g,state)&&!unproductiveOpponentHeal(g,action,state))candidates.push({action,state});
  }
  const ranked=candidates.slice(1).map(step=>({step,value:positionValue(step.state,side)}))
    .sort((a,b)=>b.value-a.value).slice(0,width-1).map(x=>x.step);
  let best=base.state, bestValue=-Infinity;
  for(const step of [base,...ranked]) {
    let st=step.state;
    for(let n=0;n<36&&!st.over&&st.turn===g.turn;n++) {
      const next=tacticalStep(st).state;
      if(!actionChangesState(st,next))break;
      st=next;
    }
    const value=positionValue(st,side);
    if(value>bestValue){best=st;bestValue=value;}
  }
  return best;
}
