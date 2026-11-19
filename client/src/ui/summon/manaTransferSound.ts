import {sfx,warmSounds,type SfxName} from '../sound';

/** Reuse the adopted mana recordings, mixed for a short ordinary summon. */
export const TRANSFER_SOUND_CUES:ReadonlyArray<{at:number;name:SfxName;gain:number;rate:number}>=[
 {at:25,name:'opening-b-rise',gain:.28,rate:3},
 {at:210,name:'opening-a-exit',gain:.72,rate:1.65},
 {at:550,name:'opening-a-rejoin',gain:.26,rate:1.75},
];
export const TRANSFER_IMPACT_SOUND={name:'opening-b-impact' as const,gain:.13,rate:1.8};
export const warmTransferSounds=()=>warmSounds([...TRANSFER_SOUND_CUES.map(c=>c.name),TRANSFER_IMPACT_SOUND.name,'summon']);

/** All cues follow the visual clock; abort also invalidates pending decodes. */
export function createTransferSound(){
 const life=new AbortController(),played=new Set<number>();let impacted=false;
 return{
  advance(ms:number,enabled:boolean){
   if(!enabled){life.abort();return;}
   for(const cue of TRANSFER_SOUND_CUES){
    if(ms<cue.at||played.has(cue.at))continue;played.add(cue.at);
    if(ms-cue.at<=100)sfx(cue.name,{signal:life.signal,gain:cue.gain,rate:cue.rate});
   }
  },
  impact(enabled:boolean){
   if(impacted||!enabled||life.signal.aborted)return;impacted=true;
   sfx(TRANSFER_IMPACT_SOUND.name,{signal:life.signal,gain:TRANSFER_IMPACT_SOUND.gain,rate:TRANSFER_IMPACT_SOUND.rate});
  },
  stop(){life.abort();},
 };
}
