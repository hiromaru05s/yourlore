import type {GameEvent} from '../../shared/types';
/** Bind only an immediately following, unreversed damage event to its exact source.
 * Converted healing, blocked damage and another cause keep their existing owners. */
export function erosionPlan(events:GameEvent[]){
 const activations=new Map<number,{damage:number;draw:number}>(),draws=new Set<number>();let draw=-1;
 for(let i=0;i<events.length;i++){
  const e=events[i];
  if(e.type==='draw'){draw=i;continue;}
  if(['playSpell','attack','turnHeader','summon','buy','trapReveal'].includes(e.type)){draw=-1;continue;}
  if(e.type!=='enchantActivate'||e.id!=='EROSION'||draw<0)continue;
  const previous=events[draw];if(previous.type!=='draw'||previous.player!==e.player)continue;
  let j=i+1;while(events[j]?.type==='log')j++;
  const damage=events[j];
  if(damage?.type==='damage'&&!damage.reversed&&damage.player!==e.player){activations.set(i,{damage:j,draw});draws.add(draw);}
 }
 return {activations,draws};
}
