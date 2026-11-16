import assert from 'node:assert/strict';
import {build} from 'esbuild';import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="source"></div><div id="target"></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','getComputedStyle'])globalThis[k]=dom.window[k];
let clock=0,frames=new Map(),id=0,reduced=false;
const realPerformance=globalThis.performance;globalThis.performance={now:()=>clock};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id;};globalThis.cancelAnimationFrame=n=>frames.delete(n);
class Matrix{translate(){return this;}scale(){return this;}multiply(){return this;}rotate(){return this;}toString(){return 'matrix(1,0,0,1,0,0)';}toFloat64Array(){return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}}
globalThis.DOMMatrix=Matrix;
dom.window.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){},clearRect(){}});
Object.defineProperties(HTMLElement.prototype,{offsetWidth:{get:()=>100},offsetHeight:{get:()=>100}});HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:100,height:150});
const dir=await mkdtemp(path.join(tmpdir(),'persistent-flight-'));const flush=()=>new Promise(r=>setTimeout(r,0));const advance=ms=>{clock+=ms;for(const [key,f]of [...frames]){frames.delete(key);f(clock);}};
const modules={
 './boardProjection':'export const projectedPlacement=()=>new DOMMatrix();',
 './questFold':'export function nativeQuestGhost(target,face){const host=document.createElement("div");host.className="fx-field-ghost";host.append(face);document.body.append(host);return host;}',
 './persistentFlightRenderer':'export function frameGlint(){} export function paintPersistentTrail(){}'
};
try{
 await build({entryPoints:['client/src/ui/persistentFlight.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs'),plugins:[{name:'controlled-flight',setup(b){b.onResolve({filter:/.*/},a=>modules[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:modules[a.path]}));}}]});
 const {flyPersistentIntoSlot:run}=await import(path.join(dir,'test.mjs'));const source=document.getElementById('source'),target=document.getElementById('target');
 const call=controller=>run(source,target,document.createElement('div'),controller.signal);const clean=()=>document.querySelectorAll('.fx-field-ghost').forEach(n=>n.remove());
 const controller=new AbortController();controller.abort();assert.equal(await call(controller),false);
 reduced=true;assert.equal(await call(new AbortController()),true);assert.equal(document.querySelector('canvas'),null);clean();reduced=false;
 source.style.visibility='';
 let pending=call(new AbortController());await flush();
 const face=document.querySelector('.fx-field-ghost > div');
 for(const ms of [150,75,75,75,75,75,50,40]){
   advance(ms);
   assert(Math.max(Number(source.style.opacity),Number(face.style.opacity))>=.999,'an opaque print spans every handoff');
   assert.equal(source.style.transform,face.style.transform);
 }
 assert.equal(document.querySelector('canvas').dataset.time,'879');
 advance(1);assert.equal(await pending,true);assert.equal(face.style.opacity,'1');
 assert.equal(document.querySelector('canvas'),null);assert.equal(frames.size,0);clean();
 source.style.visibility='';const original=source.style.cssText;
 const active=new AbortController();pending=call(active);await flush();advance(170);active.abort();
 assert.equal(await pending,false);assert.equal(frames.size,0);assert.equal(source.style.cssText,original);
 assert.equal(document.querySelector('.fx-field-ghost'),null);assert.equal(document.querySelector('canvas'),null);
 pending=call(new AbortController());await flush();target.remove();advance(16);
 assert.equal(await pending,false);assert.equal(frames.size,0);assert.equal(document.querySelector('.fx-field-ghost'),null);
 console.log('PASS persistent flight: opaque native handoff, timeline, reduced motion, abort, disconnection and cleanup');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=realPerformance;}
