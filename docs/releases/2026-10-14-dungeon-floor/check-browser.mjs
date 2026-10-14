import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=new URL('./qa/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report={errors:[],checks:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1040}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5431/floor-runtime',{timeout:120000});await page.waitForFunction(()=>window.floorRuntimeQA?.state.ready,null,{timeout:120000});
 console.log('fixture ready');
 for(const side of [0,1]){
  await page.evaluate(side=>floorRuntimeQA.setup(side,4,7),side);await page.evaluate(()=>{void floorRuntimeQA.play();});
  await page.waitForSelector('.dungeon-floor-overlay',{timeout:60000});
  // The overlay is allocated only after the real controller has completed the dice.
  await page.waitForFunction(()=>document.querySelectorAll('.zone-mon .card[data-uid]').length>=1,null,{timeout:60000});

  await page.screenshot({timeout:120000,path:new URL(`side-${side}-active.png`,dir).pathname});
  await page.waitForFunction(()=>floorRuntimeQA.state.done,null,{timeout:60000});
  assert.equal(await page.locator('.dungeon-floor-overlay').count(),0);
  const frames=await page.evaluate(()=>floorRuntimeQA.state.frames);report.checks.push({side,frames:frames.length,last:frames.at(-1),exit:await page.evaluate(()=>window.__floorExit)});
  assert(frames.some(f=>f.actors>0),'3D actors were rendered');assert(frames.at(-1).time>=5800,'full animation completed');assert(frames.every(f=>f.minForward>.9));assert(frames.some(f=>f.opacity>0&&f.opacity<1),'assembly fade rendered');assert(frames.every(f=>f.yaw===(side===0?Math.PI:0)));
  await page.screenshot({timeout:120000,path:new URL(`side-${side}.png`,dir).pathname});
  assert.equal(await page.locator(`#${side===0?'me':'opp'}Row .zone-mon .card`).count(),4);
  console.log('side complete',side);report.checks.push({side,controller:'dice then portal',count:4,cleanup:true});
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>floorRuntimeQA.setup(0,6,2));await page.evaluate(()=>{void floorRuntimeQA.play();});
 await page.waitForSelector('.dungeon-floor-overlay',{timeout:60000});
 await page.waitForFunction(()=>document.querySelectorAll('#meRow .zone-mon .card').length>=6,null,{timeout:60000});
 await page.screenshot({timeout:120000,path:new URL('mobile.png',dir).pathname});await page.waitForFunction(()=>floorRuntimeQA.state.done,null,{timeout:60000});
 assert.equal(await page.locator('#meRow .zone-mon .card').count(),7);report.checks.push({mobile:390,roll:6,available:2,count:2});
 await page.evaluate(()=>floorRuntimeQA.setup(1,6,7));await page.evaluate(()=>{void floorRuntimeQA.play();});await page.waitForSelector('.dungeon-floor-overlay',{timeout:60000});await page.evaluate(()=>floorRuntimeQA.skip());await page.waitForFunction(()=>floorRuntimeQA.state.done,null,{timeout:30000});assert.equal(await page.locator('.dungeon-floor-overlay').count(),0);report.checks.push({skip:true});
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report));
}finally{await fs.writeFile(new URL('browser-report.json',dir),JSON.stringify(report,null,2));await browser.close();}
