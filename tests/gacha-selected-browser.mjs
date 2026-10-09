import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.GACHA_ORIGIN||'http://127.0.0.1:5399';
const out=process.env.GACHA_QA_DIR||'docs/releases/2026-10-08-gacha-ivory/local';
await fs.mkdir(out,{recursive:true});
const user={id:'gacha-ui-fixture',email:'',display:'シーカー',wins:12,losses:3,credits:2400,avatar:null};
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],apiCalls=[],checks=[];
try {
 const p=await browser.newPage({viewport:{width:1280,height:900}});p.setDefaultTimeout(90000);
 p.on('pageerror',e=>errors.push(e.message));
 await apiFixture(p,r=>{const path=new URL(r.url).pathname;apiCalls.push({path,method:r.method});return path==='/api/auth/me'?{user}:path==='/api/geo'?{country:'JP'}:path==='/api/social/profile'?{profile:{...user,self:true,created_at:0,badge:null,sleeves:['default'],furnitures:[]}}:path==='/api/rank/me'?{rating:null}:path==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
 await p.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await p.locator('[data-nav="shop"]').waitFor();
 await p.locator('.screen-loader,.home-entrance').waitFor({state:'detached'}).catch(()=>{});
 await p.locator('[data-nav="shop"]').click();
 await p.locator('.gacha-v2').waitFor();
 await p.locator('.screen-loader').waitFor({state:'detached'});
 assert.equal(await p.locator('[data-category]').first().getAttribute('data-category'),'gacha');
 assert.equal(await p.locator('.gacha-editions [aria-pressed=true]').getAttribute('data-edition'),'ivory');
 assert.match(await p.locator('.gacha-copy h2').innerText(),/白銀の余韻/);
 for(const [width,height] of [[1280,900],[390,844],[320,844],[844,390]]){
  await p.setViewportSize({width,height});
  await p.evaluate(()=>document.fonts.ready);
  const overflow=await p.locator('.lounge-content').evaluate(e=>e.scrollWidth-e.clientWidth);
  assert(overflow<=1,`Overflow ${width}: ${overflow}`);
  await p.screenshot({animations:'disabled',path:`${out}/shop-${width}.png`});
  await p.locator('[data-info=rates]').click();
  const rates=await p.locator('dialog tbody td:last-child').allTextContents();
  assert.equal(rates.reduce((s,r)=>s+parseFloat(r),0),100);
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('[data-info=rates]').evaluate(e=>document.activeElement===e),true);
  for(const count of [1,10]){await p.locator(`[data-pull="${count}"]`).click();assert.match(await p.locator('dialog').innerText(),/消費されません/);await p.keyboard.press('Escape')}
  assert.equal(await p.locator('.lounge-balance b').innerText(),'2,400');
  await p.locator('.lounge-content').evaluate(e=>e.scrollTop=0);
  checks.push({width,height,variant:2,overflow,shardsUnchanged:true});
 }
 await p.setViewportSize({width:1280,height:900});
 await p.locator('[data-info=history]').click();assert.match(await p.locator('dialog').innerText(),/記録はありません/);await p.keyboard.press('Escape');
 await p.locator('.gacha-links [data-info=items]').click();assert.equal(await p.locator('.gacha-lineup article').count(),6);await p.keyboard.press('Escape');
 await p.locator('[data-category=sleeve]').click();assert((await p.locator('[data-preview]').count())>0);
 await p.locator('[data-category=furniture]').click();assert((await p.locator('[data-preview]').count())>0);
 await p.locator('[data-category=gacha]').click();await p.locator('.gacha-v2').waitFor();
 assert.deepEqual(errors,[]);
 assert.equal(apiCalls.filter(r=>/gacha|buy|purchase/.test(r.path)).length,0);
 await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,checkedAt:new Date().toISOString(),checks,errors,apiCalls,boundary:'Actual application route and assets; API/profile fixture. No authenticated account, purchase, draw, or balance mutation.'},null,2));
 console.log('PASS: selected 02 through actual shop route; 4 viewports; rates/dialog/focus/history; existing categories; no draw/purchase API.');
} finally {await browser.close()}
