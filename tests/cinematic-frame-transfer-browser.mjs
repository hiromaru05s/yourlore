import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/ui-rework/2026-11-19-frame-transfer/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1100,height:680}}),checks=[],errors=[];
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const alpha=()=>{const c=document.querySelector('.mana-ground-cracks'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];return{age:Number(c.dataset.age),sum};};
try{
 await page.goto('http://127.0.0.1:5298/cinematic-vfx-current.html?mana-transfer');await page.waitForFunction(()=>window.currentVfx?.info().ready);
 for(const width of [1100,390])for(const side of [0,1]){
  await page.setViewportSize({width,height:680});await page.waitForTimeout(250);
  await page.evaluate(side=>{currentVfx.reviewTime(140);void currentVfx.run({kind:'summon',side,spell:'S4'});},side);
  await page.waitForSelector('.mana-frame-transfer');
  const reveal=await page.evaluate(()=>{const n=document.querySelector('[data-borrowed-card-print="true"]');window.borrowed={children:[...n.children],images:[...n.querySelectorAll('img')].map(i=>i.currentSrc)};const r=n.getBoundingClientRect();return {opacity:Number(n.style.opacity),x:r.x+r.width/2,y:r.y+r.height/2};});
  assert.equal(reveal.opacity,0);assert(Math.abs(reveal.x-width/2)<1);assert(Math.abs(reveal.y-340)<1);
  const interior=await page.evaluate(()=>{const c=document.querySelector('.mana-frame-transfer'),dpr=c.width/innerWidth,r=document.querySelector('[data-borrowed-card-print="true"]').getBoundingClientRect();return[.35,.5,.65].map(q=>[...c.getContext('2d').getImageData(Math.round((r.x+r.width*q)*dpr),Math.round((r.y+r.height*.5)*dpr),1,1).data]);});
  assert(interior.every(([red,green,blue,a])=>a>220&&blue>red&&green>red),JSON.stringify(interior));
  for(const time of [140,340,580,710,810]){
   await page.evaluate(t=>currentVfx.reviewTime(t),time);await page.waitForFunction(t=>Number(document.querySelector('.mana-frame-transfer')?.dataset.time)===t,time);
   assert(await page.evaluate(()=>borrowed.children.every(n=>n.parentElement?.dataset.borrowedCardPrint==='true')));
   if(time===580)assert.equal(await page.locator('[data-borrowed-card-print="true"]').evaluate(n=>Number(n.style.opacity)),0);
   if(time===810)assert.equal(await page.locator('[data-borrowed-card-print="true"]').evaluate(n=>Number(n.style.opacity)),1);
   if(time===140||time===580||time===710)await page.screenshot({path:`${out}/${width}-${side}-${time}.png`});
  }
  const before=await page.locator('[data-borrowed-card-print="true"]').boundingBox();
  await page.evaluate(()=>currentVfx.reviewTime(820));await page.waitForSelector('.slate-summon');
  const field=page.locator(`.zone-mon .card[data-uid="field-${side}-0"]`),after=await field.boundingBox();
  assert(Math.abs(before.x-after.x)<1.2&&Math.abs(before.y-after.y)<1.2,JSON.stringify({before,after}));
  assert(await field.evaluate(n=>borrowed.children.every(c=>c.parentElement===n)));
  const samples=[];
  for(const age of [65,470,800]){await page.waitForFunction(age=>Number(document.querySelector('.mana-ground-cracks')?.dataset.age)>=age,age);samples.push(await page.evaluate(alpha));if(age===65)await page.screenshot({path:`${out}/${width}-${side}-impact.png`});}
  assert(samples[0].sum>samples[1].sum&&samples[1].sum>samples[2].sum&&samples[2].sum>0);
  await page.waitForFunction(()=>!currentVfx.info().playing);
  assert.equal(await page.locator('.mana-frame-transfer,.mana-ground-cracks,[data-borrowed-card-print="true"],.slate-summon').count(),0);
  assert(await field.evaluate(n=>borrowed.children.every(c=>c.parentElement===n)));
  assert.deepEqual(await field.locator('img').evaluateAll(a=>a.map(i=>i.currentSrc)),await page.evaluate(()=>borrowed.images));
  const trace=await page.evaluate(()=>currentVfx.info().trace),impact=trace.find(e=>e.phase==='接地・ヒビがゆっくり消える'),gone=trace.find(e=>e.phase==='ヒビ消失・定着');
  assert(gone.at-impact.at>=980&&gone.at-impact.at<1100);checks.push({width,side,nativePrint:true,filledManaPixels:interior,landingDifference:{x:after.x-before.x,y:after.y-before.y},crackDuration:gone.at-impact.at,samples});
 }
 await page.setViewportSize({width:1100,height:680});await page.waitForTimeout(200);
 await page.evaluate(()=>{currentVfx.reviewTime(340);void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForSelector('.mana-frame-transfer');await page.evaluate(()=>currentVfx.cancel());
 assert.equal(await page.locator('.mana-frame-transfer,.mana-ground-cracks,[data-borrowed-card-print="true"]').count(),0);checks.push({cancelDuringTransfer:true});
 await page.evaluate(()=>{currentVfx.reviewTime(340);void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForSelector('.mana-frame-transfer');await page.setViewportSize({width:900,height:680});await page.waitForFunction(()=>!currentVfx.info().playing);
 assert.equal(await page.locator('.mana-frame-transfer,.mana-ground-cracks,[data-borrowed-card-print="true"]').count(),0);checks.push({resizeDuringTransfer:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{currentVfx.reviewTime();await currentVfx.run({kind:'summon',side:0,spell:'S4'});});assert.equal(await page.locator('.mana-frame-transfer,.mana-ground-cracks').count(),0);checks.push({reducedMotion:true});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1100,height:680});await page.waitForTimeout(250);
 await page.evaluate(()=>{window.samples=[];let previous=0;window.collect=true;const sample=t=>{if(previous)samples.push(t-previous);previous=t;if(collect)window.sampleFrame=requestAnimationFrame(sample);};window.sampleFrame=requestAnimationFrame(sample);currentVfx.reviewTime();void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForFunction(()=>!currentVfx.info().playing);
 checks.push({livePlayback:await page.evaluate(()=>{collect=false;cancelAnimationFrame(sampleFrame);const a=samples.slice(2).sort((a,b)=>a-b);return{frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],trace:currentVfx.info().trace};})});
 await page.goto('http://127.0.0.1:5298/cinematic-vfx-current.html');await page.waitForFunction(()=>window.currentVfx?.info().ready);await page.evaluate(()=>currentVfx.run({kind:'summon',side:0,spell:'S4'}));assert.equal((await page.evaluate(()=>currentVfx.info())).transferStudy,false);assert.equal(await page.locator('.mana-frame-transfer,.mana-ground-cracks').count(),0);checks.push({originalPreviewUnaffected:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({errors,checks,scope:'Local real-board fixture calling existing ghostSummon/focusCard/slate runtime; no live PvP or deployment'},null,2));console.log(JSON.stringify({errors,checks},null,2));
}finally{await browser.close();}
