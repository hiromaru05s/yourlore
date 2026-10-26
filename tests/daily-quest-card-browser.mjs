import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-daily-quest-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const user={id:'daily-card-qa',email:'qa@example.invalid',display:'シーカー',credits:2480,wins:0,losses:0,exp:50};
let daily={day:'2026-10-23',revision:0,quest:{kind:'damage',reward:350,target:150},progress:90,claimed:false,rerollsLeft:1};
const data=()=>({credits:user.credits,resetsAt:Date.now()+86400000,daily,bot:{},online:0,ranked:0});
const writes=[];
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(req.method==='POST')writes.push({path:p,body:req.body});
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1320,wins:20,losses:10,peak_mmr:1320,rank:8,tier:'gold'}};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/collection')return {credits:user.credits,starterCards:{}};
 if(p==='/api/rewards/progression')return data();
 if(p==='/api/rewards/daily/reroll'){assert.equal(req.body.day,daily.day);assert.equal(req.body.revision,daily.revision);daily={...daily,revision:1,quest:{kind:'shield',target:20,reward:350},progress:0,rerollsLeft:0};return data();}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
try {
 await page.goto(process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5331');
 await page.waitForSelector('#dailyReward .dq-meter');
 await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay,.screen-loader'));
 await page.waitForTimeout(500);
 assert.equal(await page.locator('.rank-season').count(),0,'HOME omits season and ladder position');
 assert(!(await page.locator('#myTier').innerText()).includes('2026-10'));
 await page.locator('#online').click();assert.equal(await page.locator('#online').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.lounge-home').count(),1,'selecting a mode does not launch');
 await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('.bot-diff').waitFor();
 await page.keyboard.press('Escape');await page.locator('#rankedMode').click();
 const layouts=[];
 const capture=async name=>{if(process.env.LORE_CAPTURE!=='0')await page.screenshot({path:`${out}/${name}.png`,timeout:60000,animations:'disabled'});};
 const refresh=async()=>{await page.evaluate(()=>document.dispatchEvent(new Event('lore:rewards')));await page.waitForTimeout(100);};
 for(const [w,h] of [[1440,900],[1280,720],[1024,600],[390,844],[320,640],[844,390]]) {
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);
  const geom=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right};};
   return{daily:rect('#dailyReward'),sound:rect('.home-sound'),companion:rect('.home-companion'),main:rect('.lounge-home-main'),rank:rect('#myTier'),deck:rect('#deck'),nav:rect('.lounge-rail'),content:rect('.lounge-content'),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,document.querySelector('.lounge-content').scrollHeight,document.querySelector('.lounge-content').clientHeight]};
  });
  const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
  assert(geom.daily.y>=geom.sound.bottom,`below sound ${w}`);
  assert(geom.daily.x>=0&&geom.daily.right<=w,`card within viewport ${w}`);
  assert(!overlap(geom.daily,geom.main),`quest overlaps play at ${w}: ${JSON.stringify(geom)}`);
  assert(geom.daily.bottom<=geom.nav.y,`quest above nav ${w}`);
  if(w<=850&&h>500)assert(!overlap(geom.daily,geom.companion),`Zeno remains visible ${w}`);
  assert(geom.deck.bottom<=geom.content.bottom+1,`deck fits ${w}`);
  assert(geom.rank.bottom<=geom.deck.y+1,`rank and deck do not overlap ${w}`);
  assert(geom.scroll[0]<=w&&geom.scroll[1]<=h&&geom.scroll[2]<=geom.scroll[3]+1,`no HOME scroll ${w}`);
  layouts.push({w,h,...geom});await capture(`home-${w}x${h}`);
 }
 await page.setViewportSize({width:1280,height:800});
 assert.equal(await page.locator('.dq-meter').getAttribute('value'),'90');
 await page.locator('#dailyReward').click();await page.locator('.daily-task').waitFor();
 await page.locator('[data-reroll]').click();await page.waitForFunction(()=>document.querySelector('.dq-title')?.textContent.includes('シールド'));
 assert.equal(await page.locator('.dq-meter').getAttribute('value'),'0');
 assert.equal(await page.locator('[data-reroll]').isDisabled(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.daily-rewards-overlay').count(),0);
 daily={...daily,progress:20,claimed:true};await refresh();assert.equal(await page.locator('#dailyReward.is-complete').count(),1);
 assert((await page.locator('.dq-progress').innerText()).includes('受取済み'));
 await page.locator('#dailyReward').click();await page.locator('.daily-task').waitFor();assert.equal(await page.locator('[data-reroll]').isDisabled(),true);await page.keyboard.press('Escape');
 await capture('completed');
 daily={...daily,quest:{kind:'starterWin',card:'非常に長いクエスト対象カード名',target:3,reward:300},claimed:false,progress:1};await refresh();
 await page.setViewportSize({width:320,height:640});await capture('long-name-mobile');
 await page.waitForTimeout(150);
 assert(await page.evaluate(()=>document.querySelector('#dailyReward').getBoundingClientRect().bottom<=document.querySelector('.lounge-home-main').getBoundingClientRect().top),'long quest stays above play');
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-nav="cards"]').click();await page.locator('[data-nav="home"]').click();await page.locator('.dq-title').waitFor();assert.equal(await page.locator('#dailyReward').count(),1);
 assert.equal(writes.filter(w=>w.path.includes('/rewards/')).length,1,'only the explicit reroll writes rewards');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({scope:'real HOME + mocked account/rewards API',layouts,errors,writes},null,2));
 console.log('PASS daily quest card: six HOME sizes, API-backed progress/reroll/completion, no reward-claim write, dialog keyboard close');
} finally {await browser.close();}
