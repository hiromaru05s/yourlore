import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194',out='docs/characters/2026-10-12-faceless/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
const checks=[],errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
try{
 await page.goto(origin+'/hooded-seekers.html');await page.waitForSelector('canvas[data-ready=true]');assert.equal(await page.locator('canvas').count(),1);
 const neutral=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(500);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),neutral);checks.push('one character stays completely static at rest');
 const states=await page.evaluate(async()=>{const c=document.querySelector('canvas'),seen=[];const observe=()=>seen.push(c.dataset.action+':'+c.dataset.frame);const ob=new MutationObserver(observe);ob.observe(c,{attributes:true,attributeFilter:['data-frame']});document.querySelector('#hitPreview').click();await new Promise(r=>setTimeout(r,350));ob.disconnect();return seen;});assert.deepEqual(states,['hurt:1','idle:0']);checks.push('preview displays exactly one hit frame then the original');
 await page.screenshot({path:out+'/studio-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/studio-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px preview fits');
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/hooded-board.html');await page.waitForFunction(()=>window.hoodedBoard?.ready,null,{timeout:120000});await page.waitForFunction(()=>document.querySelectorAll('.seeker-motion[data-ready=true]').length===2);
 const portraits=await page.locator('.seeker-motion').evaluateAll(cs=>cs.map(c=>c.toDataURL()));assert.equal(portraits[0],portraits[1]);checks.push('both board sides use the same gender-neutral portrait');
 const histories={};
 for(const [action,side,hit] of [['hurt',0,true],['heavy',1,true],['mana',0,false],['heal',1,false],['brand',0,false]]){
  const history=await page.evaluate(async({action,side})=>{
   const c=document.querySelector(side?'#portraitOpp canvas':'#portraitMe canvas'),seen=[c.dataset.action+':'+c.dataset.frame];
   const ob=new MutationObserver(()=>seen.push(c.dataset.action+':'+c.dataset.frame));ob.observe(c,{attributes:true,attributeFilter:['data-frame']});
   await hoodedBoard.trigger(action,side);await new Promise(r=>setTimeout(r,350));ob.disconnect();return seen;
  },{action,side});histories[action]=history;
  assert.equal(history.includes('hurt:1'),hit,action+': '+JSON.stringify(history));assert.equal(history.at(-1),'idle:0');checks.push('controller '+action+' '+(hit?'reacts once':'keeps portrait static'));
 }
 const continuity=await page.evaluate(()=>{const c=document.querySelector('#portraitMe canvas');hoodedBoard.play('me','hurt');hoodedBoard.rerender();return c===document.querySelector('#portraitMe canvas')&&c.dataset.frame==='1';});assert(continuity);await page.waitForTimeout(300);checks.push('rerender preserves the hit and return timer');
 await page.screenshot({path:out+'/board-desktop.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:out+'/board-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('mobile board framing');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>hoodedBoard.play('me','hurt'));assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');await page.emulateMedia({reducedMotion:'no-preference'});checks.push('reduced motion stays static');
 await page.evaluate(()=>{hoodedBoard.play('me','hurt');hoodedBoard.skip(true);});assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');await page.evaluate(()=>hoodedBoard.skip(false));checks.push('skip settles hit');
 await page.evaluate(()=>hoodedBoard.trigger('victory',0));assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');assert.equal(await page.locator('#portraitOpp canvas').getAttribute('data-frame'),'0');checks.push('victory and defeat keep the static portrait');
 await page.evaluate(()=>hoodedBoard.destroy());assert.equal(await page.evaluate(()=>hoodedBoard.count()),0);checks.push('destroy releases players and timers');
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/profile-lab.html');await page.waitForSelector('#avaBtn');await page.locator('#avaBtn').click();await page.waitForSelector('.hooded-live canvas[data-ready=true]');assert.equal(await page.locator('[data-seeker-id]').count(),1);assert.equal(await page.locator('[data-seeker-id]').getAttribute('data-seeker-id'),'SEEKER_HOODED');await page.screenshot({path:out+'/profile-picker.png'});
 await page.locator('[data-save]').click();await page.waitForSelector('.hooded-picker',{state:'detached'});await page.reload();await page.waitForSelector('#avaBtn');assert.equal(await page.evaluate(()=>localStorage.getItem('lore_profile_lab_avatar')),'SEEKER_HOODED');assert.match(await page.locator('#avaBtn .hooded-seeker').getAttribute('src'),/faceless-v1/);checks.push('single character saves canonical ID and reloads');
 await page.locator('#avaBtn').click();await page.locator('[data-close]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('lore_profile_lab_avatar')),'SEEKER_HOODED');checks.push('cancel preserves saved choice');
 await page.locator('[data-tab=settings]').click();await page.locator('[data-character-settings]').click();
 await page.evaluate(async()=>{const {api}=await import('/src/net/api.ts');window.realUpdate=api.updateMe;api.updateMe=async()=>{throw new Error('保存テスト');};});await page.locator('[data-save]').click();await page.waitForFunction(()=>document.querySelector('.hooded-save-status')?.textContent.includes('保存テスト'));assert(await page.locator('[data-save]').isEnabled());
 await page.evaluate(async()=>{const {api}=await import('/src/net/api.ts');api.updateMe=window.realUpdate;});await page.locator('[data-save]').click();await page.waitForSelector('.hooded-picker',{state:'detached'});checks.push('settings save failure can retry');
 await page.setViewportSize({width:320,height:740});await page.locator('[data-character-settings]').click();await page.waitForSelector('.hooded-live canvas[data-ready=true]');await page.screenshot({path:out+'/profile-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');await page.waitForSelector('.hooded-picker',{state:'detached'});checks.push('320px picker and Escape');
 const retired=requests.filter(r=>/hooded-v1|seekers\/(menu-v1|v2)\/.+\.webp|biblion\/seeker-(blue|red)\.png/.test(r));assert.deepEqual(retired,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-tests.json',JSON.stringify({checks,histories,errors,retiredAssetRequests:retired},null,2)+'\n');console.log('PASS faceless browser: '+checks.length+' checks');
}finally{await context.close();await browser.close();}
