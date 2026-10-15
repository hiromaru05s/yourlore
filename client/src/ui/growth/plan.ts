import type {GameEvent,GameState,Side} from '../../shared/types';
export type GrowthPulse={uid:string;player:Side;amount:number;delay:number;healIndex:number|null};
/** Consecutive Growth triggers share a clock; never cross another gameplay cause. */
export function growthGroups(events:readonly GameEvent[]){
 const groups=new Map<number,GrowthPulse[]>(),consumed=new Set<number>();
 for(let i=0;i<events.length;i++){
  if(consumed.has(i))continue;const event=events[i];if(event.type!=='enchantActivate'||event.id!=='GROWTH')continue;
  const pulses:GrowthPulse[]=[],occurrences=new Map<string,number>(),sources:string[]=[];
  let at=i;
  while(at<events.length){
   const e=events[at];if(e.type!=='enchantActivate'||e.id!=='GROWTH'||e.player!==event.player)break;
   if(at!==i)consumed.add(at);
   if(!sources.includes(e.uid))sources.push(e.uid);const count=occurrences.get(e.uid)??0;occurrences.set(e.uid,count+1);
   const next=events[at+1],heal=next?.type==='heal'&&next.growthSourceUid===e.uid&&next.player===e.player?next:null;
   pulses.push({uid:e.uid,player:e.player,amount:heal?.amount??0,delay:count*250+sources.indexOf(e.uid)*85,healIndex:heal?at+1:null});
   if(heal)consumed.add(++at);at++;
  }
  groups.set(i,pulses);
 }
 return{groups,consumed};
}
/** Only retain cards present in the authoritative hand; no invented or private faces. */
export function growthDrawHands(prev:GameState,next:GameState,events:readonly GameEvent[]){
 const owners=new Set([...events].filter((e):e is Extract<GameEvent,{type:'enchantActivate'}>=>e.type==='enchantActivate'&&e.id==='GROWTH').map(e=>e.player));
 const created=new Set(events.filter((e):e is Extract<GameEvent,{type:'creationBorn'}>=>e.type==='creationBorn').map(e=>e.uid));
 const totals=[0,0],seen=[0,0];for(const e of events)if(e.type==='draw')totals[e.player]+=e.count;
 const incoming=next.players.map((p,side)=>{const old=new Set(prev.players[side].hand.map(c=>c.uid));return p.hand.filter(c=>!old.has(c.uid)&&!created.has(c.uid)).slice(-totals[side]);});
 const result=new Map<number,{player:Side;uids:string[];hand:typeof next.players[0]['hand']}>();
 events.forEach((e,index)=>{if(e.type!=='draw'||!owners.has(e.player))return;
  const start=seen[e.player];seen[e.player]+=e.count;
  const cards=incoming[e.player],arrivals=cards.slice(start,seen[e.player]),unrevealed=new Set(cards.slice(seen[e.player]).map(c=>c.uid));
  result.set(index,{player:e.player,uids:arrivals.map(c=>c.uid),hand:next.players[e.player].hand.filter(c=>!unrevealed.has(c.uid)&&!created.has(c.uid))});
 });return result;
}
