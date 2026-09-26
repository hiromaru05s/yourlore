import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5202';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-21-lounge/checks';await fs.mkdir(out,{recursive:true});
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
const shot=async name=>{await page.waitForTimeout(350);await page.screenshot({path:`${out}/${name}.png`,fullPage:false});checks.push(name);};
const nav=async key=>{await page.locator(`[data-nav="${key}"]`).click();};
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home');await shot('01-home');
 await page.locator('#bot').click();await shot('10-bot');await page.keyboard.press('Escape');assert.equal(await page.locator('.bot-diff').count(),0);
 await page.locator('.lounge-menu').click();await page.locator('[data-invite]').click();await page.waitForSelector('#invLink');await shot('20-referral');await page.locator('#invClose').click();
 await page.locator('[data-inquiry]').click();await page.locator('#inqTitle').fill('UI test');await page.locator('#inqBody').fill('Testing form recovery');await page.locator('#inqSend').click();await page.waitForSelector('.inq-msg.err');assert.equal(await page.locator('#inqBody').inputValue(),'Testing form recovery');await shot('21-inquiry-error');await page.locator('#inqSend').click();await page.waitForSelector('.inq-done');await shot('21-inquiry-success');await page.locator('#inqOk').click();
 await nav('deck');await page.waitForSelector('#deckCur .card');await shot('05-deck');
 await page.locator('#deckCur .card').nth(1).click();assert(await page.locator('#save').isDisabled());await nav('cards');await page.waitForSelector('.overlay');await page.locator('.modal-row .btn-ghost').click();assert.equal(await page.locator('.deck-panel').count(),1);
 await page.locator('#deckPool .card').first().click();assert(!(await page.locator('#save').isDisabled()));await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#deckMsg')?.textContent.includes('保存'));assert.equal(saveCount,1);
 await page.locator('#watchTab').click();assert(await page.locator('#deckEditSection').isHidden());await page.locator('#watchSearch').fill('存在しないカード');assert.equal(await page.locator('#watchPool .card').count(),0);await page.locator('#watchSearch').fill('');await shot('06-market-watch');
 await nav('cards');await page.locator('#search').fill('アチューン');await shot('07-cards');await page.locator('#grid .card').first().click();await page.waitForSelector('.zoom-overlay');await shot('08-card-detail');await page.keyboard.press('Escape');assert.equal(await page.locator('.zoom-overlay').count(),0);
 await nav('friends');await page.waitForSelector('.fr-row');assert(await page.locator('[data-ch="friend-c"]').isDisabled());await shot('11-friends');await page.locator('[data-ch="friend-a"]').click();await page.waitForSelector('#chCancel');await shot('12-challenge');await page.keyboard.press('Escape');
 await page.locator('[data-pf="friend-a"]').click();await page.waitForSelector('.pf-mini-modal');await shot('22-private-profile');await page.locator('#pfClose').click();
 await nav('leaderboard');await page.waitForSelector('.lb-row');await shot('13-leaderboard');
 await page.locator('[data-profile]').click();await page.waitForSelector('#avaBtn');await shot('14-profile');await page.locator('#renameBtn').click();await page.waitForSelector('#renameCancel');await shot('22-rename');await page.locator('#renameCancel').click();await page.locator('#avaBtn').click();await shot('22-avatar');await page.locator('#avaClose').click();
 await page.locator('[data-tab="h2h"]').click();await shot('15-head-to-head');await page.locator('[data-tab="sleeves"]').click();await shot('16-sleeves');await page.locator('[data-tab="settings"]').click();await shot('17-settings');assert(!await page.locator('.bill-plan').textContent().then(x=>x.includes('$7')));
 await nav('shop');await page.waitForSelector('.shop-empty');await shot('18-shop');await nav('tutorial');await page.waitForSelector('.tut-steps');assert.equal(await page.locator('.tut-steps li').count(),9);await shot('19-guide');
 await page.setViewportSize({width:390,height:844});await nav('home');await shot('23-mobile-home');await nav('friends');await shot('23-mobile-friends');await nav('deck');await shot('24-mobile-deck');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'mobile horizontal overflow');
 await nav('cards');await shot('24-mobile-cards');await page.locator('[data-profile]').click();await page.waitForSelector('[data-tab="settings"]');await page.locator('[data-tab="settings"]').click();await shot('24-mobile-settings');
 await page.locator('#logout').click();await page.waitForSelector('.modal');await page.locator('.modal .btn-primary').click();await page.waitForSelector('.lounge-login');await page.setViewportSize({width:1586,height:992});await shot('02-login');
 await page.locator('[data-m="register"]').click();await page.locator('#email').fill('qa@example.test');await page.locator('#password').fill('test-password');await shot('03-register');await page.locator('#submit').click();await page.waitForSelector('#resendVerify');await shot('03-verify');await page.locator('#returnLogin').click();await page.locator('#helpLink').click();await page.locator('#helpReset').click();await shot('04-forgot');await page.locator('#email').fill('qa@example.test');await page.locator('#submit').click();await page.waitForSelector('#returnLogin');await shot('04-sent');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,saveCount,mobileOverflow:overflow},null,2));console.log('PASS',checks.length,'visual states and navigation/deck/modal/auth checks');
}finally{await browser.close();}
