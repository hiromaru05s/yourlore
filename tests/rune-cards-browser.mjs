import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCards} from '../scripts/card-art-lib.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5193',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-rune-browser';await fs.mkdir(out,{recursive:true});
const cards=(await loadCards()).filter(c=>['RUNE1','RUNE2','RUNE3'].includes(c.id));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const user={id:'rune-text-fixture',display:'シーカー',credits:0,wins:0,losses:0,sleeve:'default',furniture:'default',decks:null};
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user};if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0,now:Date.now()};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:0,offered:true};if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default'],effects:[]}};if(p==='/api/collection')return {credits:0,starterCards:{STARTER_TRASH:8,STARTER_CHEST:2,STARTER_MANA:1},effects:[]};return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
const norm=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').replaceAll('—','').replaceAll('/','');
try {
 for(const lang of ['ja','ko','en']){
  await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);
  await page.goto(origin);await page.waitForSelector('.lounge-home',{timeout:120000});await page.waitForSelector('.screen-loader',{state:'detached',timeout:240000});
  await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.cards-screen').length===1);
  for(const size of [{width:1440,height:1000},{width:390,height:844}]){
   await page.setViewportSize(size);
   for(const c of cards){
    await page.locator('.cards-search').fill(c.nameJa);await page.waitForFunction(id=>document.querySelectorAll(`.cards-screen [data-card-id="${id}"]`).length===1,c.id);await page.locator(`.cards-screen [data-card-id="${c.id}"]`).click();await page.locator('#zoomOverlay').waitFor();
    const result=await page.locator('#zoomOverlay').evaluate(el=>({text:[...el.querySelectorAll('.card-effect-section')].map(b=>b.querySelector('h3').textContent+[...b.querySelectorAll('.card-effect-body')].map(p=>p.textContent).join('')).join(''),width:el.clientWidth,scrollWidth:el.scrollWidth,panels:[...el.querySelectorAll('.zoom-wrap,.zoom-details')].map(p=>({width:p.clientWidth,scrollWidth:p.scrollWidth,height:p.clientHeight,scrollHeight:p.scrollHeight,overflowY:getComputedStyle(p).overflowY}))}));
    assert.equal(norm(result.text),norm(c[{ja:'textJa',ko:'text',en:'textEn'}[lang]]),c.id+'/'+lang);
    assert(result.scrollWidth<=result.width+1);for(const p of result.panels){assert(p.scrollWidth<=p.width+1);if(p.scrollHeight>p.height+1)assert(['auto','scroll'].includes(p.overflowY));}
    if(c.id==='RUNE3')await page.screenshot({path:out+`/master-${lang}-${size.width}.png`});
    checks.push({id:c.id,lang,...size,...result});await page.keyboard.press('Escape');
   }
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,cwd:process.cwd(),checks,errors,scope:'API fixtures; actual served app, card search/detail, three languages and two viewport sizes. No authenticated duel.'},null,2)+'\n');console.log('PASS 18 served Runecraft detail texts and overflow checks');
} finally {await browser.close();}
