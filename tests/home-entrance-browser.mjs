import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import('/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5301';
const readyTimeout=origin.startsWith('https:')?180000:60000;
const out=process.env.LORE_TEST_OUT||'docs/ui-rework/2026-09-29-home-entrance/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out+'/video',size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))failed.push(r.url());});
let signedIn=true;
const user={id:'entrance-test-user',email:'preview@example.test',display:'SEEKER',wins:47,losses:19,credits:1200,avatar:'M1',decks:null};
await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;let data={ok:true,keys:[],friends:[],requests:[],items:[],rows:[]};if(path==='/api/auth/me')data={user:signedIn?user:null};if(path==='/api/auth/login'){signedIn=true;data={user};}if(path==='/api/geo')data={country:'JP'};if(path==='/api/rank/me')data={rating:{season:'2026-09',mmr:1200,wins:47,losses:19,peak_mmr:1200,rank:1,tier:'silver'}};return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:readyTimeout});await page.waitForSelector('.home-entrance-stage',{timeout:readyTimeout});
 assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);
 assert.equal(await page.locator('.loading-progress progress').getAttribute('value'),'100');
 await page.waitForFunction(()=>Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed)>=1450);await page.screenshot({path:out+'/desktop-fan.png'});
 await page.waitForSelector('.home-entrance-stage',{state:'detached',timeout:15000});assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);assert.equal(await page.locator('.screen-loader').count(),0);assert.equal(await page.locator('.home-entrance-veil').count(),0);
 await page.screenshot({path:out+'/desktop-home.png'});
 await page.locator('[data-nav="deck"]').click();await page.waitForSelector('.lounge-deck');await page.locator('[data-nav="home"]').click();await page.waitForSelector('.lounge-home');await page.waitForTimeout(250);assert.equal(await page.locator('.home-entrance-stage').count(),0,'ordinary home return does not replay');
 await page.reload({waitUntil:'domcontentloaded',timeout:readyTimeout});await page.waitForSelector('.home-entrance-skip',{timeout:readyTimeout});await page.locator('.home-entrance-skip').focus();await page.keyboard.press('Enter');await page.waitForSelector('.screen-loader',{state:'detached'});assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);assert.equal(await page.locator('#ranked').evaluate(e=>e===document.activeElement),true);
 await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'domcontentloaded',timeout:readyTimeout});await page.waitForSelector('.home-entrance-stage',{timeout:readyTimeout});await page.waitForFunction(()=>Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed)>=1500);await page.screenshot({path:out+'/mobile-fan.png'});await page.keyboard.press('Escape');await page.waitForSelector('.home-entrance-stage',{state:'detached'});assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);await page.screenshot({path:out+'/mobile-home.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'domcontentloaded',timeout:readyTimeout});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached',timeout:readyTimeout});assert.equal(await page.locator('.home-entrance-stage').count(),0);assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
 if(origin.includes('127.0.0.1')){
  await page.emulateMedia({reducedMotion:'no-preference'});
  const cancelled=await page.evaluate(async()=>{const {coverScreen}=await import('/src/ui/assetReadiness.ts');const root=document.querySelector('#app');const c=coverScreen(root,true,true);const task=c.ready();setTimeout(c.cancel,500);const complete=await task;return {complete,inert:root.inert,stage:!!document.querySelector('.home-entrance-stage'),veil:!!document.querySelector('.home-entrance-veil')};});
  assert.deepEqual(cancelled,{complete:false,inert:false,stage:false,veil:false});
 }
 await page.emulateMedia({reducedMotion:'no-preference'});signedIn=false;
 await page.reload({waitUntil:'domcontentloaded',timeout:readyTimeout});await page.waitForSelector('.lounge-login');await page.waitForSelector('.screen-loader',{state:'detached',timeout:readyTimeout});assert.equal(await page.locator('.home-entrance-stage').count(),0,'login does not run home entrance');
 await page.locator('#email').fill('preview@example.test');await page.locator('#password').fill('fixture-only-not-a-real-password');await page.locator('#submit').click();await page.waitForSelector('.home-entrance-stage',{timeout:readyTimeout});await page.locator('.home-entrance-skip').click();await page.waitForSelector('.screen-loader',{state:'detached'});assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,api:'fixture authenticated user; not real account login',errors,failed,checks:['real boot path waits for assets','approved 01 fan','home unlocks on finish','no replay on menu return','reload replays','keyboard skip restores focus','390px portrait','Escape skip','reduced motion','login to first home',...(origin.includes('127.0.0.1')?['mid-animation cancellation cleans up']:[])]},null,2));console.log('PASS home entrance '+origin);
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,failed,url:page.url()},null,2));throw error;}finally{await page.close();await context.close();await browser.close();}
