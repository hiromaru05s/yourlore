import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {chromium} from '/tmp/lore-target-browser-tools/node_modules/playwright/index.mjs';
const out='docs/releases/2026-10-09-gambler-wheel/qa',b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1280,height:900}}),errors=[],warnings=[],results=[];p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().includes('[gambler-summon]'))warnings.push(m.text())});
try{
 await p.goto('http://127.0.0.1:55009/gambler-runtime.html');await p.waitForFunction(()=>window.gamblerQA?.ready);
 const first=await p.evaluate(async()=>{
  const {Renderer}=await import('/src/ui/gamblerSummon/renderer.ts');const r=new Renderer(),c=document.createElement('canvas');const faces=['#ff0000','#0000ff'].map(color=>{const a=document.createElement('canvas');a.width=128;a.height=200;a.getContext('2d').fillStyle=color;a.getContext('2d').fillRect(0,0,128,200);return a});
  const shot=(face,v,t)=>{r.draw(c,face,v,t,!!v,false,true);return c.toDataURL()};const records=[0,1].map(v=>({variant:v+1,firstSame:shot(faces[0],v,0)===shot(faces[1],v,0),endDifferent:shot(faces[0],v,2550)!==shot(faces[1],v,2550)}));r.dispose();return records;
 });assert(first.every(r=>r.firstSame&&r.endDifferent));results.push({firstWheelIndependentOfCard:first});
 const now=Date.now();await p.clock.install({time:new Date(now-1000)});await p.clock.pauseAt(new Date(now));
 for(const id of ['GAMBLER','LEGEND_GAMBLER'])for(const side of [0,1])for(const path of ['direct','hand','generated']){
  await p.evaluate(d=>{window.done=false;window.firstMount=null;window.rawFrames=0;const obs=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.matches('.gambler-summon')){const c=n.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;window.firstMount={time:n.dataset.time,painted:data.some((a,i)=>i%4===3&&a>20)}}});obs.observe(document.body,{childList:true});window.gamblerQA.run(d.id,d.side,d.path).then(()=>{window.done=true;obs.disconnect()})},{id,side,path});
  await p.clock.runFor(20);await p.locator('.gambler-summon').waitFor();
  const initial=await p.evaluate(()=>({first:window.firstMount,variant:document.querySelector('.gambler-summon').dataset.variant,rawGhosts:[...document.querySelectorAll('.fx-field-ghost,.fx-card-flight,.cast-reveal')].filter(n=>getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().left>=0).length}));
  assert.equal(initial.first.time,'0');assert(initial.first.painted);assert.equal(initial.variant,id==='GAMBLER'?'1':'2');assert.equal(initial.rawGhosts,0);assert.equal(await p.locator('.slate-summon,.hexer-summon,.verdant-summon,[data-tribe-summon]').count(),0);
  if(side===0)await p.screenshot({path:`${out}/${id}-${path}-first.png`});
  await p.waitForFunction(()=>!document.querySelector('[style*="left: -4000px"]'));await p.clock.runFor(1000);if(side===0&&path==='generated')await p.screenshot({path:`${out}/${id}-peak.png`});
  await p.clock.runFor(1700);await p.waitForFunction(()=>window.done);assert.equal(await p.locator('.gambler-summon').count(),0);assert.equal(await p.locator('[data-uid="target-'+side+'"]').evaluate(n=>n.style.visibility),'');results.push({id,side,path,initial});console.log('PASS',id,side,path);
 }
 await p.clock.resume();
 for(const reason of ['skip','cancel','resize']){
  await p.evaluate(()=>{window.done=false;window.gamblerQA.run('GAMBLER',0,'hand').then(()=>window.done=true)});await p.locator('.gambler-summon').waitFor();if(reason==='skip')await p.evaluate(()=>window.gamblerQA.skip(true));if(reason==='cancel')await p.evaluate(()=>window.gamblerQA.cancel());if(reason==='resize')await p.setViewportSize({width:1270,height:900});await p.waitForFunction(()=>window.done);assert.equal(await p.locator('.gambler-summon').count(),0);await p.evaluate(()=>window.gamblerQA.skip(false));results.push({reason,restored:true});
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{window.done=false;window.gamblerQA.run('LEGEND_GAMBLER',1,'hand').then(()=>window.done=true)});await p.locator('.gambler-summon').waitFor();await p.screenshot({path:out+'/mobile-first.png'});await p.waitForFunction(()=>window.done);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>window.gamblerQA.run('GAMBLER',0,'hand'));assert.equal(await p.locator('.gambler-summon').count(),0);results.push({mobile:true,reduced:true});
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);await fs.writeFile(out+'/runtime.json',JSON.stringify({results,errors,warnings},null,2));console.log('PASS',results.length,'groups');
}catch(e){await p.screenshot({path:out+'/failure.png'});console.log({errors,warnings});throw e;}finally{await b.close()}
