import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['document','window','HTMLElement'])globalThis[key]=dom.window[key];
globalThis.innerWidth=1280;globalThis.innerHeight=720;
const frames=new Map();let frameId=0,clock=performance.now();
globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const step=()=>{clock=Math.max(clock,performance.now())+100;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(clock));};
const motion=new EventTarget();motion.matches=false;globalThis.matchMedia=()=>motion;
const temp=await mkdtemp(path.join(tmpdir(),'lore-entrance-'));
try{
 await build({entryPoints:['client/src/ui/homeEntrance.ts'],bundle:true,loader:{'.css':'empty'},platform:'node',format:'esm',outfile:path.join(temp,'entrance.mjs')});
 const {playHomeEntrance}=await import(path.join(temp,'entrance.mjs'));
 const setup=()=>{
  document.body.innerHTML='<main><div class="lounge-home"><div class="lounge-topbar" style="opacity:.7;transform:translateX(4px)"></div><div class="home-companion" style="transform:scale(.8)"></div></div></main><div class="screen-loader"><div class="loading-ritual"><div class="loading-card--hero"></div></div><span class="loading-title">Ready</span></div>';
  const root=document.querySelector('main'),cover=document.querySelector('.screen-loader');
  cover.getAnimations=()=>[{pause(){},cancel(){}}];
  return {root,cover,controller:new AbortController(),chrome:[...root.querySelectorAll('.lounge-home,.lounge-topbar,.home-companion')].map(el=>({el,opacity:el.style.opacity,transform:el.style.transform}))};
 };
 for(const mode of ['complete','abort','reduced','pre-abort','motion-change']){
  const {root,cover,controller,chrome}=setup();motion.matches=mode==='reduced';
  if(mode==='pre-abort')controller.abort();
  const run=playHomeEntrance(root,cover,controller.signal);
  if(mode==='complete'){
   const shell=root.querySelector('.lounge-home');
   assert.equal(shell.style.opacity,'0','the entire HOME starts hidden');
   root.querySelector('.lounge-topbar').replaceWith(Object.assign(document.createElement('header'),{className:'lounge-topbar',textContent:'Refreshed profile, volume and quests'}));
   assert.equal(shell.style.opacity,'0','a rebuilt header stays behind the same visibility gate');
  }
  step();step();
  if(mode==='abort')controller.abort();
  if(mode==='motion-change')motion.dispatchEvent(new Event('change'));
  if(mode==='complete'||mode==='reduced')for(let i=0;i<45;i++)step();
  await run;
  assert.equal(document.querySelector('.home-entrance-stage'),null,mode+' removes actors');
  assert.equal(frames.size,0,mode+' cancels frame callbacks');
  for(const {el,opacity,transform} of chrome){assert.equal(el.style.opacity,opacity,mode+' restores visibility');assert.equal(el.style.transform,transform,mode+' preserves renderer transforms');}
 }
 console.log('PASS HOME entrance completion, cancellation, reduced motion, pre-abort, preference change; renderer transforms preserved');
}finally{dom.window.close();await rm(temp,{recursive:true,force:true});}
