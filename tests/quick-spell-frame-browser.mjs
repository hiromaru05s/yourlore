// Production assets + actual menu navigation; API responses are isolated browser fixtures.
// This verifies shipped rendering, not authenticated multiplayer or server account behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5278',out=process.env.LORE_TEST_OUT||'/tmp/lore-quick-spell-frame';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(180000);
const errors=[],checks=[],loadRetries=[],networkFailures=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));
const user={id:'card-qa-fixture',display:'シーカー',email:'fixture@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,exp:100};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};
 if(p==='/api/rank/me')return{rating:{season:'2026-10',mmr:1000,tier:'iron',rank:1,wins:0,losses:0,draws:0}};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:0};
 if(p==='/api/collection')return{credits:0,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-21',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:0,resetsAt:Date.now()+86400000};
 if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};
 if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};
 return{ok:true,keys:[],receipts:[]};
});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));


async function ready(){await page.locator('.screen-loader').waitFor({state:'detached',timeout:180000});}
async function open(id,search){await page.locator('.cards-search').fill(search);await page.locator(`#grid [data-card-id="${id}"]`).click();await page.locator('#zoomOverlay').waitFor();}
async function close(){await page.locator('.inspect-close').click();await page.locator('#zoomOverlay').waitFor({state:'detached'});assert.equal(await page.locator('.quick-spell-frame-canvas').count(),0);}
const snapshot=()=>page.locator('#zoomOverlay .quick-spell-frame-canvas').evaluate(n=>n.toDataURL());
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();await ready();
 await page.locator('[data-nav=cards]').waitFor({state:'visible',timeout:180000});await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await ready();
 for(const lang of ['ja','ko','en']){
  const prev=await page.locator('.cards-lang select').inputValue(),search=await page.locator('.cards-search').elementHandle();await page.locator('.cards-lang select').selectOption(lang);if(prev!==lang)await page.waitForFunction(n=>!n.isConnected,search);await ready();
  for(const [width,height] of [[1280,900],[390,844]]){
   await page.setViewportSize({width,height});await open('QUICK_ATTUNE','アチューン');
   assert.equal(await page.locator('#zoomOverlay .quick-spell-frame-canvas').count(),1);
   const size=await page.locator('.quick-spell-frame-badge').evaluate(n=>{const r=n.getBoundingClientRect(),c=n.parentElement.getBoundingClientRect();return{text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),widthRatio:r.width/c.width,heightRatio:r.height/c.height,left:r.left,right:r.right,screen:innerWidth,overflow:n.scrollWidth>n.clientWidth+1};});
   assert(size.widthRatio>=.63&&size.heightRatio>=.07&&size.font>=11&&!size.overflow&&size.left>=0&&size.right<=size.screen,JSON.stringify(size));
   assert(size.text.includes({ja:'クイック魔法',en:'Quick spell',ko:'퀵 마법'}[lang]));
   const first=await snapshot();await page.waitForTimeout(250);assert.notEqual(await snapshot(),first,'veil keeps moving');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const still=await snapshot();await page.waitForTimeout(150);assert.equal(await snapshot(),still,'reduced motion is static');await page.emulateMedia({reducedMotion:'no-preference'});
   await page.screenshot({path:`${out}/quick-${lang}-${width}.png`});checks.push({lang,width,...size});await close();
   await open('S13','星墓の落下');assert.equal(await page.locator('.quick-spell-frame-canvas').count(),0);await close();
  }
 }
 await page.setViewportSize({width:1280,height:900});
 const prev=await page.locator('.cards-lang select').inputValue(),search=await page.locator('.cards-search').elementHandle();await page.locator('.cards-lang select').selectOption('ja');if(prev!=='ja')await page.waitForFunction(n=>!n.isConnected,search);await ready();
 for(const [id,text] of [['QUICK_MIMIC','ミミックパーティー'],['QUICK_SURVIVAL','生存をかけた戦い'],['QUICK_POISON','ポイズン'],['QUICK_WORLD','世界樹の恵み'],['QUICK_MUSTER','緊急召集'],['QUICK_SORT','選別の掟'],['QUICK_REBIRTH','強制輪廻'],['QUICK_GRIMOIRE','呪術魔法書'],['QUICK_ASSAULT','総攻撃']]){
  await open(id,text);assert.equal(await page.locator('.quick-spell-frame-canvas').count(),1);checks.push({id,quick:true});await close();
 }
 await open('QUICK_MIMIC','ミミックパーティー');
 const link=page.locator('#zoomOverlay .card-reference-link[data-reference-id="MIMIC"]').first();await link.click();assert.equal(await page.locator('.quick-spell-frame-canvas').count(),0);await page.locator('.inspect-back').click();assert.equal(await page.locator('.quick-spell-frame-canvas').count(),1);const restored=await snapshot();await page.waitForTimeout(250);assert.notEqual(await snapshot(),restored);checks.push({history:'quick to related monster and back resumes animation'});await close();
 for(let i=0;i<5;i++){await open('QUICK_ATTUNE','アチューン');await close();}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({base,scope:'real shipped card menu with isolated API fixture; no live account or multiplayer',checks,errors,networkFailures},null,2));console.log(`PASS ${checks.length} quick-frame checks: all quick spells, 3 languages, desktop/narrow, animated/static, history and repeated close; 0 browser errors`);
}catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),checks,errors,body:await page.locator('body').innerText()},null,2));throw error;}finally{await browser.close();}
