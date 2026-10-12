import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/releases/2026-10-13-casino-curtain/qa';await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],warnings=[],results=[];p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().includes('[casino-summon]'))warnings.push(m.text())});
try{
 await p.goto('http://127.0.0.1:57352/casino-runtime.html');await p.waitForFunction(()=>window.casinoQA?.ready);
 const now=Date.now();await p.clock.install({time:new Date(now-1000)});await p.clock.pauseAt(new Date(now));
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:1000});await p.clock.runFor(800);
  for(const side of [0,1])for(const path of ['direct','hand','generated']){
   await p.evaluate(d=>{
    window.done=false;window.firstMount=null;window.mounts=0;
    const obs=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.matches('.casino-summon')){
     window.mounts++;const c=n.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
     window.firstMount={time:n.dataset.time,painted:data.some((a,i)=>i%4===3&&a>20)};
    }});obs.observe(document.body,{childList:true});
    window.casinoQA.run('CASINO',d.side,d.path).then(()=>{window.done=true;obs.disconnect()});
   },{side,path});
   await p.clock.runFor(32);await p.locator('.casino-summon').waitFor();
   const initial=await p.evaluate(side=>{
    const host=document.querySelector('.casino-summon'),face=host.querySelector('.card'),target=document.querySelector(`[data-uid="target-${side}"]`);
    const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
    return{first:window.firstMount,variant:host.dataset.variant,rawGhosts:[...document.querySelectorAll('.fx-field-ghost,.fx-card-flight,.cast-reveal')].filter(n=>getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().left>=0).length,frame:rect(face),target:rect(target),clip:getComputedStyle(host.querySelector('.card-art')).clipPath};
   },side);
   assert.equal(initial.first.time,'0');assert(initial.first.painted);assert.equal(initial.variant,'2');assert.equal(initial.rawGhosts,0);assert(initial.clip.includes('celestial-base-spell'));
   if(path!=='generated')for(const key of ['x','y','width','height'])assert(Math.abs(initial.frame[key]-initial.target[key])<2,`card frame mismatch ${key}: ${JSON.stringify(initial)}`);
   assert.equal(await p.locator('.slate-summon,.gambler-summon,.dungeon-summon,[data-tribe-summon]').count(),0);
   await p.clock.runFor(900);if(path==='hand')await p.screenshot({path:`${out}/${width}-${side}-open.png`});
   await p.clock.runFor(1900);await p.waitForFunction(()=>window.done);assert.equal(await p.locator('.casino-summon').count(),0);assert.equal(await p.evaluate(()=>window.mounts),1);assert.equal(await p.locator(`[data-uid="target-${side}"]`).evaluate(n=>n.style.visibility),'');
   results.push({width,side,path,initial});console.log('PASS',width,side,path);
  }
 }
 for(const reason of ['skip','cancel','resize']){
  await p.evaluate(()=>{window.done=false;window.casinoQA.run('CASINO',0,'hand').then(()=>window.done=true)});await p.clock.runFor(32);await p.locator('.casino-summon').waitFor();
  if(reason==='skip')await p.evaluate(()=>window.casinoQA.skip(true));if(reason==='cancel')await p.evaluate(()=>window.casinoQA.cancel());if(reason==='resize')await p.setViewportSize({width:400,height:1000});
  await p.waitForFunction(()=>window.done);assert.equal(await p.locator('.casino-summon').count(),0);await p.evaluate(()=>window.casinoQA.skip(false));results.push({reason,restored:true});
 }
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{window.done=false;window.casinoQA.run('CASINO',0,'hand').then(()=>window.done=true)});await p.clock.runFor(100);await p.waitForFunction(()=>window.done);assert.equal(await p.locator('.casino-summon').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);await fs.writeFile(out+'/runtime.json',JSON.stringify({results,errors,warnings,reduced:true},null,2));console.log('PASS all casino runtime routes, first frame, fixed size, cancellation and reduced motion');
}catch(e){await p.screenshot({path:out+'/failure.png'});console.log({errors,warnings});throw e;}finally{await b.close()}
