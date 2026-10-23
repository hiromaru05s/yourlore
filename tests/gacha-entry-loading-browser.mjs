import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-gacha-entry-after',baseline=!!process.env.LORE_BASELINE;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[],requests=[],checks=[];let calls=0,releaseProfile;
const profileGate=new Promise(resolve=>releaseProfile=resolve);
const user={id:'gacha-entry-qa',email:'qa@example.invalid',display:'シーカー',wins:0,losses:0,credits:2400};
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
await apiFixture(page,async req=>{const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};if(p==='/api/rank/me')return {rating:null};if(p==='/api/rewards/tutorial')return {keys:['tuto:1','tuto:10'],credits:user.credits,offered:true};
 if(p==='/api/social/profile'){await (baseline?new Promise(r=>setTimeout(r,3500)):profileGate);return {profile:{...user,created_at:0,self:true,sleeves:['default'],furnitures:[]}};}
 if(p==='/api/collection')return {credits:user.credits,starterCards:{},cosmetics:[],effects:[]};
 if(p==='/api/collection/draw'){calls++;await new Promise(r=>setTimeout(r,250));return {credits:2300,starterCards:{},cosmetics:[],effects:[],receipt:{kind:'draw',cost:100,refund:0,rewards:[{id:'STARTER_CHEST',owned:1,refund:0}],requestId:req.body.requestId,createdAt:Date.now()}};}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],receipts:[]};
});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-nav="shop"]').click();const entryStart=Date.now();
 await page.waitForFunction(()=>{const b=document.querySelector('[data-pull="1"]');return b&&!b.disabled&&!document.querySelector('.screen-loader');});const entryMs=Date.now()-entryStart;
 if(!baseline)assert.equal(calls,0,'Entering or prewarming must never draw');
 for(const [width,height] of [[1280,900],[1280,720],[844,600],[390,844],[320,640],[844,390]]){await page.setViewportSize({width,height});await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);const boxes=await page.evaluate(()=>{const c=document.querySelector('.lounge-content').getBoundingClientRect();return [...document.querySelectorAll('[data-pull]')].map(b=>{const r=b.getBoundingClientRect();return {count:b.dataset.pull,x:r.x,y:r.y,width:r.width,height:r.height,visible:r.top>=c.top&&r.bottom<=c.bottom&&r.left>=0&&r.right<=innerWidth};});});checks.push({width,height,boxes});if(!baseline)assert(boxes.every(b=>b.visible&&b.height>=44),`draw buttons outside initial view ${width}: ${JSON.stringify(boxes)}`);await page.screenshot({path:out+'/shop-'+width+'.png'});}
 await page.setViewportSize({width:1280,height:900});await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);
 const drawStart=Date.now();await page.locator('[data-pull="1"]').click();await page.waitForSelector('.gacha-cinematic[data-phase="animation"]');const loadMs=Date.now()-drawStart;
 releaseProfile();await page.waitForTimeout(300);assert.equal(await page.locator('.gacha-cinematic').count(),1,'Late profile must not tear down the draw');
 await page.waitForTimeout(1000);await page.screenshot({path:out+'/intro.png'});
 await page.waitForSelector('.gacha-cinematic[data-phase="result"]');await page.waitForSelector('.reward-stage[data-ready="true"]');await page.screenshot({path:out+'/result.png'});
 await page.keyboard.press('Escape');await page.locator('.gacha-dialog [data-close]').first().click();assert.equal(calls,1);
 const obsolete=requests.filter(u=>/avatar-(red|blue).*\.png|\/models\/reading-board\/v1\/(deck-place|shelf)\.glb/.test(u));if(!baseline)assert.deepEqual(obsolete,[]);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,baseline,entryMs,loadMs,checks,calls,obsolete,errors},null,2));console.log(JSON.stringify({entryMs,loadMs,obsolete,checks,calls,errors}));
}finally{releaseProfile();await context.close();await browser.close();}
