import { cloneGameState } from './cloneGameState';
import { DB, STARTERS, DECK_POOL, BUYABLE_POOL } from './cards';
import { BOT_DECKS, BOT_ELITE_DECKS, BOT_HELL_DECKS } from './botDecks';
import type { CardInst, GameState, Side } from './types';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
const canonical = (a: CardInst, b: CardInst): number => a.id.localeCompare(b.id) || a.uid.localeCompare(b.uid);
const starterIds = new Set(['STARTER_MANA', ...DECK_POOL]);
const hypotheses = [
  ['STARTER_MANA', ...Array<string>(6).fill('STARTER_TRASH'), 'STARTER_CHEST', 'STARTER_CHEST'],
  ...[...BOT_DECKS, ...BOT_ELITE_DECKS, ...BOT_HELL_DECKS].map(d => ['STARTER_MANA', ...d.cards]),
];
const trapIds = BUYABLE_POOL.filter(id => DB[id].t === 'trap');

/** Build hypotheses from public reveal history, never from the real hidden inventory.
 * This matches protocol.redactFor's boundaries, including explicit hand/deck inspection.
 * Stable trap-slot UIDs remain addressable; hidden hand/deck identities are synthetic.
 */
export function observationSample(g: GameState, side: Side, sample: number): GameState {
  const st = cloneGameState(g), me = st.players[side], op = st.players[1 - side];
  let seed = hash(JSON.stringify([side, st.turn, me.hp, op.hp, me.mana, me.hand.map(c => c.uid), me.field.map(c => c.uid), op.field.map(c => c.uid), sample])) || 1;
  const rnd = (): number => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const shuffle = <T,>(a: T[]): void => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } };
  me.deck.sort(canonical); shuffle(me.deck);
  const reveal = st.pending?.kind === 'cardChoice' && (st.pending.owner ?? st.cur) === side;
  const revealDeck = reveal && ['Q_CHEAT', 'CREATION'].includes(st.pending!.reason);
  const revealHand = reveal && st.pending!.reason === 'HIGH_ELF_HAND';
  const publicTraps = op.traps.filter(t => t.card.react === 'infoDealer' && t.cnt != null);
  const visible = [...op.discard, ...op.field, ...op.enchants.map(e => e.card), ...(op.quests ?? []).map(q => q.card), ...(op.removed ?? []), ...op.exile.map(e => e.card), ...publicTraps.map(t => t.card), ...(revealDeck ? op.deck : []), ...(revealHand ? op.hand : [])];
  const known = new Map((op.revealedCards ?? []).map(c => [c.uid, c.id]));
  visible.filter(c => !(c as CardInst & {token?:boolean}).token).forEach(c => known.set(c.uid, c.id));
  op.collection = [...known.values()];
  const publicUids = new Set(visible.map(c => c.uid));
  const hiddenCount = (revealHand ? 0 : op.hand.length) + (revealDeck ? 0 : op.deck.length) + op.traps.length - publicTraps.length;
  const observed = [...known.values()].filter(id => starterIds.has(id));
  const alternatives = hypotheses.map(deck => {
    const left = [...deck]; let misses = 0;
    for (const id of observed) { const i = left.indexOf(id); if (i >= 0) left.splice(i, 1); else misses++; }
    return { left, weight: Math.exp(-misses * 1.5) };
  });
  let roll = rnd() * alternatives.reduce((s, a) => s + a.weight, 0);
  let inferred = alternatives[0].left;
  for (const a of alternatives) { roll -= a.weight; if (roll <= 0) { inferred = a.left; break; } }
  shuffle(inferred);
  let serial = 0;
  const instance = (id: string): CardInst => ({ ...(DB[id] ?? STARTERS[id] ?? STARTERS.STARTER_TRASH), uid: `hypothesis-${side}-${serial++}` });
  const pool = [...known.entries()].filter(([uid]) => !publicUids.has(uid)).map(([, id]) => instance(id));
  shuffle(pool);
  if (pool.length > hiddenCount) pool.length = hiddenCount;
  while (pool.length < hiddenCount) pool.push(instance(inferred.pop() ?? DECK_POOL[Math.floor(rnd() * DECK_POOL.length)]));
  shuffle(pool);
  for (const trap of op.traps) {
    if (publicTraps.includes(trap)) continue;
    const uid = trap.card.uid;
    const i = pool.findIndex(c => c.t === 'trap');
    // A face-down slot itself is public evidence that a trap exists.
    const card = i >= 0 ? pool.splice(i, 1)[0] : instance(trapIds[Math.floor(rnd() * trapIds.length)]);
    if (i < 0) pool.pop();
    trap.card = { ...card, uid };
    delete trap.cnt;
    if (card.react === 'doomsday') trap.cnt = 1 + Math.floor(rnd() * 3);
  }
  if (revealDeck) { op.deck.sort(canonical); shuffle(op.deck); op.hand = pool; }
  else if (revealHand) op.deck = pool;
  else { const n = op.hand.length; op.hand = pool.slice(0, n); op.deck = pool.slice(n); }
  // Silvermoon Cannon exposes the distinct IDs in the enemy deck, not their
  // multiplicities or order. Every offered choice must exist in the hypothesis.
  if (st.pending?.reason === 'exileOppDeck' && (st.pending.owner ?? st.cur) === side) {
    const ids = [...new Set((st.pending.data?.ids as string[] ?? []).filter(id => DB[id] || STARTERS[id]))];
    if (ids.length && ids.length <= op.deck.length) {
      const remaining = op.deck.filter(c => ids.includes(c.id));
      op.deck = ids.map(id => { const i = remaining.findIndex(c => c.id === id); return i < 0 ? instance(id) : remaining.splice(i, 1)[0]; });
      while (op.deck.length < g.players[1 - side].deck.length) op.deck.push(remaining.pop() ?? instance(ids[Math.floor(rnd() * ids.length)]));
      shuffle(op.deck);
    }
  }
  if (st.cur === side) op.supply = op.supply.map((c, i) => c ? { ...instance(BUYABLE_POOL[Math.floor(rnd() * BUYABLE_POOL.length)]), uid: `hypothesis-supply-${side}-${i}` } : null);
  op.supplyHist = [];
  delete op.botTune;
  st.rng = (Math.floor(rnd() * 4294967296) || 1) >>> 0;
  if (st._wheelSnap) st._wheelSnap.state = observationSample(st._wheelSnap.state as GameState, side, sample + 1009);
  return st;
}
