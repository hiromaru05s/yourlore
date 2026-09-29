import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-audio-v3-');
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','sessionStorage','Event','MutationObserver'])globalThis[k]=dom.window[k];
let time=1000,starts=[],stops=[],pending=null,fetches=0;
const originalPerformance=globalThis.performance;globalThis.performance={now:()=>time};
const param=()=>({value:0,setTargetAtTime(){},cancelScheduledValues(){}});
class Node{connect(){return this;}disconnect(){}}
class FakeAudio extends Node{
 constructor(){super();this.state='running';this.currentTime=0;this.destination={};}
 createGain(){const n=new Node();n.gain=param();return n;}
 createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=param();return n;}
 decodeAudioData(b){return Promise.resolve({name:new TextDecoder().decode(b)});}
 resume(){this.state='running';return Promise.resolve();}
 createBufferSource(){const n=new Node();n.start=()=>starts.push(n);n.stop=()=>{stops.push(n);n.onended?.();};return n;}
}
globalThis.AudioContext=FakeAudio;
globalThis.fetch=async url=>{fetches++;if(pending)await pending;return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};

let hidden=false,reduced=false,next=0;const frames=new Map();
Object.defineProperty(document,'hidden',{get:()=>hidden});globalThis.matchMedia=()=>({matches:reduced});
globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
document.body.innerHTML='<div id="overlayRoot"></div>';
try{
 await build({stdin:{contents:`export * from './client/src/ui/sound';export * from './client/src/ui/rankPresentation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rank.mjs',loader:{'.css':'empty'}});
 const a=await import(dir+'/rank.mjs');a.initSound();document.dispatchEvent(new Event('pointerdown'));await a.warmSounds(['rankUp','rankDown','rankPromote']);
 const names=()=>starts.map(n=>n.buffer.name.split('/').at(-1).replace('.mp3',''));
 let base;
 const mount=(change)=>{a.stopSounds();starts=[];stops=[];time+=10000;base=time;const el=document.createElement('div');document.querySelector('#overlayRoot').append(el);const p=new a.RankPresentation();p.set(change);p.mount(el);return{p,el};};
 const tick=t=>{time=base+t;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(time));};
 const close=v=>{v.p.destroy();v.el.remove();assert.equal(frames.size,0);};
 let v=mount({before:1144,after:1162,matchId:'promotion'});tick(499);assert.deepEqual(names(),[]);tick(500);tick(520);assert.deepEqual(names(),['rankUp']);tick(2699);assert.equal(starts.length,1);tick(2700);tick(2800);assert.deepEqual(names(),['rankUp','rankPromote']);close(v);assert(stops.includes(starts.at(-1)),'closing cancels cue');
 v=mount({before:1144,after:1162,matchId:'promotion'});assert.deepEqual(names(),[]);assert.equal(frames.size,0);close(v);
 for(const [before,after,expected] of [[1180,1198,['rankUp']],[1180,1164,['rankDown']],[1200,1200,[]],[1156,1140,['rankDown']]]){v=mount({before,after});tick(500);tick(2700);tick(4250);assert.deepEqual(names(),expected);close(v);}
 v=mount({before:1144,after:1162});tick(500);hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(frames.size,0);assert(stops.includes(starts[0]));hidden=false;close(v);
 a.setSfxVolume(0);v=mount({before:1144,after:1162});tick(500);tick(2700);assert.deepEqual(names(),[]);close(v);a.setSfxVolume(.7);
 reduced=true;v=mount({before:1144,after:1162});assert.deepEqual(names(),['rankPromote']);assert.equal(frames.size,0);close(v);reduced=false;
 v=mount({before:1144,after:1162});tick(5000);assert.deepEqual(names(),[],'late frames must not play stale cues');close(v);
 console.log('PASS: synchronized rise/fall/promotion; single cue per phase; unchanged rating silent; hidden/destroy cancellation; mute; replay; reduced-motion confirmation; stale-frame suppression.');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=originalPerformance;}
