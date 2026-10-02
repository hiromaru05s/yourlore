import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5208';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-29-portal-return';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(120000);
const capture=await page.context().newCDPSession(page);
const saveFrame=async({path})=>{await page.screenshot({path,timeout:120000});};
const errors=[],failed=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(`${r.status()} ${r.url()}`);});
const studies=[['portal-seam',2220],['portal-fold',2360],['portal-echo',2060],['portal-ivory',2520],['portal-cadence',2580]];
const settled=async(side,count)=>{
  const prefix=side==='me'?'pile-my':'pile-opp';
  assert.equal(await page.locator(`#${prefix}Deck`).getAttribute('data-count'),String(count));
  assert.equal(await page.locator(`#${prefix}Disc`).getAttribute('data-count'),'0');
  assert.equal(await page.locator('.is-shuffling').count(),0);
  assert.equal(await page.locator('#app').getAttribute('data-shuffle-phase'),null);
  assert.equal(await page.locator('#app').getAttribute('data-connected-study-active'),null);
};
try{
 await page.addInitScript(()=>{Math.random=(()=>{let s=17;return()=>((s=Math.imul(1664525,s)+1013904223|0)>>>0)/4294967296})()});
 await page.goto(origin+'/shelf-return-lab.html?portal=1');await page.waitForFunction(()=>window.loreShelfPreview?.ready,null,{timeout:120000});
 await saveFrame({path:out+'/ready-desktop.png'});
 for(const [id,duration] of studies){
   await page.evaluate(id=>loreShelfPreview.sample(id,100),id);
   await page.waitForSelector('.is-shuffling');
   for(const [phase,t] of [['vanish',.27],['gap',id==='portal-echo'?.42:id==='portal-ivory'?.53:.49],['arrival',.68]]){
     await page.evaluate(ms=>loreShelfPreview.seek(ms),duration*t);await page.waitForTimeout(100);
     const at=await page.locator('#app').getAttribute('data-shelf-return-time');assert(Math.abs(Number(at)-t)<.005);
     await saveFrame({path:`${out}/${id}-${phase}.png`});
   }
   // Scrub backward, then resume through the same completion path.
   await page.evaluate(ms=>loreShelfPreview.seek(ms),duration*.22);await page.waitForTimeout(60);
   assert(Math.abs(Number(await page.locator('#app').getAttribute('data-shelf-return-time'))-.22)<.005);
   await page.evaluate(ms=>loreShelfPreview.seek(ms),duration-5);await page.getByRole('button',{name:'続きから再生',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#pile-myDeck')?.dataset.count==='14');await settled('me',14);
   checks.push(id+': forward/backward seek, resume, final counts, cleanup');
 }
 await page.evaluate(()=>loreShelfPreview.play('linked-silver'));await settled('me',14);checks.push('previous approved silver material preserved for comparison');
 for(const side of ['me','opp']){
   await page.evaluate(side=>loreShelfPreview.side(side),side);
   for(const [id] of studies){await page.evaluate(id=>loreShelfPreview.play(id),id);await settled(side,14);}
 }
 checks.push('all five variants on both board sides');
 for(const count of [1,40]){await page.evaluate(n=>loreShelfPreview.count(n),count);await settled('opp',count);}
 checks.push('single card and 40-card compressed display');
 await page.evaluate(()=>loreShelfPreview.sample('portal-ivory',500));await page.waitForSelector('.is-shuffling');await page.evaluate(()=>loreShelfPreview.cancel());
 assert.equal(await page.locator('.is-shuffling').count(),0);assert.equal(await page.locator('#pile-oppDisc').getAttribute('data-count'),'40');
 checks.push('cancel leaves source count intact and restores resting piles');
 await page.evaluate(()=>{void loreShelfPreview.play('portal-seam');void loreShelfPreview.play('portal-fold');window.previewRun=loreShelfPreview.play('portal-echo');});await page.evaluate(()=>previewRun);await settled('opp',40);checks.push('rapid selection serialized');
 await page.evaluate(()=>loreShelfPreview.count(14));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>loreShelfPreview.side('me'));
 for(const [id,duration] of studies){
   await page.evaluate(id=>loreShelfPreview.sample(id,100),id);await page.waitForSelector('.is-shuffling');await page.evaluate(ms=>loreShelfPreview.seek(ms),duration*.68);await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   for(const button of await page.locator('[data-variant]').all()){const box=await button.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=390,'Every variant must be visible on mobile');}
   await saveFrame({path:`${out}/${id}-mobile.png`});await page.evaluate(()=>loreShelfPreview.cancel());
 }
 await page.evaluate(()=>loreShelfPreview.side('opp'));await page.evaluate(()=>loreShelfPreview.sample('portal-cadence',1050));await page.waitForSelector('.is-shuffling');await page.evaluate(()=>loreShelfPreview.seek(1050));await page.waitForTimeout(150);await saveFrame({path:out+'/opponent-mobile.png'});await page.evaluate(()=>loreShelfPreview.cancel());
 checks.push('390px: five variants, opponent control placement, no horizontal overflow');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);await page.evaluate(()=>loreShelfPreview.side('me'));await page.evaluate(()=>loreShelfPreview.sample('portal-cadence',1050));await page.waitForSelector('.is-shuffling');await page.evaluate(()=>loreShelfPreview.seek(1050));await page.waitForTimeout(150);await saveFrame({path:out+'/landscape.png'});
 await page.setViewportSize({width:1280,height:720});await page.waitForFunction(()=>!document.querySelector('.is-shuffling'));assert.equal(await page.locator('.is-shuffling').count(),0);checks.push('resize cancels an active sampled effect');
 await page.emulateMedia({reducedMotion:'reduce'});for(const [id] of studies){await page.evaluate(id=>loreShelfPreview.play(id),id);await settled('me',14);}checks.push('reduced motion: stationary short handoff with final counts for all five');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(200);
 const dark=await page.addStyleTag({content:'.board-flight-canvas{background:#111423}'});
 for(const [id,duration]of studies){await page.evaluate(id=>loreShelfPreview.sample(id,100),id);await page.waitForSelector('.is-shuffling');await page.evaluate(ms=>loreShelfPreview.seek(ms),duration*.68);await page.waitForTimeout(120);await saveFrame({path:`${out}/${id}-dark-contrast.png`});await page.evaluate(()=>loreShelfPreview.cancel());}await dark.evaluate(el=>el.remove());checks.push('five materials on an isolated dark contrast backdrop');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors,failed,viewports:[[1280,900],[390,844],[844,390],[1280,720]]},null,2));
 console.log('PASS',checks.join('\n'));
}finally{await browser.close();}
