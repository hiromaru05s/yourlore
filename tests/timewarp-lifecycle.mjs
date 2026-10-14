import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/timewarp-life-');
const dom=new JSDOM('<body><div id="board"><button id="endBtn"></button></div></body>',{pretendToBeVisual:true});
const w=dom.window;for(const name of ['window','document','HTMLElement','HTMLCanvasElement'])globalThis[name]=name==='window'?w:w[name];
globalThis.innerWidth=1280;globalThis.innerHeight=900;globalThis.CSS={escape:x=>x};
let reduced=false;globalThis.matchMedia=()=>({matches:reduced});let now=0;
globalThis.requestAnimationFrame=cb=>setTimeout(()=>{now+=1000;cb(performance.now()+now);},1);globalThis.cancelAnimationFrame=clearTimeout;
w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
globalThis.twTest={draws:[],disposed:0,wait:false,pending:[],instances:0};
try{
 await build({entryPoints:['client/src/ui/timewarp/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/runtime.mjs',plugins:[{name:'gpu-boundary',setup(b){
 b.onResolve({filter:/\.\/(spacetime|snapshot)$/},a=>({path:a.path,namespace:'boundary'}));
 b.onResolve({filter:/\/(cardSurface|cardView|cards)$/},a=>({path:a.path,namespace:'boundary'}));
 b.onLoad({filter:/.*/,namespace:'boundary'},a=>({contents:a.path.endsWith('spacetime')?`export const CAST_MS=4400,RELEASE_MS=2600;export class Spacetime{constructor(){twTest.instances++;this.canvas=document.createElement('canvas');this.canvas.className='timewarp-optics';document.body.append(this.canvas)}draw(phase){twTest.draws.push(phase)}updateBackground(){}dispose(){if(!this.canvas.isConnected)return;twTest.disposed++;this.canvas.remove()}}`:a.path.endsWith('snapshot')?`export async function snapshotBoard(){if(twTest.wait)await new Promise(r=>twTest.pending.push(r));return document.createElement('canvas')}`:a.path.endsWith('cardView')?`export function cardEl(){return document.createElement('div')}`:a.path.endsWith('cardSurface')?`export const CARD_PADDING=.03;export async function captureCardSurface(){return {face:document.createElement('canvas'),back:document.createElement('canvas')}}`:`export const DB={TIMEWARP:{id:'TIMEWARP',uid:'source',cost:10}},FRAME_BACK='back'` }));
 }}]});
 const {TimewarpPresentation}=await import(dir+'/runtime.mjs');const root=document.getElementById('board');const state=n=>({cur:0,over:false,players:[{skipTurns:0,skipTurnSources:[]},{skipTurns:n,skipTurnSources:Array(n).fill('TIMEWARP')}]});
 const settle=()=>new Promise(r=>setTimeout(r,25));const card={id:'TIMEWARP',uid:'source',cost:10};
 const fx=new TimewarpPresentation(root,0);await fx.cast(0,card);assert(twTest.draws.includes('cast'));assert.equal(twTest.draws.at(-1),'hold');fx.sync(state(1));assert.equal(document.querySelectorAll('.timewarp-optics').length,1);await fx.release(1);fx.sync(state(0));assert.equal(document.querySelectorAll('.timewarp-optics').length,0);
 // Rejoin restores the reservation without replaying the spell or die.
 twTest.draws=[];fx.sync(state(2));await settle();assert.deepEqual([...new Set(twTest.draws)],['hold']);await fx.release(1);fx.sync(state(1));await settle();assert.equal(document.querySelectorAll('.timewarp-optics').length,1);
 // Cancellation during a delayed capture settles immediately and cannot spawn a late canvas.
 fx.destroy();twTest.wait=true;const delayed=new TimewarpPresentation(root,0);let finished=false;const pending=delayed.cast(0,card).then(()=>finished=true);await settle();delayed.destroy();await pending;assert(finished);twTest.pending.splice(0).forEach(r=>r());await settle();assert.equal(document.querySelectorAll('.timewarp-optics').length,0);
 twTest.wait=false;reduced=true;const minimal=new TimewarpPresentation(root,1);await minimal.cast(1,card);await minimal.release(0);minimal.destroy();assert.equal(document.querySelectorAll('.timewarp-optics').length,0);
 const hidden=new TimewarpPresentation(root,0);hidden.sync(state(1));await settle();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(document.querySelectorAll('.timewarp-optics').length,0);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new w.Event('visibilitychange'));await settle();assert.equal(document.querySelectorAll('.timewarp-optics').length,1);hidden.sync({...state(1),over:true});assert.equal(document.querySelectorAll('.timewarp-optics').length,0);hidden.destroy();assert.equal(twTest.instances,twTest.disposed);
 console.log('PASS Timewarp lifecycle: cast/hold/manual release, rejoin, stacked reservations, abort during capture, reduced motion, hide/resume, game over, exact GPU disposal');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
