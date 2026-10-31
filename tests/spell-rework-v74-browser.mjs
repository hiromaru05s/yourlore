import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-cosmetics-tools/node_modules/playwright/index.mjs');
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5187',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-spell-v74-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
const user={id:'card-text-fixture',display:'シーカー',credits:0,wins:0,losses:0,sleeve:'default',furniture:'default',decks:null};
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user};if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0,now:Date.now()};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:0,offered:true};if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default'],effects:[]}};if(p==='/api/collection')return {credits:0,starterCards:{STARTER_TRASH:8,STARTER_CHEST:2,STARTER_MANA:1},effects:[]};return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
try{
 const coverage=JSON.parse(await fs.readFile('docs/releases/2026-10-31-spell-rework/card-delta.json','utf8'));const changed=coverage.changes.map(c=>({...c,after:{ja:c.after.textJa,ko:c.after.text,en:c.after.textEn}}));const checks=[];
 for(const lang of ['ja','ko','en']){
 await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);
 console.log('OPEN',lang,origin);await page.goto(origin,{waitUntil:'domcontentloaded'});console.log('DOM',lang);await page.waitForSelector('[data-nav=cards]',{timeout:120000});await page.waitForSelector('.screen-loader',{state:'detached',timeout:240000});
 await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.cards-screen').length===1);
 console.log('CARDS',lang);for(const c of changed){console.log('CHECK',lang,c.id);await page.locator('.cards-search').fill(c.nameJa);await page.waitForFunction(id=>document.querySelectorAll(`.cards-screen [data-card-id="${id}"]`).length===1,c.id);await page.locator(`.cards-screen [data-card-id="${c.id}"]`).click();await page.locator('#zoomOverlay').waitFor();
 const rendered=await page.locator('#zoomOverlay').evaluate(el=>[...el.querySelectorAll('.card-effect-section')].map(b=>b.querySelector('h3').textContent+[...b.querySelectorAll('.card-effect-body')].map(p=>p.textContent).join('')+[...b.querySelectorAll('.dr')].map(r=>r.querySelector('.dr-roll').textContent+':'+r.querySelector('.dr-fx').textContent).join('')).join(''));
 const norm=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').replaceAll('—','').replaceAll('/','');assert.equal(norm(rendered),norm(c.after[lang]),c.id+'/'+lang);checks.push(c.id+'/'+lang);
 if(['RICH_HABIT','DESERTIFICATION','BLOOD_SORROW','GS8_0'].includes(c.id))await page.screenshot({path:out+`/${c.id}-${lang}.png`});await page.keyboard.press('Escape');}
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.cards-search').fill('砂漠化');await page.locator('.cards-screen [data-card-id="DESERTIFICATION"]').click();await page.locator('#zoomOverlay').waitFor();await page.screenshot({path:out+'/DESERTIFICATION-en-mobile.png'});await page.keyboard.press('Escape');
 await page.locator('.cards-search').fill('Growth');assert.equal(await page.locator('[data-card-id=GROWTH]').count(),0);assert.deepEqual(errors,[]);await fs.writeFile(out+'/release-browser-report.json',JSON.stringify({origin,checks,errors,fixture:'API responses only; real built app navigation, search and detail views'},null,2));console.log('PASS',checks.length,'released text checks through actual card catalog');
}catch(error){await page.screenshot({path:out+'/failure.png'});console.error(await page.locator('body').innerText());throw error;}finally{await browser.close();}
