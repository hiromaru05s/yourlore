import type {GameEvent} from '../shared/types';

/** Rules may destroy the defender before its last counter. Keep that public face
 * present through the return strike; only presentation order changes. */
export function counterPresentationEvents(events:readonly GameEvent[]):GameEvent[]{
 const held=new Map<number,GameEvent[]>(),out:GameEvent[]=[];
 for(let i=0;i<events.length;i++){
  const event=events[i];
  if(event.type==='destroy'){
   let counter=-1;
   for(let j=i+1;j<events.length;j++){
    const next=events[j];
    if(next.type==='summon'&&next.uid===event.uid)break;
    if(next.type==='counter'&&next.uid===event.uid)counter=j;
   }
   if(counter>=0){
    // Let the matching damage cue follow contact before either face exits.
    const strike=events[counter],next=events[counter+1];
    if(strike.type==='counter'&&next?.type==='hit'&&next.uid===strike.targetUid){
     counter++;
     const survival=events[counter+1];
     if(survival?.type==='gutsSurvive'&&survival.uid===strike.targetUid)counter++;
    }
    const group=held.get(counter)??[];group.push(event);held.set(counter,group);continue;
   }
  }
  out.push(event,...(held.get(i)??[]));
 }
 return out;
}

/** Match the reducer's explicit survival result, never infer it from HP. */
export function counterSurvival(events:readonly GameEvent[],index:number):Extract<GameEvent,{type:'gutsSurvive'}>|undefined{
 const counter=events[index],hit=events[index+1],survival=events[index+2];
 return counter?.type==='counter'&&hit?.type==='hit'&&hit.uid===counter.targetUid&&survival?.type==='gutsSurvive'&&survival.uid===counter.targetUid?survival:undefined;
}
