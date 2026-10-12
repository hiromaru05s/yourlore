import type { Action, GameState } from './types';
import { effectChoices, monsterCanAttack, playBlockReason, playCost, purchaseAllowed, buyCost, freeBuyBlocked } from './engine';

/** Bound recyclable draw/tutor chains so the bot eventually commits its board.
 * This is a thinking/play policy limit; the authoritative card rules stay unchanged.
 */
export function withinBotTurnBudget(g: GameState, a: Action): boolean {
  if (a.type !== 'play') return true;
  const p = g.players[g.cur], c = p.hand[a.idx];
  return !c || !['draw', 'seek', 'recall'].includes(c.act ?? '') || (p.usesTurn[c.id] ?? 0) < 12;
}

/** Enumerate choices broadly; the reducer is the final authority on target constraints. */
export function botActions(g: GameState): Action[] {
  const p = g.players[g.cur], o = g.players[1 - g.cur], q = g.pending;
  const out: Action[] = [];
  if (q) {
    const pick = (uid: string | null): void => { out.push({ type: q.kind === 'myMon' || q.kind === 'oppMon' ? 'chooseTarget' : 'pick', uid }); };
    if (q.kind === 'cardChoice') effectChoices(g).forEach(c => pick(c.uid));
    else if (q.kind === 'myMon') p.field.forEach(c => pick(c.uid));
    else if (q.kind === 'oppMon') {
      o.field.forEach(c => pick(c.uid));
      if (q.data?.anySide) p.field.forEach(c => pick(c.uid));
    } else if (q.kind === 'seek') p.deck.forEach(c => pick(c.uid));
    else if (q.kind === 'recall') p.discard.filter(c => c.uid !== q.data?.exclude).forEach(c => pick(c.uid));
    else if (q.kind === 'purge') (q.data?.zone === 'hand' ? p.hand : q.data?.zone === 'discard' ? p.discard : [...p.deck, ...p.discard]).forEach(c => pick(c.uid));
    else if (q.kind === 'oppRmz') (o.removed ?? []).forEach(c => pick(c.uid));
    else if (q.kind === 'oppBoard') {
      for (const pl of [o, p]) {
        if (!q.data?.noMon && !q.data?.trapOnly && !q.data?.enchOnly) pl.field.forEach(c => pick(c.uid));
        if (!q.data?.enchOnly) pl.traps.forEach(t => pick(t.card.uid));
        if (!q.data?.trapOnly) pl.enchants.forEach(e => pick(e.card.uid));
      }
    } else if (q.kind === 'giantShop') {
      const ids = q.reason === 'gamblerGuess' ? ['3'] : q.reason === 'nlGrant' ? ['ambush', 'evade'] : (q.data?.ids as string[] ?? []);
      ids.forEach(pick);
    } else if (q.kind === 'reroll') pick('re');
    // Cancelling an already-started attack can loop attack -> cancel forever.
    if ((q.allowCancel && q.reason !== 'attack') || out.length === 0) pick(null);
  } else {
    p.hand.forEach((c, idx) => { if (!c.quick && playCost(c, p) <= p.mana && !playBlockReason(g, g.cur, c)) out.push({ type: 'play', idx }); });
    p.field.forEach(m => { if (monsterCanAttack(g, p, m)) out.push({ type: 'attack', uid: m.uid }); });
    for (const [pool, type] of [[p.supply, 'buySupply'], [g.market, 'buyMarket']] as const) pool.forEach((c, i) => {
      if (c && buyCost(p, c) <= p.mana && !freeBuyBlocked(p, c) && purchaseAllowed(g, p, c)) out.push({ type, i });
    });
    if (!p.refreshBlockTurn && (p.mana >= 1 || (p.refreshTokens ?? 0) > 0)) out.push({ type: 'refresh' });
    out.push({ type: 'endTurn' });
  }
  const seen = new Set<string>();
  return out.filter(a => { if (!withinBotTurnBudget(g, a)) return false; const key = JSON.stringify(a); if (seen.has(key)) return false; seen.add(key); return true; });
}

/** Reducers clone pending objects even on refusal, so reference inequality is unsafe. */
function same(a: unknown, b: unknown, key = '', counter = false): boolean {
  // Engine telemetry can increase forever in a free draw/reshuffle of the same
  // card. All current rule thresholds here are <=5. Beyond 16, counters alone
  // are not progress; real resource, quest, field and zone changes still count.
  if (typeof a === 'number' && typeof b === 'number' && (counter || ['playsTurn', 'spellsCastTurn', 'extraDraw'].includes(key))) return Math.min(a, 16) === Math.min(b, 16);
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  // Hand/discard ordering is cosmetic; deck order is hidden. Cycling the same
  // cards through a free draw must not masquerade as new strategic material.
  if (['hand', 'deck', 'discard'].includes(key) && Array.isArray(a) && Array.isArray(b)) {
    const byUid = (x: {uid:string}, y: {uid:string}) => x.uid.localeCompare(y.uid);
    return same([...a].sort(byUid), [...b].sort(byUid), 'cards');
  }
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  const keys = Object.keys(x).filter(k => k !== "revealedCards");
  if (keys.length !== Object.keys(y).filter(k => k !== "revealedCards").length) return false;
  return keys.every(k => same(x[k], y[k], k, key === 'uses' || key === 'usesTurn'));
}
export function actionChangesState(a: GameState, b: GameState): boolean {
  if (a.cur !== b.cur || a.turn !== b.turn || a.over !== b.over || !same(a.pending, b.pending)) return true;
  // Most accepted moves change one of these small fields. Avoid walking every
  // cloned card's multilingual definition before reaching the acting player.
  // The exhaustive comparison remains the fallback; these checks only prove
  // differences that it would also find (including the same counter saturation).
  for (const side of [0, 1] as const) {
    const x = a.players[side], y = b.players[side];
    for (const key of ['hp', 'mana', 'maxMana', 'shield', 'dew'] as const) if (x[key] !== y[key]) return true;
    for (const key of ['hand', 'deck', 'discard', 'field', 'enchants', 'traps', 'removed', 'quests'] as const) if (x[key]?.length !== y[key]?.length) return true;
    for (const key of ['playsTurn', 'spellsCastTurn'] as const) if (Math.min(x[key] ?? 0, 16) !== Math.min(y[key] ?? 0, 16)) return true;
    if (!same(x.usesTurn, y.usesTurn, 'usesTurn')) return true;
    for (let i = 0; i < x.field.length; i++) {
      for (const key of ['uid', 'dmg', 'exhausted', 'tempAtk', 'atkMod', 'defMod', 'attacksUsed', 'gcount', 'hatch', 'dur'] as const) if (x.field[i][key] !== y.field[i][key]) return true;
    }
  }
  return !same(a.players, b.players) || !same(a.marketStock, b.marketStock);
}
