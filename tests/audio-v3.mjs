import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-audio-v3-');
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','Event'])globalThis[k]=dom.window[k];
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
try{
 await build({stdin:{contents:`export * from './client/src/ui/sound';export * from './client/src/ui/openingSound';export * from './client/src/ui/eventSound';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const a=await import(dir+'/module.mjs');a.initSound();document.dispatchEvent(new Event('pointerdown'));
 // Cold request, mute then unmute: its late decode must never become audible.
 let release;pending=new Promise(r=>release=r);a.sfx('mana');a.setSfxVolume(0);a.setSfxVolume(.7);release();pending=null;await flush();assert.equal(starts.length,0);
 // Navigation invalidates in-flight requests even after another scene starts.
 pending=new Promise(r=>release=r);a.sfx('heal');a.stopSounds();release();pending=null;await flush();assert.equal(starts.length,0);
 // Cold arrivals over 90 ms are dropped, not played behind the animation.
 pending=new Promise(r=>release=r);a.sfx('attack');time+=100;release();pending=null;await flush();assert.equal(starts.length,0);
 await a.warmSounds();const fetched=fetches;time+=1000;
 a.sfx('impact');a.sfx('impact');assert.equal(starts.length,1);assert(starts[0].buffer.name.includes('/lore-v5/impact-1.mp3'));
 // The approved click/confirmation bank is kept exactly; only duel cues change.
 for(const name of ['click','pop','error'])assert(a.soundUrls(name).every(u=>u.includes('/lore-v3/')));
 for(const name of ['coin','match','buy'])assert.deepEqual(a.soundUrls(name),[`/sfx/lore-v4/${name}.mp3`]);
 assert.deepEqual(a.soundUrls('draw'),['/sfx/lore-v4/draw-3.mp3']);
 for(const name of a.SFX_NAMES.filter(n=>!['click','pop','error','coin','match','buy','draw'].includes(n)))assert(a.soundUrls(name).every(u=>u.includes('/lore-v5/')));
 for(let i=0;i<5;i++){time+=100;a.sfx('draw');assert(starts.at(-1).buffer.name.endsWith('/draw-3.mp3'),'draw never cycles to rejected variants');}
 a.stopSounds();time+=1000;a.sfx('attack');const sweep=starts.at(-1);a.sfx('impact');assert(stops.includes(sweep),'landing fades the outgoing attack sweep');
 time+=1000;a.sfx('mana');a.sfx('draw');const battle=starts.slice(-3);a.sfx('win');assert(battle.every(v=>stops.includes(v)),'outcome clears lingering battle voices');
 // UI remains subordinate to an outcome; no more than eight concurrent voices.
 for(const name of a.SFX_NAMES){time+=501;a.sfx(name);assert(starts.length-stops.length<=8);}
 assert.equal(fetches,fetched,'only one download per URL');
 a.stopSounds();const opening=a.openingAudio();time+=1000;opening.play('rise');opening.play('toss');assert.equal(starts.length-stops.length,2);opening.stop();assert.equal(starts.length-stops.length,0);opening.play('land');assert.equal(starts.length-stops.length,0);
 time+=1000;a.sfx('click');a.sfx('pop');assert.equal(starts.length-stops.length,1,'confirmation replaces generic click');a.stopSounds();
 let aborted=new AbortController();aborted.abort();const count=starts.length;a.sfx('diceRoll',{signal:aborted.signal});assert.equal(starts.length,count);
 a.sfx('mana');document.dispatchEvent(new Event('visibilitychange'));a.setSfxVolume(0);assert.equal(starts.length-stops.length,0);
 const e=new a.EventSound();
 e.contact('victim',1);assert.equal(e.cue({type:'hit',uid:'victim'}),undefined);assert.equal(e.cue({type:'hit',uid:'attacker'}),'impact','counterattack stays audible');assert.equal(e.cue({type:'damage',player:1,amount:3}),'damage','piercing stays audible');
 e.contact(null,1);assert.equal(e.cue({type:'damage',player:1,amount:3}),undefined);assert.equal(e.cue({type:'damage',player:1,amount:2}),'damage');
 assert.equal(e.cue({type:'heal',player:1,amount:5}),'heal','both players audible');assert.equal(e.cue({type:'heal',player:0,amount:0}),undefined);assert.equal(e.cue({type:'damage',player:0,amount:0}),undefined);
 assert.equal(e.cue({type:'summon',id:'MIMIC',player:0,uid:'m'}),undefined,'landing owns summon');
 console.log('PASS: late decode/mute/navigation cancellation, 90 ms deadline, shared opening lifecycle, eight-voice budget, UI coalescing, attack/counter/piercing/zero-heal event ownership');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=originalPerformance;}
