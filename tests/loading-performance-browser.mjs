import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-10-14-loading';await fs.mkdir(out,{recursive:true});
const roots=[process.env.LORE_BASELINE_DIST||'/tmp/lore-performance-20261014-baseline/dist',process.env.LORE_CURRENT_DIST||'/tmp/lore-performance-20261014-after/dist'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.json':'application/json'};
const servers=[];
for(const root of roots){
 const cache=new Map();const server=createServer(async(req,res)=>{try{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));
  if(!file.startsWith(root+'/'))throw Error('path');
  let body=cache.get(file);if(!body){const raw=await fs.readFile(file).catch(()=>fs.readFile(path.resolve('client/public','.'+decodeURIComponent(name))));body=/\.(html|js|css|svg)$/.test(file)?gzipSync(raw):raw;cache.set(file,body);}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  // Match the deployed cache policy; fixed art/models must revalidate.
  res.setHeader('Cache-Control',name.startsWith('/assets/')?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate');
  if(/\.(html|js|css|svg)$/.test(file))res.setHeader('Content-Encoding','gzip');res.end(body);
 }catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));servers.push(server);
}
const browser=await chromium.launch({channel:'chrome',headless:true}),samples=[];
try {
 for(const width of (process.env.LORE_TEST_WIDTH?[Number(process.env.LORE_TEST_WIDTH)]:[1280,390]))for(const version of (process.env.LORE_TEST_VERSION?[Number(process.env.LORE_TEST_VERSION)]:[0,1])){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1}),page=await context.newPage(),errors=[],failed=[];page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
  await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'perf',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:0,losses:0}}:p==='/api/rewards/tutorial'?{offered:true,keys:[],credits:100}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:{ok:true,friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[]};});
  await page.addInitScript(()=>{performance.setResourceTimingBufferSize(20000);window.longTasks=[];new PerformanceObserver(l=>window.longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'});});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:10*1024*1024/8,uploadThroughput:1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:2});
  const base='http://127.0.0.1:'+servers[version].address().port;
  const boot=Date.now();await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home-main');await page.waitForSelector('.screen-loader',{state:'detached'});const homeMs=Date.now()-boot;
  await page.screenshot({path:`${out}/${version?'after':'before'}-home-${width}.png`});
  // Same time choosing a mode/deck in both versions; automatic preload runs here.
  await page.waitForTimeout(12000);
  const warm=await page.evaluate(()=>({models:performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/')).map(r=>({url:r.name,bytes:r.encodedBodySize})),heap:performance.memory?.usedJSHeapSize}));
  await page.locator('#bot').click();await page.locator('#ranked').click();
  const start=Date.now(),startPerf=await page.evaluate(()=>performance.now());await page.locator('#diffStart').click();
  await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached'});const boardMs=Date.now()-start;
  await page.waitForTimeout(12000);
  await page.screenshot({path:`${out}/${version?'after':'before'}-game-${width}.png`});
  const metrics=await page.evaluate(start=>{const resources=performance.getEntriesByType('resource').filter(r=>r.startTime>=start);return {requests:resources.length,bytes:resources.reduce((sum,r)=>sum+r.encodedBodySize,0),largest:resources.slice().sort((a,b)=>b.encodedBodySize-a.encodedBodySize).slice(0,12).map(r=>({url:r.name,bytes:r.encodedBodySize})),modelRequests:resources.filter(r=>r.name.includes('/models/')).map(r=>r.name),longTasks:window.longTasks.filter(t=>t.start>=start),scene:document.querySelector('[data-scene-ready]')?.dataset.sceneReady,hand:document.querySelectorAll('#hand .card').length,heap:performance.memory?.usedJSHeapSize};},startPerf);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.equal(metrics.scene,'true');assert(metrics.hand>0);
  const modelDuplicates=await page.evaluate(()=>{const urls=performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/')).map(r=>r.name);return urls.filter((url,i)=>urls.indexOf(url)!==i);});
  if(version===1)assert.deepEqual(modelDuplicates,[],'preload and actual duel must share each model transfer');
  const sample={modelDuplicates,version:version?'after':'before',width,homeMs,boardMs,warm,...metrics,errors,failed};samples.push(sample);await fs.writeFile(out+'/loading-comparison.json',JSON.stringify({conditions:{bandwidthMbps:10,latencyMs:40,cpu:2,menuDwellMs:12000,api:'fixture',cache:'fresh browser context; immutable JS, revalidated art'},samples},null,2));
  console.log(JSON.stringify({version:sample.version,width,homeMs,boardMs,entryRequests:metrics.requests,entryBytes:metrics.bytes,modelRequests:metrics.modelRequests.length,warmModels:warm.models.length}));await context.close();
 }
} finally {await browser.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
