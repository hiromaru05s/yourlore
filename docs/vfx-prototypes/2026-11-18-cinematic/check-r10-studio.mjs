import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=new URL('./qa/r10',import.meta.url).pathname,b=await chromium.launch({channel:'chrome',headless:true}),ctx=await b.newContext({viewport:{width:1200,height:900},recordVideo:{dir,size:{width:1200,height:900}}}),p=await ctx.newPage(),errors=[];p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(String(e)));
try{
 await p.goto('http://127.0.0.1:5298/cinematic-vfx.html');await p.waitForFunction(()=>window.comparison?.info().ready);await p.locator('#loop').uncheck();
 for(const count of['2','4']){await p.locator('#draw-count').selectOption(count);await p.locator('#compare').selectOption('current');await p.waitForFunction(()=>window.comparison.info().active==='current'&&!window.comparison.info().playing);assert.equal(await p.frameLocator('#current-frame').locator('#hand > .card').count(),3+Number(count));}
 await p.locator('#compare').selectOption('study');await p.waitForFunction(()=>window.comparison.info().active==='study'&&!window.comparison.info().preparing);
 const f=p.frames().find(f=>f.url().includes('cinematic-vfx-scene'));await f.evaluate(()=>window.vfx.seek(.95));await p.screenshot({path:dir+'/studio-four.png'});
 await p.locator('#replay').click();const start=Date.now();await p.waitForFunction(()=>!window.comparison.info().playing);await p.waitForTimeout(600);const recordingSeconds=(Date.now()-start)/1000;
 assert.equal(await f.locator('[data-study-draw]').count(),0);assert.equal(errors.length,0);await fs.writeFile(dir+'/studio.json',JSON.stringify({errors,currentCounts:[2,4],recordingSeconds,trial:await f.evaluate(()=>window.vfx.info())},null,2));
 const video=p.video();await ctx.close();await video.saveAs(dir+'/studio-four-full.webm');console.log({errors,recordingSeconds});
}finally{await b.close()}
