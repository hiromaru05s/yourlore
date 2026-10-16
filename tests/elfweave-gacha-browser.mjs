import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5516',out=process.env.LORE_TEST_OUTPUT||'/tmp/elfweave-gacha';await fs.mkdir(out,{recursive:true});
await build({stdin:{contents:"export * from './client/src/shared/collection';export {GACHA_COSMETICS} from './client/src/shared/cosmetics';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:out+'/collection.mjs'});const {starterCollection,GACHA_COSMETICS}=await import(out+'/collection.mjs');
const ids=['sleeve:gacha-elfweave','furniture:gacha-elfweave'],owned=[],receipts=[],user={id:'elfweave-qa',email:'qa@example.invalid',display:'シーカー',wins:0,losses:0,credits:10000,starterCards:starterCollection(),sleeve:'default',furniture:'default'};
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
await apiFixture(page,req=>{const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};
 if(p==='/api/social/profile')return {profile:{...user,created_at:Date.now(),self:true,sleeves:['default',...owned.filter(id=>id.startsWith('sleeve:'))],furnitures:owned.filter(id=>id.startsWith('furniture:')),effects:[]}};
 if(p==='/api/collection')return {credits:user.credits,starterCards:user.starterCards,cosmetics:owned,effects:[]};
 if(p==='/api/collection/history')return {receipts};
 if(p==='/api/collection/draw'){const id=ids[receipts.length],receipt={kind:'draw',cost:100,refund:0,rewards:[{kind:'cosmetic',id,refund:0,owned:1}],requestId:req.body.requestId,createdAt:Date.now()};owned.push(id);receipts.push(receipt);user.credits-=100;return {credits:user.credits,starterCards:user.starterCards,cosmetics:owned,effects:[],receipt};}
 if(p==='/api/deck'){user.decks=req.body.decks;return {ok:true,decks:user.decks,deck:user.decks.list[user.decks.sel].cards};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav="deck"]').click();await page.locator('#appearanceTab').click();await page.waitForFunction(()=>!document.querySelector('.deck-cosmetic-status')?.textContent?.includes('確認中'));for(const id of ids)assert(await page.locator(`[data-cosmetic-id="${id}"]`).isDisabled());
 await page.locator('[data-nav="shop"]').click();await page.waitForSelector('[data-pull="1"]:enabled');await page.locator('[data-info="rates"]').click();const rates=await page.locator('.gacha-dialog').innerText();assert(rates.includes(`${7/GACHA_COSMETICS.length}%`));assert(rates.includes(`${GACHA_COSMETICS.filter(c=>c.kind==='sleeve').length}種`));await page.screenshot({path:out+'/rates.png'});await page.locator('.gacha-dialog [data-close]').first().click();
 await page.locator('[data-info="items"]').first().click();assert.equal(await page.locator('.gacha-lineup article').filter({hasText:'エルフの葉織'}).count(),2);await page.screenshot({path:out+'/lineup.png'});await page.locator('.gacha-dialog [data-close]').first().click();
 for(const id of ids){await page.locator('[data-pull="1"]').click();await page.waitForSelector('.gacha-cinematic[data-phase="result"]');await page.locator('.gacha-cinematic [data-done]').click();assert.equal(await page.locator('.gacha-dialog [data-reward-kind="cosmetic"]').count(),1);assert((await page.locator('.gacha-dialog').innerText()).includes(id.startsWith('sleeve')?'エルフの葉織のスリーブ':'エルフの葉織のデッキ置き場＆墓地'));await page.screenshot({path:out+'/'+id.split(':')[0]+'-reward.png'});await page.locator('.gacha-dialog [data-close]').first().click();}
 await page.locator('[data-nav="deck"]').click();await page.locator('#appearanceTab').click();for(const id of ids){await page.locator(`[data-cosmetic-id="${id}"]:enabled`).click();}await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg')?.textContent?.includes('保存'));assert.equal(user.decks.list[user.decks.sel].sleeve,ids[0]);assert.equal(user.decks.list[user.decks.sel].furniture,ids[1]);await page.screenshot({path:out+'/equipped.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({rates,separateRewards:receipts.length,equipped:user.decks.list[user.decks.sel],errors},null,2));console.log('PASS: locked items, catalog-derived rates, both lineup entries, two separate result presentations, owned equipment save (API fixture)');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(await page.locator('body').innerText(),errors);throw e;}finally{await browser.close();}
