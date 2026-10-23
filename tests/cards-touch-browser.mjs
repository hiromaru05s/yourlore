// Real shipped menu, API-only account fixture. No authenticated account writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {webkit,chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const engine=process.env.LORE_BROWSER||'webkit',origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5237',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-cards-touch';await fs.mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:{channel:'chrome'});
const page=await browser.newPage({...devices['iPad Pro 11'],viewport:{width:1194,height:834}});page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return{user:{id:'touch-fixture',display:'Seeker',avatar:'SEEKER_BLUE',credits:0,exp:100}};if(p==='/api/geo')return{country:'JP'};if(p==='/api/rank/me')return{rating:{tier:'iron',mmr:1000}};if(p==='/api/rewards/tutorial')return{offered:true,keys:[]};if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};return{ok:true,offered:true,keys:[],receipts:[]};});
await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');window.addEventListener('click',e=>{if(window.dropCompatibilityClick&&e.detail){e.preventDefault();e.stopImmediatePropagation();}},true);});
async function tap(selector){let b;for(let i=0;i<50&&!b;i++){b=await page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{x:r.x,y:r.y,width:r.width,height:r.height}:null;},selector);if(!b)await page.waitForTimeout(50);}assert(b,selector);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
async function idle(){await page.waitForFunction(()=>document.querySelector('#grid')?.getAttribute('aria-busy')!=='true'&&document.querySelectorAll('#grid>.card').length>0);}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav=cards]').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});if(await page.locator('.graphics-notice').count())await page.locator('[data-continue]').click();
 await page.waitForTimeout(1000);await page.locator('[data-nav=cards]').waitFor({state:'visible'});await tap('[data-nav=cards]');await page.locator('#pageLabel').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});await idle();
 for(const size of [{width:1194,height:834},{width:834,height:1194},{width:1024,height:768},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(const dropped of [false,true]){
   await page.evaluate(v=>window.dropCompatibilityClick=v,dropped);
   await tap('#typeRow .chip:nth-child(2)');assert.equal(await page.locator('#typeRow .chip:nth-child(2)').getAttribute('aria-pressed'),'true');
   await tap('#typeRow .chip:first-child');await idle();assert.match(await page.locator('#pageLabel').innerText(),/^1 \/ /);
   await tap('summary');assert(await page.locator('details').evaluate(e=>e.open));
   await tap('#nextPage');assert.match(await page.locator('#pageLabel').innerText(),/^2 \/ /,'One tap advances exactly one page');assert.equal(await page.locator('details').evaluate(e=>e.open),false);
   await tap('#prevPage');assert.match(await page.locator('#pageLabel').innerText(),/^1 \/ /);await idle();
   checks.push({size,droppedCompatibilityClick:dropped,passed:true});
  }
  const heights=await page.locator('#nextPage,#typeRow .chip').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(heights.every(h=>h>=44));
 }
 await page.evaluate(()=>window.dropCompatibilityClick=false);await page.screenshot({path:out+'/'+engine+'.png',animations:'disabled'});assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/'+engine+'.json',JSON.stringify({origin,engine,checks,errors,scope:'API fixture with real assets; no physical iPad confirmation'},null,2));console.log(JSON.stringify({engine,checks:checks.length,errors}));
}finally{await browser.close();}
