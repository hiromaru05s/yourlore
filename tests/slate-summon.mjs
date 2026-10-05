import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="card"></div></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
globalThis.cancelAnimationFrame=()=>{};
let reduced=true;globalThis.matchMedia=()=>({matches:reduced});
const dir=await mkdtemp(path.join(tmpdir(),'slate-test-'));
try{
 await build({entryPoints:['client/src/ui/summon/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'no-gpu',setup(b){b.onResolve({filter:/cardSurface$/},()=>({path:'capture',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const captureCardSurface=async()=>{await new Promise(r=>setTimeout(r,20));throw Error("unavailable texture")};'}));}}]});
 const {playSlateSummon,cancelSummons}=await import(path.join(dir,'runtime.mjs'));const n=document.getElementById('card');let impacts=0;
 assert.equal(await playSlateSummon(n,{onImpact:()=>impacts++}),true);assert.equal(impacts,1);assert.equal(document.querySelector('.slate-summon'),null);
 const abort=new AbortController();abort.abort();assert.equal(await playSlateSummon(n,{signal:abort.signal}),false);
 reduced=false;n.style.visibility='visible';const pending=playSlateSummon(n);cancelSummons(document.getElementById('root'));assert.equal(await pending,false);await new Promise(r=>setTimeout(r,40));assert.equal(n.style.visibility,'visible');assert.equal(document.querySelector('.slate-summon'),null);
 const warn=console.warn;console.warn=()=>{};assert.equal(await playSlateSummon(n,{onImpact:()=>impacts++}),false);console.warn=warn;assert.equal(impacts,2);assert.equal(n.style.visibility,'visible');
 n.remove();assert.equal(await playSlateSummon(n),false);
 console.log('PASS reduced motion, pre-abort, pending capture cancellation, unavailable texture fallback, disconnected source');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
