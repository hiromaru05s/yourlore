import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:8798',out=process.env.LORE_TEST_OUT||'/tmp/lore-performance-release';
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Local QA accounts only');
await fs.mkdir(out,{recursive:true});
const users=JSON.parse(await fs.readFile(process.env.LORE_TEST_USERS,'utf8'));
const width=Number(process.env.LORE_TEST_WIDTH||1280);
const browser=await chromium.launch({channel:'chrome',headless:true}),report={origin,width,samples:[],errors:[]};
try {
 for(const authenticated of [false,true]){
  const context=await browser.newContext({viewport:{width,height:width<700?844:800}});
  if(authenticated)await context.addCookies([{name:'lore_session',value:users[0].cookie.split('=')[1],url:origin}]);
  await context.addInitScript(()=>{
   localStorage.setItem('lore_lang','ja');
   performance.setResourceTimingBufferSize(20000);window.calls={};window.long=[];
   new PerformanceObserver(l=>window.long.push(...l.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask'});
   const count=k=>window.calls[k]=(window.calls[k]||0)+1;
   for(const [proto,name] of [[Element.prototype,'getBoundingClientRect'],[window,'getComputedStyle']]){const f=proto[name];proto[name]=function(...a){count(name);return f.apply(this,a)}}
   for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const f=proto[name];if(f)proto[name]=function(...a){count('gl:'+this.canvas.className);return f.apply(this,a)}}
  });
  const p=await context.newPage();p.setDefaultTimeout(120000);p.on('pageerror',e=>report.errors.push(e.message));
  const cdp=await context.newCDPSession(p);await cdp.send('Performance.enable');
  async function snapshot(name,start){
   await p.waitForTimeout(1000);
   const resources=await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.encodedBodySize,transfer:r.transferSize,ms:r.duration,type:r.initiatorType})));
   await p.evaluate(()=>{window.calls={};window.long=[]});
   await cdp.send('Profiler.enable');await cdp.send('Profiler.start');const a=await cdp.send('Performance.getMetrics');
   const frames=await p.evaluate(async()=>{const f=[],start=performance.now();let last=start;await new Promise(resolve=>{const tick=t=>{f.push(t-last);last=t;if(t-start>=5000)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});f.sort((a,b)=>a-b);return {count:f.length,p95:f[Math.floor(f.length*.95)],over50:f.filter(t=>t>50).length,calls:window.calls,long:window.long,nodes:document.querySelectorAll('*').length}});
   const b=await cdp.send('Performance.getMetrics'),{profile}=await cdp.send('Profiler.stop'),cpu={};
   for(const k of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize']){const get=x=>x.metrics.find(m=>m.name===k)?.value||0;cpu[k]=k==='JSHeapUsedSize'?get(b):get(b)-get(a)}
   const top=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,20).map(n=>({fn:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,hits:n.hitCount}));
   const r={name,readyMs:start,resources,resourceBodyBytes:resources.reduce((s,r)=>s+r.bytes,0),resourceTransferBytes:resources.reduce((s,r)=>s+r.transfer,0),...frames,cpu,top};report.samples.push(r);
   await p.screenshot({path:out+'/'+name+'.png'});await fs.writeFile(out+'/'+name+'.cpuprofile',JSON.stringify(profile));
   await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({name,readyMs:start,resourceBodyBytes:r.resourceBodyBytes,resourceTransferBytes:r.resourceTransferBytes,cpu,calls:frames.calls,p95:frames.p95,top:top.slice(0,5)}));
  }
  const start=Date.now();await p.goto(origin);await p.locator(authenticated?'.lounge-home':'.lounge-login').waitFor();await p.locator('.screen-loader').waitFor({state:'detached'});await snapshot(authenticated?'home':'login',Date.now()-start);
  if(authenticated){
   let t=Date.now();await p.locator('[data-nav="cards"]').click();await p.locator('.card-hub-tile').first().click();await p.locator('.lounge-cards').waitFor();await snapshot('cards',Date.now()-t);
   t=Date.now();await p.locator('[data-nav="single"]').click();await p.locator('.single-page').waitFor();await snapshot('single',Date.now()-t);
   t=Date.now();await p.locator('.single-battle').click();await p.locator('.game').waitFor();await p.locator('.hand-study .study-action').click();await p.locator('.hand-study').waitFor({state:'detached'});await p.locator('.duel-loader').waitFor({state:'detached'});await p.waitForTimeout(2500);await snapshot('duel',Date.now()-t);
   await p.locator('#giveupBtn').click();await p.locator('.modal .btn-danger').click();await p.locator('.finale-home').click();await p.locator('.single-page').waitFor();
  }
  assert.deepEqual(report.errors,[]);await context.close();
 }
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
