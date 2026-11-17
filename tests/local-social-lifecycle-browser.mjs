// Uses only the two seeded local QA accounts supplied in LORE_TEST_USERS.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:8798';assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const users=JSON.parse(await fs.readFile(process.env.LORE_TEST_USERS,'utf8')),out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-social-audit';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),pages=[],errors=[];
try{
 for(const u of users){const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addCookies([{name:'lore_session',value:u.cookie.split('=')[1],url:base}]);await c.addInitScript(()=>localStorage.setItem('lore_lang','ja'));const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('.lounge-home').waitFor();pages.push(p);}
 const [p,q]=pages;
 await p.evaluate(id=>fetch('/api/social/friends/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:id})}),users[1].id);
 for(const page of pages)await page.locator('[data-nav="friends"]').click();
 await p.locator('#frq').fill(users[1].email);await p.locator('#frAdd').click();
 await q.locator('[data-acc]').first().click();await p.locator('[data-ch]').first().waitFor();console.log('PASS friend request and acceptance');
 let sends=0;p.on('request',r=>{if(new URL(r.url()).pathname==='/api/social/challenge')sends++;});
 await p.locator('[data-ch]').first().evaluate(b=>{b.click();b.click();});await q.locator('#chYes').click();assert.equal(sends,1);
 for(const page of pages){await page.locator('.game').waitFor();await page.locator('.hand-study .study-action').click();}
 await p.locator('.hand-study').waitFor({state:'detached'});await p.locator('#giveupBtn').click();await p.locator('.modal .btn-danger').click();
 for(const page of pages)await page.locator('.finale-home').waitFor();
 await p.screenshot({path:out+'/result.png'});
 for(const page of pages){assert.equal(await page.evaluate(()=>localStorage.getItem('lore_game')),null);await page.locator('.finale-home').click();await page.locator('.lounge-home').waitFor();}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks:['friend request','accept','single challenge after double tap','both enter friendly room','both confirm hand','surrender','both results','both return HOME'],errors},null,2));console.log('PASS friendly match, double-tap guard, surrender, results and HOME');
}catch(e){for(const [i,p]of pages.entries())await p.screenshot({path:out+'/failure-'+i+'.png'});throw e;}finally{await browser.close();}
