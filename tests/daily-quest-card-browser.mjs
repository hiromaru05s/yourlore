import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-daily-quest-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>{errors.push(e.stack??e.message);console.error(e.stack??e.message);});
const user={id:'daily-card-qa',email:'qa@example.invalid',display:'シーカー',credits:2480,wins:0,losses:0,exp:50};
let dailies=[
 {slot:0,day:'2026-10-27',revision:0,quest:{kind:'damage',reward:350,target:150},progress:90,claimed:false,rerollsLeft:3},
 {slot:1,day:'2026-10-27',revision:0,quest:{kind:'shield',reward:350,target:20},progress:5,claimed:false,rerollsLeft:3},
 {slot:2,day:'2026-10-27',revision:0,quest:{kind:'draw',reward:400,target:10},progress:10,claimed:true,rerollsLeft:3},
];
const data=()=>({credits:user.credits,resetsAt:Date.now()+86400000,daily:dailies[0],dailies,bot:{},online:35,ranked:120});
const writes=[];let failClaim=false;
await page.addInitScript(()=>{if(!localStorage.getItem('lore_lang'))localStorage.setItem('lore_lang','ja');});
await apiFixture(page,async req=>{
 const p=new URL(req.url).pathname;
 if(req.method==='POST')writes.push({path:p,body:req.body});
 if(p==='/api/onboarding')return {stage:'complete',credits:user.credits};
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1320,wins:20,losses:10,peak_mmr:1320,rank:8,tier:'gold'}};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/collection')return {credits:user.credits,starterCards:{}};
 if(p==='/api/rewards/progression')return data();
 if(p==='/api/rewards/daily/claim'){
  if(failClaim){failClaim=false;throw Error('simulated interrupted response');}
  const q=dailies[req.body.slot];assert.equal(req.body.day,q.day);assert.equal(req.body.revision,q.revision);assert(q.progress>=q.quest.target);
  await new Promise(resolve=>setTimeout(resolve,350));const amount=q.claimed?0:q.quest.reward;q.claimed=true;user.credits+=amount;return {...data(),amount};
 }
 if(p==='/api/rewards/daily/reroll'){const q=dailies[req.body.slot];assert.equal(req.body.day,q.day);assert.equal(req.body.revision,q.revision);assert.equal(req.body.slot,1);dailies=dailies.map(x=>({...x,rerollsLeft:2}));dailies[1]={...dailies[1],revision:1,quest:{kind:'heal',target:40,reward:300},progress:0};return data();}
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[],items:[],unreadCount:0};
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
  await capture(`inspect-${w}x${h}`);
  const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
  assert(geom.daily.y>=geom.sound.bottom,`below sound ${w}`);
  assert(geom.daily.x>=0&&geom.daily.right<=w,`card within viewport ${w}`);
  assert(!overlap(geom.daily,geom.main),`quest overlaps play at ${w}: ${JSON.stringify(geom)}`);
  if(w>850||h<=500)assert(geom.daily.bottom<=geom.nav.y,`quest above nav ${w}`);
  else assert(geom.daily.y>=geom.main.bottom,`portrait quests follow play ${w}`);
  if(w<=850&&h>500)assert(!overlap(geom.daily,geom.companion),`Zeno remains visible ${w}`);
  assert(geom.deck.bottom<=geom.content.bottom+1,`deck fits ${w}`);
  assert(geom.rank.bottom<=geom.deck.y+1,`rank and deck do not overlap ${w}: ${JSON.stringify(geom)}`);
  assert(geom.scroll[0]<=w&&geom.scroll[1]<=h,`no page overflow ${w}`);
  if(w<=850&&h>500)await page.locator('.dq-task').last().scrollIntoViewIfNeeded();
  layouts.push({w,h,...geom});await capture(`home-${w}x${h}`);await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);
 }
 await page.setViewportSize({width:1280,height:800});
 assert.equal(await page.locator('.dq-task').count(),3);
 assert.equal(await page.locator('.dq-meter').nth(0).getAttribute('value'),'90');
 assert.equal(await page.locator('#modeReward progress').getAttribute('value'),'120');
 assert.equal(await page.locator('#modeReward progress').getAttribute('max'),'300');
 await page.locator('#online').click();
 assert.equal(await page.locator('#modeReward progress').getAttribute('value'),'35');
 assert.equal(await page.locator('#modeReward progress').getAttribute('max'),'100');
 await page.locator('#bot').click();assert.equal(await page.locator('#modeReward .mode-reward-content').getAttribute('aria-hidden'),'true');await page.locator('#rankedMode').click();
 await page.locator('[data-quest="1"]').click();await page.locator('.daily-replace').waitFor();
 assert.equal(await page.locator('.daily-task,.daily-duels,.daily-bots').count(),0);
 await capture('confirmation');
 await page.locator('[data-no]').click();assert.equal(writes.filter(w=>w.path.includes('/rewards/')).length,0);
 await page.locator('[data-quest="1"]').click();await page.locator('[data-yes]').click();
 await page.waitForFunction(()=>document.querySelector('[data-quest="1"] .dq-title')?.textContent.includes('回復'));
 assert.equal(await page.locator('.dq-meter').nth(1).getAttribute('value'),'0');
 assert.equal(await page.locator('.dq-meter').nth(0).getAttribute('value'),'90');
 assert((await page.locator('.dq-heading').innerText()).includes('残り2'));
 assert.equal(await page.locator('[data-quest="2"]').isDisabled(),true);
 dailies=dailies.map(q=>({...q,rerollsLeft:0}));await refresh();assert.equal(await page.locator('.dq-task:disabled').count(),3);
 dailies=dailies.map(q=>({...q,rerollsLeft:2}));dailies[0]={...dailies[0],quest:{kind:'starterWin',card:'非常に長いクエスト対象カード名',target:3,reward:300},progress:1};await refresh();
 await page.setViewportSize({width:320,height:640});await capture('long-name-mobile');
 assert(await page.evaluate(()=>document.querySelector('#dailyReward').getBoundingClientRect().top>=document.querySelector('.lounge-home-main').getBoundingClientRect().bottom),'long quest follows play');
 for(const lang of ['en','ko']){await page.evaluate(lang=>localStorage.setItem('lore_lang',lang),lang);await page.reload();await page.locator('.dq-task').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay,.screen-loader'));await capture('mobile-'+lang);assert(await page.evaluate(()=>{const r=document.querySelector('#myTier').getBoundingClientRect(),d=document.querySelector('#deck').getBoundingClientRect(),c=document.querySelector('.lounge-content').getBoundingClientRect();return r.bottom<=d.top+1&&d.bottom<=c.bottom+1;}),'long translated objective keeps rank and deck separate: '+lang);}
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-nav="cards"]').click();await page.locator('[data-nav="home"]').click();await page.locator('.dq-title').first().waitFor();assert.equal(await page.locator('#dailyReward').count(),1);
 assert.equal(writes.filter(w=>w.path.includes('/daily/reroll')).length,1,'only YES writes a replacement');
 // Mixed states and claim stay available after the shared replacement allowance is spent.
 await page.evaluate(()=>localStorage.setItem('lore_lang','ja'));await page.reload();await page.locator('.dq-task').first().waitFor();
 dailies=dailies.map(q=>({...q,rerollsLeft:0}));dailies[0]={...dailies[0],quest:{kind:'damage',target:150,reward:350},progress:90};dailies[1].progress=dailies[1].quest.target;await refresh();
 assert.equal(await page.locator('.dq-entry.is-active').count(),1);assert.equal(await page.locator('.dq-entry.is-ready').count(),1);assert.equal(await page.locator('.dq-entry.is-complete').count(),1);
 assert.equal(await page.locator('[data-quest="1"]').isDisabled(),true);assert.equal(await page.locator('[data-claim="1"]').isEnabled(),true);
 const mixed=structuredClone(dailies);
 for(const lang of ['ja','en','ko']){
  await page.evaluate(lang=>localStorage.setItem('lore_lang',lang),lang);await page.reload();await page.locator('.dq-claim').waitFor();await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay,.screen-loader'));
  for(const [w,h] of [[1440,900],[390,844],[320,640],[844,390]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);if(w<=850&&h>500)await page.locator('.dq-claim').scrollIntoViewIfNeeded();await capture(`mixed-${lang}-${w}x${h}`);
   assert(await page.evaluate(()=>{const q=document.querySelector('#dailyReward').getBoundingClientRect(),m=document.querySelector('.lounge-home-main').getBoundingClientRect(),n=document.querySelector('.lounge-rail').getBoundingClientRect(),b=document.querySelector('.dq-claim').getBoundingClientRect();return (innerWidth<=850&&innerHeight>500||q.bottom<=n.top)&&b.left>=q.left&&b.right<=q.right&&(q.right<=m.left||q.bottom<=m.top||q.left>=m.right||q.top>=m.bottom);}),`mixed state fits ${lang} ${w}x${h}`);
  }
 }
 // Worst case: every quest is ready, including narrow-screen translations.
 dailies=dailies.map(q=>({...q,progress:q.quest.target,claimed:false}));await refresh();await page.setViewportSize({width:320,height:640});await page.waitForTimeout(200);await page.locator('.dq-claim').last().scrollIntoViewIfNeeded();await capture('all-ready-mobile');
 assert.equal(await page.locator('.dq-claim').count(),3);
 assert(await page.evaluate(()=>document.querySelector('#dailyReward').getBoundingClientRect().top>=document.querySelector('.lounge-home-main').getBoundingClientRect().bottom),'all pending quests follow play');
 dailies=structuredClone(mixed);await page.evaluate(()=>localStorage.setItem('lore_lang','ja'));await page.reload();await page.locator('.dq-claim').waitFor();
 failClaim=true;await page.locator('.dq-claim').click();await page.waitForFunction(()=>document.querySelector('.dq-notice')?.textContent.includes('再度'));
 assert.equal(user.credits,2480);assert(await page.locator('.dq-claim').isEnabled());
 const before=writes.filter(w=>w.path.endsWith('/daily/claim')).length;
 await page.locator('.dq-claim').evaluate(b=>{b.click();b.click();});
 await page.waitForFunction(()=>document.querySelector('.dq-notice')?.textContent.includes('+300'));
 assert.equal(user.credits,2780);assert.equal(writes.filter(w=>w.path.endsWith('/daily/claim')).length,before+1);
 assert.equal(await page.locator('.dq-entry.is-complete').count(),2);assert.equal(await page.locator('.dq-claim').count(),0);
 await capture('claimed-mobile');await page.reload();await page.locator('.dq-task').first().waitFor();assert.equal(await page.locator('.dq-entry.is-complete').count(),2);assert.equal(await page.locator('.dq-claim').count(),0);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({scope:'real HOME + mocked account/rewards API',layouts,errors,writes},null,2));
 console.log('PASS three daily quests: six HOME sizes, three languages, NO/YES, independent slots, completion, shared budget, mode progress bars');
} finally {await browser.close();}
