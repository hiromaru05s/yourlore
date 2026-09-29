import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5298';
const out='docs/ui-rework/2026-09-29-ranked-flow';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],checks=[];
const page=await browser.newPage({viewport:{width:1440,height:1000},recordVideo:{dir:out+'/video',size:{width:1440,height:1000}}});page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
await apiFixture(page,()=>({ok:true,result:null}));
try{
 page.setDefaultTimeout(120000); console.log('loading', origin); await page.goto(origin+'/rank-lab.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.rankLab?.ready,null,{timeout:120000});
 await page.addStyleTag({content:'.rank-lab-controls{display:none!important}'});
 for(const [scenario,after,label] of [['promotion','1162','ゴールド'],['defeat','1164','ゴールド'],['demotion','1140','シルバー'],['gm','1613','グランドマスター']]){
  console.log('scenario',scenario); await page.evaluate(s=>rankLab.play(s),scenario);
  await page.waitForSelector('.crown-outcome[data-phase=playing]',{timeout:20000});
  await page.evaluate(()=>rankLab.early());assert.equal(await page.locator('.outcome-result').count(),0);
  await page.waitForSelector('.rank-result[data-phase=count]',{timeout:20000});
  assert.equal(await page.locator('.crown-outcome').count(),0,'rating waits for outcome');
  await page.screenshot({path:`${out}/${scenario}-count.png`});
  await page.waitForSelector('.rank-result[data-phase=settled]');
  assert.equal(await page.locator('.rank-score>b').innerText(),after);assert.equal(await page.locator('.rank-tier-name').innerText(),label);
  await page.screenshot({path:`${out}/${scenario}-settled.png`});checks.push(scenario);
 }
 // Review and duplicate notifications keep final result without replaying.
 await page.locator('.outcome-result .modal-row button').nth(1).click();
 await page.locator('#reviewFab').click();
 assert.equal(await page.locator('.rank-result').getAttribute('data-phase'),'settled');
 await page.evaluate(()=>rankLab.result({before:1595,after:1613}));
 assert.equal(await page.locator('.rank-score>b').innerText(),'1613');checks.push('review and duplicate');
 // Late notification including a deliberate pending state.
 await page.evaluate(()=>{rankLab.reset();rankLab.finish(null);});await page.waitForSelector('.rank-pending');assert.equal(await page.locator('.rank-score').count(),0);
 await page.evaluate(()=>rankLab.slow());await page.waitForSelector('.rank-retry');
 await page.evaluate(()=>rankLab.result({before:1200,after:1200,season:'2026-09'}));await page.waitForSelector('.rank-result[data-phase=settled]');assert.equal(await page.locator('.rank-delta').innerText(),'±0');checks.push('late/draw/pending');
 // Close in the middle; a later result cannot recreate UI.
 await page.evaluate(()=>rankLab.play('win'));await page.waitForSelector('.rank-result[data-phase=count]');await page.locator('.outcome-result .modal-row button').first().click();await page.waitForTimeout(350);assert.equal(await page.locator('.outcome-result').count(),0);checks.push('mid-count exit');
 // Reduced motion: correct final values, no timeline. Casual never shows rank UI.
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>rankLab.play('gmExit'));await page.waitForSelector('.rank-result[data-phase=settled]');assert.equal(await page.locator('.rank-tier-name').innerText(),'マスター');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile-gm-exit.png'});
 await page.evaluate(()=>{rankLab.reset(1);rankLab.result({before:1034,after:1018});rankLab.finish(0);});await page.waitForSelector('.rank-result[data-phase=settled]');assert.equal(await page.locator('.rank-score>b').innerText(),'1018');await page.screenshot({path:out+'/mobile-iron.png'});
 const bounds=await page.locator('.outcome-result').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=391&&bounds.height<=844);checks.push('mobile/reduced motion/you=1');
 await page.evaluate(()=>{rankLab.reset(0,false);rankLab.finish(null);});await page.waitForSelector('.outcome-result');assert.equal(await page.locator('.rank-result,.rank-pending').count(),0);checks.push('casual excluded');
 await page.evaluate(()=>{rankLab.reset();document.querySelector('#gallery').click();});await page.screenshot({path:out+'/eight-tiers.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await page.close();await browser.close();}
