import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-zeno-home-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1420,height:838},deviceScaleFactor:1,recordVideo:{dir:out+'/video',size:{width:1420,height:838}}});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const user={id:'zeno-visual-qa',display:'SEEKER',email:'qa@example.invalid',credits:47930,wins:20,losses:10};
await apiFixture(page,req=>{
 const p=new URL(req.url).pathname;
 if(p==='/api/auth/me')return {user};if(p==='/api/geo')return {country:'JP'};
 if(p==='/api/rank/me')return {rating:{season:'2026-10',mmr:1018,wins:20,losses:10,peak_mmr:1018,rank:1,tier:'iron'}};
 if(p==='/api/rewards/tutorial')return {keys:[],credits:user.credits,offered:true};
 if(p==='/api/rewards/progression')return {credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'heal',reward:300,target:40},progress:0,claimed:false},bot:{},online:0,ranked:0};
 return {ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[]};
});
try{
 await page.goto(process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537');
 await page.locator('.home-spirit-host canvas').waitFor({timeout:60000});
 await page.waitForSelector('.living-home[data-atmosphere="ready"]',{timeout:60000});
 await page.waitForFunction(()=>!document.querySelector('.lounge-entry-overlay'));
 await page.waitForTimeout(1800);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 await page.screenshot({path:out+'/home-still.png'});
 await page.locator('.home-spirit-host').screenshot({path:out+'/zeno-still.png'});
 const touch=page.locator('.home-spirit-touch');
 if(!process.env.ZENO_BASELINE){
  await touch.click();await page.waitForTimeout(200);
  assert.equal(await touch.evaluate(e=>getComputedStyle(e).outlineStyle),'none','Pointer must never draw the large focus circle');
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert(await touch.evaluate(e=>e.matches(':focus-visible')),'Keyboard focus reaches Zeno');
  assert.equal(await touch.evaluate(e=>getComputedStyle(e).outlineStyle),'none','Keyboard must not draw a large circle either');
  assert.equal(await touch.evaluate(e=>getComputedStyle(e,'::after').opacity),'1','Compact keyboard focus cue remains visible');
  await page.screenshot({path:out+'/keyboard-focus.png'});checks.push('Pointer and keyboard focus: no circle; compact keyboard cue');
  const frozen=await page.locator('.home-spirit-host').screenshot();
  await page.keyboard.press('Enter');await page.waitForTimeout(800);
  assert(frozen.equals(await page.locator('.home-spirit-host').screenshot()),'Reduced motion stays still after greeting');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await touch.click();await page.waitForTimeout(700);
  assert.equal(await page.locator('.home-spirit-host').getAttribute('data-spirit-mood'),'happy');
  await page.screenshot({path:out+'/greeting.png'});
  const r=await touch.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width,r.y+r.height*.8,{steps:25});await page.waitForTimeout(350);
  const yaw=Number(await page.locator('.home-spirit-host').getAttribute('data-zeno-yaw'));
  assert(Math.abs(yaw)<=30.001&&Math.abs(yaw)>10,'Authored form rotates within its bound');
  await page.screenshot({path:out+'/turned.png'});await page.mouse.up();await page.waitForTimeout(4500);
  checks.push('Greeting, continuous idle, drag and return; reduced motion remains still');
  const moving=await page.locator('.home-spirit-host').screenshot();await page.waitForTimeout(900);
  assert(!moving.equals(await page.locator('.home-spirit-host').screenshot()),'Idle animates');
  // Let an ambient gesture run through its complete envelope; the captured
  // video also covers the moving daylight, eye animation and ear deformation.
  await page.waitForFunction(()=>['sleepy','flutter'].includes(document.querySelector('.home-spirit-host')?.dataset.spiritMood),{},{timeout:30000});
  await page.waitForTimeout(1600);await page.screenshot({path:out+'/ambient-gesture.png'});
  await page.waitForFunction(()=>document.querySelector('.home-spirit-host')?.dataset.spiritMood==='idle',{},{timeout:15000});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const paused=await page.locator('.home-spirit-host canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);
  assert.equal(await page.locator('.home-spirit-host canvas').evaluate(c=>c.toDataURL()),paused,'Hidden guide does not render');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  checks.push('Complete ambient gesture and hidden-document suspension');
  await page.evaluate(()=>window.__zenoCanvas=document.querySelector('.home-spirit-host canvas'));
  await page.locator('[data-nav=tutorial]').click();await page.locator('.academy').waitFor();
  await page.locator('.academy-spirit canvas').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#startup,.screen-loader.game-loading'));
  await page.waitForTimeout(500);
  await page.screenshot({path:out+'/tutorial.png'});
  await page.locator('[data-nav=home]').click();await touch.waitFor();
  assert(await page.evaluate(()=>document.querySelector('.home-spirit-host canvas')===window.__zenoCanvas),'HOME reuses its existing renderer');
  await page.waitForTimeout(500);checks.push('Tutorial and HOME return retain the cached scene');
  for(const [w,h] of [[1280,720],[1024,600],[390,844]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(400);
   assert.equal(await page.locator('.home-spirit-host canvas').count(),1);
   assert(await page.locator('.home-spirit-host canvas').isVisible());
   await page.screenshot({path:`${out}/home-${w}.png`});
  }
  checks.push('Four viewport sizes render without missing or duplicate guide');
  await page.addInitScript(()=>{Object.defineProperty(window,'WebGL2RenderingContext',{configurable:true,value:undefined});});
  await page.reload();await page.locator('.home-spirit-host svg').waitFor({timeout:30000});
  assert.equal(await page.locator('.home-spirit-host canvas').count(),0);
  await page.screenshot({path:out+'/fallback.png'});checks.push('WebGL unavailable retains the explicit SVG fallback');
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/results.json',JSON.stringify({origin:process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537',api:'fixture, no authenticated server',checks,errors},null,2));
 console.log('PASS Zeno HOME',checks);
}finally{await context.close();await browser.close();}
