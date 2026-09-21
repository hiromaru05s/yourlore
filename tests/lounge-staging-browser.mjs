import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz';
const [user]=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));
assert(user.id.startsWith('qa-lounge-'));
const out='docs/ui-rework/2026-09-21-lounge/checks';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1586,height:992}});
await context.addCookies([{name:'lore_session',value:user.token,domain:'test.yourlore.xyz',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const page=await context.newPage(),errors=[],failed=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failed.push({path:new URL(r.url()).pathname,status:r.status()});});
const shot=async name=>{if(name.endsWith('home'))await page.waitForSelector('#myTier small');await page.waitForTimeout(500);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),name+' overflow');await page.screenshot({path:`${out}/staging-${name}.png`});checks.push(name);};
const nav=async key=>{if(await page.locator('.lounge-menu').isVisible())await page.locator('.lounge-menu').click();await page.locator(`[data-nav="${key}"]`).click();};
try{
 await page.goto(origin);await page.waitForSelector('.lounge-home');await shot('home');
 for(const [key,selector] of [['deck','#deckCur .card'],['cards','#grid .card'],['friends','.friends-page'],['leaderboard','.lb-row'],['shop','.shop-empty'],['tutorial','.tut-steps']]){
  await nav(key);if(key!=='friends')await page.waitForSelector(selector);await shot(key);
 }
 await page.locator('[data-profile]').click();await page.waitForSelector('#avaBtn');await shot('profile');await page.locator('[data-tab="settings"]').click();await shot('settings');
 await page.setViewportSize({width:390,height:844});await nav('home');await shot('mobile-home');await nav('deck');await page.waitForSelector('#deckCur .card');await shot('mobile-deck');await nav('cards');await page.waitForSelector('#grid .card');await shot('mobile-cards');
 await context.clearCookies();await page.setViewportSize({width:1586,height:992});await page.reload();await page.waitForSelector('.lounge-login');await shot('login');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const index=await fs.readFile('client/dist/index.html','utf8');
 const paths=['/index.html','/art/lounge/v1/library.png','/art/lounge/v1/entrance.png',...index.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(x=>typeof x==='string'?x:x[1]);
 const assets=[];
 for(const path of paths){const response=await fetch(origin+path);assert.equal(response.status,200,path);const remote=Buffer.from(await response.arrayBuffer()),local=await fs.readFile('client/dist'+path);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(remote),hash(local),path);assets.push({path,sha256:hash(local),bytes:local.length});}
 await fs.writeFile(out+'/staging-report.json',JSON.stringify({origin,liveApi:true,checks,errors,failed,mobileOverflow:false,assets},null,2));console.log('PASS',checks.length,'staging screens; deployed asset hashes match');
}finally{await browser.close();}
