import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="anchor" data-board-plane="0"></div></div><div id="source"></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event','HTMLCanvasElement'])globalThis[k]=dom.window[k];
let reduced=false,now=0,next=0;const frames=new Map();
globalThis.matchMedia=()=>({matches:reduced});globalThis.performance={now:()=>now};
globalThis.innerWidth=1280;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
globalThis.DOMMatrix=class{translate(){return this;}scale(){return this;}};
globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next;};globalThis.cancelAnimationFrame=i=>frames.delete(i);
HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},setTransform(){},clearRect(){}});
globalThis.verification={draws:[],disposed:0,fail:false,hold:false};
const dir=await mkdtemp(path.join(tmpdir(),'verdant-test-'));
const settle=()=>new Promise(r=>setImmediate(r));
const advance=async ms=>{now+=ms;const fs=[...frames.values()];frames.clear();fs.forEach(f=>f(now));await settle();};
try{
 await build({entryPoints:['client/src/ui/summon/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'controlled-rendering',setup(b){
 b.onResolve({filter:/cardSurface$/},()=>({path:'capture',namespace:'test'}));
 b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'test'}));
 b.onResolve({filter:/richRenderer$/},()=>({path:'renderer',namespace:'test'}));
 b.onResolve({filter:/^\.\/renderer$/},a=>a.importer.endsWith('/verdant/runtime.ts')?{path:'renderer',namespace:'test'}:null);
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='capture'?`export async function captureCardSurface(){if(verification.hold)await new Promise(r=>verification.release=r);if(verification.fail)throw Error('Unavailable');return {face:document.createElement('canvas')};}`:a.path==='projection'?`const matrix={scale(){return this},toString(){return 'matrix(1,0,0,1,0,0)'}};export const boardMatrix=()=>matrix,projectedPlacement=()=>matrix,layoutRect=()=>({left:0,top:0,width:180,height:280});`:`class R{drawBoard(c,f,id,v,ms){verification.draws.push({id,v,ms});}draw(c,f,id,v,ms){verification.draws.push({id,v,ms});}dispose(){verification.disposed++;}}export {R as RichRenderer,R as Renderer};`}));
 }}]});
 const {playSlateSummon:play,cancelSummon,cancelSummons,summonPlacement}=await import(path.join(dir,'runtime.mjs'));
 const source=document.getElementById('source'),anchor=document.getElementById('anchor');let impacts=0;
 for(const id of ['ELF','DARK_ELF','HIGH_ELF','ELDER_ELF_KING','WORLD_TREE','HALF_ELF']){
  source.dataset.cardId=id;source.style.visibility='visible';const p=play(source,{anchor,onImpact:()=>impacts++});await settle();
  assert.equal(document.querySelector('.verdant-summon').dataset.variant,id==='HALF_ELF'?'1':'2');assert.equal(document.querySelector('.slate-summon'),null);
  assert.equal(source.style.visibility,'hidden');const before=impacts;await advance(id==='HALF_ELF'?1992:2249);assert.equal(impacts,before);await advance(2);assert.equal(impacts,before+1);await advance(5000);
  assert.equal(await p,true);assert.equal(impacts,before+1);assert.equal(source.style.visibility,'visible');assert.equal(document.querySelector('.verdant-summon'),null);
  assert.equal(summonPlacement(anchor,180,280,0,false,id).toString(),'matrix(1,0,0,1,0,0)');
 }
 for(const id of ['VITAL2','VITAL3']){source.dataset.cardId=id;const count=verification.draws.length;assert.equal(await play(source,{onImpact:()=>impacts++}),true);assert.equal(verification.draws.length,count);assert.equal(document.querySelector('.verdant-summon'),null);}
 source.dataset.cardId='ELF';reduced=true;assert.equal(await play(source),true);assert.equal(document.querySelector('.verdant-summon'),null);reduced=false;
 const pre=new AbortController();pre.abort();assert.equal(await play(source,{signal:pre.signal}),false);
 for(const reason of ['root','single','abort','resize','hidden','disconnect']){
  const controller=new AbortController(),p=play(source,{anchor,signal:controller.signal});await settle();
  if(reason==='root')cancelSummons(document.getElementById('root'));
  if(reason==='single')cancelSummon(source);
  if(reason==='abort')controller.abort();
  if(reason==='resize')window.dispatchEvent(new Event('resize'));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}
  if(reason==='disconnect'){anchor.remove();await advance(40);}
  assert.equal(await p,false,reason);assert.equal(source.style.visibility,'visible');assert.equal(document.querySelector('.verdant-summon'),null);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.getElementById('root').append(anchor);
 }
 verification.hold=true;const pending=play(source);cancelSummon(source);verification.release();assert.equal(await pending,false);await settle();verification.hold=false;
 const first=play(source);await settle();const second=play(source);await settle();assert.equal(await first,false);assert.equal(source.style.visibility,'hidden');cancelSummons();assert.equal(await second,false);assert.equal(source.style.visibility,'visible');
 verification.fail=true;const warn=console.warn;console.warn=()=>{};const before=impacts;assert.equal(await play(source,{onImpact:()=>impacts++}),false);console.warn=warn;assert.equal(impacts,before+1);assert.equal(source.style.visibility,'visible');
 assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.verdant-summon').length,0);
 console.log('PASS five 02 selections, Half Elf 01, two no-animation FIXs, contact once, physical handoff, reduced motion, abort/root/single/resize/hidden/unlink, pending capture, replay, fallback and disposal');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
