import assert from 'node:assert/strict';
import {build} from 'esbuild';import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dom=new JSDOM('<div id="source"></div><div id="target"></div>',{pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement'])globalThis[k]=dom.window[k];
let clock=0,frames=new Map(),id=0,reduced=false,allocated=0,disposed=0,fail=false,draws=[],capture;
const realPerformance=globalThis.performance;globalThis.performance={now:()=>clock};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
globalThis.matchMedia=()=>({matches:reduced});globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id;};globalThis.cancelAnimationFrame=n=>frames.delete(n);
class Matrix{translate(){return this;}scale(){return this;}multiply(){return this;}rotate(){return this;}toString(){return 'matrix(1,0,0,1,0,0)';}toFloat64Array(){return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}}
globalThis.DOMMatrix=Matrix;
dom.window.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){},clearRect(){}});
Object.defineProperties(HTMLElement.prototype,{offsetWidth:{get:()=>100},offsetHeight:{get:()=>100}});HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:100,height:150});
globalThis.__capture=()=>capture??Promise.resolve({face:document.createElement('canvas')});
globalThis.__renderer=class{constructor(){allocated++;this.canvas=document.createElement('canvas');}resize(){}cardBounds(){return{width:.3,height:.6,cx:.5,cy:.5};}draw(_variant,ms){if(fail)throw Error('render failure');draws.push(ms);}dispose(){disposed++;}};
const dir=await mkdtemp(path.join(tmpdir(),'quest-pact-'));const flush=()=>new Promise(r=>setTimeout(r,0));const advance=ms=>{clock+=ms;for(const [key,f]of [...frames]){frames.delete(key);f(clock);}};
const modules={
 '../shared/cards':'export const FRAME_BACK="";',
 './cardSurface':'export const CARD_PADDING=.12;export const captureCardSurface=()=>globalThis.__capture();',
 './boardProjection':'export const projectedPlacement=()=>new DOMMatrix();',
 './questPact/renderer':'export const QuestPactRenderer=globalThis.__renderer;'
};
try{
 await build({entryPoints:['client/src/ui/questFold.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs'),plugins:[{name:'controlled-flight',setup(b){b.onResolve({filter:/.*/},a=>modules[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:modules[a.path]}));}}]});
 const {foldQuestIntoSlot:run}=await import(path.join(dir,'test.mjs'));const source=document.getElementById('source'),target=document.getElementById('target');
 const call=controller=>run(source,target,document.createElement('div'),controller.signal);const clean=()=>document.querySelectorAll('.fx-field-ghost').forEach(n=>n.remove());
 let controller=new AbortController();controller.abort();assert.equal(await call(controller),false);assert.equal(allocated,0);
 controller=new AbortController();let finish;capture=new Promise(r=>finish=r);let pending=call(controller);await flush();controller.abort();assert.equal(await pending,false);finish({face:document.createElement('canvas')});await flush();assert.equal(allocated,0);assert.equal(document.querySelectorAll('.fx-field-ghost').length,0);capture=undefined;
 reduced=true;assert.equal(await call(new AbortController()),true);assert.equal(allocated,0);clean();reduced=false;
 controller=new AbortController();pending=call(controller);await flush();advance(880);assert.equal(draws.at(-1),880);advance(3920);assert.equal(await pending,true);assert.equal(draws.at(-1),4800);assert.equal(disposed,allocated);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('canvas').length,0);assert.equal(source.style.visibility,'');assert.equal(document.querySelectorAll('.fx-field-ghost').length,1);clean();
 controller=new AbortController();pending=call(controller);await flush();controller.abort();assert.equal(await pending,false);assert.equal(disposed,allocated);assert.equal(frames.size,0);assert.equal(document.querySelectorAll('.fx-field-ghost').length,0);
 fail=true;assert.equal(await call(new AbortController()),false);assert.equal(disposed,allocated);assert.equal(source.style.visibility,'');fail=false;
 const pair=[call(new AbortController()),call(new AbortController())];await flush();assert.equal(document.querySelectorAll('.quest-fold-canvas').length,2);advance(4800);assert.deepEqual(await Promise.all(pair),[true,true]);assert.equal(disposed,allocated);clean();
 pending=call(new AbortController());await flush();Object.defineProperty(document,'hidden',{configurable:true,value:true});advance(16);assert.equal(await pending,false);delete document.hidden;assert.equal(disposed,allocated);assert.equal(document.querySelectorAll('.quest-fold-host').length,0);
 pending=call(new AbortController());await flush();target.remove();advance(16);assert.equal(await pending,false);assert.equal(frames.size,0);assert.equal(disposed,allocated);assert.equal(document.querySelectorAll('.fx-field-ghost').length,0);
 assert.ok(!/fillText|strokeText|\.font\s*=/.test(await (await import('node:fs/promises')).readFile('client/src/ui/questPact/textures.ts','utf8')));
 console.log('PASS: language-independent path texture; approved full duration; pre-abort; capture cancellation with late resolution; reduced motion without GPU; normal native handoff; active abort; renderer failure; disconnected target; concurrent casts; document hidden; renderer/RAF/source cleanup');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();globalThis.performance=realPerformance;delete globalThis.__capture;delete globalThis.__renderer;}
