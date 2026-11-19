import {sfx,warmSounds} from './sound';
import {OPENING_SOUND_CUES,openingSoundName,approvedOpeningMix,type OpeningCue,type OpeningSoundMix} from './opening/soundBank';
export function warmOpeningSound(mix:OpeningSoundMix=approvedOpeningMix()):Promise<void>{return warmSounds([...OPENING_SOUND_CUES.map(cue=>openingSoundName(cue,mix[cue])),'draw']);}
/** Production and auditions share mute, limiter, decode cache and cancellable voice budget. */
export function openingAudio(mix:OpeningSoundMix=approvedOpeningMix(),rate=1){
 const life=new AbortController();void warmOpeningSound(mix);
 return {play(cue:OpeningCue){sfx(openingSoundName(cue,mix[cue]),{signal:life.signal,rate});},stop(){life.abort();}};
}
