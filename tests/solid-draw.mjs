import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-solid-draw-');
const dom=new JSDOM('<div id="pile-myDeck"><i class="pile-draw-anchor"></i></div><div id="hand"><div class="card" data-uid="old"></div><div class="card" data-uid="new"></div></div>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Element','Node','localStorage','navigator','Image'])Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
globalThis.matchMedia=()=>({matches:false});
let painted=false,delay=false,release;
globalThis.requestAnimationFrame=cb=>setTimeout(()=>{painted=true;cb(performance.now());},0);
globalThis.cancelAnimationFrame=clearTimeout;
const rect=(x,w)=>({left:x,top:80,width:w,height:w*1.56});
const deck=document.getElementById('pile-myDeck'),anchor=deck.firstElementChild,cards=[...document.querySelectorAll('.card')];
deck.getBoundingClientRect=()=>rect(200,100);
anchor.getBoundingClientRect=()=>rect(210,painted?80:0);
cards.forEach(n=>n.getBoundingClientRect=()=>rect(300,100));
const calls=[];
globalThis.__draw=async args=>{calls.push(args);assert.equal(args.cards[0].style.visibility,'hidden');if(delay)await new Promise(r=>{release=r;args.signal.addEventListener('abort',r,{once:true});});if(!args.signal.aborted)args.cards.forEach(args.onLand);};
try{
 await build({stdin:{contents:`export {animateDraw,setFxSkip} from './client/src/ui/anim';export {arrivingHandUids} from './client/src/ui/handGeometry';export {createStockGeometry,stockMatrix} from './client/src/ui/drawStock';export {Vector3} from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},outfile:dir+'/test.mjs',plugins:[{name:'capture-flight',setup(b){b.onResolve({filter:/^\.\/paperDraw$/},()=>({path:'flight',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const drawPaperCards=args=>globalThis.__draw(args);',loader:'js'}));}}]});
 const {animateDraw,setFxSkip,arrivingHandUids,createStockGeometry,stockMatrix,Vector3}=await import(dir+'/test.mjs');
 // Regression: a freshly rebuilt 3D pile anchor has zero bounds until paint.
 await animateDraw(document.getElementById('hand'),1,'me',{uids:['new']});
 assert.equal(calls.length,1);assert.equal(calls[0].origin.width,80);assert.equal(calls[0].origin.left,210);
 assert.deepEqual(calls[0].cards,[cards[1]]);assert(cards.every(n=>n.style.visibility===''));
 // Bad/missing projections fall back to the real pile, without silently skipping.
 anchor.getBoundingClientRect=()=>rect(0,0);
 await animateDraw(document.getElementById('hand'),1,'me',{uids:['new']});
 assert.equal(calls.at(-1).origin.width,100);
 // Resize and fast-forward must restore cards and release the active flight.
 for(const cancel of [()=>window.dispatchEvent(new dom.window.Event('resize')),()=>setFxSkip(true)]){
  delay=true;const pending=animateDraw(document.getElementById('hand'),1,'me',{uids:['new']});
  while(!release)await new Promise(r=>setTimeout(r,1));cancel();await pending;release=null;assert(cards.every(n=>n.style.visibility===''));setFxSkip(false);
 }
 // The merged opening uses an external abort while the solid arrival is active.
 const openingAbort=new AbortController();delay=true;
 const openingDraw=animateDraw(document.getElementById('hand'),1,'me',{uids:['new'],signal:openingAbort.signal});
 while(!release)await new Promise(r=>setTimeout(r,1));openingAbort.abort();await openingDraw;release=null;
 assert(calls.at(-1).signal.aborted);assert(cards.every(n=>n.style.visibility===''));
 const beforeAborted=calls.length;
 await animateDraw(document.getElementById('hand'),1,'me',{signal:openingAbort.signal});
 assert.equal(calls.length,beforeAborted);
 assert.deepEqual(arrivingHandUids([{uid:'kept'},{uid:'used'}],[{uid:'kept'},{uid:'drawn'}],3),['drawn']);
 assert.deepEqual(arrivingHandUids([],[{uid:'drawn'}],0),[]);
 // Volume must remain visible edge-on, and terminate exactly on the native face.
 const geometry=createStockGeometry(100,156);geometry.computeBoundingBox();
 assert(Math.abs(geometry.boundingBox.max.z)<1e-5);assert(Math.abs(geometry.boundingBox.min.z+2.4)<1e-5);
 const side=stockMatrix({x:700,y:450,z:50,pitch:0,yaw:90,bank:0,scale:1},1280,720);
 const a=new Vector3(0,0,0).applyMatrix4(side),b=new Vector3(0,0,-2.4).applyMatrix4(side);assert(Math.abs(a.x-b.x)>2.39);
 // Browser CSS uses a downwards Y axis; native landing corners must coincide.
 for(const bank of [-20,0,20]){
  const pose={x:700,y:600,z:0,pitch:0,yaw:0,bank,scale:.65},m=stockMatrix(pose,1280,720),angle=bank*Math.PI/180;
  for(const [x,y] of [[-50,-78],[50,-78],[50,78],[-50,78]]){
   const actual=new Vector3(x,-y,0).applyMatrix4(m),px=actual.x+640,py=360-actual.y;
   assert(Math.abs(px-(pose.x+.65*(x*Math.cos(angle)-y*Math.sin(angle))))<1e-7);
   assert(Math.abs(py-(pose.y+.65*(x*Math.sin(angle)+y*Math.cos(angle))))<1e-7);
  }
 }
 geometry.dispose();console.log('PASS: deferred pile projection, fallback, incoming-only selection, resize/fast-forward restoration, solid edge-on volume and native landing alignment');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
