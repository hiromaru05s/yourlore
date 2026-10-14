import type {GameState} from '../../shared/types';
import {effAtk,curHp} from '../../shared/engine';
export type TrickValue={id:string;owner:number;swapped:boolean;atk:number;hp:number;hurt:boolean};
export type TrickChange={uid:string;before:TrickValue;after:TrickValue};
/** Store copied scalars: reducer snapshots can be mutated in place by local play. */
export function createTrickRoomTracker(){
 let previous=new Map<string,TrickValue>(),wasActive=false,initialized=false;
 return (g:GameState)=>{
  const active=!g.over&&(g.trickLeft??0)>0,changes:TrickChange[]=[],next=new Map<string,TrickValue>();
  g.players.forEach((p,owner)=>p.field.forEach(m=>{
   const after={id:m.id,owner,swapped:!!m.trickSwapped,atk:effAtk(p,m,g),hp:curHp(p,m),hurt:m.hatch==null&&(m.dmg??0)>0};
   next.set(m.uid,after);const before=previous.get(m.uid);
   if(!g.over&&before&&before.id===after.id&&before.owner===owner&&before.swapped!==after.swapped&&m.hatch==null)changes.push({uid:m.uid,before,after});
  }));
  const plan={active,changes,initial:!initialized,entered:initialized&&active&&!wasActive,exited:initialized&&!active&&wasActive};
  previous=next;wasActive=active;initialized=true;return plan;
 };
}
export type TrickPlan=ReturnType<ReturnType<typeof createTrickRoomTracker>>;
