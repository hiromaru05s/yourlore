import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5202';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-27-seeker-stage/checks';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1586,height:992}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
let logged=true,saveCount=0,inquiryFail=true;
const user={id:'qa-lounge',email:'qa@example.test',display:'シーカー',avatar:'SEEKER_BLUE',wins:24,losses:10,credits:840,sleeve:'default'};
const rating={season:'2026-09',mmr:1184,tier:'gold',wins:12,losses:5,rank:26,peak_mmr:1210};
const friends={friends:[{id:'friend-a',display:'アストラ',avatar:'SEEKER_RED',online:true,state:'menu'},{id:'friend-b',display:'ルミナ',avatar:'SEEKER_BLUE',online:true,state:'online'},{id:'friend-c',display:'ノクス',avatar:null,online:false,state:null}],incoming:[],outgoing:[],challenges:[]};
const profile={...user,self:true,created_at:Date.UTC(2026,0,1),...rating,stats_public:true,sleeves:['default'],byMode:{ranked:{w:12,l:5},online:{w:8,l:3},bot:{w:4,l:2}},recent:[{mode:'ranked',result:'win',opp:'アストラ',turns:12,at:Date.now()},{mode:'online',result:'loss',opp:'ルミナ',turns:18,at:Date.now()}],h2h:[{oppId:'friend-a',oppName:'アストラ',wins:3,losses:2,games:5}]};
await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;const body=r.request().postDataJSON();let data={ok:true};
 if(path==='/api/geo')data={country:'JP'};
 else if(path==='/api/auth/me')data={user:logged?user:null};
 else if(path==='/api/social/friends')data=friends;
 else if(path==='/api/rank/me')data={rating};
 else if(path==='/api/social/profile')data={profile:new URL(r.request().url()).searchParams.has('id')?{...profile,self:false,private:true}:profile};
 else if(path==='/api/rank/leaderboard')data={season:'2026-09',total:26,entries:[{...rating,display:'アストラ',rank:1,mmr:1580,tier:'gm'},{...rating,display:'シーカー',rank:26}]};
 else if(path==='/api/deck'){saveCount++;user.decks=body.decks;data={decks:body.decks,deck:body.decks.list[body.decks.sel].cards};}
 else if(path==='/api/social/me'){Object.assign(user,body);Object.assign(profile,body);data={ok:true,...user};}
 else if(path==='/api/invite/me')data={code:'LORETEST',limit:3,invites:[{display:'アストラ',status:'pending',created_at:Date.now()}]};
 else if(path==='/api/inquiry'&&inquiryFail){inquiryFail=false;await r.fulfill({status:503,contentType:'application/json',body:'{"error":"test outage"}'});return;}
 else if(path==='/api/auth/register')data={needVerify:true};
 else if(path==='/api/auth/login'){logged=true;data={user};}
 else if(path==='/api/auth/logout')logged=false;
 else if(path==='/api/social/challenge')data={id:'challenge-test'};
 else if(path==='/api/social/challenge/poll')data={status:'pending'};
 else if(path==='/api/rewards/claimed')data={keys:[],credits:840};
 await r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
});
await page.routeWebSocket('**/ws/**',ws=>{ws.onMessage(raw=>{try{if(JSON.parse(String(raw)).type==='queue')ws.send(JSON.stringify({type:'queued'}));}catch{}});});
const shot=async name=>{await page.waitForTimeout(350);await page.screenshot({path:`${out}/${name}.png`,fullPage:false});checks.push(name);};
const nav=async key=>{await page.locator(`[data-nav="${key}"]`).click();};
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home');
 assert(!/ビブリオン魔導図書館|BIBLION|THE GRAND LIBRARY/.test(await page.locator('body').innerText()));
 await page.locator('img.lore-icon').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await page.locator('.lounge-rail svg').count(),0);
 await shot('home-final');
 for(const id of ['ranked','online']){await page.locator('#'+id).click();await page.waitForSelector('.lounge-lobby');await shot('queue-'+id);await page.locator('#cancel').click();await page.waitForSelector('.lounge-home');}
 for(const [width,height] of [[1280,720],[844,390],[390,844],[320,568]]){await page.setViewportSize({width,height});const bounds=await page.evaluate(()=>{const r=document.querySelector('#ranked').getBoundingClientRect(),d=document.querySelector('.lounge-rail').getBoundingClientRect();return {rankTop:r.top,rankBottom:r.bottom,dockTop:d.top,navCount:document.querySelectorAll('[data-nav]').length,bg:getComputedStyle(document.querySelector('.lounge-shell')).backgroundRepeat};});assert.equal(bounds.navCount,7);assert.equal(bounds.bg,'no-repeat');assert(bounds.rankBottom<=bounds.dockTop,JSON.stringify({width,height,...bounds}));await shot('home-'+width+'x'+height);}
 await page.setViewportSize({width:1586,height:992});
 await nav('cards');await page.waitForSelector('#grid .card');
 for(const [width,height] of [[1586,992],[1024,768],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);
  await page.locator('#grid').evaluate(el=>{el.scrollTop=el.scrollHeight;});await page.waitForTimeout(250);
  const result=await page.evaluate(()=>{const panel=document.querySelector('.cards'),grid=document.querySelector('#grid'),last=grid.lastElementChild,head=document.querySelector('.cards-head');return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,panelBottom:panel.getBoundingClientRect().bottom,gridBottom:grid.getBoundingClientRect().bottom,lastBottom:last.getBoundingClientRect().bottom,lastTop:last.getBoundingClientRect().top,gridTop:grid.getBoundingClientRect().top,scrollable:grid.scrollHeight>grid.clientHeight,headTop:head.getBoundingClientRect().top,outerScroll:document.querySelector('.lounge-content').scrollTop};});
  assert(!result.overflow,JSON.stringify(result));assert(result.scrollable);assert(result.gridBottom<=result.panelBottom);assert(result.lastBottom<=result.gridBottom+1);assert(result.lastBottom>result.gridTop);assert.equal(result.outerScroll,0);assert(result.headTop>=60);checks.push(result);
  await shot(`cards-bottom-${width}`);
  await page.locator('#search').fill('存在しないカード');assert.equal(await page.locator('#grid .card').count(),0);assert(await page.locator('.cards-empty').isVisible());await shot(`cards-empty-${width}`);await page.locator('#search').fill('');
 }
 await page.setViewportSize({width:390,height:844});await nav('home');await shot('home-mobile-final');await page.locator('.lounge-menu').click();const menuBox=await page.locator('#loungeUtilities').boundingBox();assert(menuBox&&menuBox.y>=0&&menuBox.y+menuBox.height<760,JSON.stringify(menuBox));await shot('navigation-mobile');await page.keyboard.press('Escape');
 await nav('deck');await page.waitForSelector('#deckCur .card');await shot('deck-mobile-final');await page.locator('#watchTab').click();await page.waitForSelector('#watchPool .card');await shot('watch-mobile-final');
 await page.setViewportSize({width:1586,height:992});await page.locator('[data-profile]').click();await page.waitForSelector('#avaBtn');await shot('profile-final');await page.locator('[data-tab="settings"]').click();await shot('settings-final');
 await nav('friends');await page.waitForSelector('.fr-row');await shot('friends-final');await nav('shop');await shot('shop-final');await nav('leaderboard');await shot('ranking-final');await nav('tutorial');await shot('guide-final');await nav('home');await page.locator('#bot').click();await shot('bot-picker');await page.keyboard.press('Escape');assert.equal(await page.locator('.overlay').count(),0);
 const names=['home','duel','bot','deck','cards','trophy','friends','shop','book','gift','mail','settings','shard','profile','sleeve','menu','check','close','arrow','search','bell','sound','language','history','edit'];
 const icons=await page.evaluate(async names=>Promise.all(names.map(async name=>{const i=new Image();i.src='/art/lounge/icons/v2/'+name+'.png';await i.decode();return {name,width:i.naturalWidth,height:i.naturalHeight};})),names);assert.equal(icons.length,25);
 await page.setViewportSize({width:320,height:568});await nav('home');await shot('home-small');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.lounge-menu').click();await page.locator('[data-inquiry]').click();await shot('inquiry-small');await page.keyboard.press('Escape');await page.keyboard.press('Escape');logged=false;await page.reload();await page.waitForSelector('.lounge-login');await shot('login-small');await page.setViewportSize({width:1586,height:992});await shot('login-desktop');assert.deepEqual(errors,[]);await fs.writeFile(out+'/stage-report.json',JSON.stringify({checks,icons,errors},null,2));console.log('PASS catalog boundary/empty/scroll at 4 sizes, 25 PNG icons, navigation and visual states');
}finally{await browser.close();}
