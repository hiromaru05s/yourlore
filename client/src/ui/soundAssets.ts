/** Pure inventory shared by playback and the persistent asset manifest. */
export const SFX_NAMES=['click','play','summon','attack','impact','damage','heal','death','trapSet','trap','draw','buy','mana','turn','win','lose','drawGame','match','error','coin','pop','facehit','mimic','mana-pay','void','shuffle','duel-start','discard','coinToss','coinLand','diceRoll','diceLand','rankUp','rankDown','rankPromote','chosenCrown','opening-b-rise','opening-b-impact','opening-b-toss','opening-a-rejoin','opening-a-friction','opening-h-land','opening-a-exit'] as const;
import type {OpeningSoundName} from './opening/soundBank';
export type SfxName=typeof SFX_NAMES[number];
export type SoundName=SfxName|OpeningSoundName;
const UI=new Set<SoundName>(['click','pop','error']),VARIANTS=new Set<SoundName>(['click','attack','impact']);
const PRESERVED_V4=new Set<SoundName>(['coin','match','buy']);
export const soundUrls=(name:SoundName)=>name==='win'?['/sfx/result-v1/victory.mp3']:name==='lose'?['/sfx/result-v1/defeat.mp3']:name.startsWith('opening-')?[`/sfx/opening-mana-v1/${name.slice(8)}.wav`]:name==='chosenCrown'?['/sfx/chosen-v2/heavy-blade.mp3']:name==='play'?['/sfx/lore-v7/play.mp3']:name==='summon'?['/sfx/lore-v8/summon.mp3']:name==='draw'?['/sfx/lore-v4/draw-3.mp3']:Array.from({length:VARIANTS.has(name)?3:1},(_,i)=>`/sfx/lore-v${UI.has(name)?3:PRESERVED_V4.has(name)?4:5}/`+name+(VARIANTS.has(name)?'-'+(i+1):'')+'.mp3');
