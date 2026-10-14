import type {GameEvent} from '../../shared/types';
import {DB,STARTERS} from '../../shared/cards';
export type RuneReplay={playIndex:number;sourceUids:string[]};
/** Engine order is authoritative: a permanent alone never predicts an echo. */
export function runeReplayPlan(events:GameEvent[]){
 const held=new Set<number>(),replays=new Map<number,RuneReplay>(),suppressed=new Set<number>();
 let cast=-1,first=-1;
 events.forEach((event,index)=>{
  if(event.type==='playSpell'){
   const def=DB[event.id]??STARTERS[event.id];cast=def?.t==='spell'&&event.dest!=='field'?index:-1;first=-1;return;
  }
  if(['buy','trapReveal','trapSet','turnHeader','win','needTarget'].includes(event.type)){cast=-1;first=-1;return;}
  if(event.type!=='enchantActivate'||DB[event.id]?.ench!=='runeEcho'||cast<0)return;
  const original=events[cast];if(original.type!=='playSpell'||original.player!==event.player)return;
  if(first<0){first=index;held.add(cast);replays.set(index,{playIndex:cast,sourceUids:[event.uid]});}
  else{const replay=replays.get(first)!;if(!replay.sourceUids.includes(event.uid))replay.sourceUids.push(event.uid);suppressed.add(index);}
 });
 return {held,replays,suppressed};
}
