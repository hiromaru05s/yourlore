import assert from 'node:assert/strict';
import {build} from 'esbuild';import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="card"></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
const realPerformance=globalThis.performance;
let reduced=false,clock=0,frames=new Map(),id=0,prepared=[],draws=[],disposals=0;
globalThis.performance={now:()=>clock};
const advance=ms=>{clock+=ms;for(const [key,f] of [...frames]){frames.delete(key);f(clock);}};
globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.__frameScene=()=>new Promise((resolve,reject)=>prepared.push({resolve:()=>resolve({draw:(ms,r)=>draws.push([ms,r]),dispose:()=>disposals++}),reject}));
const dir=await mkdtemp(path.join(tmpdir(),'spell-frame-'));
const flush=()=>new Promise(r=>setTimeout(r,0));
try{
 await build({entryPoints:['client/src/ui/spellFrame/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs'),plugins:[{name:'controlled-scene',setup(b){b.onResolve({filter:/^\.\/scene$/},()=>({path:'scene',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const createFrameScene=()=>globalThis.__frameScene();'}));}}]});
 const {playSpellFrame,cancelSpellFrames,warmSpellFrame}=await import(path.join(dir,'test.mjs'));const n=document.getElementById('card');n.style.transform='rotate(3deg)';
 warmSpellFrame();await flush();assert.equal(prepared.length,0,'warming must not allocate a scene');
 const abort=new AbortController();abort.abort();assert.equal(await playSpellFrame(n,abort.signal),false);assert.equal(prepared.length,0);
 let pending=playSpellFrame(n);await flush();cancelSpellFrames();assert.equal(await pending,false);prepared.shift().resolve();await flush();assert.equal(disposals,1);assert.equal(frames.size,0);
 pending=playSpellFrame(n);await flush();prepared.shift().reject(Error('no WebGL'));assert.equal(await pending,false);assert.equal(n.style.transform,'rotate(3deg)');
 pending=playSpellFrame(n);await flush();prepared.shift().resolve();await flush();window.dispatchEvent(new Event('resize'));assert.equal(await pending,false);assert.equal(frames.size,0);
 pending=playSpellFrame(n);await flush();prepared.shift().resolve();await flush();advance(320);assert.equal(draws.at(-1)[0],1600,'full shader phase at 5x speed');advance(319);assert.equal(disposals,2,'must preserve final tail');advance(1);assert.equal(await pending,true);assert.equal(draws.at(-1)[0],3200,'final shader frame is rendered');assert.equal(frames.size,0);
 reduced=true;pending=playSpellFrame(n);await flush();prepared.shift().resolve();await flush();assert.equal(draws.at(-1)[1],true);advance(640);assert.equal(await pending,true);assert.equal(frames.size,0);
 reduced=false;const first=playSpellFrame(n);await flush();const second=playSpellFrame(n);await flush();assert.equal(await first,false);prepared.shift().resolve();prepared.shift().resolve();await flush();n.remove();for(const [key,f] of [...frames]){frames.delete(key);f(performance.now());}assert.equal(await second,false);assert.equal(await playSpellFrame(n),false);assert.equal(frames.size,0);
 assert.equal(disposals,6);console.log('PASS: 640ms complete timeline, preload without GPU allocation, pre-abort, async cancellation, renderer failure, resize, reduced-motion completion, overlapping replacement, disconnected source; no face mutation');
}finally{cancelAnimationFrame(id);await rm(dir,{recursive:true,force:true});dom.window.close();delete globalThis.__frameScene;globalThis.performance=realPerformance;}
