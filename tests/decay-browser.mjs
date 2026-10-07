import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/releases/2026-10-07-decay/qa';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.goto('http://127.0.0.1:5397/decay-adoption.html');await page.waitForFunction(()=>window.decayQA?.ready);console.log('board ready');const cases=[];
 for(const [width,side] of [[1280,0],[1280,1],[390,0],[390,1]]){
  console.log('case',width,side);await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(side=>{window.done=false;window.decayQA.play(side).then(r=>{window.result=r;window.done=true;}).catch(e=>{window.testError=String(e);window.done=true;});},side);
  await page.waitForSelector('.decay-dissolve');await page.waitForFunction(()=>Number(document.querySelector('.decay-dissolve')?.dataset.time)>800);await fs.writeFile(out+`/dissolve-${width}-${side}.png`,await page.screenshot());
  assert.equal(await page.locator('.mana-destruction').count(),0,'no ordinary destruction/Shelf-transfer overlay');
  await page.waitForFunction(()=>window.done);const result=await page.evaluate(()=>window.result);assert.equal(result.events[0]?.cause,'decay');assert(!result.field.includes(`decay-${side}-1`));assert(result.discard.includes(`decay-${side}-1`));assert.equal(result.hp,27);assert.equal(await page.locator('.decay-dissolve,.decay-capture').count(),0);cases.push({width,side,...result});
 }
 await page.evaluate(()=>{window.done=false;window.decayQA.play(0).then(()=>window.done=true);});await page.waitForSelector('.decay-dissolve');await page.evaluate(()=>window.decayQA.skip());await page.waitForFunction(()=>window.done);assert.equal(await page.locator('.decay-dissolve,.decay-capture').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>window.decayQA.play(1));assert.equal(reduced.events[0].cause,'decay');assert.equal(await page.locator('.decay-dissolve').count(),0);
 await page.evaluate(()=>window.decayQA.dispose());assert.equal(await page.locator('.decay-dissolve,.decay-capture').count(),0);assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({cases,errors,skip:true,reduced:true,dispose:true},null,2));console.log('PASS actual engine -> controller -> decay surface -> removal/Shelf/HP; both owners, desktop/mobile, skip, reduced, dispose');
}catch(error){console.error('diagnostic',await page.evaluate(()=>({ready:window.decayQA?.ready,done:window.done,error:window.testError,hosts:[...document.querySelectorAll('.decay-dissolve')].map(n=>({...n.dataset})),body:document.body.innerText.slice(-700)})),errors);await page.screenshot({path:out+'/failure.png',timeout:10000}).catch(()=>{});throw error;}finally{await browser.close();}
