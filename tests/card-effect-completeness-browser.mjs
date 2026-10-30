import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5187',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-card-effect-completeness';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
const user={id:'card-text-fixture',display:'シーカー',credits:0,wins:0,losses:0,sleeve:'default',furniture:'default',decks:null};
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return {user};if(p==='/api/gifts')return {items:[],unreadCount:0,pendingCount:0,pendingAmount:0,now:Date.now()};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:0,offered:true};if(p==='/api/social/profile')return {profile:{...user,self:true,created_at:1,sleeves:['default'],furnitures:['default'],effects:[]}};if(p==='/api/collection')return {credits:0,starterCards:{STARTER_TRASH:8,STARTER_CHEST:2,STARTER_MANA:1},effects:[]};return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};});
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home',{timeout:120000});await page.waitForSelector('.screen-loader',{state:'detached',timeout:240000});
 const report=await page.evaluate(async()=>{
 const [{DB,STARTERS},{zoomCard,closeZoom},{setLang}]=await Promise.all([import('/src/shared/cards.ts'),import('/src/ui/anim.ts'),import('/src/i18n.ts')]);
 window.cardAudit={DB,STARTERS,zoomCard,closeZoom,setLang};let count=0;const mismatches=[];
 const norm=s=>s.replace(/[【】]/g,'').replace(/\s+/g,'').replaceAll('—','').replaceAll('/','');
 for(const lang of ['ja','ko','en']){setLang(lang);for(const c of [...Object.values(DB),...Object.values(STARTERS)]){zoomCard({...c,uid:c.id});const rendered=[...document.querySelectorAll('#zoomOverlay .card-effect-section')].map(b=>b.querySelector('h3').textContent+[...b.querySelectorAll('.card-effect-body')].map(p=>p.textContent).join('')+[...b.querySelectorAll('.dr')].map(r=>r.querySelector('.dr-roll').textContent+':'+r.querySelector('.dr-fx').textContent).join('')).join('');if(norm(rendered)!==norm(c[{ja:'textJa',ko:'text',en:'textEn'}[lang]]))mismatches.push(c.id+'/'+lang);closeZoom();count++;}}
 return {count,mismatches};});
 assert.equal(report.count,1143);assert.deepEqual(report.mismatches,[]);
 const viewports=[];
 for(const lang of ['ja','ko','en'])for(const size of [{width:1440,height:1000},{width:390,height:844}]){
 await page.setViewportSize(size);await page.evaluate(lang=>{const a=window.cardAudit;a.closeZoom();a.setLang(lang);a.zoomCard({...a.DB.GUILD_CO,uid:'guild-inspect'});},lang);await page.waitForTimeout(300);
 const layout=await page.locator('#zoomOverlay').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,sections:el.querySelectorAll('.card-effect-section').length,panels:[...el.querySelectorAll('.zoom-wrap,.zoom-details')].map(p=>({width:p.clientWidth,scrollWidth:p.scrollWidth,height:p.clientHeight,scrollHeight:p.scrollHeight,overflowY:getComputedStyle(p).overflowY}))}));
 assert.equal(layout.sections,3);assert(layout.scrollWidth<=layout.width+1);for(const p of layout.panels){assert(p.scrollWidth<=p.width+1);if(p.scrollHeight>p.height+1)assert(['auto','scroll'].includes(p.overflowY));}
 await page.screenshot({path:out+`/guild-${lang}-${size.width}.png`});if(size.width===390){await page.locator('#zoomOverlay .card-effect-section').last().scrollIntoViewIfNeeded();await page.screenshot({path:out+`/guild-${lang}-390-bottom.png`});}viewports.push({lang,...size,...layout});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,cwd:process.cwd(),fixture:'API responses only; production app styles, art and zoom inspector',...report,viewports,errors},null,2));console.log('PASS',report.count,'Chrome inspectors and six Guild viewport/locale checks');
}finally{await browser.close();}
