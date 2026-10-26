import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5589',out=process.env.LORE_TEST_OUT||'/tmp/lore-duel-scene-recovery';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const width of (process.env.LORE_QA_WIDTHS||'1902,390').split(',').map(Number)){
 const page=await browser.newPage({viewport:{width,height:width<700?844:950},deviceScaleFactor:width<700?2:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]')&&!document.querySelector('.duel-loader'),null,{timeout:90000});
 await page.evaluate(()=>document.querySelector('.tempo-controls').style.display='none');
 const recoveries=[];
 for(const selector of ['.duel-objects-3d','.board-flight-canvas']){
  await page.evaluate(selector=>{
   window.recoveryState=JSON.stringify(combatTempo.controller.state);window.recoveryNode=document.querySelector(selector);
   const extension=recoveryNode.getContext('webgl2').getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss extension unavailable');extension.loseContext();
  },selector);
  await page.waitForFunction(selector=>document.querySelector(selector)!==window.recoveryNode&&document.querySelector('[data-scene-ready=true]'),selector,{timeout:30000});
  const restored=await page.evaluate(()=>({sameState:recoveryState===JSON.stringify(combatTempo.controller.state),root:{...document.querySelector('[data-scene-ready=true]').dataset},boards:document.querySelectorAll('.duel-objects-3d').length,flights:document.querySelectorAll('.board-flight-canvas').length,deck:!!document.querySelector('.pile--3d-ready'),mana:document.querySelector('#portraitMe .pt-mana').dataset.crystalsReady}));
  assert(restored.sameState);assert.equal(restored.boards,1);assert.equal(restored.flights,1);assert(restored.deck);assert.match(restored.root.tableState,/^ready/);assert.equal(restored.root.widgetsReady,'true');assert.equal(restored.mana,'20');recoveries.push({selector,...restored});
 }
 await page.screenshot({path:`${out}/${width}-restored.png`});
 await page.evaluate(async()=>{await combatTempo.run('lethal',0);await combatTempo.controller.queue;});
 assert.equal(await page.locator('.duel-objects-3d').count(),1);assert.equal(await page.locator('[data-scene-ready=true]').count(),1);assert.deepEqual(errors,[]);
 // A pending retry must never resurrect a match after its owner is destroyed.
 await page.evaluate(()=>{document.querySelector('.duel-objects-3d').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
 await page.waitForFunction(()=>!document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>combatTempo.controller.view.destroy());await page.waitForTimeout(1500);assert.equal(await page.locator('.duel-objects-3d,.board-flight-canvas').count(),0);
 results.push({width,recoveries,postRecoveryCombat:true,destroyCancelsRetry:true,errors});await page.close();console.log('PASS',width);
}await fs.writeFile(out+'/report.json',JSON.stringify({origin,results,boundary:'Real board/controller fixture, synthetic GPU loss; no authenticated match or physical-device verification.'},null,2));}finally{await browser.close();}
