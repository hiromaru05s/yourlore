// Optional rendered-UI regression. API responses are fixtures; no account or purchase is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.BOOK_ORIGIN||'http://127.0.0.1:5186',out=process.env.BOOK_QA_DIR||'docs/releases/2026-10-28-seeker-book/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const lang of (process.env.BOOK_LANGS||'ja,en,ko').split(',')){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({lang})=>{
   localStorage.setItem('lore_lang',lang);
   const native=window.fetch.bind(window);window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname.startsWith('/api/'))return new Response(JSON.stringify(url.pathname==='/api/auth/me'?{user:{id:'local-guest-user',display:'Book QA',credits:0}}:url.pathname==='/api/geo'?{country:'JP'}:{}),{headers:{'Content-Type':'application/json'}});return native(input,init);};
  },{lang});
  await page.goto(origin+'/?devLogin=1',{waitUntil:'domcontentloaded'});
  await page.addLocatorHandler(page.locator('.graphics-notice [data-continue]'),async()=>page.locator('.graphics-notice [data-continue]').click());
  await page.locator('[data-nav="tutorial"]').click({timeout:90000});
  await page.locator('#tutorial-tab-basics').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tutorial-tab-book').getAttribute('aria-selected'),'true');
  await page.locator('.seeker-plate img').evaluate(i=>i.decode());
  if(lang==='ja'){await page.waitForTimeout(700);await page.screenshot({path:out+'/book-desktop.png'});}
  const total=Number((await page.locator('.seeker-page-status').innerText()).split('/')[1]);
  for(let i=1;i<total;i++){assert.equal(await page.locator('.seeker-page-status').innerText(),`${i} / ${total}`);await page.locator('[data-next]').click();}
  assert(await page.locator('.seeker-reference').isVisible());
  await page.locator('[data-kind]').selectOption('cards');assert.match(await page.locator('.seeker-result-count').innerText(),/^381/);
  await page.locator('[data-results-next]').click();assert.match(await page.locator('.seeker-result-count').innerText(),/2/);
  await page.locator('.seeker-reference input').fill('xyz-no-such-rule-009');assert(await page.locator('.seeker-empty').isVisible());
  await page.locator('.seeker-reference input').fill(lang==='ja'?'最大マナ':lang==='en'?'mana':'마나');assert(await page.locator('.seeker-reference-entry').count()>0,'effect full text searchable');
  await page.locator('.seeker-reference-entry summary').first().click();await page.locator('[data-inspect]').first().click();
  await page.locator('#zoomOverlay .zoom-wrap').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#zoomOverlay').waitFor({state:'hidden'});
  await page.locator('.seeker-reference input').fill('');await page.locator('[data-kind]').selectOption('all');
  if(lang==='ja'){await page.locator('.seeker-volume').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:out+'/reference-desktop.png'});}
  await page.locator('[data-chapter="deck"]').click();await page.locator('[data-next]').click();
  await page.locator('[data-nav="home"]').click();await page.locator('[data-nav="tutorial"]').click();await page.locator('#tutorial-tab-book').click();assert.equal(await page.locator('.seeker-page-status').innerText(),`2 / ${total}`,'saved page on navigation');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-nav="tutorial"]').click({timeout:90000});await page.locator('#tutorial-tab-book').click();assert.equal(await page.locator('.seeker-page-status').innerText(),`2 / ${total}`,'saved page after reload');
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await page.locator('.seeker-mobile-contents select').selectOption('deck');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
   assert(await page.locator('.seeker-volume').evaluate(e=>e.scrollWidth<=e.clientWidth),'no book overflow');
   if(lang==='ja'&&width===390){await page.locator('#tutorial-tab-book').scrollIntoViewIfNeeded();await page.waitForTimeout(300);await page.screenshot({path:out+'/book-mobile.png'});}
   await page.locator('.seeker-mobile-contents select').selectOption('reference');await page.locator('.seeker-reference-entry summary').first().click();
   assert(await page.locator('.seeker-volume').evaluate(e=>e.scrollWidth<=e.clientWidth),'no reference overflow');
   if(lang==='ja'&&width===390)await page.screenshot({path:out+'/reference-mobile.png'});
  }
  await page.locator('#tutorial-tab-basics').click();await page.locator('#rules').click();assert(await page.locator('.seeker-reference').isVisible(),'shared footer opens complete reference');
  assert.deepEqual(errors,[],'no runtime errors');console.log(`PASS ${lang}: ${total} pages, reference/search/inspection, keyboard tabs, saved position, 1440/390/320 widths`);
  if(lang==='ja'&&!process.env.BOOK_SKIP_WALKTHROUGH){
   await page.setViewportSize({width:1280,height:800});await page.locator('#tutorial-tab-basics').click();await page.locator('#continuePart').click();await page.locator('.game-loading').waitFor({state:'hidden'});await page.locator('.tutorial-part-tour').waitFor({state:'visible'});
   for(let moves=0;moves<100&&!await page.locator('#bookPlaySingle').count();moves++){
    const layer=page.locator('.tutorial-part-tour'),index=await layer.getAttribute('data-step'),action=await layer.getAttribute('data-action'),target=page.locator('.tutorial-tour-target');
    if(action==='next')await page.locator('.tutorial-tour-next:not([disabled])').click();
    else if(action==='inspect')await target.click({button:'right'});
    else if(action==='click')await target.click();
    else{
     const source=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-action-ring');await source.waitFor({state:'visible'}).catch(async e=>{await page.screenshot({path:out+'/walkthrough-failure.png'});throw new Error(`Step ${index}, action ${action}: ${e.message}`);});
     const a=await source.boundingBox(),drop=page.locator('.tutorial-action-guide:not([hidden]) .tutorial-drop-ring:not([hidden])');
     if(await drop.count()){
      const b=await drop.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();
      const choice=page.locator('.cast-review');if(await choice.count()){await choice.locator('[data-choice]').click();await choice.locator('.btn-gold').click();}
     }else if(await target.evaluate(e=>!!e.closest('#fixedMarket,#supplyMarket')))await target.dblclick();else await target.click();
    }
    await page.waitForFunction(i=>!document.querySelector('.tutorial-part-tour')||document.querySelector('.tutorial-part-tour').dataset.step!==i,index,{timeout:20000});
   }
   await page.locator('#bookPlaySingle').waitFor({state:'visible'});assert.equal(await page.locator('#tutorial-tab-book').getAttribute('aria-selected'),'true');
   await page.screenshot({path:out+'/completed-invitation.png'});
   await page.locator('#tutorial-tab-basics').click();assert(await page.locator('.tutorial-basics-clear').isVisible());await page.locator('#openBook').click();
   await page.locator('#bookPlaySingle').click();await page.locator('#endBtn').waitFor({state:'visible',timeout:90000});
   assert.deepEqual(errors,[],'walkthrough has no runtime errors');console.log('PASS real basic-tutorial controls → optional book invitation → Single board');
  }
  await context.close();
 }
}finally{await browser.close();}
