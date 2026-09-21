import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import('/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const [user]=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));
assert(user.id.startsWith('qa-release-')); 
const out=process.env.LORE_TEST_OUTPUT||'docs/card-expansion/2026-09-21/browser';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'lore_session',value:user.token,domain:'test.yourlore.xyz',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://test.yourlore.xyz/');await page.locator('#cards').click({timeout:30000});
 for(const [query,expected,file]of [['ファイアー',5,'staging-fire-series.png'],['黒魔',6,'staging-black-series.png']]){await page.locator('#search').fill(query);await page.waitForFunction(()=>[...document.querySelectorAll('.cards-grid img')].every(i=>i.complete&&i.naturalWidth>0),{timeout:45000});await page.evaluate(async()=>{const urls=new Set([...document.querySelectorAll('.cards-grid .card-frame')].map(e=>getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean));await Promise.all([...urls].map(async url=>{const img=new Image();img.src=url;await img.decode();}));await document.fonts.ready;});await page.waitForTimeout(400);const count=await page.locator('.cards-grid .card').count();assert.equal(count,expected,query);await page.screenshot({path:out+'/'+file});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/staging-browser.json',JSON.stringify({origin:'https://test.yourlore.xyz',checks:['authenticated home loads','Fire series: 5 cards','Black Magic / mage series: 6 cards'],errors},null,2));console.log('PASS live staging HOME and both series in the real card gallery');
}finally{await browser.close();}
