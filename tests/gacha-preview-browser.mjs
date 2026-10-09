import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.GACHA_ORIGIN||'http://127.0.0.1:5398';
const out='docs/ui-concepts/2026-10-08-gacha-three/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],requests=[],checks=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url())});
 await page.goto(origin+'/gacha-three.html',{waitUntil:'domcontentloaded'});
 await page.locator('.gacha-page').waitFor({timeout:90000});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-category]').first().getAttribute('data-category'),'gacha');
 for(const v of [1,2,3]){
  await page.locator(`[data-variant="${v}"]`).click();
  await page.locator(`.gacha-v${v}`).waitFor();
  await page.evaluate(async()=>Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))));
  await page.screenshot({animations:'disabled',path:`${out}/desktop-${v}.png`});
  assert.match(await page.locator('[data-pull="1"]').innerText(),/100/);
  assert.match(await page.locator('[data-pull="10"]').innerText(),/1,000/);
  await page.locator('[data-info="rates"]').click();
  assert.equal(await page.locator('dialog tbody tr').count(),6);
  const rates=await page.locator('dialog tbody tr td:last-child').allTextContents();
  assert.equal(rates.reduce((sum,rate)=>sum+parseFloat(rate),0),100);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').count(),0);
  assert.equal(await page.locator('[data-info="rates"]').evaluate(e=>e===document.activeElement),true);
  for(const count of [1,10]){
   await page.locator(`[data-pull="${count}"]`).click();
   assert.match(await page.locator('dialog').innerText(),/消費されません/);
   await page.keyboard.press('Escape');
  }
  assert.equal(await page.locator('.lounge-balance b').innerText(),'2,400');
  await page.locator('[data-info="history"]').click();
  assert.match(await page.locator('dialog').innerText(),/記録はありません/);
  await page.keyboard.press('Escape');
  await page.locator('.gacha-artwork').click();
  assert.equal(await page.locator('.gacha-lineup article').count(),6);
  await page.keyboard.press('Escape');
  for(const width of [390,320,844]){
   await page.setViewportSize({width,height:width===844?390:844});
   const overflow=await page.locator('.lounge-content').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
   assert(overflow.scroll<=overflow.client+1,`Horizontal overflow v${v}, ${width}: ${JSON.stringify(overflow)}`);
   await page.locator('[data-pull="10"]').scrollIntoViewIfNeeded();
   assert(await page.locator('[data-pull="10"]').isVisible());
   await page.locator('[data-pull="10"]').click();
   await page.keyboard.press('Escape');
   await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);
   await page.screenshot({animations:'disabled',path:`${out}/${width}-${v}.png`});
   checks.push({variant:v,width,horizontalOverflow:false});
  }
  await page.setViewportSize({width:1440,height:1000});
 }
 await page.locator('[aria-label="所持シャード"]').selectOption('0');
 await page.locator('[data-pull="10"]').click();
 assert.match(await page.locator('dialog').innerText(),/不足/);
 await page.keyboard.press('Escape');
 await page.locator('[data-category="sleeve"]').click();
 assert((await page.locator('[data-preview]').count())>0,'Existing sleeve catalog remains accessible');
 await page.locator('[data-category="gacha"]').click();
 assert.equal(await page.locator('.gacha-page').count(),1);
 assert.deepEqual(requests,[],'The standalone preview must never request server APIs');
 assert.deepEqual(errors,[],'No browser runtime errors');
 await fs.writeFile(`${out}/report.json`,JSON.stringify({checks,errors,requests,prices:[100,1000],ratesSum:100},null,2));
 console.log('PASS: 3 designs; 9 responsive checks; price/rate totals; dialogs/focus; no draw or API side effects; sleeve navigation.');
} finally {await browser.close()}
