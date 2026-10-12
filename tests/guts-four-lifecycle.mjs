import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'guts-four-'));
const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;
// Geometry-only canvas double. This checks invalid coordinates and ownership;
// browser captures remain the evidence for appearance, projection and motion.
let calls=0;
const ctx=new Proxy({}, {get:(_t,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>{calls++;for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),`${String(key)} received ${x}`)},set:()=>true});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
try{
 await build({entryPoints:['client/src/dev/guts-four/rig.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'rig.mjs')});
 const {EnduranceRig}=await import(path.join(dir,'rig.mjs'));let cases=0;
 for(const variant of [0,1,2,3])for(const count of [1,2,3])for(const direction of [-1,1]){
  const card=document.createElement('div');card.className='card';card.setAttribute('style','opacity: 0.9;');
  card.innerHTML=`<span class="ad-def"><b class="seal-value">9</b></span><div class="card-status"><span data-psv="guts" title="original"><b>${count}</b></span></div>`;
  document.querySelector('main').append(card);let width=0;Object.defineProperty(card,'offsetWidth',{get:()=>width});Object.defineProperty(card,'offsetHeight',{get:()=>width/0.64});
  const baseStyle=card.getAttribute('style'),baseStatus=card.querySelector('.card-status').innerHTML;
  // A hidden comparison can be rebuilt while the real-board pane is visible.
  const rig=new EnduranceRig(card,variant,count,direction);rig.render(740);width=160;rig.render(719);
  assert.equal(card.querySelector('.seal-value').textContent,'9');assert.equal(card.querySelector('[data-psv] b').textContent,String(count));
  for(let n=0;n<20;n++)rig.render(1070);
  assert.equal(card.querySelector('.seal-value').textContent,'1');assert.equal(card.querySelector('[data-psv] b')?.textContent??'0',String(count-1));assert.equal(card.querySelectorAll('canvas').length,1);
  rig.render(1070,false,false);assert.equal(card.querySelector('.seal-value').textContent,'9');
  rig.render(810,true);assert.equal(card.style.translate,'0 0px');assert.equal(card.style.rotate,'0deg');
  for(const t of [720,745,880,1400,1800,2300,2800])rig.render(t);
  assert.equal(rig.active,false);assert.equal(card.querySelector('.seal-value').textContent,'1');
  rig.reset();assert.equal(card.querySelector('.seal-value').textContent,'9');
  rig.render(960);rig.dispose();assert.equal(card.querySelectorAll('canvas').length,0);assert.equal(card.getAttribute('style'),baseStyle);assert.equal(card.querySelector('.card-status').innerHTML,baseStatus);assert.equal(card.dataset.endurance,undefined);
  card.remove();cases++;
 }
 console.log(JSON.stringify({status:'passed',cases,finiteCanvasCalls:calls,checks:['hidden to visible','repeat without double consumption','invalid trigger','reduced motion','end state','reset','dispose and exact restoration']},null,2));
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
