import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5471';
const out='docs/vfx-prototypes/2026-10-12-taunt-four/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
console.log('Browser ready');const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,240));});const checks=[];
try{
 console.log('Loading preview');await page.goto(origin+'/taunt-four.html',{timeout:180000,waitUntil:'domcontentloaded'});console.log('DOM loaded');console.log('Initial body',await page.locator('h1').textContent());await page.waitForFunction(()=>window.tauntStudy?.state.ready,{},{timeout:180000});
 console.log('Study ready');await page.evaluate(()=>{tauntStudy.stop();tauntStudy.seek(460);});for(let i=0;i<4;i++){const png=await page.locator('article canvas').nth(i).evaluate(c=>c.toDataURL().split(',')[1]);await fs.writeFile(out+'/canvas-'+(i+1)+'.png',Buffer.from(png,'base64'));}await page.screenshot({path:out+'/comparison-460.png',fullPage:true,timeout:120000});console.log('Comparison captured');
 await page.evaluate(()=>{tauntStudy.play();});await page.waitForTimeout(3800);await page.evaluate(()=>tauntStudy.stop());
 await page.locator('#board-play').click();await page.waitForFunction(()=>document.querySelector('#board').contentWindow?.tauntBoard?.state.ready,{},{timeout:180000});const frame=page.frames().find(f=>f.url().includes('taunt-four-board'));assert(frame);await frame.waitForFunction(()=>window.tauntBoard?.state.ready,{},{timeout:180000});
 for(let variant=0;variant<4;variant++){
  await page.evaluate(v=>{document.querySelector('#loop').checked=false;tauntStudy.seek([460,430,480,540][v]);},variant);
  await page.locator(`article[data-v="${variant}"] .stage`).screenshot({path:out+`/variant-${variant+1}.png`});
  for(const side of [0,1]){
   await frame.evaluate(async({variant,side})=>{await tauntBoard.configure({variant,side,card:'SHIELD_TITAN',result:5});tauntBoard.seek([460,430,480,540][variant]);},{variant,side});
   const state=await frame.evaluate(()=>tauntBoard.state);assert.equal(state.activeSources,1);assert.equal(state.hidden,0);assert(state.overlay);
   checks.push({variant,side,check:'frame anchored on one native card'});
  }
  await page.locator('#board-section').scrollIntoViewIfNeeded();await page.screenshot({path:out+`/board-${variant+1}.png`});
  await frame.evaluate(()=>tauntBoard.stop());assert.equal((await frame.evaluate(()=>tauntBoard.state)).hidden,0);
 }
 for(const result of [2,5]){
  await frame.evaluate(async result=>{await tauntBoard.configure({variant:0,side:0,card:'SHIELD_TITAN',result});window.playPromise=tauntBoard.play();},result);
  await frame.waitForFunction(()=>tauntBoard.state.events.filter(e=>e.type==='dice-start').length>0,{},{timeout:20000});
  await frame.evaluate(()=>Promise.race([window.playPromise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback timeout')),15000))]));
  const state=await frame.evaluate(()=>tauntBoard.state),starts=state.events.filter(e=>e.type==='dice-start');assert(starts.at(-1).elapsed>=1000);assert.equal(state.hidden,0);checks.push({result,elapsed:starts.at(-1).elapsed,check:'pre-roll completes before existing dice'});
 }
 // Cancellation during active geometry must reveal exactly the original card.
 await frame.evaluate(()=>{window.playPromise=tauntBoard.play();});await frame.waitForFunction(()=>tauntBoard.state.activeSources>0);await frame.evaluate(()=>tauntBoard.stop());await frame.evaluate(()=>Promise.race([window.playPromise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback timeout')),15000))]));assert.equal(await frame.locator('.d3-overlay').count(),0);assert.equal((await frame.evaluate(()=>tauntBoard.state)).hidden,0);checks.push({check:'cancel settles promise and restores source, no dice'});
 await frame.evaluate(async()=>{await tauntBoard.configure({variant:2,side:1,card:'ELF',multi:true,reduced:true});tauntBoard.seek(500);});assert.equal((await frame.evaluate(()=>tauntBoard.state)).activeSources,2);assert.equal((await frame.evaluate(()=>tauntBoard.state)).hidden,0);await frame.evaluate(()=>tauntBoard.stop());checks.push({check:'granted taunt, opponent, two sources, reduced motion'});
 await frame.evaluate(async()=>{for(let variant=0;variant<4;variant++){await tauntBoard.configure({variant,card:'ELF',side:1,multi:true,reduced:false});tauntBoard.seek(460);}tauntBoard.stop();});const before=await frame.evaluate(()=>tauntBoard.state.stats);for(let i=0;i<12;i++)await frame.evaluate(async i=>{await tauntBoard.configure({variant:i%4,card:'ELF',side:1,multi:true,reduced:false});tauntBoard.seek(150+i*60);tauntBoard.stop();},i);const after=await frame.evaluate(()=>tauntBoard.state.stats);assert.equal(after.geometries,before.geometries);assert.equal(after.textures,before.textures);checks.push({check:'repeat stable GPU resources',before,after});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>tauntStudy.seek(480));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/mobile-390.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({check:'390px no horizontal overflow, scrollable'});
 await page.setViewportSize({width:320,height:720});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({check:'320px no horizontal overflow'});
 await page.setViewportSize({width:844,height:390});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({check:'landscape 844px no horizontal overflow'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks.length,'checks');
}catch(e){console.error('QA FAILURE',e);await page.screenshot({path:out+'/failure.png',timeout:15000}).catch(()=>{});throw e;}finally{await context.close();await browser.close();}
