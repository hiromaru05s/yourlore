import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const out='docs/sound-redesign/2026-09-30/checks';await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile('client/public/sfx/lore-v5/manifest.json','utf8')).sounds;
const old=JSON.parse(await fs.readFile('client/public/sfx/lore-v4/manifest.json','utf8')).sounds;
const preserved=[];
for(const name of ['click','pop','error','coin','match','buy','draw'])for(const clip of manifest[name]){
 const b=await fs.readFile('client/public'+clip.url),hash=createHash('sha256').update(b).digest('hex');assert.equal(hash,clip.sha256);assert(old[name].some(x=>x.sha256===hash));preserved.push(clip.url);
}
assert.equal(preserved.length,9);assert.deepEqual(manifest.draw.map(c=>c.file),['draw-3.mp3']);
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.qaStarts=[];window.qaLive=new Set();const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args){window.qaStarts.push({time:performance.now(),duration:this.buffer?.duration});window.qaLive.add(this);this.addEventListener('ended',()=>window.qaLive.delete(this),{once:true});return start.apply(this,args)};
});
try{
 await page.goto('http://127.0.0.1:5338/sound-review.html');await page.waitForFunction(()=>document.querySelectorAll('article').length===35);
 const names=await page.locator('article').evaluateAll(rows=>rows.map(r=>r.dataset.cue));assert.equal(new Set(names).size,35);
 const buttons=page.locator('[data-url]');assert.equal(await buttons.count(),73);
 const played=[];
 for(let i=0;i<73;i++){
  const b=buttons.nth(i),url=await b.getAttribute('data-url'),before=await page.evaluate(()=>qaStarts.length);await b.click();
  await page.waitForFunction(n=>qaStarts.length>n,before);played.push(url);await page.locator('#stop').click();await page.waitForFunction(()=>qaLive.size===0);
 }
 await page.locator('[data-chain="new"]').click();await page.waitForFunction(()=>qaLive.size>0);await page.locator('#stop').click();await page.waitForFunction(()=>qaLive.size===0);
 const afterStop=await page.evaluate(()=>qaStarts.length);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>qaStarts.length),afterStop);
 await page.locator('#bgm').check();await page.locator('[data-chain="new"]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('BGMあり'));
 await page.waitForFunction(()=>document.querySelector('#timeline').textContent==='カードを引く');await page.locator('#stop').click();await page.waitForFunction(()=>qaLive.size===0);
 await page.locator('#volume').fill('0');assert.equal(await page.locator('#volume-label').textContent(),'0%');await page.locator('#volume').fill('70');
 await page.locator('[data-filter="new"]').click();assert.equal(await page.locator('article').count(),28);
 await page.locator('[data-filter="keep"]').click();assert.equal(await page.locator('article').count(),7);
 await page.locator('[data-filter="all"]').click();await page.locator('#search').fill('支払い');assert.equal(await page.locator('article').count(),1);await page.locator('#search').fill('');
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/preview-desktop.png'});
 const widths=[];for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);widths.push({width,scroll});assert(scroll<=width);if(width===390)await page.screenshot({path:out+'/preview-mobile.png'});}
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/preview-browser.json',JSON.stringify({preserved,played,checks:['35 cue rows','28 redesigned / 7 preserved filters','All 73 A/B/kept buttons play','Sequence stops immediately, including scheduled sounds','BGM sequence starts and stops','Search','1280 / 390 / 320 layout'],widths,errors},null,2)+'\n');
 console.log('PASS: 73 preview buttons, sequences/BGM/stop, 9 preserved files, filters and responsive layout');
}finally{await browser.close()}
