import type {GameEvent} from '../../shared/types';
import {outcomes} from './catalog';
export const HATCH_VARIANT=1; // Approved 02: spiral unwind.
export function hatchOutcome(egg:string|undefined,result:string|undefined){
 return outcomes.findIndex(o=>o.egg===egg&&o.id===result);
}
/** Only explicit, paired engine events may suppress destruction/ordinary summon. */
export function hatchPairs(events:GameEvent[]){
 const pairs=new Map<string,string>();
 events.forEach((e,i)=>{
  if(e.type!=='summon'||!e.hatchFrom||hatchOutcome(e.hatchFrom.id,e.id)<0)return;
  if(events.slice(0,i).some(d=>d.type==='destroy'&&d.player===e.player&&d.uid===e.hatchFrom!.uid&&d.id===e.hatchFrom!.id))pairs.set(e.uid,e.hatchFrom.uid);
 });return pairs;
}
