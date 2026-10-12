import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/vfx-prototypes/2026-10-13-silence-seals-r2/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1320,height:1160},deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],failed=[],cases=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
const state=()=>page.evaluate(()=>silenceQA.state);
const seek=async t=>{await page.evaluate(t=>silenceQA.seek(t),t);};
const shot=async name=>page.screenshot({path:out+'/'+name+'.png'});
let frame;
try{
 await page.goto('http://127.0.0.1:5496/silence-four.html',{waitUntil:'commit'});await page.waitForFunction(()=>window.silenceQA?.state.ready);await seek(800);await shot('four-giant');
 for(const id of ['NT_SEAL5','NT_SEAL3']){await page.selectOption('#card',id);for(const t of [0,400,800,1200,1700,2200,3000]){await seek(t);const s=await state();assert(s.stats.calls>0);assert.equal(s.id,id);cases.push({kind:'four-canvas',id,t});if(t===800)await shot(id+'-'+t);}}
 await page.selectOption('#card','NT_SEAL5');await page.click('#theme');await seek(800);await shot('four-dark');await page.click('#theme');
 // Record two full cycles at 1x using the actual animation clock, without forced frame stepping.
 await page.evaluate(()=>{silenceQA.seek(0);window.silenceIntervals=[];let previous=performance.now();let count=0;function frame(now){silenceIntervals.push(now-previous);previous=now;if(++count<500)requestAnimationFrame(frame)}requestAnimationFrame(frame);silenceQA.play();});
 await page.waitForTimeout(7300);const intervals=await page.evaluate(()=>silenceIntervals);await seek(800);
 await page.evaluate(()=>silenceQA.setMode('board'));await page.waitForFunction(()=>silenceQA.state.boardReady);frame=page.frames().find(f=>f.url().includes('?board'));assert(frame);
 const board=()=>frame.evaluate(()=>silenceBoard.state);
 for(const id of ['NT_SEAL5','NT_SEAL3']){await page.selectOption('#card',id);for(let side=0;side<2;side++){if((await board()).side!==side)await page.click('#side');for(let v=0;v<4;v++){await page.evaluate(v=>silenceQA.select(v),v);await seek(0);await frame.waitForFunction(()=>silenceBoard.state.ms===0);let s=await board();assert.equal(s.hidden,1);assert.equal(s.rigs,1);assert.equal(s.firstTime,0);await seek(800);await frame.waitForFunction(()=>silenceBoard.state.ms===800);assert((await board()).heights[0]>0);if(id==='NT_SEAL5'&&side===0)await shot('board-'+v);await seek(2400);await frame.waitForFunction(()=>silenceBoard.state.ms===2400);s=await board();assert.equal(s.heights[0],0);assert.equal(s.impacts,1);await seek(3000);await frame.waitForFunction(()=>silenceBoard.state.ms===3000);s=await board();assert.equal(s.hidden,0);assert.equal(s.rigs,0);cases.push({kind:'board',id,side,v,contactOnce:true,restored:true,firstTime:0});}}}
 await page.click('#multi');await seek(0);await frame.waitForFunction(()=>silenceBoard.state.rigs===3);await seek(900);await frame.waitForFunction(()=>silenceBoard.state.ms===900);await shot('three-opponent');await page.click('#stop');await frame.waitForFunction(()=>silenceBoard.state.hidden===0);cases.push({kind:'concurrent-and-cancel',restored:true});
 await page.click('#multi');if((await board()).side!==0)await page.click('#side');await seek(3000);
 const hand=frame.locator('.hand [data-card-id="NT_SEAL3"],.hand-card[data-card-id="NT_SEAL3"],#hand [data-card-id="NT_SEAL3"]');
 console.log('first phases passed',cases.length,'hand matches',await hand.count());await fs.writeFile(out+'/checkpoint.json',JSON.stringify({cases,errors,failed},null,2));
 if(await hand.count()){const bounds=await hand.first().boundingBox();assert(bounds);await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y-150,{steps:12});await page.mouse.up();await page.waitForFunction(()=>silenceQA.state.playing);cases.push({kind:'native-hand-drag',started:true});await page.click('#stop');}else throw Error('Hand selector unavailable');
 await page.check('#reduced');await seek(800);await frame.waitForFunction(()=>silenceBoard.state.reduced);assert.equal((await board()).hidden,0);assert.equal((await board()).rigs,0);await page.uncheck('#reduced');
 await seek(800);await frame.waitForFunction(()=>silenceBoard.state.hidden===1);await page.setViewportSize({width:1280,height:1000});await frame.waitForFunction(()=>silenceBoard.state.hidden===0);cases.push({kind:'resize-cancel',restored:true});
 await page.evaluate(()=>silenceQA.setMode('grid'));await page.waitForFunction(()=>document.querySelector('iframe').src==='about:blank');
 const layouts=[];for(const width of [390,320,844]){await page.setViewportSize({width,height:900});await seek(800);const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.equal(layout.width,layout.scroll);layouts.push(layout);await page.screenshot({path:out+'/mobile-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:1320,height:1160});await seek(800);await shot('four-final');
 const sorted=intervals.filter(n=>n>0).sort((a,b)=>a-b);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({cases,layouts,errors,failed,frameIntervals:{count:sorted.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over50:sorted.filter(x=>x>50).length},boundary:'Local preview and GameView fixture. No engine dispatch/online match/adoption/deployment claim. Wall-clock timings measured on a shared, busy host.'},null,2));console.log('PASS',cases.length,JSON.stringify(layouts));
}catch(e){await shot('failure').catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify({message:e.stack,errors,failed,state:await state().catch(()=>null),board:await frame?.evaluate(()=>silenceBoard.state).catch(()=>null)},null,2));throw e;}finally{const video=page.video();await context.close();if(video){await video.saveAs(path.resolve(out,'continuous-review.webm'));}await browser.close();}
