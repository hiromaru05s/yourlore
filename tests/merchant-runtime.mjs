import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<div id="card" data-card-id="DARK_MERCHANT"></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','HTMLCanvasElement','Event'])globalThis[k]=dom.window[k];
let reduced=false,now=0,next=0;const frames=new Map();
globalThis.matchMedia=()=>({matches:reduced});globalThis.performance={now:()=>now};
globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next;};globalThis.cancelAnimationFrame=i=>frames.delete(i);
globalThis.innerWidth=1280;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
globalThis.Image=class{set src(_){queueMicrotask(()=>this.onload())}};
HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},clearRect(){},scale(){}});
globalThis.checks={created:0,disposed:0,sounds:0,stopped:0,draws:[],hold:false,fail:false};
const settle=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
const advance=async ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));await settle();};
const dir=await mkdtemp(path.join(tmpdir(),'merchant-runtime-'));
try{
 await build({entryPoints:['client/src/ui/merchant/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),loader:{'.png':'text'},plugins:[{name:'mock-gpu',setup(b){
 b.onResolve({filter:/cardSurface$/},()=>({path:'capture',namespace:'test'}));
 b.onResolve({filter:/^\.\/darkRenderer$/},()=>({path:'renderer',namespace:'test'}));
 b.onResolve({filter:/^\.\/sound$/},()=>({path:'sound',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='capture'?`export async function captureCardSurface(){if(checks.hold)await new Promise(r=>checks.release=r);if(checks.fail)throw Error('capture failed');return {face:document.createElement('canvas')}}`:a.path==='sound'?`export class ContactSound{constructor(n,black){if(n!==12||!black)throw Error('wrong black coins');checks.sounds++}advance(){}dispose(){checks.stopped++}}`:`export class DarkRenderer{constructor(){checks.created++}dark(c,f,v,t,w,h,reduced,board,source,keep){if(checks.drawFail)throw Error('draw failed');checks.draws.push({v,t,board,source,keep})}dispose(){checks.disposed++}}`}));
 }}]});
 const {playDarkMerchant:play,cancelDarkMerchants:cancel}=await import(path.join(dir,'runtime.mjs'));
 const card=document.getElementById('card');card.style.visibility='visible';
 const p=play(card);await settle();assert.equal(document.querySelector('.dark-merchant-reveal').dataset.variant,'3');assert.equal(card.style.visibility,'hidden');assert.equal(checks.draws[0].t,0);assert.equal(checks.draws[0].v,2);assert(checks.draws[0].board);assert(checks.draws[0].keep);
 await advance(3300);assert.equal(checks.draws.at(-1).t,3300);await advance(3300);assert.equal(await p,true);assert.equal(card.style.visibility,'visible');assert.match(card.style.transform,/scale/);
 for(const reason of ['cancel','abort','resize','pagehide','hidden','disconnect']){
  const ac=new AbortController(),p=play(card,ac.signal);await settle();
  if(reason==='cancel')cancel();if(reason==='abort')ac.abort();if(['resize','pagehide'].includes(reason))window.dispatchEvent(new Event(reason));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}
  if(reason==='disconnect'){card.remove();await advance(20);}
  assert.equal(await p,false,reason);assert.equal(card.style.visibility,'visible');Object.defineProperty(document,'hidden',{configurable:true,value:false});document.body.append(card);
 }
 checks.hold=true;const pending=play(card);await settle();cancel();assert.equal(await pending,false);checks.release();await settle();checks.hold=false;assert.equal(document.querySelector('.dark-merchant-reveal'),null);
 const first=play(card);await settle();const second=play(card);await settle();assert.equal(await first,false);cancel();assert.equal(await second,false);assert.equal(card.style.visibility,'visible');
 reduced=true;assert.equal(await play(card),false);reduced=false;const ac=new AbortController();ac.abort();assert.equal(await play(card,ac.signal),false);card.dataset.cardId='MERCH1';assert.equal(await play(card),false);card.dataset.cardId='DARK_MERCHANT';
 const warn=console.warn;console.warn=()=>{};
 for(const field of ['fail','drawFail']){checks[field]=true;const p=play(card);await settle();assert.equal(await p,false);assert.equal(card.style.visibility,'visible');checks[field]=false;}console.warn=warn;
 assert.equal(frames.size,0);assert.equal(checks.created,checks.disposed);assert.equal(checks.sounds,checks.stopped);assert.equal(document.querySelector('.dark-merchant-reveal'),null);
 console.log('PASS merchant 03: exact selection, native handoff, cancellation, late loading, replacement, reduced motion, renderer failure, audio and GPU cleanup');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
