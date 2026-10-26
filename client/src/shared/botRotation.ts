import type { BotNpc } from './botNpcs';
export interface BotRotation { signature: string; remaining: number[]; previous?: number }
/** A shuffled bag gives every strategy a turn; cycle boundaries cannot repeat. */
export function nextNpcDeck(npc: BotNpc, saved?: BotRotation, random = Math.random): {index:number; rotation:BotRotation} {
  const signature=JSON.stringify(npc.decks.map(d=>[d.name,[...d.cards].sort()]));
  const previous=saved?.signature===signature?saved.previous:undefined;
  let remaining=saved?.signature===signature?[...saved.remaining]:[];
  if(!remaining.length){
    remaining=npc.decks.map((_,i)=>i);
    for(let i=remaining.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
    if(remaining.length>1&&remaining[0]===previous)[remaining[0],remaining[1]]=[remaining[1],remaining[0]];
  }
  const index=remaining.shift()!;
  return {index,rotation:{signature,remaining,previous:index}};
}
