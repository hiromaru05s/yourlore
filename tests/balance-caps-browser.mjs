// Exercise shipped bundles and real menu/card inspection with isolated API fixtures.
// This is a browser rendering test, not an authenticated account or online duel.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5321',out=process.env.LORE_TEST_OUT||'docs/balance/2026-10-26-caps/browser-local';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'ore-qa-fixture',display:'シーカー',email:'fixture@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,exp:100};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};
 if(p==='/api/rank/me')return{rating:{season:'2026-10',mmr:1000,tier:'iron',rank:1,wins:0,losses:0,draws:0}};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:0};
 if(p==='/api/collection')return{credits:0,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-26',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:0,resetsAt:Date.now()+86400000};
 if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};
 if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};
 return{ok:true,keys:[],receipts:[]};
});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const [id,name,rules] of [
  ['GOBLIN_RAIDER','特攻ゴブリン',['自分の場に最大1体','次の相手のターン終了時','必ず破壊']],
  ['QUICK_GRIMOIRE','呪術魔法書',['魔法5回','コスト-1','無効になった魔法も回数を消費']],
  ['DOMINION','支配',['スキップ予約は1回まで','このゲーム中に3回まで']],
  ['RUST_SHROOM','ラストマッシュルーム',['4以上なら','自分に3ダメージ']]]){
  await page.locator('.cards-search').fill(name);const face=page.locator(`#grid [data-card-id="${id}"]`).first();
  // Generated-only cards are accessible through the source card's related-card link.
  if(id==='DOMINION'){
   await page.locator('.cards-search').fill('城下町');
   const source=page.locator('#grid [data-card-id="Q_TOWN"]').first();await source.click();await page.locator('.zoom-overlay').waitFor();await page.locator('.zoom-overlay .card-reference-link[data-reference-id="DOMINION"]').click();
  }else await face.click();
  await page.locator('.zoom-overlay').waitFor();const text=await page.locator('.zoom-overlay').innerText();for(const rule of rules)assert(text.includes(rule),id+': '+rule+' / '+text);
  await page.locator('.zoom-overlay img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
  assets.push(...await page.locator('.zoom-overlay img').evaluateAll(imgs=>imgs.filter(img=>img.src.includes('/art/cards/')).map(img=>({url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}))));
  await page.screenshot({path:out+'/'+id+'.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/'+id+'-390.png'});
  // Verify that the lower rule text can actually be reached in the mobile scroller.
  for(const rule of rules)await page.locator('.zoom-details').getByText(rule,{exact:false}).first().scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+id+'-390-rules.png'});await page.locator('.zoom-overlay .inspect-close').click();await page.locator('.zoom-overlay').waitFor({state:'detached'});await page.setViewportSize({width:1280,height:900});checks.push(name+' current effect text on desktop and 390px');
 }
 assert.deepEqual(errors,[]);checks.push('All four card inspections rendered without JS errors');
 await fs.writeFile(out+'/report.json',JSON.stringify({base,scope:'shipped static assets, actual App/menu/card renderer; isolated API fixtures; no authenticated account or online duel',checks,assets,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
