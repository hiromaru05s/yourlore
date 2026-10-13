import type {GameEvent} from '../../shared/types';
export const DRAGON_FUSION_VARIANT=3; // Approved 04, with GM6_0 slate-blue scales and ivory horns.
export function fusionPairs(events:GameEvent[]){
 const pairs=new Map<string,NonNullable<Extract<GameEvent,{type:'summon'}>['fusionFrom']>>();
 events.forEach((event,i)=>{
  if(event.type!=='summon'||!event.fusionFrom)return;
  const {dragon,mate}=event.fusionFrom;
  if(dragon.id!=='GM6_0'||dragon.uid===mate.uid||!((event.id==='DRAGON_RIDER'&&mate.id==='SOLDIER2')||(event.id==='ANTIQUE_DK'&&mate.id==='INFKNIGHT')))return;
  if([dragon,mate].every(source=>events.slice(0,i).some(e=>e.type==='destroy'&&e.cause==='fusion'&&e.player===event.player&&e.uid===source.uid&&e.id===source.id)))pairs.set(event.uid,event.fusionFrom);
 });return pairs;
}
