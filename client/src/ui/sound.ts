/** Original stereo Foley + crystal bank. No legacy arcade tones or sample mix. */
export const SFX_NAMES=['click','play','summon','attack','impact','damage','heal','death','trapSet','trap','draw','buy','mana','maxhp','turn','win','lose','drawGame','match','error','coin','pop','facehit','mimic','mana-pay','void','shuffle','duel-start'] as const;
export type SfxName=typeof SFX_NAMES[number];
const ROOT='/sfx/lore-v2/',VARIANTS=new Set<SfxName>(['click','draw','attack','impact']);
const TRIM:Partial<Record<SfxName,number>>={click:.34,pop:.45,draw:.65,attack:.85,impact:.9,facehit:1,win:.8,lose:.72,'duel-start':.7,error:.48};
let volume=.7;try{const v=parseFloat(localStorage.getItem('lore_sfx')??'');if(Number.isFinite(v))volume=Math.max(0,Math.min(1,v));}catch{}
let ctx:AudioContext|null=null,master:GainNode|null=null,installed=false,unlocked=false;
const encoded=new Map<string,Promise<ArrayBuffer>>(),decoded=new Map<string,Promise<AudioBuffer>>(),last=new Map<SfxName,number>(),cycle=new Map<SfxName,number>();
const active=new Set<AudioBufferSourceNode>();
export const soundUrls=(name:SfxName)=>Array.from({length:VARIANTS.has(name)?3:1},(_,i)=>ROOT+name+(VARIANTS.has(name)?'-'+(i+1):'')+'.mp3');
function bytes(url:string){let p=encoded.get(url);if(!p){p=fetch(url).then(r=>{if(!r.ok)throw new Error('sound unavailable');return r.arrayBuffer();}).catch(e=>{encoded.delete(url);throw e;});encoded.set(url,p);}return p;}
function buffer(url:string){let p=decoded.get(url);if(!p){p=bytes(url).then(b=>ctx!.decodeAudioData(b.slice(0))).catch(e=>{decoded.delete(url);throw e;});decoded.set(url,p);}return p;}
function unlock(){
 if(typeof AudioContext==='undefined')return;
 try{if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=volume*volume;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.16;master.connect(limiter).connect(ctx.destination);}
 unlocked=true;if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
 for(const name of SFX_NAMES)for(const url of soundUrls(name))void buffer(url).catch(()=>{});
 }catch{/* Audio availability never blocks gameplay. */}
}
export function initSound(){
 if(installed)return;installed=true;
 for(const name of SFX_NAMES)for(const url of soundUrls(name))void bytes(url).catch(()=>{});
 document.addEventListener('pointerdown',unlock,{once:true,capture:true});document.addEventListener('keydown',unlock,{once:true,capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSounds();});
}
export function stopSounds(){for(const voice of active){try{voice.stop();}catch{}}active.clear();}
export function getSfxVolume(){return volume;}
export function setSfxVolume(v:number){if(!Number.isFinite(v))return;volume=Math.max(0,Math.min(1,v));try{localStorage.setItem('lore_sfx',String(volume));}catch{}if(master&&ctx)master.gain.setTargetAtTime(volume*volume,ctx.currentTime,.015);if(!volume)stopSounds();}
export function sfx(name:SfxName){
 if(!unlocked||!ctx||!master||volume<=0||document.hidden)return;
 if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
 const now=performance.now();if(now-(last.get(name)??-Infinity)<(name==='click'?75:45))return;last.set(name,now);
 const urls=soundUrls(name),i=cycle.get(name)??0;cycle.set(name,i+1);const audio=ctx,gain=master;
 void buffer(urls[i%urls.length]).then(buf=>{
  if(volume<=0||document.hidden||audio.state!=='running'||performance.now()-now>350)return;
  if(active.size>=16){const old=active.values().next().value;if(old){try{old.stop();}catch{}active.delete(old);}}
  const source=audio.createBufferSource(),trim=audio.createGain();source.buffer=buf;trim.gain.value=TRIM[name]??.78;source.connect(trim).connect(gain);active.add(source);
  source.onended=()=>{active.delete(source);source.disconnect();trim.disconnect();};source.start();
 }).catch(()=>{});
}

/** Shared master bus for cancellable opening cues. */
export function getSfxBus():{context:AudioContext;master:GainNode}|null {
 return unlocked&&ctx&&master?{context:ctx,master}:null;
}
