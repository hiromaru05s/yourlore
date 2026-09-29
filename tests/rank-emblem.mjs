import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tmp=await mkdtemp(join(tmpdir(),'lore-crest-'));
try {
 await build({entryPoints:['client/src/ui/rankPresentation.ts'],bundle:true,platform:'node',format:'esm',outfile:join(tmp,'presentation.mjs'),loader:{'.css':'empty'}});
 const dom=new JSDOM('<div id="overlayRoot"></div>',{url:'http://localhost',pretendToBeVisual:true});
 for(const name of ['document','MutationObserver','sessionStorage'])globalThis[name]=dom.window[name];
 let reduced=false,hidden=false,now=0,next=0;const frames=new Map();
 Object.defineProperty(document,'hidden',{get:()=>hidden});
 globalThis.matchMedia=()=>({matches:reduced});
 globalThis.performance={now:()=>now};
 globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const {RankPresentation}=await import(join(tmp,'presentation.mjs'));
 const mount=(change)=>{now=0;const el=document.createElement('div');document.querySelector('#overlayRoot').append(el);const p=new RankPresentation();p.set(change);p.mount(el);return {p,el};};
 const tick=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
 const tiers=['iron','bronze','silver','gold','platinum','diamond','master','gm'];
 const mmrs=[1020,1038,1098,1162,1258,1408,1558,1613];
 for(let i=1;i<tiers.length;i++){
  const {p,el}=mount({before:mmrs[i]-18,after:mmrs[i],tierBefore:tiers[i-1],tierAfter:tiers[i]});
  tick(2100);assert.equal(el.querySelector('.rank-score b').textContent,String(mmrs[i]));
  tick(2650);const incoming=el.querySelector('.rank-new');
  assert.notEqual(incoming.style.getPropertyValue('--crest-wing'),'0deg','wing should articulate');
  assert.notEqual(incoming.style.getPropertyValue('--crest-crown'),'0px','crown should arrive separately');
  tick(4250);assert.equal(el.dataset.phase,'settled');assert.equal(incoming.style.opacity,'1');assert.equal(incoming.style.getPropertyValue('--crest-wing'),'0deg');
  const ids=[...el.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length,'old/new gradients must not collide');
  for(const path of el.querySelectorAll('[fill^="url"]'))assert.ok(el.querySelector('#'+path.getAttribute('fill').slice(5,-1)),'gradient reference resolves');
  assert.equal(frames.size,0);p.destroy();el.remove();
 }
 for(const change of [{before:1180,after:1198},{before:1180,after:1164},{before:1200,after:1200}]){
  const {p,el}=mount(change);tick(2600);assert.equal(el.querySelector('.rank-old').style.getPropertyValue('--crest-wing'),'0deg','ordinary MMR change preserves assembled metal');tick(3000);assert.equal(el.dataset.phase,'settled');p.destroy();el.remove();
 }
 const demotion=mount({before:1613,after:1595,tierBefore:'gm',tierAfter:'master',matchId:'receipt'});tick(2500);hidden=true;document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(demotion.el.dataset.phase,'settled');assert.equal(demotion.el.querySelector('.rank-score b').textContent,'1595');assert.equal(frames.size,0);demotion.p.destroy();demotion.el.remove();hidden=false;
 const replay=mount({before:1613,after:1595,tierBefore:'gm',tierAfter:'master',matchId:'receipt'});assert.equal(replay.el.dataset.phase,'settled');assert.equal(frames.size,0);replay.p.destroy();replay.el.remove();
 reduced=true;const accessible=mount({before:1144,after:1162});assert.equal(accessible.el.dataset.phase,'settled');assert.equal(frames.size,0);accessible.p.destroy();accessible.el.remove();reduced=false;
 const detached=mount({before:1144,after:1162});tick(2550);detached.el.remove();await new Promise(r=>setTimeout(r,0));assert.equal(frames.size,0);detached.p.destroy();
 const closed=mount({before:1144,after:1162});tick(2600);closed.p.destroy();assert.equal(frames.size,0);
 dom.window.close();console.log('PASS: seven promotions, same-tier gain/loss/draw, GM demotion, distinct SVG IDs, hidden/replay/reduced-motion/detach cleanup.');
} finally {await rm(tmp,{recursive:true,force:true});}
