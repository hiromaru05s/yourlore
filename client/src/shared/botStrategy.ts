import type { CardDef, GameState, PlayerState } from './types';
import { cardPower } from './cardEval';
import { DB, hasPassive } from './cards';

/** Sustained recovery matters beyond the short rollout horizon. These are
 * policy estimates, never changes to card effects or access to hidden cards. */
export function recoveryEngine(c: CardDef): number {
  if (c.aura === 'shieldDew') return (c.val2 ?? 0) * 4;
  if (c.ench === 'worldCare') return 5;
  if (c.ench === 'worldHeart') return 10;
  if (c.ench === 'healSummon') return (c.val2 ?? 0) * 2;
  if (c.turnFx === 'turnHeal') return c.val ?? 0;
  if (c.turnFx === 'payDefHeal') return c.val2 ?? 0;
  return 0;
}

export function recoveryPerTurn(g: GameState, p: PlayerState): number {
  const o = g.players[p === g.players[0] ? 1 : 0];
  const multiplier = 2 ** (g.players.reduce((n, q) => n + q.field.filter(m => m.id === 'ELF').length, 0)
    - o.field.filter(m => m.id === 'HIGH_ELF').length);
  return (p.dew ?? 0) * 2 ** p.field.filter(m => m.id === 'WORLD_TREE').length * multiplier;
}

/** Read only the opponent's public zones/history and the shared market.
 * An available counter is a risk, not a card already in the opponent's hand. */
export function recoveryThreat(g: GameState, p: PlayerState): number {
  const o = g.players[p === g.players[0] ? 1 : 0];
  const active = o.field.reduce((n, c) => n + recoveryEngine(c), 0)
    + o.enchants.reduce((n, e) => n + recoveryEngine(e.card), 0);
  const available = Math.max(0, ...g.market.map((c, i) =>
    (g.marketStock?.[i] ?? 3) > 0 && c.cost <= o.maxMana + 2 ? recoveryEngine(c) * .6 : 0));
  const revealed = Math.max(0, ...(o.revealedCards ?? []).map(c => DB[c.id] ? recoveryEngine(DB[c.id]) * .75 : 0));
  return Math.min(24, Math.max(active, available, revealed) + recoveryPerTurn(g, o) * 1.5);
}

/** Contextual deck development: stop adding chip damage into an accessible
 * recovery engine, and acquire removal, scaling bodies and our own engine.
 * Duplicate answers have diminishing value; don't fill the deck with tech. */
function adjustmentEvaluator(g: GameState, p: PlayerState): (c: CardDef) => number {
  const o = g.players[p === g.players[0] ? 1 : 0];
  const threat = recoveryThreat(g, p);
  const owned = [...p.hand, ...p.deck, ...p.discard, ...p.field, ...p.enchants.map(e => e.card)];
  const counts = new Map<string, number>();
  for (const c of owned) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  const activeRecovery = o.field.some(m => recoveryEngine(m) > 0);
  const shieldDew = owned.reduce((n, x) => n + (x.aura === 'shieldDew' ? (x.val2 ?? 0) : 0), 0);
  return c => {
    const copies = counts.get(c.id) ?? 0;
    let bonus = 0;
    if (c.act === 'destroyMon') {
      const eligible = (m: CardDef): boolean => m.t === 'mon' && recoveryEngine(m) > 0 && !hasPassive(m, 'aura')
        && (!c.cap || m.cost <= c.cap)
        && (c.id !== 'RUNE1' || m.cost >= 5)
        && (!['WALLBREAK1', 'WALLBREAK2'].includes(c.id) || (m.atk ?? 0) <= 2)
        && (c.id !== 'SNIPE1' || (m.def ?? 0) <= 3)
        && (c.id !== 'SNIPE2' || (m.def ?? 0) <= 2);
      const targets = o.field.filter(eligible);
      const future = g.market.some((m, i) => eligible(m) && (g.marketStock?.[i] ?? 3) > 0);
      bonus += targets.length ? 18 : future ? threat * 1.5 : 0;
      // These sweep both fields. Buying an answer that destroys our own board
      // is not equivalent to acquiring a selective removal spell.
      if (c.id === 'WALLBREAK2') bonus -= p.field.filter(m => (m.atk ?? 0) + (m.atkMod ?? 0) <= 2).length * 4;
      if (c.id === 'SNIPE2') bonus -= p.field.filter(m => (m.def ?? 0) + (m.defMod ?? 0) - (m.dmg ?? 0) <= 2).length * 4;
    }
    if (c.act === 'desertification') bonus += Math.min(30, recoveryPerTurn(g, o) * 4) + threat * .5;
    if (c.act === 'armorBreak') bonus += Math.min(9, o.shield ?? 0) * .7;
    if (c.act === 'spearShield') bonus += Math.min(20, o.shield ?? 0) * .6;
    if (c.act === 'destroyEnch' || c.id === 'COUNTERCALC') {
      bonus += o.enchants.some(e => recoveryEngine(e.card) > 0) ? 16 : threat * .35;
    }
    // Development must be able to contest the blocker, not merely survive longer.
    if (c.t === 'mon' && !c.directOnly && (c.atk ?? 0) >= 4 && !c.summonReq) bonus += threat * .65;
    if (recoveryEngine(c) > 0) bonus += Math.min(9, threat);
    // Shield is also a renewable Dew source once a Priest is part of our
    // engine. Without this, both the bot and its simulated opponent ignore
    // cheap shield purchases even after acquiring the payoff monster.
    const grantsShield = c.onSummon === 'shield' || c.onSummon === 'armorer'
      || c.act === 'golemShield' || c.act === 'cullShield';
    if (grantsShield) bonus += Math.min(24, shieldDew * 5);
    bonus /= 1 + copies * 2;
    if (c.id === 'FLAME' || c.id === 'AMBUSH' || (c.act === 'dmg' && (c.val ?? 0) <= 4)) bonus -= threat * .7;
    // Ghost gains ATK on healing, but each healing action also deals 2 self damage.
    // Do not count that growth as free scaling in a persistent recovery matchup.
    if (c.id === 'GHOST') bonus -= Math.min(8, threat) + (activeRecovery ? 2 : 0);
    return bonus;
  };
}

export function strategicAdjustment(g: GameState, p: PlayerState, c: CardDef): number {
  return adjustmentEvaluator(g, p)(c);
}

/** Reuse public context within one position; don't rescan both decks per card. */
export function strategicPowerEvaluator(g: GameState, p: PlayerState): (c: CardDef) => number {
  const adjustment = adjustmentEvaluator(g, p);
  return c => Math.max(0, cardPower(c) + adjustment(c));
}

export function strategicPower(g: GameState, p: PlayerState, c: CardDef): number {
  return strategicPowerEvaluator(g, p)(c);
}

/** Extra field value for engines that a four-half-turn search cannot amortize. */
export function lastingValue(g: GameState, p: PlayerState): number {
  const o = g.players[p === g.players[0] ? 1 : 0];
  const recovery = recoveryPerTurn(g, p);
  return Math.min(60, recovery * 4) + p.field.reduce((n, c) => n + recoveryEngine(c), 0)
    + p.enchants.reduce((n, e) => n + recoveryEngine(e.card), 0)
    - p.field.filter(m => m.id === 'GHOST').length * (recoveryPerTurn(g, o) > 0 ? 6 : 0);
}
