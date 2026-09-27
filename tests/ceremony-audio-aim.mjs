import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-ceremony-');
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','Event'])globalThis[k]=dom.window[k];
let contextCount=0,starts=0,stops=0,decoded=0,fetches=0;const param=()=>({value:0,setTargetAtTime(){}});
class AudioNode{connect(){return this;}disconnect(){}}
class FakeAudio extends AudioNode{constructor(){super();contextCount++;this.state='running';this.currentTime=0;this.destination={};}createGain(){const node=new AudioNode();node.gain=param();return node;}createDynamicsCompressor(){const node=new AudioNode();for(const k of ['threshold','knee','ratio','attack','release'])node[k]=param();return node;}decodeAudioData(){decoded++;return Promise.resolve({});}resume(){this.state='running';return Promise.resolve();}createBufferSource(){const n=new AudioNode();n.start=()=>starts++;n.stop=()=>{stops++;n.onended?.();};return n;}}
globalThis.AudioContext=FakeAudio;globalThis.fetch=async()=>{fetches++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(12)};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
try{
 await build({stdin:{contents:`export * from './client/src/ui/aimGeometry';export * from './client/src/ui/riftGeometry';export * from './client/src/ui/sound';export {playDuelOpening} from './client/src/ui/duelOpening';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/checks.mjs'});
 const api=await import(dir+'/checks.mjs');
 // All quadrants, near-zero drag and reverse-direction movement: no backward tangent.
 for(const distance of [0,.001,2,8,22,80,500,2000])for(let degrees=0;degrees<360;degrees+=5){const a={x:371,y:615},v={x:Math.cos(degrees*Math.PI/180),y:Math.sin(degrees*Math.PI/180)},b={x:a.x+v.x*distance,y:a.y+v.y*distance},curve=api.aimCurve(a,b);assert.deepEqual(curve.point(0),a);assert.deepEqual(curve.point(1),b);let previous=-1;for(let i=0;i<=100;i++){const t=i/100,p=curve.point(t),tangent=curve.tangent(t),projection=(p.x-a.x)*v.x+(p.y-a.y)*v.y;assert(Object.values(p).every(Number.isFinite));assert(projection>=previous-1e-8);if(distance>.001)assert(tangent.x*v.x+tangent.y*v.y>0);previous=projection;}}
 const outline=api.riftOutline();assert(outline.length>100);assert(Math.min(...outline.map(p=>p[1]))<.065);assert(Math.max(...outline.map(p=>p[1]))>.39);assert(api.RIFT_DEPTHS[0]<-.041);
 const manifest=JSON.parse(await readFile('client/public/sfx/lore-v2/manifest.json','utf8'));
 assert.deepEqual([...Object.keys(manifest.sounds)].sort(),[...api.SFX_NAMES].sort());let bytes=0;
 for(const name of api.SFX_NAMES){const urls=api.soundUrls(name);assert.equal(urls.length,manifest.sounds[name].length);for(const [i,clip] of manifest.sounds[name].entries()){assert(urls[i].endsWith('/'+clip.file));const b=await readFile('client/public/sfx/lore-v2/'+clip.file);bytes+=b.length;assert.equal(createHash('sha256').update(b).digest('hex'),clip.sha256);assert(clip.peakDb<-1);assert(clip.seconds>0&&clip.seconds<5);}}
 assert(bytes<1024*1024);
 api.initSound();api.initSound();await flush();assert.equal(fetches,0,'boot does not compete with scene artwork');document.dispatchEvent(new Event('lore:screen-ready'));await api.warmSounds(['click','pop','error']);assert.equal(fetches,5);assert.equal(contextCount,0,'no AudioContext before user gesture');api.sfx('attack');await flush();assert.equal(starts,0);
 document.dispatchEvent(new Event('pointerdown'));await flush();assert.equal(contextCount,1);assert.equal(decoded,5);await api.warmSounds();assert.equal(fetches,36);assert.equal(decoded,36);
 api.sfx('attack');api.sfx('attack');await flush();assert.equal(starts,1,'same-frame event is deduplicated');
 for(const name of api.SFX_NAMES)api.sfx(name);await flush();assert(stops>0,'polyphony capped');assert.equal(decoded,36,'buffers decoded once');
 api.setSfxVolume(0);const silent=starts;api.sfx('win');await flush();assert.equal(starts,silent);api.setSfxVolume(.65);api.setSfxVolume(NaN);assert.equal(api.getSfxVolume(),.65);assert.equal(localStorage.getItem('lore_sfx'),'.65'.replace(/^\./,'0.'));
 // Removing an opening (navigation) resolves its promise, even without WebGL.
 globalThis.matchMedia=()=>({matches:false});
 const opening=api.playDuelOpening({name:'<unsafe>',avatar:null},{name:'Other',avatar:null},true);assert(document.querySelector('.duel-opening'));assert.equal(document.querySelector('.ceremony-opening-player strong').textContent,'<unsafe>');document.querySelector('.duel-opening').remove();await opening;assert.equal(document.querySelectorAll('.cointoss-ov').length,0);
 console.log('PASS: 58,176 aim samples; rail-aligned cutter bounds; 28 cues / 36 clips / '+Math.round(bytes/1024)+' KiB; gesture unlock, decode cache, rate limit, polyphony, mute and cancelled opening');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
