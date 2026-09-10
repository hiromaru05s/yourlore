import type {GameState} from '../shared/types';
import {effAtk} from '../shared/engine';

/** Copy values: the local engine may mutate the same GameState between renders. */
export function createAttackRiseTracker() {
  let previous = new Map<string, {id: string; owner: number; atk: number}>();
  return (state: GameState): string[] => {
    const next = new Map<string, {id: string; owner: number; atk: number}>();
    const raised: string[] = [];
    state.players.forEach((player, owner) => player.field.forEach(mon => {
      const value = {id: mon.id, owner, atk: effAtk(player, mon)};
      const old = previous.get(mon.uid);
      if (old && old.id === value.id && old.owner === owner && value.atk > old.atk) raised.push(mon.uid);
      next.set(mon.uid, value);
    }));
    previous = next;
    return state.over ? [] : raised;
  };
}
