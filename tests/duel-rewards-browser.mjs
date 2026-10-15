import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5496',out=process.env.LORE_TEST_OUT||'/tmp/lore-rewards-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'qa-rewards',display:'Rewards QA',email:'qa@test.invalid',avatar:'SEEKER_BLUE',wins:4,losses:2,credits:600};
const data={daily:{day:'2026-10-15',revision:0,quest:{kind:'starterWin',target:3,reward:300,card:'STARTER_CHEST'},progress:2,claimed:false,rerollsLeft:3},online:95,ranked:290,bot:{easy:true},credits:600,resetsAt:Date.now()+86400000};let rerolls=0;
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};if(p==='/api/rank/me')return{rating:{season:'2026-10',tier:'iron',mmr:1000,rank:4}};if(p==='/api/rewards/tutorial')return{keys:['tutorial:v2:intro:skip'],offered:true,credits:600};if(p==='/api/rewards/progression')return data;if(p==='/api/rewards/daily/reroll'){assert.equal(r.body.revision,data.daily.revision);rerolls++;data.daily={...data.daily,revision:rerolls,rerollsLeft:3-rerolls,progress:0,quest:{kind:'damage',target:150,reward:350}};return data;}return{ok:true};});
try{
 await page.goto(base);await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForFunction(()=>document.querySelector('#dailyReward')?.textContent.includes('300'));
 assert((await page.locator('#dailyReward').textContent()).includes('宝箱'));
 for(const [width,height] of [[1280,900],[1280,720],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#dailyReward').click();
  await page.waitForSelector('[data-reroll]');
  assert((await page.locator('.daily-task').textContent()).includes('300'));
  const geometry=await page.locator('.daily-rewards').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,viewportOverflow:document.documentElement.scrollWidth>innerWidth,rect:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
  assert(!geometry.overflow&&!geometry.viewportOverflow,JSON.stringify(geometry));
  await page.screenshot({path:`${out}/daily-${width}-${height}.png`});checks.push({width,height,...geometry});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.daily-rewards-overlay').count(),0);
 }
 await page.setViewportSize({width:1280,height:900});await page.locator('#dailyReward').click();
 for(let i=1;i<=3;i++){await page.locator('[data-reroll]').click();await page.waitForFunction(n=>document.querySelector('[data-reroll]')?.textContent.includes(`残り${n}回`),3-i);}
 assert(await page.locator('[data-reroll]').isDisabled());assert.equal(rerolls,3);
 await page.keyboard.press('Escape');await page.locator('#bot').click();await page.locator('#ranked').click();
 await page.waitForFunction(()=>document.querySelector('[data-bot-reward=easy]')?.textContent.includes('受取済み'));
 for(const [diff,amount] of [['normal',500],['hard',1000],['hell',2000]])assert((await page.locator(`[data-bot-reward=${diff}]`).textContent()).includes(String(amount)));
 await page.setViewportSize({width:320,height:568});assert(!(await page.locator('.bot-npcs').evaluate(e=>e.scrollWidth>e.clientWidth+1)));await page.screenshot({path:out+'/bot-320.png'});await page.keyboard.press('Escape');
 data.daily.claimed=true;data.daily.progress=150;await page.locator('#dailyReward').click();await page.waitForFunction(()=>document.querySelector('.daily-task')?.textContent.includes('受取済み'));assert(await page.locator('[data-reroll]').isDisabled());
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/result.json',JSON.stringify({checks,rerolls,errors},null,2));console.log('PASS reward display, 5 viewport geometries, 3 rerolls, completion and BOT claim labels');
}finally{await browser.close();}
