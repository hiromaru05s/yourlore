import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5207',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-controls-live';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={origin,mode:'real application and assets, fixture local guest API; no real account or PvP',cases:[]};
try{for(const lang of ['ko','ja','en']){
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],assets=new Set();page.on('response',r=>{if(/\/assets\/.*\.js(?:\?|$)/.test(r.url()))assets.add(r.url());});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
 await apiFixture(page,async r=>{
  const p=new URL(r.url).pathname;
  if(p==='/api/auth/me')return {user:{id:'local-guest-user',display:'CONTROLS QA',email:'qa@example.test',credits:0,avatar:'SEEKER_BLUE',wins:0,losses:0}};
  if(p==='/api/rewards/tutorial')return {offered:true,keys:[],credits:0};
  if(p==='/api/rewards/progression')return {credits:0,ranked:0,online:0,bot:{},dailies:[],resetsAt:Date.now()+86400000};
  if(p==='/api/rank/me')return {rating:{season:'2026-11',mmr:1000,tier:'bronze',wins:0,losses:0}};
  if(p==='/api/gifts')return {items:[],unreadCount:0};
  return {ok:true,country:'KR',entries:[],items:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};
 });
 await page.addInitScript(lang=>{localStorage.setItem('lore_lang',lang);localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));},lang);
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('#diffStart').click();
  await page.locator('#hand .card').first().waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#endBtn .end-turn-label')?.textContent==='END\nTURN',null,{timeout:120000});
  await page.waitForTimeout(1500);
  const hand=page.locator('#hand .card').first();await hand.click();await page.waitForTimeout(300);await hand.click();assert.equal(await page.locator('#zoomOverlay').count(),0);
  await hand.click({button:'right'});await page.locator('#zoomOverlay').waitFor();await page.screenshot({path:out+'/'+lang+'-inspect.png'});await page.keyboard.press('Escape');
  assert.equal(await page.locator('#zoomOverlay').count(),0);await page.screenshot({path:out+'/'+lang+'.png'});
  assert.deepEqual(errors,[]);report.cases.push({lang,primaryClick:'no zoom',secondaryClick:'zoom',label:'END TURN',errors,assets:[...assets]});
 }catch(error){await page.screenshot({path:out+'/'+lang+'-failure.png'});console.log(await page.locator('body').innerText());throw error;}finally{await context.close();}
}await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser.close();}
