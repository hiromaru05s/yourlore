import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5186';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-26-single-loading/local';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report={origin,api:'guest fixture; real built assets',checks:[]};
try{
 for(const [width,stalledCache] of [[1280,false],[390,false],[1280,true]]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.stack));
  await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:0,losses:0}}:p==='/api/rewards/tutorial'?{offered:true,keys:[],credits:100}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:{ok:true,friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[]};});
  await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home-main');await page.waitForSelector('.screen-loader',{state:'detached'});
  assert.equal(await page.locator('#bot').innerText(),'シングル');await page.locator('#bot').click();assert((await page.locator('#ranked').innerText()).includes('シングル'));
  await page.screenshot({path:`${out}/home-${width}.png`});if(stalledCache)await page.evaluate(()=>{Cache.prototype.keys=function(){return new Promise(()=>{});};});await page.locator('#ranked').click();assert.equal(await page.locator('.bot-npcs .menu-eyebrow').innerText(),'SINGLE');await page.screenshot({path:`${out}/opponents-${width}.png`});
  const start=Date.now();await page.locator('#diffStart').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.duel-opening',{state:'detached'});await page.waitForFunction(()=>document.querySelector('#hand .card'));
  const hand=await page.locator('#hand .card').count();assert(hand>0);await page.screenshot({path:`${out}/game-${width}${stalledCache?'-stalled-cache':''}.png`});assert.deepEqual(errors,[]);report.checks.push({width,stalledCache,cacheMode:await page.locator('html').getAttribute('data-menu-cache'),readyMs:Date.now()-start,hand,sceneReady:true,errors});await context.close();
 }
 await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
