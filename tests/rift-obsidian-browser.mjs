import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/releases/2026-10-07-rift-obsidian/qa';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],cases=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5398/rift-obsidian-adoption.html');await page.waitForFunction(()=>window.obsidianQA?.ready);console.log('board ready');
 for(const [width,side]of [[1280,0],[1280,1],[390,0],[390,1]]){
  await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(side=>{window.done=false;window.samples=[];const observe=()=>{const n=document.querySelector('.rift-destruction');if(n)samples.push({...n.dataset});if(!done)requestAnimationFrame(observe);};requestAnimationFrame(observe);obsidianQA.play(side).then(r=>{window.result=r;window.done=true;});},side);
  await page.waitForSelector('.rift-destruction');await page.waitForFunction(()=>Number(document.querySelector('.rift-destruction')?.dataset.progress)>.24);await page.screenshot({path:out+`/fracture-${width}-${side}.png`});await page.waitForFunction(()=>window.done);
  const r=await page.evaluate(()=>({result,samples}));assert(r.result.removed.includes(`obsidian-${side}-1`));assert(!r.result.field.includes(`obsidian-${side}-1`));assert(r.samples.length>20);assert.deepEqual([...new Set(r.samples.map(s=>s.variant))],['obsidian-01']);assert(r.samples.some(s=>s.phase==='fracture'));assert(r.samples.some(s=>s.phase==='transfer'));assert(r.samples.some(s=>s.phase==='arrival'));assert.equal(await page.locator('.rift-destruction,.rift-destruction-source').count(),0);cases.push({width,side,result:r.result,frames:r.samples.length});console.log('PASS engine/controller',width,side);
 }
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>obsidianQA.reset(0));
 const lifecycle=await page.evaluate(async()=>{
  const {playMonster}=await import('/src/ui/monster/runtime.ts'),{obsidianResourceState}=await import('/src/ui/riftDestruction/renderer.ts');
  const nodes=[...document.querySelectorAll('#meRow .zone-mon .card')].slice(0,2),target=document.querySelector('#rift-me'),original=nodes.map(n=>n.style.visibility),control=new AbortController();
  const wait=ps=>new Promise(async resolve=>{await Promise.all(ps);resolve(true);});
  const jobs=nodes.map(n=>playMonster(n,'destroy',{variant:'B',destination:target,signal:control.signal}));
  await new Promise(resolve=>{function step(){if(document.querySelectorAll('.rift-destruction').length===2)resolve();else requestAnimationFrame(step);}step();});
  const users=obsidianResourceState().users;control.abort();await wait(jobs);
  return{users,after:obsidianResourceState(),restored:nodes.every((n,i)=>n.style.visibility===original[i]),overlays:document.querySelectorAll('.rift-destruction,.rift-destruction-source').length,absorbing:target.classList.contains('is-absorbing')};
 });assert.equal(lifecycle.users,2);assert.equal(lifecycle.after.users,0);assert(lifecycle.restored);assert.equal(lifecycle.overlays,0);assert(!lifecycle.absorbing);
 await page.evaluate(()=>{window.done=false;obsidianQA.play(0).then(()=>window.done=true);});await page.waitForSelector('.rift-destruction');await page.evaluate(()=>obsidianQA.skip());await page.waitForFunction(()=>done);assert.equal(await page.locator('.rift-destruction,.rift-destruction-source').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>obsidianQA.play(1));assert(reduced.removed.includes('obsidian-1-1'));assert.equal(await page.locator('.rift-destruction').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{window.done=false;obsidianQA.play(0).then(()=>window.done=true);});await page.waitForSelector('.rift-destruction');await page.setViewportSize({width:1200,height:800});await page.waitForFunction(()=>done);assert.equal(await page.locator('.rift-destruction,.rift-destruction-source').count(),0);
 await page.evaluate(()=>obsidianQA.dispose());assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({cases,lifecycle,skip:true,reduced:true,resize:true,errors,boundary:'Actual engine reduce -> controller -> ghostDie -> playMonster -> GPU obsidian. Local board fixture, not an authenticated online match.'},null,2));console.log('PASS lifecycle, simultaneous, skip, reduced, resize, dispose');
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.log(await page.evaluate(()=>({body:document.body.innerText.slice(-300),ready:window.obsidianQA?.ready})),errors);throw e;}finally{await browser.close();}
