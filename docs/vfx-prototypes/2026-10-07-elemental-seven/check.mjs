import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_PATH||'playwright');
const url=process.env.LORE_PREVIEW_URL||'http://127.0.0.1:5268/elemental-seven.html';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[],failed=[],checks=[],timing=[];page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
const kinds=['cannon','lightning','berserk','arrow','meteor','ball','zone'];
const peaks={cannon:1600,lightning:1275,berserk:1600,arrow:1810,meteor:2350,ball:1625,zone:2010};
const ready=()=>page.waitForFunction(()=>window.elementLab?.stage?.ready,{},{timeout:90000});
const select=async kind=>{await page.evaluate(k=>elementLab.select(k),kind);await ready()};
const seek=t=>page.evaluate(t=>elementLab.stage.seek(t),t);
try{
 await page.goto(url);await ready();assert.equal(await page.evaluate(()=>elementLab.stage.status().renderer),'volume-webgl');
 for(const kind of kinds){await select(kind);console.log('studio',kind);for(const t of [0,680,1100,peaks[kind],2600]){await seek(t);if(t===peaks[kind]||t===680)await page.locator('iframe').screenshot({path:`${out}studio-${kind}-${t}.png`})}await page.evaluate(()=>elementLab.stage.seek(elementLab.stage.current.duration));assert(await page.evaluate(()=>{const c=elementLab.stage.canvas,a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<a.length;i+=4)if(a[i])return false;return true}));assert.equal(await page.evaluate(()=>elementLab.stage.status().overlays),1)}
 checks.push('7 effects: charge, flight, impact, recovery, clear end overlay');
 for(const[k,count]of [['arrow',3],['meteor',8],['lightning',3],['zone',4]]){await select(k);assert.equal(await page.evaluate(()=>elementLab.stage.hits.length),count)}
 await select('lightning');assert(await page.evaluate(()=>elementLab.stage.hits.some(h=>h.target===4)));checks.push('3 arrows, 8 meteors, 3 lightning hits including allied target, 4 simultaneous zone targets');
 await select('cannon');await page.locator('#heavy').check();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.hits[0].amount),2);await page.locator('#heavy').uncheck();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.hits[0].amount),1);
 await select('berserk');await page.locator('#friendly').check();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.hits[0].target),4);await seek(1600);await page.locator('iframe').screenshot({path:out+'berserk-allied.png'});
 await select('ball');await page.locator('#player').check();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.hits[0].target),3);await page.locator('#player').uncheck();await ready();
 await select('zone');await page.locator('#enhanced').check();await ready();assert(await page.evaluate(()=>elementLab.stage.hits.every(h=>h.amount===9)));checks.push('heavy cannon damage, friendly berserk, player target, enhanced zone');
 await select('ball');await page.evaluate(()=>{elementLab.stage.play()});await page.waitForTimeout(250);await page.evaluate(()=>elementLab.stage.stop());const paused=await page.evaluate(()=>elementLab.stage.time);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>elementLab.stage.time),paused);await page.evaluate(()=>elementLab.stage.reset());assert.equal(await page.evaluate(()=>elementLab.stage.time),0);
 await page.evaluate(()=>{const s=elementLab.stage;s.seek(s.current.duration-100);s.play()});await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>elementLab.stage.playing),false);checks.push('pause, reset, one-shot completion');
 await page.locator('#light').check();for(const kind of kinds){await select(kind);await seek(peaks[kind]);await page.locator('iframe').screenshot({path:`${out}white-${kind}.png`})}await page.locator('#light').uncheck();
 // Real-time cadence is measured separately from deterministic seek recordings.
 await select('meteor');timing.push(await page.evaluate(async()=>{const s=elementLab.stage;let last=performance.now(),deltas=[];s.reset();s.play();while(s.playing){await new Promise(r=>requestAnimationFrame(r));const n=performance.now();deltas.push(n-last);last=n}deltas.sort((a,b)=>a-b);return {mode:'studio',frames:deltas.length,medianMs:deltas[Math.floor(deltas.length*.5)],p95Ms:deltas[Math.floor(deltas.length*.95)]}}));
 await page.locator('#board').click();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.status().boardReady),'true');
 for(const side of ['0','1']){console.log('board side',side);await page.locator('#side').selectOption(side);await ready();for(const kind of kinds){await select(kind);await seek(peaks[kind]);await page.locator('iframe').screenshot({path:`${out}board-${side}-${kind}.png`});assert.equal(await page.evaluate(()=>elementLab.stage.status().overlays),1)}}checks.push('real GameView ready; all 7 effects on both sides');
 for(const size of [{width:390,height:844},{width:320,height:740}]){await page.setViewportSize(size);await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await select('meteor');await seek(2350);await page.screenshot({path:out+`mobile-board-${size.width}.png`,fullPage:true})}checks.push('320 and 390 px: no horizontal overflow');
 await page.locator('#studio').click();await ready();await select('zone');await seek(2010);await page.screenshot({path:out+'mobile-studio.png',fullPage:true});
 await page.locator('#reduced').check();await seek(2010);assert(await page.evaluate(()=>[...elementLab.stage.root.querySelectorAll('.card')].every(e=>!e.style.translate&&!e.style.rotate)));await page.evaluate(()=>elementLab.stage.reset());checks.push('reduced motion: no source or target movement');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready();assert.equal(await page.evaluate(()=>elementLab.stage.reduced),true);assert.equal(await page.evaluate(()=>elementLab.stage.playing),false);checks.push('OS reduced motion startup stays paused');
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('reduced').checked);await select('lightning');await seek(1275);await page.screenshot({path:out+'overview.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await fs.writeFile(out+'report.json',JSON.stringify({checks,errors,failed,timing,scope:'Local presentation fixtures, no engine/runtime/staging adoption'},null,2));console.log('PASS',JSON.stringify({checks,timing}));
}finally{await browser.close()}
