import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-09-29/staging';
const dist=process.env.LORE_STAGING_BUILD;assert(dist,'LORE_STAGING_BUILD is required');await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['index.html',...(await fs.readdir(path.join(dist,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)];
const assets=[];
for(const file of files){const local=await fs.readFile(path.join(dist,file)),r=await fetch(origin+'/'+file);assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(local),file);assets.push({file,sha256:hash(local)});}
console.log('Asset hashes verified',assets.length);
const riftBundle=files.find(f=>/^assets\/riftScene-.*\.js$/.test(f));assert(riftBundle);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.gpuCalls={};for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=proto[method];if(!original)continue;proto[method]=function(...args){const key=this.canvas.className||'offscreen';window.gpuCalls[key]=(window.gpuCalls[key]||0)+1;return original.apply(this,args);};}});
await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'performance-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default',furniture:'default'}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:p==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
try{
 await page.goto(origin+'/?polish',{waitUntil:'domcontentloaded'});console.log('Root loaded');await page.waitForSelector('.screen-loader',{state:'detached'});console.log('Menu ready');await page.locator('#bot').click();console.log('BOT mode selected');await page.locator('#ranked').click();console.log('Difficulty modal open');await page.locator('[data-diff=easy]').click();console.log('Easy selected');await page.locator('#diffStart').click();console.log('BOT selected');await page.waitForSelector('[data-scene-ready=true]');console.log('Scene ready');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');await page.waitForFunction(()=>!!document.querySelector('[data-reading-turn=player]'));await page.waitForTimeout(5500);
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(750);
  const sample=await page.evaluate(async()=>{window.gpuCalls={};const frames=[],start=performance.now();let last=start;await new Promise(resolve=>{const tick=now=>{frames.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});frames.sort((a,b)=>a-b);return {gpuCalls:window.gpuCalls,frames:frames.length,p95:frames[Math.floor(frames.length*.95)],scene:document.querySelector('[data-scene-ready=true]').dataset.scenePerf};});
  assert((sample.gpuCalls['duel-objects-3d']||0)<18000,JSON.stringify(sample));assert(!await page.locator('.duel-loader').count());samples.push({width,height,...sample});await page.screenshot({path:out+'/bot-'+width+'.png'});
 }
 await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(300);
 await fs.writeFile(out+'/idle-verification.json',JSON.stringify({origin,assets,samples,errors},null,2));
 const ink=await page.evaluate(async bundle=>{
  const {swallowRiftCard}=await import('/'+bundle),source=document.querySelector('#hand .card'),r=source.getBoundingClientRect(),copy=source.cloneNode(true),target=document.querySelector('#rift-me'),sink=target.getBoundingClientRect();
  copy.removeAttribute('id');copy.style.cssText+=`;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--cw:${r.width}px;--ch:${r.height}px;transform:none;z-index:125`;document.body.append(copy);
  const anchor=document.createElement('div');anchor.style.cssText=`position:fixed;left:${sink.left}px;top:${sink.top}px;width:${sink.width}px;height:${sink.height}px;pointer-events:none`;document.body.append(anchor);
  const before={width:copy.offsetWidth,height:copy.offsetHeight,frame:getComputedStyle(copy.querySelector('.card-frame')).backgroundImage,hidden:document.hidden};
  const seen=[];const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLCanvasElement)seen.push(node.className);});observer.observe(document.body,{childList:true});
  try{await swallowRiftCard(copy,anchor,new DOMMatrix().translate(r.left,r.top),new AbortController().signal,()=>{});await Promise.resolve();return {before,seen};}
  finally{observer.disconnect();copy.remove();anchor.remove();}
 },riftBundle);
 console.log('Silver projection probe',ink);assert(ink.seen.includes('rift-silver-source'),JSON.stringify(ink));assert.equal(await page.locator('.rift-silver-source,.rift-silver-ink-canvas').count(),0);
 const spellBundle=files.find(f=>/^assets\/scene-.*\.js$/.test(f));let spell;
 if(spellBundle){
  spell=await page.evaluate(async bundle=>{
   const {createFrameScene}=await import('/'+bundle),source=document.querySelector('.card--spell');if(!source)throw Error('No public spell card for deployed mask probe');
   const copy=source.cloneNode(true);copy.removeAttribute('id');copy.style.cssText='position:fixed;left:400px;top:170px;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;z-index:150';document.body.append(copy);
   const get=CanvasRenderingContext2D.prototype.getImageData;let reads=0;
   CanvasRenderingContext2D.prototype.getImageData=function(...args){if(this.canvas.width===768&&this.canvas.height===1200)reads++;return get.apply(this,args);};
   const samples=[];
   try{for(let i=0;i<2;i++){const before=reads,scene=await createFrameScene(copy);try{scene.draw(1000,false);samples.push({maskReadbacks:reads-before,canvases:copy.querySelectorAll('.spell-frame-resonance').length});}finally{scene.dispose();}}return {samples,remaining:copy.querySelectorAll('.spell-frame-resonance').length};}
   finally{CanvasRenderingContext2D.prototype.getImageData=get;copy.remove();}
  },spellBundle);
  assert.equal(spell.samples[0].maskReadbacks,3);assert.equal(spell.samples[1].maskReadbacks,0);assert(spell.samples.every(s=>s.canvases===1));assert.equal(spell.remaining,0);console.log('Deployed spell mask cache and cleanup verified',spell);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/verification.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),assets,samples,optimizedSilverProjection:true,spellMaskCache:spell,errors,boundary:'Real deployed assets and built BOT board. Authentication/API responses are fixtures. Silver ink invoked through the deployed swallowRiftCard export on a public hand clone; not an authenticated online match or natural exile event.'},null,2));console.log('PASS',assets.length,'deployed asset hashes, desktop/mobile BOT idle budget, optimized silver-ink projection and cleanup');
}catch(error){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:error.message,url:page.url(),body:(await page.locator('body').innerText()).slice(0,5000),errors},null,2));throw error;}finally{await browser.close();}
