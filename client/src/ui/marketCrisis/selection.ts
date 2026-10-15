import type {GameState} from '../../shared/types';
/** Economic Crisis (including a replay) replaces every fixed-market identity.
 * A buy replaces one slot; supply refreshes and rejected/nullified spells do not. */
export function fixedMarketWasReplaced(before:GameState,after:GameState):boolean{
 const old=before.market,next=after.market;
 if(before===after||before.turn!==after.turn||before.cur!==after.cur||old.length<2||old.length!==next.length)return false;
 const ids=new Set(old.map(c=>c.uid));return next.every(c=>!ids.has(c.uid));
}
