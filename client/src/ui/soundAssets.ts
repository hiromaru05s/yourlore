/** Pure inventory shared by playback and the persistent asset manifest. */
export const SFX_NAMES=['click','play','summon','attack','impact','damage','heal','death','trapSet','trap','draw','buy','mana','turn','win','lose','drawGame','match','error','coin','pop','facehit','mimic','mana-pay','void','shuffle','duel-start','discard','coinToss','coinLand','diceRoll','diceLand','rankUp','rankDown','rankPromote','chosenCrown'] as const;
export type SfxName=typeof SFX_NAMES[number];
const UI=new Set<SfxName>(['click','pop','error']),VARIANTS=new Set<SfxName>(['click','attack','impact']);
const PRESERVED_V4=new Set<SfxName>(['coin','match','buy']);
export const soundUrls=(name:SfxName)=>name==='chosenCrown'?['/sfx/chosen-v2/heavy-blade.mp3']:name==='play'?['/sfx/lore-v7/play.mp3']:name==='summon'?['/sfx/lore-v8/summon.mp3']:name==='draw'?['/sfx/lore-v4/draw-3.mp3']:Array.from({length:VARIANTS.has(name)?3:1},(_,i)=>`/sfx/lore-v${UI.has(name)?3:PRESERVED_V4.has(name)?4:5}/`+name+(VARIANTS.has(name)?'-'+(i+1):'')+'.mp3');
