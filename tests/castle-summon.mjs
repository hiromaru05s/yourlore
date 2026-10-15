import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<div class="game" id="root"><div id="source" data-card-id="CASTLE"></div></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event','HTMLCanvasElement'])globalThis[k]=dom.window[k];
globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.devicePixelRatio=2;
HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},clearRect(){}});
class Matrix{translate(){return this}scale(){return this}inverse(){return this}multiply(){return this}toString(){return 'matrix(1,0,0,1,0,0)'}toFloat64Array(){return new Float64Array(16)}}globalThis.DOMMatrix=Matrix;
let reduced=false,now=0,next=0,motionChange=()=>{};const frames=new Map();globalThis.matchMedia=()=>({get matches(){return reduced},addEventListener(_,fn){motionChange=fn}});globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=f=>{frames.set(++next,f);return next};globalThis.cancelAnimationFrame=i=>frames.delete(i);
globalThis.checks={draws:[],released:0,created:0,fail:false};
const dir=await mkdtemp(path.join(tmpdir(),'castle-summon-'));const advance=ms=>{now+=ms;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now))};const flush=()=>new Promise(r=>setTimeout(r,0));
try{
 await build({entryPoints:['client/src/ui/castleSummon/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'runtime.mjs'),plugins:[{name:'mock-gpu',setup(b){
 b.onResolve({filter:/boardProjection$/},()=>({path:'projection',namespace:'mock'}));b.onResolve({filter:/^\.\/renderer$/},()=>({path:'renderer',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='projection'?`export const projectedPlacement=()=>new DOMMatrix();`:`export class CastleRenderer{constructor(){checks.created++}drawBoard(host,v,t,m,r,native){if(checks.fail)throw Error('GPU unavailable');checks.draws.push({v,t,native,mounted:host.isConnected});}dispose(){checks.released++}}`}));}}]});
 const {playCastleSummon:play,cancelCastleSummon:cancel,cancelCastleSummons:all}=await import(path.join(dir,'runtime.mjs'));
 const source=document.getElementById('source'),root=document.getElementById('root');
 Object.defineProperties(HTMLElement.prototype,{offsetWidth:{get:()=>64},offsetHeight:{get:()=>100}});
 source.style.transform='rotate(0deg)';source.style.visibility='visible';let impacts=0;
 const p=play(source,{from:{left:0,top:600,width:80,height:125},onImpact:()=>impacts++});await flush();
 assert.deepEqual(checks.draws[0],{v:0,t:0,native:true,mounted:false});assert.equal(source.style.visibility,'visible');assert.equal(document.querySelector('.castle-summon').dataset.variant,'1');
 advance(1239);assert.equal(impacts,0);advance(1);assert.equal(impacts,1);assert.equal(source.style.transform,'rotate(0deg)','native seated transform restored before reveal ends');
 advance(1640);const draws=checks.draws.length;assert.equal(document.querySelector('.castle-summon').dataset.time,'2440');advance(160);assert.equal(await p,true);assert.equal(checks.draws.length,draws,'no empty GPU transfer at the seam');assert.equal(impacts,1);assert.equal(source.style.transform,'rotate(0deg)');
 for(const reason of ['single','root','abort','resize','hidden','disconnect','pagehide','motion']){
  const ac=new AbortController(),p=play(source,{signal:ac.signal});await flush();
  if(reason==='single')cancel(source);if(reason==='root')all(root);if(reason==='abort')ac.abort();if(reason==='resize'||reason==='pagehide')window.dispatchEvent(new Event(reason));
  if(reason==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}if(reason==='disconnect'){source.remove();advance(16)}if(reason==='motion')motionChange();
  assert.equal(await p,false,reason);assert.equal(source.style.visibility,'visible');assert.equal(source.style.transform,'rotate(0deg)');assert.equal(document.querySelectorAll('.castle-summon').length,0);Object.defineProperty(document,'hidden',{configurable:true,value:false});root.append(source);
 }
 const pending=play(source);cancel(source);await flush();assert.equal(await pending,false);
 const a=play(source),b=play(source);await flush();assert.equal(await a,false);cancel(source);assert.equal(await b,false);
 const other=source.cloneNode(true);root.append(other);const count=checks.created;const multi=[play(source),play(other)];await flush();assert.equal(checks.created,count+1,'simultaneous summons share one GPU');assert.equal(document.querySelectorAll('.castle-summon').length,2);cancel(source);assert.equal(document.querySelectorAll('.castle-summon').length,1);advance(2600);assert.deepEqual(await Promise.all(multi),[false,true]);other.remove();
 reduced=true;const created=checks.created;assert.equal(await play(source,{onImpact:()=>impacts++}),true);assert.equal(checks.created,created);reduced=false;
 const ac=new AbortController();ac.abort();assert.equal(await play(source,{signal:ac.signal}),false);source.dataset.cardId='ELF';assert.equal(await play(source),false);source.dataset.cardId='CASTLE';
 const warn=console.warn;console.warn=()=>{};checks.fail=true;const failed=play(source,{onImpact:()=>impacts++});await flush();assert.equal(await failed,false);assert.equal(source.style.visibility,'visible');assert.equal(source.style.transform,'rotate(0deg)');checks.fail=false;console.warn=warn;
 assert.equal(checks.created,checks.released);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.castle-summon').length,0);
 for(const file of ['client/src/ui/anim.ts','client/src/ui/monster/runtime.ts','client/src/ui/summon/runtime.ts'])assert.match(await readFile(file,'utf8'),/isCastle/);
 console.log('PASS Castle 01: native face continuity, contact once, hand flight, quiet ending, cancellation, replacement, concurrent GPU sharing, reduced motion, fallback, disposal');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close()}
