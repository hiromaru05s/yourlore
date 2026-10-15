import type {GameEvent} from '../../shared/types';
export const EVADE_DURATION = 700;
export const WIDTH = 180;
export const HEIGHT = 281.25;
/** A declared attack precedes its resolution events. Only preplay its own evade roll. */
export function evasionRollIndex(events:readonly GameEvent[],attackIndex:number):number {
 const attack=events[attackIndex];if(attack?.type!=='attack')return -1;
 for(let i=attackIndex+1;i<events.length;i++){
  const event=events[i];if(event.type==='attack')break;
  if(event.type==='dice'&&event.evasion?.attackerUid===attack.uid)return i;
 }
 return -1;
}
