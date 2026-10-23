import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5436',out='docs/vfx/2026-10-23-tribe-pact-defeat/qa';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],records=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}});const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('[tribe pact'))errors.push(m.text());});await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.goto(origin+'/tribe-pact-defeat.html');await page.waitForFunction(()=>window.pactPreview?.ready);console.log('ready');
 // Sample phases inside the browser: screenshots on a loaded workstation must not
 // race the real-time animation or change the production timing.
 async function cast(you=0,owner=0,mode='normal'){
  return page.evaluate(async({you,owner,mode})=>{
   await pactPreview.reset(you,owner);window.pactSamples=[];
   const phases=new Set();let canceled=false;
   const observer=new MutationObserver(()=>{
    const fx=document.querySelector('.pact-defeat');if(!fx)return;
    const phase=fx.dataset.phase;if(!phases.has(phase)){
     phases.add(phase);const words=fx.querySelector('.pact-defeat__words').getBoundingClientRect();
     pactSamples.push({phase,time:Number(fx.dataset.time),side:fx.dataset.side,text:fx.textContent,earlyModal:!!document.querySelector('.outcome-result'),wordsInBounds:words.x>=0&&words.right<=innerWidth});
    }
    if(mode!=='normal'&&!canceled&&phase==='reveal'){
     canceled=true;
     if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;}else pactPreview[mode]();
    }
   });observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase']});window.pactObserver=observer;
   pactPreview.cast();pactPreview.earlyResult();
  },{you,owner,mode});
 }
 async function settled(){await page.waitForSelector('.outcome-result');return page.evaluate(()=>{pactObserver.disconnect();return pactSamples;});}
 for(const [you,owner] of [[0,0],[0,1],[1,0]]){
  await cast(you,owner);const samples=await settled();console.log('samples',you,owner,JSON.stringify(samples));
  for(const phase of ['reveal','breach','tear','judgment','verdict'])assert(samples.some(s=>s.phase===phase),phase);
  assert(samples.every(s=>s.side===(you===owner?'me':'opp')&&!s.earlyModal&&s.wordsInBounds));
  assert.equal(await page.locator('.pact-defeat').count(),0);assert.match(await page.locator('#winDetail').innerText(),/多種族契約 — 契約不履行/);assert.equal(await page.evaluate(owner=>pactPreview.getState().players[owner].hp,owner),32);assert.equal(await page.locator('.buff-icon[data-uid="pact-source"]').evaluate(n=>n.style.visibility),'');records.push({you,owner,samples});
 }
 await page.evaluate(()=>pactPreview.reconnect());await page.waitForSelector('.outcome-result');assert.equal(await page.locator('.pact-defeat').count(),0);assert.match(await page.locator('#winDetail').innerText(),/契約不履行/);records.push({reconnect:'passed'});
 for(const mode of ['skip','destroy','hidden']){
  await cast(0,0,mode);
  if(mode==='destroy'){await page.waitForFunction(()=>pactSamples.some(s=>s.phase==='reveal')&&!document.querySelector('.pact-defeat'));await page.evaluate(()=>pactObserver.disconnect());}
  else{await settled();assert.match(await page.locator('#winDetail').innerText(),/契約不履行/);}
  assert.equal(await page.locator('.pact-defeat').count(),0);records.push({cancel:mode,passed:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await cast();const reduced=await settled();assert(reduced.some(s=>s.phase==='static'));assert(!reduced.some(s=>s.phase==='tear'));records.push({reducedMotion:'passed'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const [width,height] of [[390,844],[844,390]]){await page.setViewportSize({width,height});await cast();const samples=await settled();assert(samples.every(s=>s.wordsInBounds));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);records.push({width,height,samples});}
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/result-mobile.png'});await fs.writeFile(out+'/report.json',JSON.stringify({records,errors},null,2));await context.close();console.log('PASS');
}finally{await browser.close();}
