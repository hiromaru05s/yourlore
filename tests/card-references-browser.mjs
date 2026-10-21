// Production assets + actual menu navigation; API responses are isolated browser fixtures.
// This verifies shipped rendering, not authenticated multiplayer or server account behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5598',out=process.env.LORE_TEST_OUT||'/tmp/lore-card-references-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
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

const review=process.env.LORE_REFERENCE_REVIEW==='1';
async function open(id,search){
 if(review){await page.locator('#card').selectOption(id);await page.locator('#open').click();}
 else {await page.locator('.cards-search').fill(search);await page.locator(`#grid [data-card-id="${id}"]`).click();}
 await page.locator('#zoomOverlay').waitFor();
}
async function close(){await page.locator('.inspect-close').click();await page.locator('#zoomOverlay').waitFor({state:'detached'});}
async function popupFits(){const r=await page.locator('.card-reference-preview').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:el.scrollWidth>el.clientWidth+1};});assert(r.left>=0&&r.top>=0&&r.right<=r.w&&r.bottom<=r.h&&!r.overflow,JSON.stringify(r));}
try {
 await page.goto(base+(review?'/card-wording-review.html':''),{waitUntil:'domcontentloaded'});
 if(!review){await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached',timeout:180000});await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.locator('.screen-loader').waitFor({state:'detached',timeout:180000});}
 for(const lang of ['ja','ko','en']){
  if(review)await page.locator('#language').selectOption(lang);
  else {const previous=await page.locator('.cards-lang select').inputValue(),old=await page.locator('.cards-search').elementHandle();await page.locator('.cards-lang select').selectOption(lang);if(previous!==lang)await page.waitForFunction(n=>!n.isConnected,old);await page.locator('.screen-loader').waitFor({state:'detached',timeout:180000});}
  for(const [width,height]of [[1280,900],[390,844]]){
   await page.setViewportSize({width,height});
   for(const [id,search,source]of [['CREATION','創造','EMPTY_MIND'],['DOMINION','支配','Q_TOWN']]){
    await open(id,search);const original=page.locator('#zoomOverlay');const sourceCard=original.locator(`[data-relation=sources] .card[data-card-id="${source}"]`);await sourceCard.click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),source);await page.locator('.inspect-back').click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),id);checks.push({lang,width,id,source,reverse:true});
    if(lang==='ja')await page.screenshot({path:`${out}/${id}-${width}.png`});await close();
   }
   await open('EMPTY_MIND','無の境地');let link=page.locator('.card-reference-link[data-reference-id=CREATION]');await link.hover();await page.locator('.card-reference-preview').waitFor();await popupFits();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'EMPTY_MIND');
   if(lang==='ja')await page.screenshot({path:`${out}/single-${width}.png`});await page.keyboard.press('Escape');assert.equal(await page.locator('.card-reference-preview').count(),0);await link.click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'CREATION');await page.locator('.inspect-back').click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'EMPTY_MIND');checks.push({lang,width,id:'EMPTY_MIND',hover:true,history:true});await close();
   await open('MIMIC_KING','ミミックキング');link=page.locator('.card-reference-link[data-reference-id=mimic]');await link.hover();await page.locator('.card-reference-preview').waitFor();await popupFits();assert.equal(await page.locator('.card-reference-preview .reference-member').count(),7);assert.equal(await page.locator('.card-reference-preview [data-card-id=MIMIC_HIDEOUT]').count(),0);
   await page.locator('.card-reference-preview header').hover();await page.waitForTimeout(250);assert.equal(await page.locator('.card-reference-preview').count(),1,'pointer can enter preview without dismissal');
   if(lang==='ja')await page.screenshot({path:`${out}/series-${width}.png`});await page.locator('.card-reference-preview .reference-member[data-card-id=MIMIC2]').click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'MIMIC2');await page.locator('.inspect-back').click();assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'MIMIC_KING');checks.push({lang,width,id:'MIMIC_KING',hoverSeries:true,previewNavigation:true});await close();
   await open('BLACK_ELSA','黒魔女');link=page.locator('.card-reference-link[data-reference-id=black]').first();await link.focus();await page.keyboard.press('ArrowDown');await popupFits();assert.equal(await page.locator('.card-reference-preview .reference-member[data-card-id=BLACK_ELSA]').count(),0);assert(await page.locator('.card-reference-preview .reference-member').count()>1);await page.keyboard.press('Escape');assert.equal(await page.locator('.card-reference-preview').count(),0);assert.equal(await page.locator('#zoomOverlay').getAttribute('data-card-id'),'BLACK_ELSA');assert.equal(await link.evaluate(el=>el===document.activeElement),true);checks.push({lang,width,id:'BLACK_ELSA',keyboard:true});await close();
   await open('GUILD_CHEST','ギルド');link=page.locator('.dr-fx .card-reference-link[data-reference-id=GUILD_EYE]');await link.hover();await page.locator('.card-reference-preview').waitFor();await popupFits();checks.push({lang,width,id:'GUILD_CHEST',diceReference:true});await close();
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({base,scope:review?'local real inspector':'production assets and real card menu with isolated API fixtures',checks,errors},null,2));console.log(`PASS ${checks.length} reference scenarios: reverse links, hover previews, series, pointer bridge, keyboard, history and viewport bounds; 0 browser errors`);
} catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),checks,errors,body:await page.locator('body').innerText()},null,2));throw error;}finally{await browser.close();}
