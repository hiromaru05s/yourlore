import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194',out='docs/characters/2026-10-12-faceless-illustrated/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
const checks=[],errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
try{
 await page.goto(origin+'/hooded-seekers.html');await page.waitForSelector('canvas[data-ready=true]');assert.equal(await page.locator('canvas').count(),1);
 const neutral=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(500);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),neutral);checks.push('one character stays completely static at rest');
 const states=await page.evaluate(async()=>{const c=document.querySelector('canvas'),seen=[];const observe=()=>seen.push(c.dataset.action+':'+c.dataset.frame);const ob=new MutationObserver(observe);ob.observe(c,{attributes:true,attributeFilter:['data-frame']});document.querySelector('#hitPreview').click();const deadline=performance.now()+12000;
   do{await new Promise(requestAnimationFrame);}while((!seen.length||c.dataset.action!=='idle')&&performance.now()<deadline);
   ob.disconnect();return seen;});assert(states.filter(v=>v.startsWith('hurt:')).length>5);assert.equal(states.at(-1),'idle:0');checks.push('preview advances through recoil and restores idle');
 await page.screenshot({path:out+'/studio-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/studio-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px preview fits');
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/hooded-board.html');await page.waitForFunction(()=>window.hoodedBoard?.ready,null,{timeout:120000});await page.waitForFunction(()=>document.querySelectorAll('.seeker-motion[data-ready=true]').length===2);
 const portraits=await page.locator('.seeker-motion').evaluateAll(cs=>cs.map(c=>c.toDataURL()));assert.equal(portraits[0],portraits[1]);checks.push('both board sides use the same gender-neutral portrait');
 const histories={};
 for(const [action,side,hit] of [['hurt',0,true],['heavy',1,true],['mana',0,false],['heal',1,false],['brand',0,false]]){
  const history=await page.evaluate(async({action,side})=>{
   const c=document.querySelector(side?'#portraitOpp canvas':'#portraitMe canvas'),seen=[c.dataset.action+':'+c.dataset.frame];
   const ob=new MutationObserver(()=>seen.push(c.dataset.action+':'+c.dataset.frame));ob.observe(c,{attributes:true,attributeFilter:['data-frame']});
   await hoodedBoard.trigger(action,side);
   const deadline=performance.now()+12000;
   while(c.dataset.action!=='idle'&&performance.now()<deadline)await new Promise(requestAnimationFrame);
   ob.disconnect();return seen;
  },{action,side});histories[action]=history;
  assert.equal(history.some(v=>v.startsWith('heal:')),action==='heal');assert.equal(history.some(v=>v.startsWith('mana:')),action==='mana');assert.equal(history.some(v=>v.startsWith('hurt:')),hit,action+': '+JSON.stringify(history));assert.equal(history.at(-1),'idle:0');checks.push('controller '+action+' '+(hit?'reacts once':'settles to idle'));
 }
 const continuity=await page.evaluate(async()=>{
   const c=document.querySelector('#portraitMe canvas');
   hoodedBoard.play('me','hurt');await new Promise(r=>setTimeout(r,250));
   const frame=c.dataset.frame;hoodedBoard.rerender();hoodedBoard.play('me','hurt');
   return c===document.querySelector('#portraitMe canvas')&&frame===c.dataset.frame&&c.dataset.action==='hurt';
 });assert(continuity);
 await page.evaluate(()=>{hoodedBoard.play('me','hurt');hoodedBoard.play('opp','hurt');});
 assert.equal(await page.locator('.seeker-motion[data-action=hurt]').count(),2);
 await page.waitForFunction(()=>document.querySelectorAll('.seeker-motion[data-action=idle]').length===2);
 assert.deepEqual(await page.locator('.seeker-motion').evaluateAll(cs=>cs.map(c=>c.toDataURL())),portraits);
 await page.screenshot({path:out+'/board-desktop.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:out+'/board-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('mobile board framing');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>hoodedBoard.play('me','hurt'));assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');await page.emulateMedia({reducedMotion:'no-preference'});checks.push('reduced motion stays static');
 await page.evaluate(()=>{hoodedBoard.play('me','hurt');hoodedBoard.skip(true);});assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');await page.evaluate(()=>hoodedBoard.skip(false));assert.equal(await page.locator('.pt-ring').evaluateAll(rs=>rs.flatMap(r=>r.getAnimations()).length),0);checks.push('skip settles hit and frame motion');
 await page.evaluate(()=>hoodedBoard.trigger('victory',0));assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-frame'),'0');assert.equal(await page.locator('#portraitOpp canvas').getAttribute('data-frame'),'0');checks.push('victory and defeat keep the static portrait');
 await page.evaluate(()=>{hoodedBoard.play('me','hurt');hoodedBoard.destroy();});assert.equal(await page.evaluate(()=>hoodedBoard.count()),0);checks.push('destroy releases players and timers');
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/profile-lab.html');await page.waitForSelector('.pf-ava .hooded-seeker');
 assert.equal(await page.locator('#avaBtn, .pf-ava-edit').count(),0);await page.locator('.pf-ava').click();assert.equal(await page.locator('.hooded-picker').count(),0);checks.push('fixed portrait has no edit control or picker');
 await page.locator('[data-tab=settings]').click();assert.equal(await page.locator('[data-character-settings]').count(),0);assert.equal(await page.locator('#renderQuality').count(),1);checks.push('settings omit character selection and retain graphics settings');
 await page.setViewportSize({width:320,height:740});await page.locator('[data-tab=overview]').click();await page.screenshot({path:out+'/profile-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const retired=requests.filter(r=>/hooded-v1|seekers\/(menu-v1|v2)\/.+\.webp|biblion\/seeker-(blue|red)(-lossless)?\.(png|webp)/.test(r));assert.deepEqual(retired,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-tests.json',JSON.stringify({checks,histories,errors,retiredAssetRequests:retired},null,2)+'\n');console.log('PASS faceless browser: '+checks.length+' checks');
}finally{await context.close();await browser.close();}
