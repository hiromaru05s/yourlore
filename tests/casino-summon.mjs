import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="root"><div id="anchor"></div></div><div id="source" data-card-id="CASINO"><div class="card-art"><img></div><div class="card-cost">3</div></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event','HTMLCanvasElement'])globalThis[k]=dom.window[k];
let reduced=false,now=0,next=0,motionChange=()=>{};const frames=new Map();globalThis.matchMedia=()=>({get matches(){return reduced},addEventListener(_,fn){motionChange=fn}});globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next};globalThis.cancelAnimationFrame=i=>frames.delete(i);
globalThis.checks={created:0,disposed:0,draws:[],fail:false};
const dir=await mkdtemp(path.join(tmpdir(),'casino-summon-'));const advance=ms=>{now+=ms;const fs=[...frames.values()];frames.clear();fs.forEach(f=>f(now))};
try{
 await build({entryPoints:['client/src/ui/casinoSummon/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'mock-gpu',setup(b){
 b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'mock'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='projection'?`export const projectedPlacement=()=>({toString(){return 'matrix(1,0,0,1,0,0)'}});`:`export class CasinoRenderer{constructor(){if(checks.constructorFail)throw Error('No GPU');checks.created++}draw(canvas,t){if(checks.fail)throw Error('Context lost');checks.draws.push({t,mounted:!!document.querySelector('.casino-summon')})}dispose(){checks.disposed++}}`}));}}]});
 const {playCasinoSummon:play,cancelCasinoSummon:cancel,cancelCasinoSummons:all}=await import(path.join(dir,'runtime.mjs'));
 const source=document.getElementById('source'),anchor=document.getElementById('anchor'),root=document.getElementById('root');let impacts=0;
 source.style.visibility='visible';const first=play(source,{anchor,onImpact:()=>impacts++});assert.equal(source.style.visibility,'hidden');assert.deepEqual(checks.draws[0],{t:0,mounted:false});assert.equal(document.querySelector('.casino-summon').dataset.variant,'2');assert.equal(document.querySelectorAll('#source').length,1);assert.equal(document.querySelector('.casino-summon .card-cost').textContent,'3');
 advance(1759);assert.equal(impacts,0);advance(1);assert.equal(impacts,1);advance(1040);assert.equal(await first,true);assert.equal(impacts,1);assert.equal(source.style.visibility,'visible');
 for(const reason of ['single','root','abort','resize','hidden','disconnect','pagehide','motion']){
  const ac=new AbortController(),p=play(source,{anchor,signal:ac.signal});
  if(reason==='single')cancel(source);if(reason==='root')all(root);if(reason==='abort')ac.abort();if(reason==='resize'||reason==='pagehide')window.dispatchEvent(new Event(reason));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}
  if(reason==='disconnect'){anchor.remove();advance(16)}if(reason==='motion')motionChange();
  assert.equal(await p,false,reason);assert.equal(source.style.visibility,'visible');assert.equal(document.querySelectorAll('.casino-summon').length,0);
  Object.defineProperty(document,'hidden',{configurable:true,value:false});root.append(anchor);
 }
 const a=play(source),b=play(source);assert.equal(await a,false);cancel(source);assert.equal(await b,false);assert.equal(source.style.visibility,'visible');
 const other=source.cloneNode(true);document.body.append(other);const before=checks.created;const multi=[play(source,{anchor}),play(other,{anchor})];assert.equal(checks.created,before+1,'one GPU across simultaneous summons');all();assert.deepEqual(await Promise.all(multi),[false,false]);other.remove();
 reduced=true;assert.equal(await play(source,{onImpact:()=>impacts++}),true);reduced=false;const ac=new AbortController();ac.abort();assert.equal(await play(source,{signal:ac.signal}),false);source.dataset.cardId='GAMBLER';assert.equal(await play(source),false);source.dataset.cardId='CASINO';
 const warn=console.warn;console.warn=()=>{};
 for(const field of ['constructorFail','fail']){checks[field]=true;const before=impacts;assert.equal(await play(source,{onImpact:()=>impacts++}),false);assert.equal(impacts,before+1);assert.equal(source.style.visibility,'visible');checks[field]=false;}
 const p=play(source,{onImpact:()=>impacts++});advance(1760);const beforeContact=impacts;checks.fail=true;advance(16);assert.equal(await p,false);assert.equal(impacts,beforeContact);checks.fail=false;console.warn=warn;
 assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.casino-summon').length,0);assert.equal(checks.created,checks.disposed);
 console.log('PASS casino 02: frame zero before mount, native frame, impact once, source/anchor cancellation, shared GPU, cancellation, replacement, reduced, fallback and cleanup');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close()}
