import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5521',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-gacha-rewards';await fs.mkdir(out,{recursive:true});
await build({stdin:{contents:"export * from './client/src/shared/collection';export {GACHA_COSMETICS} from './client/src/shared/cosmetics';export {CARD_EFFECTS} from './client/src/shared/cardEffects';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out+'/data.mjs'});
const {starterCollection,COLLECTIBLE_STARTERS,GACHA_COSMETICS,CARD_EFFECTS,DB,STARTERS}=await import(out+'/data.mjs');
const starter={id:COLLECTIBLE_STARTERS.find(id=>(STARTERS[id]??DB[id]).t==='mon'),owned:1,refund:0},sleeve={kind:'cosmetic',id:'sleeve:quiet-porcelain',owned:1,refund:0},furniture={kind:'cosmetic',id:'furniture:gacha-mimic-coffer',owned:1,refund:0},effect={kind:'effect',id:'effect:prism-veil',owned:1,refund:0};
const mixed=[starter,sleeve,furniture,effect,{...starter,refund:50,owned:8},{id:'STARTER_CHEST',owned:2,refund:0},...Array.from({length:4},(_,i)=>({id:COLLECTIBLE_STARTERS[(i+2)%COLLECTIBLE_STARTERS.length],owned:1,refund:0}))];
let next=mixed,calls=0;const counts=[];const receipts=[],user={id:'reward-reveal-qa',display:'シーカー',email:'qa@example.invalid',wins:0,losses:0,credits:100000,starterCards:starterCollection()};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,async req=>{const p=new URL(req.url).pathname;if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0};if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'starterWin',card:'STARTER_CHEST',reward:500,target:3},progress:1,claimed:false},bot:{},online:0,ranked:0};if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default'],furnitures:[]}};if(p==='/api/collection')return {credits:user.credits,starterCards:user.starterCards,cosmetics:[],effects:[]};if(p==='/api/collection/history')return {receipts};if(p==='/api/collection/draw'){calls++;counts.push(req.body.count);await new Promise(r=>setTimeout(r,700));const receipt={kind:'draw',cost:100*next.length,refund:next.reduce((s,r)=>s+r.refund,0),rewards:next,requestId:req.body.requestId,createdAt:Date.now()};receipts.push(receipt);if(user.credits>=receipt.cost)user.credits+=receipt.refund-receipt.cost;return {credits:user.credits,starterCards:user.starterCards,cosmetics:[],effects:[],receipt};}return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
async function screenshot(name){await page.screenshot({path:out+'/'+name+'.png'});}
async function overview(n=10){await page.waitForSelector('.reward-gallery');assert.equal(await page.locator('.reward-gallery article').count(),n);assert.equal(await page.locator('.gacha-cinematic,.reward-detail-host,.reward-stage').count(),0);assert.equal(await page.locator('.gacha-dialog footer [data-close]').count(),0);}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));await page.locator('[data-nav="shop"]').click();await page.locator('[data-pull="10"]:enabled').waitFor();
 await page.waitForTimeout(1000);await screenshot('shop-panel');
 const fan=page.locator('.gacha-table-fan'),before=await fan.boundingBox();
 await fan.evaluate(e=>window.originalFan=e);await page.locator('[data-pull="10"]').click();
 assert.equal(await fan.evaluate(e=>e===window.originalFan),true,'draw preserves card DOM');assert.deepEqual(await fan.boundingBox(),before,'pending draw does not move cards');
 await page.waitForSelector('.gacha-cinematic[data-phase="animation"]');
 const skip=await page.locator('[data-skip]').boundingBox();assert(skip.width>=142&&skip.height>=52);await screenshot('intro-skip');
 // Run the complete approved intro once, then test immediate skip separately.
 await overview();await page.waitForFunction(()=>[...document.querySelectorAll('.reward-tile-art[data-ready]')].every(el=>el.dataset.ready==='true'));
 assert.equal(await page.locator('.reward-gallery button,a,[data-inspect]').count(),0);
 const tile=page.locator('[data-reward-index="0"]'),art=tile.locator('.reward-tile-art');await page.mouse.move(0,0);const rest=await art.boundingBox();await tile.hover();await page.waitForTimeout(250);assert((await art.boundingBox()).y<rest.y,'hover stays responsive');await tile.click();await overview();assert.equal(calls,1);
 assert.match(await page.locator('.reward-sleeve-quiet').evaluate(e=>getComputedStyle(e).clipPath),/inset/);
 const geometries=[];
 for(const [width,height] of [[1440,900],[1280,720],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const geometry=await page.locator('.gacha-dialog').evaluate(d=>{const b=d.getBoundingClientRect(),f=d.querySelector('footer').getBoundingClientRect();return {width:d.clientWidth,scroll:d.scrollWidth,bottom:b.bottom,footer:f.bottom,viewport:innerHeight};});
  assert(geometry.scroll<=geometry.width+1);assert(geometry.footer<=geometry.viewport&&geometry.footer<=geometry.bottom);geometries.push({width,height,...geometry});await screenshot('results-'+width);
 }
 await page.setViewportSize({width:1280,height:720});
 await page.locator('[data-redraw]').click();assert.equal(calls,1);assert.match(await page.locator('.gacha-redraw-confirm').innerText(),/10連.*1000|10連/s);assert.equal(await page.locator('[data-balance-before]').innerText(),'99,050');assert.equal(await page.locator('[data-balance-after]').innerText(),'98,050');await screenshot('redraw-confirm');
 await page.locator('[data-redraw-no]').click();await overview();assert.equal(calls,1);assert.equal(await page.locator('[data-redraw]').evaluate(e=>e===document.activeElement),true);
 await page.locator('[data-redraw]').click();await page.keyboard.press('Escape');await overview();assert.equal(calls,1);
 await page.locator('[data-redraw]').click();await page.locator('[data-redraw-yes]').evaluate(e=>{e.click();e.click();});
 await page.locator('.gacha-cinematic [data-skip]').click();await overview();assert.equal(calls,2);assert.deepEqual(counts,[10,10]);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.gacha-dialog').count(),0);
 await page.setViewportSize({width:1440,height:900});assert.deepEqual(await fan.boundingBox(),before,'completed draw does not move cards');assert.equal(await page.locator('#collectionNotice').innerText(),'');assert.equal(await page.locator('#collectionNotice').isVisible(),false);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-pull="10"]').click();await overview();assert.equal(calls,3);await page.keyboard.press('Escape');
 await page.locator('[data-info="history"]').click();await page.waitForFunction(()=>document.querySelectorAll('.reward-gallery article').length===30);assert.equal(await page.locator('.reward-gallery button').count(),0);await page.keyboard.press('Escape');assert.equal(calls,3);
 next=[sleeve];await page.locator('[data-pull="1"]').click();await overview(1);await page.locator('[data-reward-index="0"]').click();await overview(1);await screenshot('single-result');
 await page.locator('[data-redraw]').click();assert(!/10連/.test(await page.locator('.gacha-redraw-confirm').innerText()));assert.equal(await page.locator('[data-balance-before]').innerText(),'97,050');assert.equal(await page.locator('[data-balance-after]').innerText(),'96,950');await page.locator('[data-redraw-no]').click();await page.keyboard.press('Escape');
 // The returned balance disables another purchase, including after a refund.
 user.credits=50;await page.locator('[data-pull="1"]').click();await overview(1);assert(await page.locator('[data-redraw]').isDisabled());await page.keyboard.press('Escape');assert(await page.locator('[data-pull="1"]').isDisabled());
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,calls,counts,geometries,stablePendingLayout:true,readOnlyResults:true,confirmNoAndEscape:true,doubleYesSinglePurchase:true,singleAndTen:true,insufficientBalance:true,balanceBeforeAndAfter:true,successNoticeRemoved:true,errors},null,2));console.log('PASS gacha direct results, hover only, redraw YES/NO, single spend, fixed pending layout, balance and five viewports');
}catch(e){await screenshot('failure');console.error(errors);throw e;}finally{await context.close();await browser.close();}
