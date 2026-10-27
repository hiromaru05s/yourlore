import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body></body>',{url:'http://localhost'});
for(const key of ['document','window','HTMLElement','HTMLCanvasElement','AbortController'])globalThis[key]=dom.window[key];
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.devicePixelRatio=1;
globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>1;
const pending=new Map();globalThis.__loadInk=mode=>{let task=pending.get(mode);if(!task){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});task={promise,resolve,reject};pending.set(mode,task);}return task.promise;};
let contexts=0,programs=0,uploads=[],deleted=0,lost=false,uniformReads=0;
const gl=new Proxy({
 FRAMEBUFFER_COMPLETE:1,COMPILE_STATUS:2,LINK_STATUS:3,
 getExtension:n=>n==='WEBGL_lose_context'?{loseContext(){lost=true;}}:{},
 getShaderParameter:()=>true,getProgramParameter:()=>true,checkFramebufferStatus:()=>1,isContextLost:()=>lost,
 getUniformLocation(){uniformReads++;return null;},
 createProgram(){programs++;return {};},texImage2D(...args){const image=args.at(-1);if(image?.mode)uploads.push(image.mode);},deleteTexture(){deleted++;},
},{get:(o,k)=>k in o?o[k]:String(k).startsWith('create')?()=>({}):()=>{}});
HTMLCanvasElement.prototype.getContext=()=>{contexts++;return gl;};
const temp=await mkdtemp(path.join(tmpdir(),'lore-ink-lifecycle-'));
try{
 await build({entryPoints:['client/src/ui/homeDuelInk.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'ink.mjs'),plugins:[{name:'images',setup(b){b.onResolve({filter:/homeDuelAssets$/},()=>({path:'images',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const loadHomeDuelImage=mode=>globalThis.__loadInk(mode);'}));}}]});
 const {HomeDuelInk}=await import(path.join(temp,'ink.mjs'));
 const host=document.createElement('button');document.body.append(host);
 const ink=new HomeDuelInk(host,'ranked');ink.setMode('single');ink.setMode('normal');
 pending.get('normal').resolve({mode:'normal'});pending.get('single').resolve({mode:'single'});pending.get('ranked').resolve({mode:'ranked'});await ink.ready;
 assert.deepEqual(uploads,['ranked','normal'],'Obsolete selection must not repaint over the latest mode');assert.equal(host.dataset.ready,'true');assert.equal(contexts,1);assert.equal(programs,9);
 ink.step(.016);const reads=uniformReads;
 const canvas=ink.canvas;
 for(const mode of ['single','normal','ranked','single','ranked']){ink.setMode(mode);await ink.ready;assert.equal(host.dataset.ready,'true');assert.equal(ink.canvas,canvas);}
 ink.step(.016);assert.equal(uniformReads,reads,'Frames and mode changes reuse shader locations, including inactive uniforms');
 assert.equal(contexts,1);assert.equal(programs,9,'Mode changes must not compile more shaders');
 ink.canvas.dispatchEvent(new dom.window.Event('webglcontextlost'));assert.equal(host.dataset.motion,'static');assert.equal(host.dataset.ready,undefined);
 ink.destroy();assert.equal(host.querySelector('canvas'),null);assert.equal(deleted,10,'Destroy releases nine render targets and the source texture');
 pending.clear();uploads=[];lost=false;
 const next=new HomeDuelInk(host,'ranked');next.setMode('single');next.destroy();pending.get('ranked').resolve({mode:'ranked'});pending.get('single').resolve({mode:'single'});await next.ready;
 assert.deepEqual(uploads,[],'Unmount during loading must never upload or revive disposed GPU resources');assert.equal(host.querySelector('canvas'),null);
 console.log('PASS reusable HOME ink: rapid selection, latest-result ownership, one context/program set, context loss fallback and complete disposal');
}finally{await rm(temp,{recursive:true,force:true});dom.window.close();delete globalThis.__loadInk;}
