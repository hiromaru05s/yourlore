import type {GameEvent} from '../../shared/types';
export function isSoulHarvestDamage(e:GameEvent):boolean{
 return e.type==='damage'&&!e.reversed&&e.amount>0&&[e.srcKo,e.srcJa].some(s=>s?.includes('data-card="SOUL_HARVEST"'));
}
/** Stop at the next action. Reaction logs/enchant cues may precede the damage. */
export function soulHarvestDamageIndex(events:GameEvent[],from:number):number{
 for(let i=from+1;i<events.length;i++){
  const e=events[i];
  if(['playSpell','trapSet','trapReveal','buy','turnHeader','win','attack','summon'].includes(e.type))break;
  if(isSoulHarvestDamage(e))return i;
 }
 return -1;
}
