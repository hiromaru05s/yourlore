import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5549';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-balanced-home';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1420,height:838},recordVideo:{dir:out+'/video',size:{width:1420,height:838}}});
const page=await context.newPage(),errors=[],assets=[],pending=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(/\/art\/lounge\/(toon-balanced|toon-soft)-20261026\/(library-wide|ivy|clouds)\.webp/.test(r.url()))pending.push((async()=>{assert.equal(r.status(),200);assets.push({url:r.url(),sha256:createHash('sha256').update(await r.body()).digest('hex')});})());});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const user={id:'background-qa',display:'SEEKER',email:'qa@example.invalid',credits:47930,wins:20,losses:10};
await apiFixture(page,req=>{const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/gifts')return {items:[],pendingCount:0,pendingAmount:0,unreadCount:0,now:Date.now()};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1018,wins:20,losses:10,peak_mmr:1018,rank:1,tier:'iron'}};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{},online:0,ranked:0};
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
});
try{
 await page.goto(origin);await page.locator('.living-home[data-atmosphere=ready]').waitFor({timeout:60000});await page.locator('.home-spirit-host canvas').waitFor();await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));
 const plate=await page.locator('.living-home').evaluate(n=>getComputedStyle(n).backgroundImage);assert(plate.includes('/toon-balanced-20261026/library-wide.webp'));
 const start=Date.now();
 for(const seconds of [6,11,21,26,36]){await page.waitForTimeout(Math.max(0,seconds*1000-(Date.now()-start)));await page.screenshot({path:`${out}/home-${seconds}s.png`});}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/home-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 await Promise.all(pending);
 for(const path of ['toon-balanced-20261026/library-wide.webp','toon-balanced-20261026/ivy.webp','toon-soft-20261026/clouds.webp'])assert(assets.some(a=>a.url.endsWith(path)),'Loaded '+path);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/checks.json',JSON.stringify({origin,api:'synthetic fixtures, no account mutations',plate,assets,errors,checks:['Real HOME with approved balanced art and unchanged natural clouds','36 seconds continuous playback recorded','Desktop and mobile render without horizontal overflow']},null,2));
 console.log('PASS HOME art loading, 36-second playback capture, desktop/mobile, no page errors');
}finally{await context.close();await browser.close();}
