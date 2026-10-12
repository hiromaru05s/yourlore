import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194',out=process.env.LORE_TEST_OUT||'docs/characters/2026-10-12-faceless-illustrated/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']}),page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(120000);
const errors=[],requests=[],updates=[],failed=[];page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const user={id:'hooded-menu-fixture',display:'シーカー',email:'fixture@example.test',avatar:'SEEKER_BLUE',wins:3,losses:1,credits:0,sleeve:'default',furniture:'default'};
await apiFixture(page,r=>{const path=new URL(r.url).pathname;
 if(path==='/api/auth/me')return {user};if(path==='/api/geo')return {country:'JP'};
 if(path==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:3,losses:1}};
 if(path==='/api/social/profile')return {profile:{...user,self:true,created_at:Date.now(),recent:[],stats_public:true}};
 if(path==='/api/social/me'){updates.push(r.body);Object.assign(user,r.body);return {ok:true,...user,stats_public:true};}
 return {ok:true,keys:[],steps:[],rows:[],friends:[],incoming:[],outgoing:[]};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});await page.screenshot({path:out+'/home-replaced.png'});
 assert((await page.locator('.lounge-atmosphere').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('/art/lounge/v1/library.webp'));
 if(!origin.startsWith('https:'))await page.evaluate(async()=>{const m=await import('/src/ui/seekerAnimation.ts');m.setSeekerSkip(true);});
 await page.locator('.lounge-user').click();await page.waitForSelector('#avaBtn');await page.locator('#avaBtn').click();await page.waitForSelector('.hooded-live canvas[data-ready=true]');
 const hit=await page.evaluate(async()=>{const c=document.querySelector('.hooded-live canvas');document.querySelector('button[data-action=hurt]').click();return c.dataset.action;});assert.equal(hit,'hurt');
 await page.locator('[data-seeker-id=SEEKER_HOODED]').click();await page.locator('[data-save]').click();await page.waitForSelector('.hooded-picker',{state:'detached'});assert.equal(updates.at(-1).avatar,'SEEKER_HOODED');
 assert.match(await page.locator('.lounge-user .hooded-seeker').getAttribute('src'),/faceless-v2\/portrait/);
 await page.locator('.lounge-user').click();await page.waitForSelector('#avaBtn');assert.match(await page.locator('#avaBtn .hooded-seeker').getAttribute('src'),/faceless-v2\/portrait/);
 await page.locator('#avaBtn').click();await page.waitForTimeout(250);await page.screenshot({path:out+'/profile-in-lounge.png'});
 await page.setViewportSize({width:320,height:740});await page.waitForTimeout(250);await page.screenshot({path:out+'/profile-in-lounge-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.keyboard.press('Escape');await page.waitForSelector('.hooded-picker',{state:'detached'});
 await page.locator('[data-home]').click();await page.waitForSelector('.lounge-home');
 if(!origin.startsWith('https:')){const {seekerPlaybackCount}=await page.evaluate(async()=>{const m=await import('/src/ui/seekerAnimation.ts');return {seekerPlaybackCount:m.seekerPlaybackCount()};});assert.equal(seekerPlaybackCount,0);}
 assert.deepEqual(errors,[]);const retired=requests.filter(r=>/seekers\/(menu-v1|v2)\/.+\.webp|biblion\/seeker-(blue|red)(-lossless)?\.(png|webp)|stage-v1\/stage\./.test(r));assert.deepEqual(retired,[]);
 await fs.writeFile(out+'/menu-tests.json',JSON.stringify({origin,fixtureAccount:true,checks:[origin.startsWith('https:')?'compiled profile hit preview works':'profile hit preview works after previous duel was skipped/destroyed','actual HOME uses figure-free library','actual profile sends avatar to social/me','saved choice updates lounge header and profile','actual lounge picker at 320px','Escape and navigation dispose preview','no retired art requests'],updates,errors,retired},null,2)+'\n');console.log('PASS actual menu and profile API flow (fixture account)');
}catch(error){
 await page.screenshot({path:out+'/failure.png',timeout:15000}).catch(()=>{});
 await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),url:page.url(),errors,failed,requests:requests.slice(-15)},null,2));
 throw error;
}finally{await browser.close();}
