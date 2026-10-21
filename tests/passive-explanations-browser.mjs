// Production assets + actual menu navigation; API responses are isolated browser fixtures.
// This verifies shipped rendering, not authenticated multiplayer or server account behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5598',out=process.env.LORE_TEST_OUT||'/tmp/lore-passive-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
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

const review=process.env.LORE_PASSIVE_REVIEW==='1';
async function ready(){
 for(let attempt=0;attempt<3;attempt++){
  const state=await Promise.race([page.locator('.screen-loader').waitFor({state:'detached',timeout:180000}).then(()=> 'ready'),page.locator('.screen-loader .asset-retry').waitFor({state:'visible',timeout:180000}).then(()=> 'retry')]);
  if(state==='ready')return;
  loadRetries.push({at:new Date().toISOString(),text:await page.locator('.screen-loader').innerText()});
  await page.screenshot({path:`${out}/load-retry-${loadRetries.length}.png`});
  await page.locator('.screen-loader .asset-retry').click();
 }
 throw Error('Artwork could not load after 3 visible retry actions');
}
async function open(id,search){
 if(review){await page.locator('#card').selectOption(id);await page.locator('#open').click();}
 else {await page.locator('.cards-search').fill(search);await page.locator(`#grid [data-card-id="${id}"]`).click();}
 await page.locator('#zoomOverlay').waitFor();
}
async function close(){if(await page.locator('.card-reference-preview').count())await page.keyboard.press('Escape');await page.locator('.inspect-close').click();await page.locator('#zoomOverlay').waitFor({state:'detached'});}
async function popupFits(){const r=await page.locator('.card-reference-preview').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:el.scrollWidth>el.clientWidth+1};});assert(r.left>=0&&r.top>=0&&r.right<=r.w&&r.bottom<=r.h&&!r.overflow,JSON.stringify(r));}
const cases=[['M6','ツイン','counter'],['NGA4','剣鬼','dual'],['ASSASSIN1','初級アサシン','ambush'],['TAR2','没落貴族','aura'],['TOKEN00','かかし','void'],['WINE','ワイン','void'],['FORESIGHT','先見の明','void'],['GOLEM1','ゴーレム','guts'],['RUST_SLUG','ラストキャップ','decay'],['TAR5','貴族領主','majesty'],['CASTLE','城','taunt'],['CHOSEN_ARCHER','選ばれし弓手','evade'],['STARTER_MANA','アチューン','relic'],['VOID_RITE','次元術式','void']];
try {
 await page.goto(base+(review?'/card-wording-review.html':''),{waitUntil:'domcontentloaded'});
 if(review)await page.locator('#surface').selectOption('menu');
 else {await page.locator('.lounge-home').waitFor();await ready();await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await ready();}
 for(const lang of ['ja','ko','en']){
  if(review)await page.locator('#language').selectOption(lang);
  else {const previous=await page.locator('.cards-lang select').inputValue(),old=await page.locator('.cards-search').elementHandle();await page.locator('.cards-lang select').selectOption(lang);if(previous!==lang)await page.waitForFunction(n=>!n.isConnected,old);await ready();}
  for(const [width,height]of [[1280,900],[390,844]]){
   await page.setViewportSize({width,height});
   for(const [id,search,key]of cases){
    await open(id,search);
    const term=page.locator(`#zoomOverlay button.card-key-label[data-psv="${key}"]`).first();await term.click();
    const target=page.locator(`.psv-item[data-psv="${key}"]`),rows=target.locator('.psv-rule');assert(await rows.count()>0);
    if(key==='void')assert.equal(await rows.count(),id==='VOID_RITE'?5:3,'Void definition follows owned card type without hiding referenced cases');
    for(const row of await rows.all()){
     await row.scrollIntoViewIfNeeded();
     const bounds=await row.evaluate(el=>{const dd=el.querySelector('dd'),r=el.getBoundingClientRect(),s=getComputedStyle(dd);return{left:r.left,right:r.right,width:innerWidth,overflow:el.scrollWidth>el.clientWidth+1,font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),text:dd.textContent};});
     assert(bounds.left>=0&&bounds.right<=bounds.width+1&&!bounds.overflow&&bounds.font>=16&&bounds.line>=bounds.font*1.7,JSON.stringify({id,lang,width,bounds}));assert(bounds.text.length>0);
    }
    await target.locator('.psv-name').scrollIntoViewIfNeeded();
    if(lang==='ja'&&['TOKEN00','WINE','FORESIGHT','GOLEM1','RUST_SLUG'].includes(id))await page.screenshot({path:`${out}/${id}-${width}.png`});
    await page.locator('.inspect-return-rules').click();assert.equal(await term.evaluate(el=>document.activeElement===el),true);
    checks.push({id,key,lang,width,rows:await rows.count(),returnFocus:true});await close();
   }
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({base,scope:review?'local real inspector with menu styles':'production assets and real card menu with isolated API fixtures',checks,errors,loadRetries,networkFailures},null,2));console.log(`PASS ${checks.length} passive definition scenarios: all 11 abilities, three Void types and reference, Japanese/Korean/English, 1280/390 widths, full readable rows and return focus`);
}catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),checks,errors,loadRetries,networkFailures,body:await page.locator('body').innerText()},null,2));throw error;}finally{await browser.close();}
