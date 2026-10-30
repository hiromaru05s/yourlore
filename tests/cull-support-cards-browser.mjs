// Exercise shipped bundles and real menu/card inspection with isolated API fixtures.
// This is a browser rendering test, not an authenticated account or online duel.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:57482',out=process.env.LORE_TEST_OUT||'docs/releases/2026-10-26-cull-support/cards-local';await fs.mkdir(out,{recursive:true});
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
 for(const [id,name,rules,removed] of [
  ['FURNACE','溶鉱炉',['合計7を超える分を得られない','既に持っているシールドは減らない'],['購入コストが最も低い']],
  ['SCRAPPER','スクラップ収集家',['このカード以外の購入コスト1','2枚とも送った場合'],['墓地、デッキの順']],
  ['PURGE_ALL','大粛清',['デッキ・墓地・場・手札','好きな枚数'],[]],
  ['FOCUS','選択と集中',['1枚まで'],['合計3枚']],
  ['CULL_FLOOD','カルの洗礼',['カル','4枚','墓地に追加'],['合計3枚']],
  ['TRIAL_AREA','試練の領域',['自分に5ダメージ','自分のターン開始時','墓地に追加'],['2枚まで']],
  ['REFRESH_HAND','リフレッシュ',['カードを1枚引く','魔法カードなら','3回復'],['2枚まで']]]){
  await page.locator('.cards-search').fill(name);const face=page.locator(`#grid [data-card-id="${id}"]`).first();await face.click();
  await page.locator('.zoom-overlay').waitFor();const text=await page.locator('.zoom-overlay').innerText();for(const phrase of removed)assert(!text.includes(phrase),id+': obsolete text '+phrase);for(const rule of rules)assert(text.includes(rule),id+': '+rule+' / '+text);
  await page.locator('.zoom-overlay img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
  assets.push(...await page.locator('.zoom-overlay img').evaluateAll(imgs=>imgs.filter(img=>img.src.includes('/art/cards/')).map(img=>({url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}))));
  await page.screenshot({path:out+'/'+id+'.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/'+id+'-390.png'});await page.locator('.zoom-overlay .inspect-close').click();await page.locator('.zoom-overlay').waitFor({state:'detached'});await page.setViewportSize({width:1280,height:900});checks.push(name+' current effect text on desktop and 390px');
 }
 assert.deepEqual(errors,[]);checks.push('All seven card inspections rendered without JS errors');
 await fs.writeFile(out+'/report.json',JSON.stringify({base,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'actual App/menu/card renderer served from base; isolated API fixtures; no authenticated account or online duel',checks,assets,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
