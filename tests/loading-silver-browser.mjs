import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5212';
const out='docs/ui-rework/2026-09-29-loading-silver/qa';
await fs.mkdir(out+'/video',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];
try {
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out+'/video',size:{width:1280,height:720}}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/loading-lab.html');await page.locator('.loading-logo').evaluate(e=>e.decode());
 await page.locator('.preview-controls').evaluate(e=>e.style.display='none');
 await page.waitForTimeout(11800);
 assert.equal(await page.locator('progress').evaluate(e=>e.value),42);checks.push('Two uninterrupted cycles; progress stays at 42 until work completes');
 for(const t of [0,1000,2200,3400,4500,5599]){
  await page.evaluate(t=>{for(const a of document.querySelector('.loading-ritual').getAnimations({subtree:true})){a.pause();a.currentTime=t}},t);
  await page.screenshot({path:`${out}/phase-${t}.png`});
 }
 for(const [width,height] of [[1280,720],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.screenshot({path:`${out}/size-${width}.png`});
  const bounds=await page.locator('.loading-progress').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 }
 checks.push('1280 desktop, 390 and 320 phones, 844 landscape fit without horizontal overflow');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.loading-ritual').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
 await page.screenshot({path:out+'/reduced.png'});checks.push('Reduced motion has no running ritual animations');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const result=await page.evaluate(async()=>{
  const {loadingScreen}=await import('/src/ui/loadingScreen.ts');const second=loadingScreen('screen-loader','second');document.body.append(second.element);
  second.update(70,'work');second.update(20,'older work');const monotonic=second.element.querySelector('progress').value===70;
  const independent=window.loadingPreview.element.querySelector('progress').value===42;
  second.update(120,'done');const capped=second.element.querySelector('progress').value===100;
  const animations=second.element.getAnimations({subtree:true});second.element.remove();await new Promise(requestAnimationFrame);
  return {monotonic,independent,capped,detached:animations.every(a=>a.playState==='idle')};
 });
 assert.deepEqual(result,{monotonic:true,independent:true,capped:true,detached:true});checks.push('Concurrent loaders stay independent; progress is monotonic and capped; removal cancels animations');
 // Slow continuous playback uses the same production CSS, not a separate renderer.
 await page.setViewportSize({width:1280,height:720});
 await page.evaluate(()=>{for(const a of document.querySelector('.loading-ritual').getAnimations({subtree:true})){a.currentTime=0;a.playbackRate=.25;a.play()}});
 await page.waitForTimeout(8000);checks.push('Quarter-speed playback recorded');
 assert.deepEqual(errors,[]);checks.push('No browser runtime errors');
 const video=page.video();await context.close();await video.saveAs(out+'/continuous.webm');
 await fs.writeFile(out+'/ritual-report.json',JSON.stringify({checks,result},null,2));
 console.log('PASS',checks);
}finally{await browser.close()}
