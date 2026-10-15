import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5491',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-starter-browser';await fs.mkdir(out,{recursive:true});
await build({entryPoints:['client/src/shared/collection.ts'],bundle:true,platform:'node',format:'esm',outfile:out+'/collection.mjs'});
const {starterCollection,COLLECTIBLE_STARTERS}=await import(out+'/collection.mjs');
const user={id:'collection-qa',email:'qa@example.invalid',display:'シーカー',wins:0,losses:0,credits:10000,starterCards:starterCollection(),sleeve:'default',furniture:'default'};
const receipts=[],seen=new Map();let dropped=false,dropNext=false,purchaseCalls=0;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};
 if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/collection')return {credits:user.credits,starterCards:user.starterCards};
 if(p==='/api/collection/history')return {receipts:[...receipts].reverse()};
 if(p==='/api/collection/buy'||p==='/api/collection/draw'){
  purchaseCalls++;const b=req.body;
  if(!seen.has(b.requestId)){
   const kind=p.endsWith('buy')?'buy':'draw',count=kind==='buy'?1:b.count,cost=kind==='buy'?200:count*100;
   const rewards=Array.from({length:count},(_,i)=>{const id=kind==='buy'?b.id:COLLECTIBLE_STARTERS[i%COLLECTIBLE_STARTERS.length],refund=user.starterCards[id]>=8?50:0;if(!refund)user.starterCards[id]++;return {id,refund,owned:user.starterCards[id]};});
   const receipt={kind,cost,refund:rewards.reduce((s,r)=>s+r.refund,0),rewards,requestId:b.requestId,createdAt:Date.now()};user.credits-=cost-receipt.refund;receipts.push(receipt);seen.set(b.requestId,receipt);
  }
  if(dropNext&&!dropped){dropped=true;throw Error('Simulated lost response');}
  return {credits:user.credits,starterCards:user.starterCards,receipt:seen.get(b.requestId)};
 }
 if(p==='/api/deck'){user.decks=req.body.decks;return {ok:true,decks:user.decks,deck:user.decks.list[user.decks.sel].cards};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-pull="1"]:enabled');
 assert(!/\b(?:SSR|SR)\b/.test(await page.locator('.gacha-page').innerText()));
 await page.locator('[data-info="rates"]').click();assert((await page.locator('.gacha-dialog').innerText()).includes('92.5%'));await page.locator('.gacha-dialog [data-close]').first().click();
 for(const [w,h] of [[1440,900],[1024,600],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width:w,height:h});await page.screenshot({path:`${out}/gacha-${w}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`gacha overflow ${w}`);
  await page.locator('[data-category="starter"]').click();assert.equal(await page.locator('[data-buy-starter]').count(),COLLECTIBLE_STARTERS.length);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`shop overflow ${w}`);await page.screenshot({path:`${out}/starters-${w}.png`});
  await page.locator('[data-category="gacha"]').click();
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-category="starter"]').click();
 const id=COLLECTIBLE_STARTERS[1];await page.locator(`[data-buy-starter="${id}"]`).click();await page.waitForFunction(()=>document.querySelector('#shopCredits')?.textContent==='9800');assert.equal(user.starterCards[id],1);
 dropNext=true;await page.locator(`[data-buy-starter="${id}"]`).click();await page.waitForSelector('#collectionRecovery:not([hidden])');await page.locator('#collectionRetry').click();await page.waitForFunction(()=>document.querySelector('#shopCredits')?.textContent==='9600');assert.equal(user.starterCards[id],2);assert.equal(receipts.length,2);assert.equal(purchaseCalls,3);
 await page.locator('[data-nav="deck"]').click();await page.waitForSelector('#deckPool');assert.equal(await page.locator('.deck-pool-tile').filter({has:page.locator(`[data-card-id="${COLLECTIBLE_STARTERS[2]}"]`)}).locator('.deck-card-action').isDisabled(),true);
 await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-pull="1"]:enabled');await page.locator('[data-pull="1"]').click();await page.waitForSelector('.gacha-cinematic');await page.waitForSelector('.gacha-cinematic[data-ready="true"]');
 if(await page.locator('.gacha-cinematic [data-skip]').isVisible())await page.locator('.gacha-cinematic [data-skip]').click();await page.waitForSelector('.gacha-cinematic[data-phase="result"]');await page.screenshot({path:out+'/draw-result-animation.png'});await page.locator('.gacha-cinematic [data-done]').click();assert((await page.locator('.gacha-dialog').innerText()).includes('獲得結果'));await page.screenshot({path:out+'/draw-result.png'});await page.locator('.gacha-dialog [data-close]').first().click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-pull="10"]').click();await page.waitForSelector('.gacha-cinematic[data-phase="result"]');await page.locator('.gacha-cinematic [data-done]').click();assert.equal(await page.locator('.gacha-dialog .gacha-lineup article').count(),10);await page.locator('.gacha-dialog [data-close]').first().click();
 await page.locator('[data-info="history"]').click();await page.waitForFunction(()=>document.querySelector('.gacha-dialog-body')?.textContent?.includes('購入'));assert.equal(receipts.length,4);await page.screenshot({path:out+'/history.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({catalog:COLLECTIBLE_STARTERS.length,receipts:receipts.length,purchaseCalls,viewports:5,errors},null,2));console.log('PASS browser: five viewport geometries, catalog, buy, lost-response recovery, unowned deck lock, real reward cinematic, reduced-motion ten draw, history');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(await page.locator('body').innerText(),errors);throw error;}finally{await browser.close();}
