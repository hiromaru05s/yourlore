const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
import {apiFixture} from './helpers/api-fixture.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5298',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-npc-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const lang=process.env.LORE_TEST_LANG||'ja';
const layoutOnly=process.env.LORE_LAYOUT_ONLY==='1';
const launches=[],warnings=[];page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
const user={id:'qa-npc',display:'シーカー',avatar:'SEEKER_BLUE',wins:12,losses:3,credits:840};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/rewards/bot/start'){launches.push(r.body);return new Promise(()=>{});}
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1200,tier:'gold',rank:26}};
 if(p==='/api/rewards/tutorial')return {offered:true,keys:[],amounts:{},credits:840};
 if(p==='/api/rewards/progression')return {bot:{},online:0,ranked:0,credits:840,resetsAt:Date.now()+3600000,daily:{day:'2026-10-27',revision:0,quest:{kind:'heal',target:40,reward:300},progress:0,claimed:false,rerollsLeft:1}};
 if(p==='/api/gifts')return {items:[],unreadCount:0};
 if(p==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
 return {ok:true,keys:[],credits:840};
});
await page.addInitScript(lang=>localStorage.setItem('lore_lang',lang),lang);
try{
 await page.goto(origin);await page.locator('#bot').waitFor({timeout:60000});await page.locator('.screen-loader').waitFor({state:'detached',timeout:60000});if(await page.locator('.graphics-notice').count())await page.locator('.graphics-notice [data-continue]').click();await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('#diffStart').waitFor();
 for(const [width,height] of [[1440,900],[1280,720],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(1200);
  const layout=await page.evaluate(()=>{const b=document.querySelector('#diffStart').getBoundingClientRect(),m=document.querySelector('.bot-npcs').getBoundingClientRect(),g=document.querySelector('.diff-grid');return {button:{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom},modal:{x:m.x,width:m.width},overflow:document.documentElement.scrollWidth>innerWidth,scrollable:g.scrollHeight>g.clientHeight,rosterHeight:g.clientHeight};});
  assert(!layout.overflow);assert(layout.rosterHeight>=120,'Roster must retain enough height to browse opponents');assert(layout.button.y>=0&&layout.button.bottom<=height,JSON.stringify(layout));assert(Math.abs(layout.button.x+layout.button.width/2-(layout.modal.x+layout.modal.width/2))<3);assert(layout.button.height>=54);assert(await page.locator('.diff-card').evaluateAll(cards=>cards.every(e=>e.scrollHeight<=e.clientHeight+2)),'All NPC descriptions must fit');
  await page.screenshot({path:`${out}/${width}x${height}.png`});checks.push({width,height,...layout});
 }
 await page.setViewportSize({width:1440,height:900});
 for(const tier of ['easy','normal','hard','hell']){await page.locator(`[data-diff=${tier}]`).click();assert.equal(await page.locator(`[data-diff=${tier}]`).getAttribute('aria-pressed'),'true');}
 await page.locator('[data-diff=hard]').click();assert((await page.locator('#diffStart').textContent()).includes({ja:'ヴェラ',en:'Vera',ko:'베라'}[lang]));
 await page.locator('#diffStart').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'diffCancel');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'diffStart');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.bot-npcs').count(),0);
 if(!layoutOnly){await page.locator('#ranked').click();await page.locator('[data-diff=easy]').dblclick();await page.waitForFunction(()=>!document.querySelector('.bot-npcs')&&!!document.querySelector('.game,.screen-loader,.duel-loader,.duel-opening'),null,{timeout:30000});
 for(let i=0;i<180&&!launches.length;i++)await page.waitForTimeout(500);
 assert.deepEqual(launches,[{difficulty:'easy',lang}],'One server start request for the double-clicked NPC');}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,lang,checks,errors,launches,layoutOnly,boundary:'Real UI and assets, fixture account/API. No authenticated server duel.'},null,2));console.log('PASS',JSON.stringify(checks));
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(await page.locator('body').innerText(),errors,warnings);throw e;}finally{await browser.close();}
