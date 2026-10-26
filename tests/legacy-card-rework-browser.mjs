// Exercise shipped bundles and real menu/card inspection with isolated API fixtures.
// This is a browser rendering test, not an authenticated account or online duel.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5334',out=process.env.LORE_TEST_OUT||'docs/releases/2026-10-27-legacy-cards/browser-local';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[],assets=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'ore-qa-fixture',display:'シーカー',email:'fixture@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,exp:100};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};
 if(p==='/api/rank/me')return{rating:{season:'2026-10',mmr:1000,tier:'iron',rank:1,wins:0,losses:0,draws:0}};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:0};
 if(p==='/api/collection')return{credits:0,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-27',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:0,resetsAt:Date.now()+86400000};
 if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};
 if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};
 return{ok:true,keys:[],receipts:[]};
});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});
 const {loadCards}=await import('../scripts/card-art-lib.mjs');const catalog=await loadCards({includeStarters:true});
 for(const [id,rules] of [
  ['M8',['相手の雫を1減らし','雫1を得る']],['M12',['攻撃力-2（持続）']],
  ['UNBRANDER',['烙印カウンターを1個','自分の体力を3回復する']],['M5',['シールド2を得る']],
  ['M4',['相手に2ダメージ']],['M2',['墓地から購入コスト1','ランダム']],
  ['COLOSSEUM_REST',['自分のターン開始時','体力を2回復','10枚以上','1体を選び']],
  ['BUDGET',['1～2','3～6','さらに「兵士」1体']],['S12',['ダイス5個','20以上']],
  ['NIGHT_CASTLE_GIFT',[]],['AHEUK',['2体以上','さらに1減らす']],['GS8_0',[]],['TIMEWARP',[]],
  ['S14',['両方の場','気合','カウンター1個']],['GM5_3',['4ダメージ']],
  ...['NHEX','HEXER1','HEXER2','HEXER3'].map(id=>[id,['自分のターン開始時','同名でない','種類数','呪い']])]){
  const name=catalog.find(c=>c.id===id).nameJa;
  await page.locator('.cards-search').fill(name);await page.locator(`#grid [data-card-id="${id}"]`).first().click();
  await page.locator('.zoom-overlay').waitFor();const text=await page.locator('.zoom-overlay').innerText();for(const rule of rules)assert(text.includes(rule),id+': '+rule+' / '+text);
  await page.locator('.zoom-overlay img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
  assets.push(...await page.locator('.zoom-overlay img').evaluateAll(imgs=>imgs.filter(img=>img.src.includes('/art/cards/')).map(img=>({url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}))));
  if(['M4','COLOSSEUM_REST','HEXER3'].includes(id))await page.screenshot({path:out+'/'+id+'.png'});await page.setViewportSize({width:390,height:844});if(['M4','COLOSSEUM_REST','HEXER3'].includes(id))await page.screenshot({path:out+'/'+id+'-390.png'});
  // Verify that the lower rule text can actually be reached in the mobile scroller.
  for(const rule of rules)await page.locator('.zoom-details').getByText(rule,{exact:false}).first().scrollIntoViewIfNeeded();
  if(['M4','COLOSSEUM_REST','HEXER3'].includes(id))await page.screenshot({path:out+'/'+id+'-390-rules.png'});await page.locator('.zoom-overlay .inspect-close').click();await page.locator('.zoom-overlay').waitFor({state:'detached'});await page.setViewportSize({width:1280,height:900});checks.push(name+' current effect text on desktop and 390px');
 }
 assert.deepEqual(errors,[]);checks.push('All 19 card inspections rendered without JS errors');
 await fs.writeFile(out+'/report.json',JSON.stringify({base,scope:'shipped static assets, actual App/menu/card renderer; isolated API fixtures; no authenticated account or online duel',checks,assets,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
