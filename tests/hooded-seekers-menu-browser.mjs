import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194',out=process.env.LORE_TEST_OUT||'docs/characters/2026-10-12-faceless-illustrated/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic','--use-angle=metal']}),page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(120000);
const errors=[],requests=[],updates=[],failed=[];page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});page.on('pageerror',e=>errors.push(e.stack ?? e.message));page.on('request',r=>requests.push(r.url()));
const user={id:'hooded-menu-fixture',display:'シーカー',email:'fixture@example.test',avatar:'NPC_LUMI',background:'plain',needsUsername:false,wins:3,losses:1,credits:0,sleeve:'default',furniture:'default'};
await apiFixture(page,r=>{const path=new URL(r.url).pathname;
 if(path==='/api/auth/me')return {user};if(path==='/api/geo')return {country:'JP'};
 if(path==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:3,losses:1}};
 if(path==='/api/gifts')return {items:[],pendingCount:0,pendingAmount:0,unreadCount:0,now:Date.now()};
 if(path==='/api/onboarding')return {stage:'complete'};
 if(path==='/api/rewards/tutorial')return {offered:true,keys:[]};
 if(path==='/api/rewards/progression')return {dailies:[],online:0,ranked:0,bot:{},credits:0,resetsAt:Date.now()+86400000};
 if(path==='/api/social/profile')return {profile:{...user,self:true,created_at:Date.now(),recent:[],stats_public:true}};
 if(path==='/api/social/me'){updates.push(r.body);Object.assign(user,r.body);return {ok:true,...user,stats_public:true};}
 return {ok:true,keys:[],steps:[],rows:[],friends:[],incoming:[],outgoing:[]};
});

await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),()=>page.locator('.graphics-notice [data-continue]').click());
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 const figure=page.locator('.home-standing-seeker');
 await page.locator('.home-standing-seeker[data-character=NPC_LUMI] img').waitFor();
 assert.match(await figure.locator('img').getAttribute('src'),/npcs.*lumi/);
 await page.locator('.screen-loader').waitFor({state:'detached'});
 await page.locator('[data-profile]').click();
 await page.locator('[data-edit-look]').click();
 const picker=page.locator('dialog.appearance-picker');
 assert.equal(await picker.locator('[data-scene]').count(),8);
 await picker.locator('[data-character]').last().click();
 await picker.locator('[data-scene=navy]').click();
 await picker.locator('[data-save]').click();
 await picker.waitFor({state:'detached'});
 assert.deepEqual(updates.at(-1),{avatar:'SEEKER_HOODED',background:'navy'});
 // Inspect in the navigation task, before a fast compositor can finish the entrance.
 const entry = await page.evaluate(() => {
   document.querySelector('[data-nav=home]').click();
   const home = document.querySelector('.lounge-home');
   return {
     daylight: getComputedStyle(home.querySelector('.living-home')).backgroundImage.includes('library-daylight'),
     phase: home.dataset.homeReturn,
     sceneAnimation: getComputedStyle(home.querySelector('.lounge-home-screen')).animationName,
     ui: ['.lounge-topbar','.lounge-home-main','.lounge-rail'].map(selector => getComputedStyle(home.querySelector(selector)).visibility),
     loading: !!document.querySelector('.screen-loader'),
   };
 });
 assert.deepEqual(entry,{daylight:true,phase:'scene',sceneAnimation:'none',ui:['hidden','hidden','hidden'],loading:false});
 await page.locator('.home-standing-seeker[data-character=SEEKER_HOODED]').waitFor();
 assert.match(await figure.locator('img').getAttribute('src'),/home-closeup-daylight/);
 await page.waitForFunction(() => !document.querySelector('.lounge-home').hasAttribute('data-home-return'));
 assert.equal(await page.locator('.lounge-rail').isVisible(),true);
 await page.screenshot({path:out+'/home.png'});
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-profile]').click();
 await page.locator('[data-edit-look]').click();
 assert.equal(await picker.locator('[data-scene=navy]').getAttribute('aria-pressed'),'true');
 await picker.locator('[data-save]').waitFor({state:'visible'});
 await page.screenshot({path:out+'/palette.png',animations:'disabled'});
 await page.keyboard.press('Escape');await picker.waitFor({state:'detached'});
 assert.deepEqual(errors,[]);
 console.log('PASS profile, saved character on HOME and eight free background colors (fixture account)');
}catch(error){
 await page.screenshot({path:out+'/failure.png',timeout:15000}).catch(()=>{});
 await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),url:page.url(),errors,failed,requests:requests.slice(-15)},null,2));
 throw error;
}finally{await browser.close();}
