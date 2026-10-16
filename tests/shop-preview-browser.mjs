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
await apiFixture(page,r=>{const path=new URL(r.url).pathname;if(path==='/api/auth/me')return {user};if(path==='/api/geo')return {country:'JP'};if(path==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};if(path==='/api/social/profile')return {profile:{...user,self:true,sleeves:['default'],furnitures:[]}};return {ok:true};});
try{
 await page.goto(origin);await page.locator('.lounge-home').waitFor();await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('[data-nav=shop]').click();console.log('Shop navigation');
 await page.locator('[data-category=furniture]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.shop-furniture-preview img').length===14);
 assert.equal(await page.locator('.furniture-preview').count(),0);
 assert.equal(await page.locator('#shopSelection').count(),0);
 await page.locator('[data-preview="furniture:porcelain"]').waitFor();
 await page.screenshot({path:out+'/shop-desktop.png'});
 const url=page.url();
 for(const [width,height] of [[1280,800],[390,844],[320,667],[844,390]]){
  await page.setViewportSize({width,height});
  for(const category of ['sleeve','furniture']){
   await page.locator(`[data-category=${category}]`).click();
   const tiles=page.locator('[data-preview]');
   for(const index of [0,await tiles.count()-1]){
    const tile=tiles.nth(index);await tile.click();
    assert.equal(await tile.getAttribute('aria-pressed'),null);
    assert.equal(await page.locator('#shopSelection').count(),0);
    assert.equal(await page.locator('[data-board-preview], .shop-board-dialog, #shopSelection a').count(),0);
    assert.equal(page.url(),url);
   }
   assert(await page.locator('[data-buy]').count()>0,'Purchase controls remain available');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   assert.equal(browser.contexts()[0].pages().length,1);
   await page.screenshot({path:`${out}/shop-${category}-${width}.png`});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify({passed:true,errors,checks:['12 actual model thumbnails','no board preview in either category','catalog and purchase controls retained','desktop mobile and landscape without overflow']},null,2));console.log('PASS shop preview');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw error;}finally{await browser.close();}
