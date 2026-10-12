import type { Action, GameState } from './types';
import { actingSide, effAtk, monsterCanAttack, reduce } from './engine';
import { botActions, actionChangesState } from './botActions';

/** A bounded same-turn proof search. Unknown draws, dice, face-down traps and
 * opponent decisions cannot be used as evidence for a forced win. */
export function forcedWin(g: GameState, nodeLimit: number): Action | undefined {
  const side = actingSide(g), other = 1 - side;
  if (side !== g.cur || g.players[other].traps.length) return;
  const p = g.players[side], o = g.players[other];
  // Only a scheduling heuristic: the reducer, not this estimate, proves a win.
  const pressure = p.field.filter(m => monsterCanAttack(g, p, m)).reduce((n, m) => n + Math.max(0, effAtk(p, m, g)) * 2, 0)
    + p.hand.reduce((n, c) => n + (c.t === 'mon' ? (c.atk ?? 0) * 2 : c.act?.includes('buff') ? 6 * p.field.length : (c.val ?? 0) + 8), 0);
  if (pressure < o.hp + (o.shield ?? 0)) return;
  let nodes = 0;
  const visited = new Map<string, number>();
  const walk = (st: GameState, depth: number): Action[] | undefined => {
    if (st.over) return st.winner === side ? [] : undefined;
    if (st.cur !== side || actingSide(st) !== side || depth <= 0 || nodes >= nodeLimit) return;
    // Include all mutable player attributes; omit only text and telemetry.
    const key = JSON.stringify([st.pending, st.players], (k, v) => ['name','nameJa','nameEn','text','textJa','textEn','revealedCards'].includes(k) ? undefined : v);
    if ((visited.get(key) ?? -1) >= depth) return;
    visited.set(key, depth);
    const seen = new Set<string>();
    const children: {a: Action; next: GameState; rank: number}[] = [];
    for (const a of botActions(st)) {
      if (a.type === 'endTurn' || a.type === 'refresh' || a.type === 'buyMarket' || a.type === 'buySupply') continue;
      if (a.type === 'play') {
        const signature = JSON.stringify({...st.players[side].hand[a.idx],uid:''});
        if (seen.has(signature)) continue;
        seen.add(signature);
      }
      if (nodes++ >= nodeLimit) break;
      const next = reduce(st, a).state;
      if (next.rng !== st.rng || !actionChangesState(st, next)) continue;
      // Our deck order is sampled too. A hypothetical future draw is not proof.
      if (JSON.stringify(next.players[side].deck) !== JSON.stringify(st.players[side].deck)) continue;
      const before = st.players[other], after = next.players[other];
      // Never prove a win using the sampled contents of a private zone.
      if (JSON.stringify(before.hand) !== JSON.stringify(after.hand) || JSON.stringify(before.deck) !== JSON.stringify(after.deck)) continue;
      if (next.over && next.winner === side) return [a];
      const rank = (before.hp + (before.shield ?? 0) - after.hp - (after.shield ?? 0)) * 8
        + (before.field.length - after.field.length) * 6
        + next.players[side].field.reduce((n,m) => n + (monsterCanAttack(next,next.players[side],m) ? effAtk(next.players[side],m,next) : 0),0);
      children.push({a,next,rank});
    }
    children.sort((a,b) => b.rank-a.rank);
    for (const child of children) {
      const rest = walk(child.next, depth - 1);
      if (rest) return [child.a, ...rest];
    }
  };
  return walk(g, 14)?.[0];
}
