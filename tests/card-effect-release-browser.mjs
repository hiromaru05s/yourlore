import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5187',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-card-effect-completeness';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
const user={id:'card-text-fixture',display:'シーカー',credits:0,wins:0,losses:0,sleeve:'default',furniture:'default',decks:null};
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user};if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0,now:Date.now()};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:0,offered:true};if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default'],effects:[]}};if(p==='/api/collection')return {credits:0,starterCards:{STARTER_TRASH:8,STARTER_CHEST:2,STARTER_MANA:1},effects:[]};return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
try{
 const coverage=JSON.parse(await fs.readFile('docs/releases/2026-10-29-card-effect-audit/coverage.json','utf8'));const changed=coverage.cards.filter(c=>c.changed);const checks=[];
 for(const lang of ['ja','ko','en']){
 await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);
 await page.goto(origin);await page.waitForSelector('.lounge-home',{timeout:120000});await page.waitForSelector('.screen-loader',{state:'detached',timeout:240000});
 await page.locator('[data-nav=cards]').click();await page.locator('.cards-search').waitFor();
 for(const c of changed){await page.locator('.cards-search').fill(c.nameJa);await page.locator(`.cards-screen [data-card-id="${c.id}"]`).click();await page.locator('#zoomOverlay').waitFor();
 const rendered=await page.locator('#zoomOverlay').evaluate(el=>[...el.querySelectorAll('.card-effect-section')].map(b=>b.querySelector('h3').textContent+[...b.querySelectorAll('.card-effect-body')].map(p=>p.textContent).join('')+[...b.querySelectorAll('.dr')].map(r=>r.querySelector('.dr-roll').textContent+':'+r.querySelector('.dr-fx').textContent).join('')).join(''));
 const norm=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').replaceAll('—','').replaceAll('/','');assert.equal(norm(rendered),norm(c.after[lang]),c.id+'/'+lang);checks.push(c.id+'/'+lang);
 if(c.id==='GUILD_CO')await page.screenshot({path:out+`/release-guild-${lang}.png`});await page.keyboard.press('Escape');}
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/release-browser-report.json',JSON.stringify({origin,checks,errors,fixture:'API responses only; real built app navigation, search and detail views'},null,2));console.log('PASS',checks.length,'released text checks through actual card catalog');
}finally{await browser.close();}
