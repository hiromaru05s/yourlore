import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="anchor"></div></div><div id="source" data-card-id="POISON_MASTER"><div class="card-art"><img></div></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event','HTMLCanvasElement'])globalThis[k]=dom.window[k];
globalThis.getComputedStyle=dom.window.getComputedStyle;globalThis.innerWidth=1000;globalThis.innerHeight=800;
HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},clearRect(){}});
let reduced=false,now=0,next=0,motionChange=()=>{};const frames=new Map();globalThis.matchMedia=()=>({get matches(){return reduced},addEventListener(_,fn){motionChange=fn}});globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next};globalThis.cancelAnimationFrame=i=>frames.delete(i);
globalThis.checks={draws:[],released:0,fail:false,capture:0};
const dir=await mkdtemp(path.join(tmpdir(),'poison-summon-'));const advance=ms=>{now+=ms;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now))};const flush=async()=>{await new Promise(r=>setTimeout(r,0))};
try{
 await build({entryPoints:['client/src/ui/poisonSummon/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'mock-gpu',setup(b){
 b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'mock'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'mock'}));b.onResolve({filter:/cardSurface$/},()=>({path:'capture',namespace:'mock'}));b.onResolve({filter:/shared\/cards$/},()=>({path:'cards',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:{projection:`export const boardMatrix=()=>({scale(){return this}}),layoutRect=()=>({left:10,top:20,width:60,height:90}),screenToBoard=(x,y)=>({x,y});`,renderer:`export function renderBoard(c,face,id,v,t){if(checks.fail)throw Error('GPU unavailable');checks.draws.push({id,v,t,mounted:!!document.querySelector('.poison-summon')});}export function releaseFace(){checks.released++}`,capture:`export async function captureCardSurface(){checks.capture++;if(checks.pending)await checks.pending;return {face:{width:640,height:926}}}`,cards:`export const FRAME_BACK='back';`}[a.path]}));}}]});
 const {playPoisonSummon:play,cancelPoisonSummon:cancel,cancelPoisonSummons:all}=await import(path.join(dir,'runtime.mjs'));
 const source=document.getElementById('source'),anchor=document.getElementById('anchor'),root=document.getElementById('root');let impacts=0;
 for(const [id,v]of [['POISON_MASTER',2],['RUST_SLUG',0],['RUST_SHROOM',3]]){
  source.dataset.cardId=id;source.style.visibility='visible';checks.draws=[];const before=impacts,p=play(source,{anchor,onImpact:()=>impacts++});assert.equal(source.style.visibility,'hidden');await flush();assert.deepEqual(checks.draws[0],{id,v,t:0,mounted:false});assert.equal(document.querySelector('.poison-summon').dataset.variant,String(v+1));
  advance(639);assert.equal(impacts,before);advance(1);assert.equal(impacts,before+1);advance(2160);assert.equal(await p,true);assert.equal(impacts,before+1);assert.equal(source.style.visibility,'visible');
 }
 for(const reason of ['single','root','abort','resize','hidden','disconnect','pagehide','motion']){
  const ac=new AbortController(),p=play(source,{anchor,signal:ac.signal});await flush();
  if(reason==='single')cancel(source);if(reason==='root')all(root);if(reason==='abort')ac.abort();if(reason==='resize'||reason==='pagehide')window.dispatchEvent(new Event(reason));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}
  if(reason==='disconnect'){anchor.remove();advance(16)}if(reason==='motion')motionChange();
  assert.equal(await p,false,reason);assert.equal(source.style.visibility,'visible');assert.equal(document.querySelectorAll('.poison-summon').length,0);
  Object.defineProperty(document,'hidden',{configurable:true,value:false});root.append(anchor);
 }
 let unblock;checks.pending=new Promise(r=>unblock=r);const before=checks.draws.length;const pending=play(source);cancel(source);unblock();await flush();assert.equal(await pending,false);assert.equal(checks.draws.length,before,'cancellation during capture never mounts');checks.pending=null;
 const a=play(source),b=play(source);await flush();assert.equal(await a,false);cancel(source);assert.equal(await b,false);assert.equal(source.style.visibility,'visible');
 const other=source.cloneNode(true);document.body.append(other);const multi=[play(source,{anchor}),play(other,{anchor})];await flush();assert.equal(document.querySelectorAll('.poison-summon').length,2);cancel(source);assert.equal(document.querySelectorAll('.poison-summon').length,1);advance(2800);assert.deepEqual(await Promise.all(multi),[false,true]);other.remove();
 reduced=true;const captures=checks.capture;assert.equal(await play(source,{onImpact:()=>impacts++}),true);assert.equal(checks.capture,captures);reduced=false;
 const ac=new AbortController();ac.abort();assert.equal(await play(source,{signal:ac.signal}),false);source.dataset.cardId='ELF';assert.equal(await play(source),false);source.dataset.cardId='POISON_MASTER';
 const warn=console.warn;console.warn=()=>{};checks.fail=true;const failed=play(source,{onImpact:()=>impacts++});await flush();assert.equal(await failed,false);assert.equal(source.style.visibility,'visible');checks.fail=false;
 const p=play(source,{onImpact:()=>impacts++});await flush();advance(640);const beforeContact=impacts;checks.fail=true;advance(16);assert.equal(await p,false);assert.equal(impacts,beforeContact);checks.fail=false;console.warn=warn;
 assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.poison-summon').length,0);
 for(const file of ['client/src/ui/anim.ts','client/src/ui/monster/runtime.ts','client/src/ui/summon/runtime.ts'])assert.match(await readFile(file,'utf8'),/isPoisonSummon/);
 console.log('PASS poison selection 03/01/04: contact once, frame zero, both native routes, cancellation during capture, replacement, concurrency isolation, reduced motion, GPU fallback and cleanup');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close()}
