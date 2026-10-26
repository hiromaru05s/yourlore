/** Fresh anonymous browser; only public GET endpoints and normal page loading. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'https://yourlore.xyz',out=process.env.LORE_TEST_OUT||'/tmp/lore-release-readonly';await fs.mkdir(out,{recursive:true});
assert(['https://yourlore.xyz','https://test.yourlore.xyz'].includes(origin));
const browser=await chromium.launch({channel:'chrome',headless:true}),report={origin,at:new Date().toISOString(),authentication:'anonymous fresh browser',samples:[],boundaries:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===origin)failed.push({url:r.url(),status:r.status()})});
 await p.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);window.__longTasks=[];new PerformanceObserver(l=>window.__longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'})});
 for(const cache of ['cold','warm']){
  const start=Date.now();await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-login',{timeout:60000});await p.waitForSelector('.screen-loader',{state:'detached',timeout:60000});
  const data=await p.evaluate(()=>({requests:performance.getEntriesByType('resource').length,bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0),scripts:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')&&/\.js$/.test(r.name)).map(r=>r.name),tbt:window.__longTasks.reduce((n,ms)=>n+Math.max(0,ms-50),0),broken:[...document.images].filter(i=>i.getClientRects().length&&i.loading!=='lazy'&&(!i.complete||!i.naturalWidth)).map(i=>i.src)}));
  assert.deepEqual(data.broken,[]);report.samples.push({cache,readyMs:Date.now()-start,...data});
 }
 for(const [path,status] of [['/api/auth/me',200],['/api/collection',401],['/api/social/profile',401],['/ws/queue',401]]){
  const r=await context.request.get(origin+path);assert.equal(r.status(),status,path);if(path==='/api/auth/me')assert.equal((await r.json()).user,null);report.boundaries.push({path,status:r.status()});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await p.screenshot({path:out+'/login.png'});report.errors=errors;report.failed=failed;console.log(JSON.stringify({origin,samples:report.samples.map(({cache,readyMs,requests,bytes,tbt})=>({cache,readyMs,requests,bytes,tbt})),boundaries:report.boundaries}));
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
