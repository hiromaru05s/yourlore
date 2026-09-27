import {sfx,warmSounds,type SfxName} from './sound';
type Cue='rise'|'toss'|'land'|'reveal';
const cues:Record<Cue,SfxName>={rise:'duel-start',toss:'coinToss',land:'coinLand',reveal:'turn'};
export function warmOpeningSound():Promise<void>{return warmSounds([...Object.values(cues),'draw']);}
/** The same mix, mute, voice budget and decode cache as the rest of the game. */
export function openingAudio(){
 const life=new AbortController();void warmOpeningSound();
 return {play(cue:Cue){sfx(cues[cue],{signal:life.signal});},stop(){life.abort();}};
}
