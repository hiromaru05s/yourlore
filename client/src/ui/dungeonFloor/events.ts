import type {GameEvent} from '../../shared/types';

/** Only summons explicitly owned by this roll belong to the portal. */
export function dungeonFloorSummons(events:GameEvent[], diceIndex:number) {
  const dice=events[diceIndex];
  if(dice?.type!=='dice'||dice.source.id!=='DUNGEON_FLOOR')return [];
  const result:Extract<GameEvent,{type:'summon'}>[]=[];
  for(let i=diceIndex+1;i<events.length;i++){
    const event=events[i];
    if(event.type==='dice'||event.type==='playSpell'||event.type==='turnHeader'||event.type==='win')break;
    if(event.type==='summon'&&event.source==='DUNGEON_FLOOR'&&event.player===dice.player&&event.id==='MIMIC')result.push(event);
  }
  return result.slice(0,dice.rolls[0]);
}
