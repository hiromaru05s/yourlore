// Uses only the two seeded local QA accounts supplied in LORE_TEST_USERS.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:8798';assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const users=JSON.parse(await fs.readFile(process.env.LORE_TEST_USERS,'utf8')),out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-npc-audit';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),pages=[],errors=[];
try{
 for(const u of users.slice(0,1)){const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addCookies([{name:'lore_session',value:u.cookie.split('=')[1],url:base}]);await c.addInitScript(()=>localStorage.setItem('lore_lang','ja'));const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('.lounge-home').waitFor();pages.push(p);}
 const p=pages[0];
 await p.locator('[data-nav="single"]').click();await p.locator('.single-page').waitFor();
 await p.locator('.sp-deck').click();await p.locator('.sp-deck-sheet').waitFor();await p.keyboard.press('Escape');await p.locator('.sp-deck-sheet').waitFor({state:'detached'});
 await p.screenshot({path:out+'/single.png'});
 await p.locator('.single-page .single-battle').click();await p.locator('.game').waitFor();await p.locator('.hand-study .study-action').click();await p.locator('.hand-study').waitFor({state:'detached'});
 await p.reload();await p.locator('.game').waitFor();await p.waitForTimeout(3500);await p.locator('#giveupBtn').click();await p.locator('.modal .btn-danger').click();await p.locator('.finale-home').waitFor();assert.equal(await p.locator('.finale-home').innerText(),'シングルへ');
 await p.screenshot({path:out+'/bot-result.png'});await p.locator('.finale-home').click();await p.locator('.single-page').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('lore_game')),null);await p.locator('[data-nav="home"]').click();await p.locator('.lounge-home').waitFor();
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks:['latest Single page','deck preview and Escape','server NPC start','mulligan','reload NPC room','surrender','result','return Single','HOME'],errors},null,2));console.log('PASS latest Single and server NPC lifecycle');

}catch(e){for(const [i,p]of pages.entries())await p.screenshot({path:out+'/failure-'+i+'.png'});throw e;}finally{await browser.close();}
