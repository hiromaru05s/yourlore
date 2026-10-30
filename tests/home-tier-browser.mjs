import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5508';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-home-tier-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();
const errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));
let tier='gm',mmr=1580,failed=false;
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,r=>{
 const p=new URL(r.url).pathname;
 if(p==='/api/auth/me')return {user:{id:'tier-qa',display:'シーカー',credits:1200,avatar:'SEEKER_BLUE'}};
 if(p==='/api/rank/me')return {rating:failed?null:{season:'2026-10',mmr,tier,wins:1,losses:0}};
 if(p==='/api/rewards/tutorial')return {offered:true,keys:[]};
 if(p==='/api/rewards/progression')return {credits:1200,ranked:0,online:0,bot:{},resetsAt:Date.now()+86400000,dailies:['rift','buyMonster','heal'].map((kind,i)=>({day:'2026-10-30',slot:i,revision:0,rerollsLeft:3,progress:0,claimed:false,quest:{kind,target:[30,20,40][i],reward:300}}))};
 return {ok:true,country:'JP',items:[],entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],bot:{}};
});
page.setDefaultTimeout(90000);
const ready=async()=>{await page.waitForSelector('.home-rank');await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForSelector('.dq-task');};
try{
 await page.goto(origin);await ready();
 for(const [width,height] of [[1440,900],[1280,720],[1024,600],[390,844],[375,667],[320,568],[844,390],[667,375],[851,650]]){
  await page.setViewportSize({width,height});await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(250);
  const g=await page.evaluate(()=>{
   const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   return {rank:box('#myTier'),icon:box('#myTier .rank-emblem'),duel:box('#ranked'),deck:box('#deck'),content:box('.lounge-content'),quest:box('#dailyReward'),panel:box('.lounge-home-main'),overflow:document.documentElement.scrollWidth>innerWidth,questParent:document.querySelector('#dailyReward').parentElement.className};
  });
  assert(!g.overflow,'no horizontal overflow');assert(g.icon.w>=64,'crest stays readable');assert(Math.abs(g.duel.w-g.duel.h)<1,'duel stays circular');
  assert(g.rank.x>=g.panel.x&&g.rank.right<=g.panel.right+1,'rank inside panel');
  assert(g.icon.bottom<=g.rank.bottom+1,'crest fits rank');assert(g.rank.bottom<=g.deck.y+1,'rank does not overlap deck');
  assert(g.duel.bottom<=g.deck.y+1,'duel does not overlap deck');assert(g.duel.w>=(height<=500?90:100),'duel remains usable');
  if(width<=850&&height>500){
   assert.equal(g.questParent,'screen lounge-home-screen');assert(g.quest.y>=g.panel.bottom,'quests follow play');
   await page.locator('.dq-task').last().scrollIntoViewIfNeeded();assert(await page.locator('.dq-task').last().isVisible());
   await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);
  }else assert.equal(g.questParent,'lounge-seeker');
  await page.screenshot({path:`${out}/home-${width}x${height}.png`});cases.push({width,height,...g});
 }
 // A profile refresh and orientation change must retain the live quest node.
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 await page.evaluate(()=>{window.__questNode=document.querySelector('#dailyReward');document.dispatchEvent(new Event('lore:user'));});
 assert(await page.evaluate(()=>window.__questNode===document.querySelector('#dailyReward')));assert.equal(await page.locator('#dailyReward').count(),1);
 await page.locator('#online').click();assert.equal(await page.locator('#online').getAttribute('aria-pressed'),'true');
 await page.locator('#bot').click();await page.locator('#ranked').click();await page.waitForSelector('.bot-diff-ov');await page.locator('#diffCancel').click();
 await page.locator('#myTier').focus();await page.keyboard.press('Enter');await page.waitForSelector('.lb');
 tier='bronze';mmr=1000;await page.locator('[data-nav=home]').click();await ready();assert(await page.locator('#myTier').innerText().then(s=>s.includes('1000')));
 await page.locator('#deck').click();await page.waitForSelector('.lounge-deck');await page.locator('[data-nav=home]').click();await ready();
 failed=true;await page.reload();await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForFunction(()=>document.querySelector('#myTier')?.textContent.includes('再読み込み'));failed=false;await page.locator('#myTier').click();await page.waitForSelector('.home-rank');
 for(const lang of ['en','ko']){await page.evaluate(l=>localStorage.setItem('lore_lang',l),lang);await page.reload();await ready();assert(await page.locator('#myTier').innerText().then(s=>s.includes('1000')));await page.screenshot({path:`${out}/home-${lang}.png`});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,api:'fixtures; real adopted assets',cases,errors},null,2));console.log('PASS: nine viewports, three languages, full quests, refresh/orientation, keyboard ranking, mode/BOT/deck navigation and rank retry');
}finally{await browser.close();}
