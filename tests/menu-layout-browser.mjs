import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5546';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-menu-layout-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const user={id:'menu-layout-qa',display:'長いシーカープロフィール名',credits:1234567,exp:245,wins:20,losses:10,avatar:'SEEKER_BLUE'};
await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),process.env.LORE_TEST_LANG||'ja');
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};
 if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1018,rank:1,tier:'iron'}};
 if(p==='/api/rank/leaderboard')return {season:'2026-10',entries:[]};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{},online:0,ranked:0};
 return {ok:true,credits:user.credits,starterCards:{},effects:[],cosmetics:[],keys:[],entries:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
const geometry=()=>page.evaluate(()=>{
 const selectors=['.lounge-topbar','.lounge-user','.lounge-brand','.lounge-balance','.lounge-menu','.gift-mail','.lounge-rail',...['home','deck','cards','leaderboard','friends','shop','tutorial'].map(p=>`[data-nav="${p}"]`)];
 return Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100)];}));
});
try{
 await page.goto(origin);
 await page.locator('.lounge-home').waitFor({timeout:60000});
 await page.waitForSelector('.screen-loader',{state:'detached',timeout:60000});
 await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of (process.env.LORE_TEST_VIEWPORTS?JSON.parse(process.env.LORE_TEST_VIEWPORTS):[[1440,900],[1280,720],[390,844],[320,568],[844,390]])){
  await page.setViewportSize({width,height});
  let home;
  for(const route of ['home','deck','cards','leaderboard','friends','shop','tutorial','home']){
   await page.locator(`[data-nav="${route}"]`).click();
   await page.locator(`.lounge-${route}`).waitFor();
   await page.waitForSelector('.screen-loader',{state:'detached',timeout:60000});
   await page.waitForTimeout(450);
   const current=await geometry();
   if(!home)home=current;
   assert.deepEqual(current,home,`${width}x${height}: ${route} shifted the shared frame`);
   assert.equal(await page.locator('[data-nav][aria-current="page"]').getAttribute('data-nav'),route);
   const profile=current['.lounge-user'],logo=current['.lounge-brand'],balance=current['.lounge-balance'];
   assert(profile[0]+profile[2]<=logo[0],`${route}: profile overlaps logo`);
   assert(logo[0]+logo[2]<=current['.gift-mail'][0],`${route}: gift slot overlaps logo`);
   assert(current['.gift-mail'][0]+current['.gift-mail'][2]<=balance[0],`${route}: gift slot overlaps shards`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('.lounge-menu').click();
   await page.locator('#loungeUtilities').waitFor({state:'visible'});
   await page.keyboard.press('Escape');
   await page.locator('#loungeUtilities').waitFor({state:'hidden'});
   if(route!=='home'||checks.length===0)await page.screenshot({path:`${out}/${width}-${height}-${route}.png`});
   checks.push({width,height,route,geometry:current});
  }
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/report.json`,JSON.stringify({origin,checks,errors},null,2));
 console.log(`PASS: ${checks.length} route/viewport checks; shared frame unchanged, no overlaps, navigation and utility menu work.`);
}catch(error){await page.screenshot({path:`${out}/failure.png`});console.error(await geometry());throw error;}finally{await browser.close();}
