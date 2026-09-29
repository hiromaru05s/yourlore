import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
import fs from 'node:fs/promises';
const name=process.argv[2]||'current',out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-09-29';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5279';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.gpuCalls={};
 for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
  const original=proto[method];if(!original)continue;
  proto[method]=function(...args){const key=this.canvas.className||'offscreen';window.gpuCalls[key]=(window.gpuCalls[key]||0)+1;return original.apply(this,args)};
 }
});
try{
 await page.goto(origin+'/duel-lab.html?polish');await page.waitForSelector('[data-scene-ready="true"]');await page.waitForTimeout(5500);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(1000);
  const first=await cdp.send('Performance.getMetrics');
  const measured=await page.evaluate(async()=>{window.gpuCalls={};const frames=[],start=performance.now();let last=start;await new Promise(resolve=>{const tick=now=>{frames.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});frames.sort((a,b)=>a-b);return {gpuCalls:window.gpuCalls,frames:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],scene:document.querySelector('#app').dataset.scenePerf};});
  const second=await cdp.send('Performance.getMetrics');const metrics={};for(const key of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize']){const get=r=>r.metrics.find(x=>x.name===key)?.value||0;metrics[key]=get(second)-get(first);}
  await page.screenshot({path:`${out}/${name}-${width}.png`});samples.push({width,height,...measured,metrics});
 }
 if(name!=='before')for(const sample of samples){assert((sample.gpuCalls['duel-objects-3d']||0)<15000,'idle board must stay cached: '+JSON.stringify(sample));}
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/${name}.json`,JSON.stringify({samples,errors},null,2));console.log(JSON.stringify({samples,errors},null,2));
}finally{await browser.close()}
