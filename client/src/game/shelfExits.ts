import type {GameState,GameEvent,Side} from '../shared/types';
/** Only public persistent cards that actually reached their owner's Shelf.
 * Removal, return to hand, ownership changes and already-animated destroys are excluded. */
export function persistentShelfExits(before:GameState,after:GameState,events:GameEvent[]){
 const destroyed=new Set(events.filter(e=>e.type==='destroy').map(e=>e.uid));
 return ([0,1] as Side[]).flatMap(player=>{
  const next=after.players[player],remaining=new Set([...next.enchants,...(next.quests??[])].map(e=>e.card.uid));
  const oldShelf=new Set(before.players[player].discard.map(c=>c.uid)),shelf=new Set(next.discard.map(c=>c.uid));
  return [...before.players[player].enchants,...(before.players[player].quests??[])].map(e=>e.card)
   .filter(c=>!remaining.has(c.uid)&&shelf.has(c.uid)&&!oldShelf.has(c.uid)&&!destroyed.has(c.uid))
   .map(card=>({player,card}));
 });
}
