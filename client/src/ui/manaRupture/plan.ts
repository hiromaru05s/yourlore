import type {GameState,ReduceResult,Side} from '../../shared/types';

/** Only a fresh, authoritative HP defeat owns a rupture. Rejoins and forfeits do not. */
export function lethalOutcomeSide(before:GameState,result:ReduceResult):Side|null {
  const after=result.state;
  if(before.over || !after.over || after.winner==null)return null;
  const loser=(1-after.winner) as Side;
  return before.players[loser].hp>0 && after.players[loser].hp<=0 &&
    result.events.some(e=>e.type==='damage' && e.player===loser && e.amount>0)
    ? loser : null;
}
