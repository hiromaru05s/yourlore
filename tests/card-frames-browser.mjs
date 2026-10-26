import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5264',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-frame-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack??e.message));
const ids=['frame:mirror-silver','frame:flowing-gold','frame:obsidian-ember','frame:nacre-prism','frame:verdigris-runes'],prices=[30000,50000,200000,100000,200000];
const user={id:'frames-qa',display:'シーカー',needsUsername:false,avatar:'SEEKER_BLUE',credits:1000000,wins:0,losses:0,frames:[],effects:[],decks:null};let saves=0,purchases=0;
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,r=>{const p=new URL(r.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',tier:'gold',mmr:1320}};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{day:'2026-10-26',revision:0,rerollsLeft:3,quest:{kind:'starterWin',card:'STARTER_CHEST',reward:500,target:3},progress:0,claimed:false},bot:{},online:0,ranked:0};
 if(p==='/api/gifts')return {items:[],now:Date.now(),pendingCount:0,pendingAmount:0,unreadCount:0};
 if(p==='/api/rewards/medals')return {entries:[]};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/collection')return {credits:user.credits,starterCards:{},effects:[],cosmetics:user.frames};
 if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default']}};
 if(p==='/api/social/buy-cosmetic'){const i=ids.indexOf(r.body.id);assert(i>=0);if(!user.frames.includes(r.body.id)){purchases++;user.frames.push(r.body.id);user.credits-=prices[i];}return {ok:true,credits:user.credits,frames:user.frames};}
 if(p==='/api/deck'){saves++;user.decks=r.body.decks;user.deck=user.decks.list[user.decks.sel].cards;return {ok:true,decks:user.decks,deck:user.deck};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home');await page.waitForSelector('.lounge-entry-overlay',{state:'detached'});await page.locator('[data-nav=shop]').click();await page.locator('[data-category=accessories]').click();await page.waitForSelector('[data-buy-frame]:enabled');
 await page.waitForFunction(()=>document.querySelectorAll('.frame-shop-grid .card-frame-material').length>=10);assert.equal(await page.locator('.frame-shop-grid [data-card-id=STARTER_MANA]').count(),5);await page.screenshot({path:out+'/shop-desktop.png'});
 const animated=page.locator('.frame-shop-grid .card-frame-material').first(),start=await animated.evaluate(c=>c.toDataURL());await page.waitForTimeout(400);assert.notEqual(await animated.evaluate(c=>c.toDataURL()),start);
 for(const id of ids){await page.locator(`[data-buy-frame="${id}"]`).click();await page.locator('[data-frame-yes]').click();await page.waitForFunction(id=>document.querySelector(`[data-buy-frame="${id}"]`).textContent==='所持済み',id);}
 assert.equal(purchases,5);assert.equal(user.credits,420000);await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/shop-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-nav=deck]').click();await page.locator('#appearanceTab').click();await page.waitForSelector('[data-cosmetic-kind=frame]:enabled');
 for(let i=0;i<5;i++){await page.locator('#deckTabs .deck-tab').nth(i).click();await page.locator(`[data-cosmetic-kind=frame][data-cosmetic-id="${ids[i]}"]`).click();}
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg').textContent.includes('保存完了'));assert.equal(saves,1);assert.deepEqual(user.decks.list.map(d=>d.frame),ids);await page.screenshot({path:out+'/appearance-desktop.png'});
 await page.locator('[data-nav=home]').click();await page.locator('[data-nav=deck]').click();await page.locator('#appearanceTab').click();assert.equal(await page.locator(`[data-cosmetic-kind=frame][data-cosmetic-id="${ids[0]}"]`).getAttribute('aria-pressed'),'true');await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/appearance-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const layer=page.locator('.deck-frame-preview .card-frame-material').first(),still=await layer.evaluate(c=>c.toDataURL());await page.waitForTimeout(300);assert.equal(await layer.evaluate(c=>c.toDataURL()),still);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({purchases,saves,credits:user.credits,frames:user.decks.list.map(x=>x.frame),errors},null,2));console.log('PASS shop/Attune/5 prices/confirmations/owned states; five independent deck frames/save/reopen; desktop/mobile/reduced motion');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});console.error(errors);throw e;}finally{await browser.close();}
