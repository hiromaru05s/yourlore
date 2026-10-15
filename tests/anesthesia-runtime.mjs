import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anesthesia-dom-'));
try{
 await build({entryPoints:['client/src/ui/anesthesia/runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/runtime.mjs',plugins:[{name:'presentation-owner-seam',setup(b){b.onResolve({filter:/monster\/runtime$/},()=>({path:'owners',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const monsterPresentationNodes = source => [source,...document.querySelectorAll(`[data-present-source="${source.dataset.uid}"]`)];'}));}}]});
 const dom=new JSDOM('<div id="root"><div class="zone-mon"></div></div>');const {window}=dom;let hidden=false,now=0,next=0;const frames=new Map(),animations=[];
 const motion=new window.EventTarget();motion.matches=false;
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(t,k)=>k in t?t[k]:()=>{}});
 window.HTMLCanvasElement.prototype.getContext=()=>context;
 window.HTMLElement.prototype.animate=function(){const a={currentTime:0,id:'',canceled:false,pause(){},cancel(){this.canceled=true;}};animations.push(a);return a;};
 Object.defineProperty(window.document,'hidden',{get:()=>hidden});
 Object.assign(globalThis,{window,document:window.document,matchMedia:()=>motion,requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id)});
 const oldPerformance=globalThis.performance;Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 const {AnesthesiaPresentation}=await import(dir+'/runtime.mjs'),root=document.querySelector('#root'),zone=root.querySelector('.zone-mon');
 const card=uid=>{const n=document.createElement('div');n.className='card';n.dataset.uid=uid;zone.append(n);return n;};
 const a=card('a'),late=card('late'),foreign=card('foreign');let state={turn:5,over:false,players:[{field:[{uid:'a',immuneDamageTurn:5},{uid:'late'}]},{field:[{uid:'foreign'}]}]};
 const effect=new AnesthesiaPresentation(root);effect.sync(state);assert.equal(document.querySelectorAll('.anesthesia-status').length,1);assert.equal(a.dataset.anesthesiaProtected,'true');assert(!late.querySelector('canvas'));assert(!foreign.querySelector('canvas'));
 const step=t=>{now=t;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(t));};
 // A real actor copies the source DOM. The runtime replaces inherited blank canvas with one owned surface.
 const clone=a.cloneNode(true);clone.removeAttribute('data-uid');clone.dataset.presentSource='a';document.body.append(clone);step(40);assert.equal(clone.querySelectorAll('canvas').length,1);assert.equal(document.querySelectorAll('.anesthesia-status').length,2);
 effect.sync(structuredClone(state));assert.equal(document.querySelectorAll('.anesthesia-status').length,2);
 hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(document.querySelectorAll('.anesthesia-status').length,0);assert.equal(frames.size,0);assert(animations.every(a=>a.canceled));
 hidden=false;document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(document.querySelectorAll('.anesthesia-status').length,2);
 motion.matches=true;motion.dispatchEvent(new window.Event('change'));assert(animations.every(a=>a.canceled));
 motion.matches=false;motion.dispatchEvent(new window.Event('change'));effect.advanceTurn(6);step(80);assert.equal(a.dataset.anesthesiaProtected,'false');step(500);assert.equal(document.querySelectorAll('.anesthesia-status').length,0);assert.equal(frames.size,0);
 state={...state,turn:6,players:[{field:[{uid:'a',immuneDamageTurn:6},{uid:'late'}]},{field:[{uid:'foreign'}]}]};effect.sync(state);assert.equal(document.querySelectorAll('.anesthesia-status').length,2);
 a.remove();clone.remove();step(540);assert.equal(document.querySelectorAll('.anesthesia-status').length,0);
 effect.dispose();assert.equal(frames.size,0);assert(animations.every(a=>a.canceled));
 Object.defineProperty(globalThis,'performance',{value:oldPerformance,configurable:true});dom.window.close();
 console.log(JSON.stringify({passed:true,checks:['target-only','actor-clone-replacement','rerender-deduplication','hidden-cancel','visible-restore','reduced-motion','turn-expiry','regrant','removed-card','dispose']}));
}finally{await fs.rm(dir,{recursive:true,force:true});}
