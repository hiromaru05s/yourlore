import type {GameEvent} from '../../shared/types';
type Summon=Extract<GameEvent,{type:'summon'}>;
/** Only engine-marked summons belong to the ritual; counter-summons never join it. */
export function forbiddenBatches(events:GameEvent[]):Map<string,Summon[]>{
 const groups=new Map<string,Summon[]>();
 for(const event of events){
  if(event.type!=='summon'||event.ritual===undefined)continue;
  const key=event.player+':'+event.ritual,list=groups.get(key)??[];
  list.push(event);groups.set(key,list);
 }
 return new Map([...groups.values()].map(list=>[list[0].uid,list]));
}
