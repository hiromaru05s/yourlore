import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:8798',out=process.env.LORE_TEST_OUT||'/tmp/lore-gallery-visibility';
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
await fs.mkdir(out,{recursive:true});const users=JSON.parse(await fs.readFile(process.env.LORE_TEST_USERS,'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),report=[];
try{for(const width of [1280,390]){
 const c=await browser.newContext({viewport:{width,height:width===390?844:800}}),p=await c.newPage(),errors=[];
 p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await c.addCookies([{name:'lore_session',value:users[0].cookie.split('=')[1],url:origin}]);
 await c.addInitScript(()=>localStorage.setItem('lore_lang','ja'));await p.goto(origin);await p.locator('.lounge-home').waitFor();await p.locator('.screen-loader').waitFor({state:'detached'});
 await p.locator('[data-nav="cards"]').click();await p.locator('.card-hub-tile').first().click();await p.waitForFunction(()=>document.querySelector('#grid .card')&&!document.querySelector('#grid[aria-busy]'));
 await p.waitForFunction(()=>document.querySelectorAll('#grid .gallery-offscreen').length>100);
 const top=await p.evaluate(()=>({cards:document.querySelectorAll('#grid>.card').length,paused:document.querySelectorAll('#grid>.gallery-offscreen').length,firstPaused:document.querySelector('#grid>.card').classList.contains('gallery-offscreen')}));
 assert.equal(top.firstPaused,false);assert(top.cards>400);assert(top.paused>100);
 await p.locator('#grid').evaluate(el=>{el.scrollTop=el.scrollHeight});
 await p.waitForFunction(()=>!document.querySelector('#grid>.card:last-child').classList.contains('gallery-offscreen'));
 assert(await p.locator('#grid>.card').first().evaluate(el=>el.classList.contains('gallery-offscreen')));
 const last=p.locator('#grid>.card').last();await last.focus();await p.keyboard.press('Enter');await p.locator('.zoom-overlay').waitFor();await p.locator('.inspect-close').click();
 await p.locator('#search').fill('アチューン');await p.waitForFunction(()=>!document.querySelector('#grid[aria-busy]')&&document.querySelectorAll('#grid>.card').length<100);
 await p.locator('#search').fill('');await p.waitForFunction(()=>!document.querySelector('#grid[aria-busy]')&&document.querySelectorAll('#grid>.card').length>400);
 await p.locator('.cards-lang select').selectOption('en');await p.waitForFunction(()=>!document.querySelector('#grid[aria-busy]')&&document.querySelector('.cards-lang select')?.value==='en');
 await p.screenshot({path:out+'/gallery-'+width+'.png'});
 await p.locator('[data-nav="home"]').click();await p.locator('.lounge-home').waitFor();assert.equal(await p.locator('.gallery-offscreen').count(),0);
 assert.deepEqual(errors,[]);report.push({width,top,checks:['offscreen sleep','scroll resume','keyboard inspection','search and reset','language rebuild','HOME cleanup'],errors});await c.close();
}}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log('PASS PC and narrow gallery scrolling, inspection, filters, language and teardown');
