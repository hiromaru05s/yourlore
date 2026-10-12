import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const qa=new URL('../../../../docs/vfx-prototypes/2026-10-12-counter-four/qa/',import.meta.url).pathname;
await fs.mkdir(qa,{recursive:true});
const fast=process.env.COUNTER_FAST==='1';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('Browser console:',m.text(),m.location());}});
try{
 await page.goto('http://127.0.0.1:5469/counter-four.html?qa'+(fast?'':'&capture'),{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.counterLab?.ready,undefined,{timeout:120000});
 await page.evaluate(()=>window.counterLab.seek(380));if(!fast)await page.screenshot({path:qa+'browser-desktop.png',fullPage:true});
 if(!fast)await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('QA保存完了'),undefined,{timeout:120000});
 await page.evaluate(()=>window.counterLab.setMode('board'));const frame=page.frameLocator('iframe');await frame.locator('.zone-mon .card').first().waitFor({timeout:120000});
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.counterBoard?.state.ready,undefined,{timeout:120000});
 const checks=[];
 for(const side of [0,1])for(const v of [0,1,2,3]){
  await page.evaluate(({side,v})=>{window.counterLab.setSide(side);window.counterLab.seek(380,v);},{side,v});await page.waitForTimeout(120);
  const state=await page.evaluate(()=>document.querySelector('iframe').contentWindow.counterBoard.state);checks.push({side,v,ok:state.hidden===1&&state.rigs===1});
  await page.locator('#board').scrollIntoViewIfNeeded();if(!fast)await page.screenshot({path:qa+`board-${side}-${v}.png`});
 }
 await page.evaluate(()=>{window.counterLab.setMulti(true);window.counterLab.seek(360);});await page.waitForTimeout(120);checks.push({multi:await page.evaluate(()=>document.querySelector('iframe').contentWindow.counterBoard.state)});
 await page.evaluate(()=>window.counterLab.seek(1760));await page.waitForTimeout(100);checks.push({restored:await page.evaluate(()=>document.querySelector('iframe').contentWindow.counterBoard.state)});
 await page.evaluate(()=>{window.counterLab.reduce(true);window.counterLab.seek(350);});await page.waitForTimeout(100);if(!fast)await page.screenshot({path:qa+'board-reduced.png'});
 await page.evaluate(()=>window.counterLab.setMode('grid'));await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.counterLab.reduce(false);window.counterLab.seek(380);});if(!fast)await page.screenshot({path:qa+'mobile.png',fullPage:true});
 checks.push({mobile:await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))});await page.getByText('暗い背景',{exact:true}).count();await page.locator('#theme').click();if(!fast)await page.screenshot({path:qa+'mobile-dark.png',fullPage:true});
 for(const c of checks){if('ok' in c)assert(c.ok);if(c.multi)assert.equal(c.multi.rigs,3);if(c.restored){assert.equal(c.restored.hidden,0);assert.equal(c.restored.rigs,0);}if(c.mobile)assert.equal(c.mobile.scroll,c.mobile.viewport);}
 await fs.writeFile(qa+'browser.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));assert.equal(errors.length,0);
}finally{await browser.close();}
