import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1440,height:960}}),errors=[];p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
const out='docs/ui-rework/2026-11-19-normal-summon-two/qa';
try{
 await p.goto('http://127.0.0.1:5298/cinematic-vfx.html');await p.waitForFunction(()=>window.comparison?.info().ready&&!comparison.info().preparing);
 assert.deepEqual(await p.locator('#summon-version option').evaluateAll(a=>a.map(x=>x.value)),['resonance','weave']);
 await p.locator('#loop').uncheck();
 const trial=p.frames().find(f=>f.url().includes('cinematic-vfx-scene'));
 for(const variant of ['resonance','weave']){
  await p.locator('#summon-version').selectOption(variant);await p.waitForFunction(()=>!comparison.info().preparing);await trial.evaluate(()=>vfx.seek(1.22));
  await p.screenshot({path:`${out}/studio-${variant}.png`});assert((await p.locator('#effect-title').innerText()).includes(variant==='resonance'?'蒼光':'薄膜'));
 }
 await p.locator('#compare').selectOption('alternate');
 const order=[];for(const [active,variant] of [['current','resonance'],['study','resonance'],['study','weave']]){await p.waitForFunction(({active,variant})=>comparison.info().active===active&&(active==='current'||comparison.info().activeSummon===variant)&&!comparison.info().preparing,{active,variant});order.push(await p.evaluate(()=>comparison.info()));}
 await p.waitForFunction(()=>!comparison.info().playing&&!comparison.info().preparing);assert.equal((await p.evaluate(()=>comparison.info())).activeSummon,'weave');
 await p.locator('#compare').selectOption('study');await p.locator('#summon-version').selectOption('resonance');await p.waitForFunction(()=>!comparison.info().preparing);await trial.evaluate(()=>vfx.seek(1.22));await p.setViewportSize({width:390,height:844});await p.waitForTimeout(600);await p.screenshot({path:`${out}/studio-mobile.png`});
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/studio-report.json`,JSON.stringify({errors,order,variants:2,controls:true},null,2));console.log({errors,order});
}finally{await b.close();}
