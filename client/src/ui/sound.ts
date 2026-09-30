/** TCG v5 sound bank; preserve approved HOME, purchase and draw recordings. */
export const SFX_NAMES=['click','play','summon','attack','impact','damage','heal','death','trapSet','trap','draw','buy','mana','turn','win','lose','drawGame','match','error','coin','pop','facehit','mimic','mana-pay','void','shuffle','duel-start','discard','coinToss','coinLand','diceRoll','diceLand','rankUp','rankDown','rankPromote'] as const;
export type SfxName=typeof SFX_NAMES[number];
const UI=new Set<SfxName>(['click','pop','error']),VARIANTS=new Set<SfxName>(['click','attack','impact']);
const PRESERVED_V4=new Set<SfxName>(['coin','match','buy']);
type Family='ui'|'paper'|'combat'|'magic'|'ceremony';
interface Policy {family:Family;gap:number;priority:number;}
const policy=(name:SfxName):Policy=>{
 if(UI.has(name))return {family:'ui',gap:90,priority:0};
 if(['draw','discard','shuffle','trapSet','buy','coin','mana-pay'].includes(name))return {family:'paper',gap:name==='draw'?65:120,priority:1};
 if(name==='play')return {family:'magic',gap:120,priority:2};
 if(['mana','heal'].includes(name))return {family:'magic',gap:280,priority:2};
 if(['win','lose','drawGame','duel-start','match','rankUp','rankDown','rankPromote'].includes(name))return {family:'ceremony',gap:500,priority:4};
 return {family:'combat',gap:65,priority:3};
};
const LIMIT:Record<Family,number>={ui:1,paper:3,combat:3,magic:2,ceremony:1};
let volume=.7;try{const v=parseFloat(localStorage.getItem('lore_sfx')??'');if(Number.isFinite(v))volume=Math.max(0,Math.min(1,v));}catch{}
let ctx:AudioContext|null=null,master:GainNode|null=null,installed=false,unlocked=false,epoch=0;
const encoded=new Map<string,Promise<ArrayBuffer>>(),decoded=new Map<string,Promise<AudioBuffer>>(),ready=new Map<string,AudioBuffer>();
const last=new Map<SfxName,number>(),cycle=new Map<SfxName,number>();
interface Voice {name:SfxName;source:AudioBufferSourceNode;gain:GainNode;family:Family;priority:number;finish:()=>void;}
const active=new Set<Voice>();
export const soundUrls=(name:SfxName)=>name==='draw'?['/sfx/lore-v4/draw-3.mp3']:Array.from({length:VARIANTS.has(name)?3:1},(_,i)=>`/sfx/lore-v${UI.has(name)?3:PRESERVED_V4.has(name)?4:5}/`+name+(VARIANTS.has(name)?'-'+(i+1):'')+'.mp3');
function bytes(url:string){let p=encoded.get(url);if(!p){p=fetch(url).then(r=>{if(!r.ok)throw new Error('sound unavailable');return r.arrayBuffer();}).catch(e=>{encoded.delete(url);throw e;});encoded.set(url,p);}return p;}
function buffer(url:string){let p=decoded.get(url);if(!p){p=bytes(url).then(b=>ctx!.decodeAudioData(b.slice(0))).then(b=>{ready.set(url,b);return b;}).catch(e=>{decoded.delete(url);throw e;});decoded.set(url,p);}return p;}
function unlock(){
 if(typeof AudioContext==='undefined')return;
 try{
  if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=volume*volume;
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.1;master.connect(limiter).connect(ctx.destination);}
  unlocked=true;if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
  for(const url of encoded.keys())void buffer(url).catch(()=>{});
 }catch{/* Sound availability never blocks gameplay. */}
}
export function initSound(){
 if(installed)return;installed=true;
 document.addEventListener('lore:screen-ready',()=>{void warmSounds(['click','pop','error']);},{once:true});
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSounds();});
}
/** Two background requests; artwork and gameplay never wait for audio. */
export async function warmSounds(names:readonly SfxName[]=SFX_NAMES):Promise<void>{
 const urls=[...new Set(names.flatMap(soundUrls))];let index=0;
 const worker=async()=>{while(index<urls.length){const url=urls[index++];try{if(ctx)await buffer(url);else await bytes(url);}catch{/* Optional. */}}};
 await Promise.all([worker(),worker()]);
}
function fadeOut(voice:Voice){
 active.delete(voice);
 if(!ctx)return;
 const now=ctx.currentTime;
 voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.008);
 try{voice.source.stop(now+.035);}catch{voice.finish();}
}
/** Invalidate pending decodes as well as playing voices. Nothing leaks into the next scene. */
export function stopSounds(){epoch++;last.clear();for(const voice of [...active])fadeOut(voice);}
export function getSfxVolume(){return volume;}
export function setSfxVolume(v:number){if(!Number.isFinite(v))return;volume=Math.max(0,Math.min(1,v));try{localStorage.setItem('lore_sfx',String(volume));}catch{}if(master&&ctx)master.gain.setTargetAtTime(volume*volume,ctx.currentTime,.015);if(!volume)stopSounds();document.dispatchEvent(new Event('lore:volume-change'));}
export interface SoundOptions {signal?:AbortSignal;}
export function sfx(name:SfxName,options:SoundOptions={}):void{
 if(!unlocked||!ctx||!master||volume<=0||document.hidden||options.signal?.aborted)return;
 if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
 const now=performance.now(),p=policy(name);if(now-(last.get(name)??-Infinity)<p.gap)return;
 // A specific confirmation replaces the generic click from the same UI action.
 if(name==='click'&&now-Math.max(last.get('pop')??-Infinity,last.get('error')??-Infinity)<90)return;
 last.set(name,now);
 const urls=soundUrls(name),i=cycle.get(name)??0;cycle.set(name,i+1);
 const url=urls[i%urls.length],audio=ctx,bus=master,generation=epoch;
 const play=(buf:AudioBuffer)=>{
  if(generation!==epoch||options.signal?.aborted||volume<=0||document.hidden||audio.state!=='running'||performance.now()-now>90)return;
  // A hit replaces its travelling sweep; outcome audio clears the preceding battle.
  // Keep the direct sound transient intact instead of compressing the entire mix.
  for(const voice of [...active]){
   if((['impact','facehit'].includes(name)&&voice.name==='attack')||
      (p.family==='ceremony'&&voice.family!=='ui'))fadeOut(voice);
  }
  const siblings=[...active].filter(v=>v.family===p.family);
  if(siblings.length>=LIMIT[p.family])fadeOut(siblings[0]);
  if(active.size>=8){const oldest=[...active].sort((a,b)=>a.priority-b.priority)[0];if(oldest.priority>p.priority)return;fadeOut(oldest);}
  const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buf;gain.gain.value=1;
  source.connect(gain).connect(bus);
  const abort=()=>fadeOut(voice);
  const voice:Voice={name,source,gain,...p,finish:()=>{active.delete(voice);options.signal?.removeEventListener('abort',abort);source.disconnect();gain.disconnect();}};
  source.onended=voice.finish;active.add(voice);options.signal?.addEventListener('abort',abort,{once:true});source.start();
 };
 const cached=ready.get(url);if(cached)play(cached);else void buffer(url).then(play).catch(()=>{});
}
