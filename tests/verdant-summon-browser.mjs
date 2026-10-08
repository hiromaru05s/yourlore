import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/releases/2026-10-08-verdant-04/qa',browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage(),errors=[],warnings=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('Native card fallback'))warnings.push(m.text());});
page.setDefaultTimeout(60000);
try{
 await page.goto('http://127.0.0.1:5395/verdant-qa.html');await page.waitForFunction(()=>window.verdantQA?.ready);console.log('Board ready');const clockStart=Date.now();await page.clock.install({time:new Date(clockStart-60000)});await page.clock.pauseAt(new Date(clockStart));
 for(const [id,side,path] of [['ELF',0,'direct'],['DARK_ELF',1,'direct'],['HIGH_ELF',0,'direct'],['ELDER_ELF_KING',1,'direct'],['WORLD_TREE',0,'direct'],['HALF_ELF',0,'direct'],['ELF',0,'hand'],['WORLD_TREE',1,'generated']]){
  await page.evaluate(({id,side,path})=>{window.runDone=false;window.verdantQA.run(id,side,path).then(()=>window.runDone=true);},{id,side,path});
  await page.clock.runFor(100);await page.locator('.verdant-summon').waitFor({state:'attached',timeout:30000});await page.clock.runFor(750);
  const seen=await page.locator('.verdant-summon').evaluate(n=>({...n.dataset}));assert.equal(seen.cardId,id);assert.equal(seen.variant,id==='HALF_ELF'?'1':'4');assert.equal(await page.locator('.slate-summon').count(),0);
  await page.screenshot({path:`${out}/${id}-${side}-${path}.png`});await page.clock.runFor(4500);await page.waitForFunction(()=>window.runDone);assert.equal(await page.locator('.verdant-summon').count(),0);results.push({id,side,path,seen});console.log('PASS',id,side,path);
 }
 await page.clock.resume();for(const id of ['VITAL2','VITAL3']){await page.evaluate(id=>window.verdantQA.run(id),id);assert.equal(await page.locator('.verdant-summon,.slate-summon').count(),0);}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.runDone=false;window.verdantQA.run('ELF').then(()=>window.runDone=true);});await page.waitForSelector('.verdant-summon');await page.screenshot({path:out+'/mobile.png'});await page.evaluate(()=>window.verdantQA.skip(true));await page.waitForFunction(()=>window.runDone);assert.equal(await page.locator('.verdant-summon').count(),0);assert.equal(await page.locator('[data-uid="target-0"]').evaluate(n=>n.style.visibility),'');await page.evaluate(()=>window.verdantQA.skip(false));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.verdantQA.run('HIGH_ELF'));assert.equal(await page.locator('.verdant-summon').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);await fs.writeFile(out+'/runtime-browser.json',JSON.stringify({results,errors,warnings,boundary:'Local real GameView, production playMonster and hand/generated presentation paths, controlled browser clock for intermediate frames; no network match.'},null,2));
}catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({message:error.message,errors,warnings,state:await page.evaluate(()=>({ready:window.verdantQA?.ready,done:window.runDone,hosts:[...document.querySelectorAll('.verdant-summon')].map(n=>({...n.dataset}))}))},null,2));throw error;}finally{await context.close();await browser.close();}
