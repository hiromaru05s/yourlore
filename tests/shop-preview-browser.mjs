import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5348';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-shop-preview';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'shop-qa',display:'シーカー',avatar:'SEEKER_BLUE',credits:23,wins:1,losses:1};
await apiFixture(page,r=>{const path=new URL(r.url).pathname;if(path==='/api/auth/me')return {user};if(path==='/api/geo')return {country:'JP'};if(path==='/api/social/profile')return {profile:{...user,self:true,sleeves:['default'],furnitures:[]}};return {ok:true};});
try{
 await page.goto(origin);await page.locator('.lounge-home').waitFor();await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('[data-nav=shop]').click();console.log('Shop navigation');
 await page.locator('[data-category=furniture]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.shop-furniture-preview img').length===14);
 assert.equal(await page.locator('.furniture-preview').count(),0);
 assert.equal(await page.locator('#shopSelection a[target="_blank"]').count(),0);
 await page.locator('[data-preview="furniture:porcelain"]').click();
 await page.screenshot({path:out+'/shop-desktop.png'});
 const url=page.url();await page.locator('[data-board-preview]').click();
 let board=page.frameLocator('.shop-board-dialog iframe');
 await board.locator('[data-scene-ready=true]').waitFor();
 await board.locator('#pile-myDeck[data-atelier-material=porcelain]').waitFor();
 assert((await board.locator('#pile-myDeck').getAttribute('data-sleeve')).includes('sleeve_default'));
 assert.equal(page.url(),url);assert.equal(browser.contexts()[0].pages().length,1);
 await page.screenshot({path:out+'/board-desktop.png'});
 await page.locator('[data-view=deck]').click();await page.screenshot({path:out+'/deck-closeup.png'});
 await page.keyboard.press('Escape');await page.waitForSelector('.shop-board-dialog',{state:'detached'});
 assert.equal(await page.locator('[data-board-preview]').evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.locator('[data-preview="furniture:porcelain"]').getAttribute('aria-pressed'),'true');
 // Old finishes and sleeves also preview exactly the selected equipment.
 await page.locator('[data-preview="furniture:astral"]').click();await page.locator('[data-board-preview]').click();
 board=page.frameLocator('.shop-board-dialog iframe');await board.locator('[data-scene-ready=true]').waitFor();
 assert((await board.locator('#pile-myDisc').getAttribute('data-material')).includes('material-astral'));
 await page.locator('[data-close]').click();
 await page.locator('[data-category=sleeve]').click();await page.locator('[data-preview=tidal]').click();await page.locator('[data-board-preview]').click();
 board=page.frameLocator('.shop-board-dialog iframe');await board.locator('[data-scene-ready=true]').waitFor();
 assert((await board.locator('#pile-myDeck').getAttribute('data-sleeve')).includes('/tidal/'));
 assert.equal(await board.locator('#pile-myDeck').getAttribute('data-material'),'');
 await page.locator('[data-close]').click();await page.locator('[data-category=furniture]').click();
 for(const [width,height] of [[390,844],[320,667]]){
  await page.setViewportSize({width,height});await page.locator('[data-preview="furniture:tidal"]').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/shop-${width}.png`});
  await page.locator('[data-board-preview]').click();board=page.frameLocator('.shop-board-dialog iframe');await board.locator('[data-scene-ready=true]').waitFor();
  await page.locator('[data-view=grave]').click();await page.screenshot({path:`${out}/grave-${width}.png`});
  assert(await page.locator('.shop-board-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.locator('[data-close]').click();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,errors,checks:['14 actual model thumbnails','same-tab board and closeups','Escape and focus restoration','selection retained','legacy and atelier furniture','sleeves independent from furniture','320/390px no horizontal overflow']},null,2));console.log('PASS shop preview');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw error;}finally{await browser.close();}
