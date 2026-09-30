import type {GameEvent,Side} from '../shared/types';
import type {SfxName} from './sound';
/** Only suppress the exact hit already voiced by the attack animation.
 * Counterattacks, piercing and spell damage remain independently audible. */
export class EventSound {
 private hit:string|null=null;
 private player:Side|null=null;
 contact(targetUid:string|null,defender:Side,damaging=true){this.hit=targetUid;this.player=targetUid||!damaging?null:defender;}
 cue(e:GameEvent):SfxName|undefined{
  if(e.type==='attack'||e.type==='playSpell'){this.hit=null;this.player=null;}
  if(e.type==='hit'){
   if(e.uid===this.hit){this.hit=null;return;}
   return e.amount===0?undefined:'impact';
  }
  if(e.type==='damage'){
   if(e.player===this.player){this.player=null;return;}
   return e.amount>0?'damage':undefined;
  }
  if(e.type==='heal')return e.amount>0?'heal':undefined;
  // Summon belongs to the card landing, not the preceding focus/reveal.
  return ({destroy:'death',playSpell:'play',trapReveal:'trap',trapSet:'trapSet'} as Partial<Record<GameEvent['type'],SfxName>>)[e.type];
 }
}
