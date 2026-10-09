/** Disposable authenticated users only. No API mocking or public queue. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-full-audit/staging-browser';await fs.mkdir(out,{recursive:true});
const users=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));assert(users.every(u=>u.id.startsWith('qa-release-audit-')));
const checks=[];
for(const u of users){const response=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:u.email,password:u.password}),signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);const body=await response.json();assert.equal(body.user.id,u.id);assert.equal(body.user.deck.length,8);assert.equal(body.user.decks.list.length,5);u.token=response.headers.get('set-cookie').match(/lore_session=([^;]+)/)[1]}
await fs.writeFile(process.env.LORE_QA_AUTH_FILE,JSON.stringify(users),{mode:0o600});checks.push('two real password logins deliver complete deck data');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']}),context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
await context.addCookies([{name:'lore_session',value:users[0].token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],failed=[],layouts=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failed.push({path:new URL(r.url()).pathname,status:r.status()})});
const settle=async()=>{await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForTimeout(250)};
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home');await settle();
 for(const [width,height]of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});
  for(const name of ['home','deck','cards','leaderboard','friends','shop','tutorial']){
   await page.locator(`[data-nav="${name}"]`).click();await page.waitForSelector('.lounge-'+name);await settle();
   if(name==='cards')await page.waitForFunction(()=>document.querySelector('#grid .card')&&!document.querySelector('#grid[aria-busy=true]'));
   if(name==='deck')await page.waitForSelector('#deckCur .card');
   const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.getClientRects().length&&i.complete&&!i.naturalWidth).map(i=>new URL(i.src).pathname)}));
   assert(metrics.scroll<=width,name+' overflow');assert.deepEqual(metrics.broken,[],name+' broken art');layouts.push({name,width,...metrics});await page.screenshot({path:`${out}/${name}-${width}.jpg`});console.log('PASS',name,width);
  }
  await page.locator('[data-profile]').click();await settle();await page.waitForSelector('[data-tab="settings"]');await page.screenshot({path:`${out}/profile-${width}.jpg`});await page.locator('[data-tab="settings"]').click();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'settings overflow');await page.screenshot({path:`${out}/settings-${width}.jpg`});
 }
 checks.push('seven menus plus profile/settings at desktop and 390px; no horizontal overflow or broken visible artwork');
 await page.setViewportSize({width:1280,height:900});await page.locator('[data-nav="home"]').click();await settle();await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('[data-diff="easy"]').click();await page.locator('#diffStart').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.duel-opening',{state:'detached'});assert.equal(await page.locator('.help-callout,.turn-toast').count(),0);await page.screenshot({path:out+'/bot.jpg'});checks.push('real authenticated HOME to BOT startup, decoded board, no retired callouts');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,at:new Date().toISOString(),liveApi:true,checks,layouts,errors,failed},null,2));console.log('PASS',checks);
}finally{await browser.close()}
