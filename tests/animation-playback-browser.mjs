import fs from 'node:fs/promises';import assert from 'node:assert/strict';const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/performance/2026-10-02/playback',lock='/tmp/lore-series-vfx-heavy-qa.lock';
await fs.mkdir(out,{recursive:true});await fs.mkdir(lock);await fs.writeFile(lock+'/owner.json',JSON.stringify({pid:process.pid,task:'animation-performance'}));
let browser;const report={checks:[],errors:[],requests:[]};
try {
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});const page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.type(),m.text());});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url().includes('/art/vfx/mimic'))report.requests.push(r.url().split('/art/')[1]);});
 await page.goto((process.env.LORE_MIMIC_URL||'http://127.0.0.1:5396')+'/src/dev/mimic-runtime/index.html');await page.waitForFunction(()=>window.mimicQA?.ready);
 const ids=['MIMIC','MIMIC2','MIMIC_LORD','AWAKENED_MIMIC','MIMIC_KING','MIMIC_KING2'];
 for(const side of [0,1])for(const id of ids){
  console.log('START',id,side);
  const playback=page.evaluate(async({id,side})=>{
   const seen=[];let peak=0;
   const observe=()=>{for(const n of document.querySelectorAll('.mimic-summon-rig')){peak=Math.max(peak,Number(n.dataset.open)||0);if(!seen.some(s=>s.id===n.dataset.card))seen.push({id:n.dataset.card,variant:Number(n.dataset.variant)});}};
   const observer=new MutationObserver(observe);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-open']});
   try{const events=await mimicQA.play(id,side);return{events,seen,peak,remaining:document.querySelectorAll('.mimic-summon-rig').length,field:document.querySelector(`.zone-mon .card[data-uid="mimic-${side}"]`)?.outerHTML};}finally{observer.disconnect();}
  },{id,side});
  await page.waitForFunction(()=>Number(document.querySelector('.mimic-summon-rig')?.dataset.open)>.7);await page.screenshot({path:`${out}/${id}-${side}.png`});const result=await playback;
  assert(result.events.some(e=>e.id===id));assert(result.peak>.7);assert.equal(result.seen.find(s=>s.id===id)?.variant,{MIMIC:3,MIMIC2:1,MIMIC_LORD:3,AWAKENED_MIMIC:1,MIMIC_KING:2,MIMIC_KING2:1}[id]);assert.equal(result.remaining,0);assert(result.field);
  console.log('PASS',id,side);report.checks.push({id,side,route:'engine summon event',result:'passed'});
 }
 // Alternate public summon API shares the same reveal.
 await page.evaluate(()=>{window.task=mimicQA.play('MIMIC_KING',0,'hand');});await page.waitForSelector('.mimic-summon-rig');await page.evaluate(()=>window.task);assert.equal(await page.locator('.mimic-summon-rig').count(),0);report.checks.push({case:'hand API',result:'passed'});
 for(const action of ['skip','resize','hidden','destroy']){
  await page.evaluate(()=>{window.task=mimicQA.play('MIMIC_KING2',1);});await page.waitForFunction(()=>Number(document.querySelector('.mimic-summon-rig')?.dataset.open)>.2);
  await page.evaluate(action=>{if(action==='skip')mimicQA.skip();if(action==='resize')window.dispatchEvent(new Event('resize'));if(action==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}if(action==='destroy')mimicQA.dispose();},action);
  await page.evaluate(()=>window.task);assert.equal(await page.locator('.mimic-summon-rig').count(),0);report.checks.push({case:action,result:'passed'});
  if(action==='hidden')await page.evaluate(()=>{delete document.hidden;});
 }
 await page.reload();await page.waitForFunction(()=>window.mimicQA?.ready);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.task=mimicQA.play('MIMIC_KING2',0);});await page.waitForFunction(()=>Number(document.querySelector('.mimic-summon-rig')?.dataset.open)>.7);await page.screenshot({path:out+'/mobile-reduced.png'});await page.evaluate(()=>window.task);assert.equal(await page.locator('.mimic-summon-rig').count(),0);report.checks.push({case:'mobile reduced motion',result:'passed'});
 // WebGL unavailable: native summon still lands without hiding the card.
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:original.call(this,kind,...args);};});await page.reload();await page.waitForFunction(()=>window.mimicQA?.ready);await page.evaluate(()=>mimicQA.play('MIMIC_KING',0));assert.equal(await page.locator('.zone-mon .card[data-uid="mimic-0"]').count(),1);assert.equal(await page.locator('.mimic-summon-rig').count(),0);report.checks.push({case:'WebGL fallback',result:'passed'});
 assert(!report.requests.some(r=>/amber-|ridged|moist-flesh|layered|deep-throat/.test(r)));assert.deepEqual(report.errors,[]);
 report.status='passed';await context.close();
} catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));await browser?.close();const owner=JSON.parse(await fs.readFile(lock+'/owner.json','utf8'));if(owner.pid===process.pid)await fs.rm(lock,{recursive:true});}
