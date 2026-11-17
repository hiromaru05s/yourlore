import type {GameState,Side} from './types';

export function targetOwner(g: GameState, uid: string): Side | null {
  if (uid === 'player-0') return 0;
  if (uid === 'player-1') return 1;
  for (const s of [0,1] as Side[]) {
    const p=g.players[s];
    if ([...p.field,...p.hand,...p.deck,...p.discard,...(p.removed??[]),...p.enchants.map(e=>e.card),...p.traps.map(t=>t.card)].some(c=>c.uid===uid)) return s;
  }
  return null;
}
