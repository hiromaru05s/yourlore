import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5491',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-starter-browser';await fs.mkdir(out,{recursive:true});
await build({stdin:{contents:"export * from './client/src/shared/collection';export * from './client/src/shared/dailyStarterShop';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out+'/collection.mjs'});
const {starterCollection,COLLECTIBLE_STARTERS,dailyStarterShop}=await import(out+'/collection.mjs');
const user={id:'collection-qa',email:'qa@example.invalid',display:'シーカー',wins:0,losses:0,credits:10000,starterCards:starterCollection(),sleeve:'default',furniture:'default'};
const daily=dailyStarterShop(Date.now());
const geometry=[];
const receipts=[],seen=new Map();let dropped=false,dropNext=false,purchaseCalls=0;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'starterWin',card:'STARTER_CHEST',reward:500,target:3},progress:1,claimed:false},bot:{},online:0,ranked:0};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,wins:0,losses:0,peak_mmr:1000,rank:1,tier:'bronze'}};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};
 if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/collection')return {credits:user.credits,starterCards:user.starterCards,dailyShop:daily};
 if(p==='/api/collection/history')return {receipts:[...receipts].reverse()};
 if(p==='/api/collection/buy'||p==='/api/collection/draw'){
  purchaseCalls++;const b=req.body;
  if(!seen.has(b.requestId)){
   const kind=p.endsWith('buy')?'buy':'draw',count=b.count??1,cost=100*count;
   const rewards=Array.from({length:count},(_,i)=>{const id=kind==='buy'?b.id:COLLECTIBLE_STARTERS[i%COLLECTIBLE_STARTERS.length],refund=user.starterCards[id]>=8?50:0;if(!refund)user.starterCards[id]++;return {id,refund,owned:user.starterCards[id]};});
   const receipt={kind,cost,refund:rewards.reduce((s,r)=>s+r.refund,0),rewards,requestId:b.requestId,createdAt:Date.now()};user.credits-=cost-receipt.refund;if(kind==='buy')daily.remaining[b.id]-=count;receipts.push(receipt);seen.set(b.requestId,receipt);
  }
  if(dropNext&&!dropped){dropped=true;throw Error('Simulated lost response');}
  return {credits:user.credits,starterCards:user.starterCards,dailyShop:daily,receipt:seen.get(b.requestId)};
 }
 if(p==='/api/deck'){user.decks=req.body.decks;return {ok:true,decks:user.decks,deck:user.decks.list[user.decks.sel].cards};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
});
async function assertCatalog(category,width,height){
 const layout=await page.locator('.shop-other').evaluate(host=>{
  const outer=host.getBoundingClientRect(),rect=e=>e.getBoundingClientRect().toJSON();
  return {outer:outer.toJSON(),scrollHeight:host.scrollHeight,height:host.clientHeight,scrollWidth:host.scrollWidth,width:host.clientWidth,items:[...host.querySelectorAll('article')].map(rect),controls:[...host.querySelectorAll('[data-buy-starter],[data-buy-frame],select,.starter-shop-face')].map(rect),text:host.innerText};
 });
 assert(!layout.text.includes('デッキの全カードに、動く質感を。'));assert(!layout.text.includes('毎日00:00 KST更新'));
 assert(layout.scrollHeight<=layout.height+1,`${category} vertical overflow ${width}x${height}: ${JSON.stringify(layout)}`);
 assert(layout.scrollWidth<=layout.width+1,`${category} horizontal overflow ${width}`);
 for(const r of [...layout.items,...layout.controls])assert(r.top>=layout.outer.top-1&&r.bottom<=layout.outer.bottom+1&&r.left>=layout.outer.left-1&&r.right<=layout.outer.right+1,`${category} cropped ${width}x${height}: ${JSON.stringify(r)}`);
 geometry.push({category,width,height,...layout});
}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-pull="1"]:enabled');
 assert.equal(await page.locator('.gacha-editions,#shopCredits,.shop-credits').count(),0);
 assert(!/\b(?:SSR|SR)\b/.test(await page.locator('.gacha-page').innerText()));
 await page.locator('[data-info="rates"]').click();assert((await page.locator('.gacha-dialog').innerText()).includes('92.5%'));await page.locator('.gacha-dialog [data-close]').first().click();
 for(const [w,h] of [[1440,900],[1024,600],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(600);await page.screenshot({path:`${out}/gacha-${w}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`gacha overflow ${w}`);
  assert(await page.locator('[data-pull]').evaluateAll(buttons=>{const content=document.querySelector('.lounge-content').getBoundingClientRect();return buttons.every(button=>{const r=button.getBoundingClientRect();return r.top>=content.top&&r.bottom<=content.bottom+1&&r.height>=44;});}),`draw buttons fit ${w}`);
  assert(await page.locator('.gacha-table').evaluate(el=>el.getBoundingClientRect().width>=el.parentElement.getBoundingClientRect().width-2),`gacha fills its available width ${w}`);
  const frame=await page.locator('.shop-gacha-active>.tut').boundingBox();
  await page.locator('[data-category="starter"]').click();await page.waitForTimeout(200);assert.equal(await page.locator('[data-buy-starter]').count(),5);
  const starterFrame=await page.locator('.shop-gacha-active>.tut').boundingBox();assert(Math.abs(starterFrame.width-frame.width)<1&&Math.abs(starterFrame.height-frame.height)<1,`identical frame ${w}`);

  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`shop overflow ${w}`);
  const ratio=await page.locator('.starter-shop-face .card').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;});assert(Math.abs(ratio-.64)<.002,`card ratio ${w}: ${ratio}`);await page.screenshot({path:`${out}/starters-${w}.png`});
  await assertCatalog('starter',w,h);await page.locator('[data-category="accessories"]').click();assert.equal(await page.locator('[data-buy-frame]').count(),5);await assertCatalog('accessories',w,h);await page.screenshot({path:`${out}/accessories-${w}.png`});
  const accessoryFrame=await page.locator('.shop-gacha-active>.tut').boundingBox();assert.equal(accessoryFrame.width,frame.width);assert.equal(accessoryFrame.height,frame.height);geometry.push({width:w,height:h,gacha:frame,starter:starterFrame,accessories:accessoryFrame});
  assert.equal(await page.locator('[data-category]').count(),3);
  await page.locator('[data-category="gacha"]').click();
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-category="starter"]').click();
 const id=daily.cards.find(id=>id!=='STARTER_CHEST');
 await page.locator(`[data-starter-quantity="${id}"]`).selectOption('1');await page.locator(`[data-buy-starter="${id}"]`).click();
 assert((await page.locator('.starter-purchase-dialog').innerText()).includes('100'));assert.equal(purchaseCalls,0);
 await page.locator('[data-purchase-no]').click();assert.equal(purchaseCalls,0);
 await page.locator(`[data-buy-starter="${id}"]`).click();await page.keyboard.press('Escape');assert.equal(purchaseCalls,0);
 await page.locator(`[data-buy-starter="${id}"]`).click();await page.locator('[data-purchase-yes]').click();await page.waitForFunction(()=>document.querySelector('#collectionNotice')?.textContent?.includes('購入が完了'));assert.equal(user.starterCards[id],1);assert.equal(user.credits,9900);
 dropNext=true;await page.locator(`[data-buy-starter="${id}"]`).click();await page.locator('[data-purchase-yes]').click();await page.waitForSelector('#collectionRecovery:not([hidden])');await page.locator('#collectionRetry').click();await page.waitForFunction(()=>document.querySelector('#collectionRecovery')?.hidden);assert.equal(user.starterCards[id],2);assert.equal(user.credits,9800);assert.equal(receipts.length,2);assert.equal(purchaseCalls,3);assert(await page.locator(`[data-buy-starter="${id}"]`).isDisabled());
 if(!process.env.LORE_SHOP_ONLY){
  await page.locator('[data-nav="deck"]').click();await page.waitForSelector('#deckPool');assert.equal(await page.locator('.deck-pool-tile').filter({has:page.locator(`[data-card-id="${COLLECTIBLE_STARTERS[2]}"]`)}).locator('.deck-card-action').isDisabled(),true);
  await page.locator('[data-nav="shop"]').click();
 }else await page.locator('[data-category="gacha"]').click();
 await page.waitForSelector('[data-pull="1"]:enabled');await page.locator('[data-pull="1"]').click();await page.waitForSelector('.gacha-cinematic');await page.waitForSelector('.gacha-cinematic[data-ready="true"]');
 if(await page.locator('.gacha-cinematic [data-skip]').isVisible())await page.locator('.gacha-cinematic [data-skip]').click();await page.waitForSelector('.reward-gallery');assert((await page.locator('.gacha-dialog').innerText()).includes('獲得結果'));await page.screenshot({path:out+'/draw-result.png'});await page.locator('.gacha-dialog [data-close]').first().click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-pull="10"]').click();await page.waitForSelector('.gacha-dialog .reward-tile');assert.equal(await page.locator('.gacha-dialog .reward-tile').count(),10);await page.locator('.gacha-dialog [data-close]').first().click();
 await page.locator('[data-info="history"]').click();await page.waitForFunction(()=>document.querySelector('.gacha-dialog-body')?.textContent?.includes('購入'));assert.equal(receipts.length,4);await page.screenshot({path:out+'/history.png'});
 await page.locator('.gacha-dialog [data-close]').first().click();
 await page.locator('[data-category="starter"]').click();
 Object.assign(daily,dailyStarterShop(daily.resetsAt+1));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(day=>document.querySelector('.starter-shop-date')?.textContent?.includes(day),daily.day);
 assert.deepEqual(await page.locator('[data-buy-starter]').evaluateAll(buttons=>buttons.map(b=>b.dataset.buyStarter)),daily.cards);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({scope:process.env.LORE_SHOP_ONLY?'shop-only':'shop-and-deck',origin,dailyCards:5,totalStarterPool:COLLECTIBLE_STARTERS.length,rollover:true,geometry,receipts:receipts.length,purchaseCalls,viewports:5,errors},null,2));console.log('PASS browser: five viewport geometries, catalog, buy, lost-response recovery, real reward cinematic, reduced-motion ten draw, history');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(await page.locator('body').innerText(),errors);throw error;}finally{await browser.close();}
