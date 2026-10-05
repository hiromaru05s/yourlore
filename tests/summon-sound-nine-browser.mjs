import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUTPUT||'docs/sound-study/2026-10-05-summon/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.qaActive=0;window.qaStarts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){window.qaActive++;window.qaStarts++;this.addEventListener('ended',()=>window.qaActive--,{once:true});return start.apply(this,a);};});
const ended=()=>page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('再生終了'));
const sceneEnded=()=>page.waitForFunction(()=>document.querySelector('#status').textContent==='実盤面の再生が終了しました。');
try{
 await page.goto('http://127.0.0.1:5393/summon-sound-nine.html',{waitUntil:'commit'});await page.waitForSelector('[data-single]');
 const clips=JSON.parse(await fs.readFile('client/src/dev/summon-sound-nine/assets/manifest.json','utf8'));
 assert.equal(clips.length,9);assert.equal(new Set(clips.map(c=>c.sha256)).size,9);assert(Math.max(...clips.map(c=>c.energy200Db))-Math.min(...clips.map(c=>c.energy200Db))<.2);
 for(const c of clips){await page.locator(`[data-single="${c.id}"]`).click();await ended();}
 assert.equal(await page.evaluate(()=>qaStarts),9);
 await page.locator('#old').click();await ended();await page.locator('[data-repeat]').first().click();await ended();assert.equal(await page.evaluate(()=>qaStarts),13);
 await page.locator('#bgm').check();await page.locator('#mono').check();await page.locator('#all').click();await page.waitForTimeout(700);await page.locator('#stop').click();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>qaActive),0);
 await page.locator('#bgm').uncheck();await page.locator('#mono').uncheck();const before=await page.evaluate(()=>qaStarts);await page.locator('#all').click();await ended();assert.equal(await page.evaluate(()=>qaStarts)-before,9);console.log('Nine samples, repeat, sequence and stop passed');
 const frame=page.frames().find(f=>f.url().endsWith('/summon-sound-nine/scene.html'));assert(frame);await page.waitForFunction(()=>!document.querySelector('[data-scene]').disabled);
 const scenes=[];
 for(const c of clips){await page.locator(`[data-scene="${c.id}"]`).click();await sceneEnded();const trace=await frame.evaluate(()=>summonSoundQA.trace);assert.equal(trace.length,1,JSON.stringify(trace));assert.equal(trace[0].selected,c.id);assert(trace[0].impactMs>=790&&trace[0].impactMs<1300,JSON.stringify(trace));await frame.locator('#meRow .zone-mon [data-card-id=M2]').waitFor({state:'visible'});scenes.push({id:c.id,trace});console.log('summon',c.id,trace[0].impactMs);}
 assert.equal(new Set(scenes.map(s=>s.trace[0].fingerprint)).size,9);
 await page.locator('[data-scene=current]').click();await sceneEnded();assert.equal((await frame.evaluate(()=>summonSoundQA.trace))[0].selected,'current');
 // Interrupt a landing before contact: no scheduled candidate may leak afterwards.
 await page.locator('[data-scene="09-arcane"]').click();await frame.waitForSelector('.slate-summon');await page.locator('#stop').click();await page.waitForTimeout(1000);assert.equal(await frame.locator('.slate-summon').count(),0);assert.equal(await frame.evaluate(()=>qaActive),0);
 await page.locator('#card').selectOption('M12');await page.locator('#side').selectOption('1');await page.locator('#bgm').check();await page.locator('#mono').check();await page.locator('[data-scene="03-slate"]').click();await sceneEnded();await frame.locator('#oppRow .zone-mon [data-card-id=M12]').waitFor({state:'visible'});assert.equal((await frame.evaluate(()=>summonSoundQA.trace))[0].selected,'03-slate');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>qaActive),0);
 await page.locator('#bgm').uncheck();await page.screenshot({path:out+'/desktop.png',fullPage:true});
 const sizes=[];for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.waitForTimeout(300);const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(result.scroll<=width,JSON.stringify(result));sizes.push(result);await page.screenshot({path:out+'/mobile-'+width+'.png',fullPage:true});}
 await page.locator('[data-scene="09-arcane"]').click();const box=await page.locator('#scene').boundingBox();assert(box.y>=0&&box.y+box.height<=844);await sceneEnded();assert.equal((await frame.evaluate(()=>summonSoundQA.trace))[0].selected,'09-arcane');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({clips:clips.map(({id,sha256,energy200Db})=>({id,sha256,energy200Db})),scenes,sizes,errors,checks:['nine unique recordings','energy within .2 dB','nine single controls','original single and board','three repetitions','nine sequence','cancel sequence and BGM','nine real summon landing callbacks','stop during landing','large card on opponent side','BGM and mono','mobile auto scroll','320/390/1440 layout'],boundary:'Preview fixture through real engine/controller/adopted slate summon; buffer substitution confined to preview iframe. Functional verification, not subjective listening approval.'},null,2)+'\n');console.log('PASS summon nine');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});await fs.writeFile(out+'/failure.json',JSON.stringify({error:e.stack,errors,scene:await page.locator('#scene-status').textContent().catch(()=>null)},null,2));throw e;}finally{await browser.close();}
