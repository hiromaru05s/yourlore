import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const out='docs/performance/2026-09-30';await fs.mkdir(out,{recursive:true});
const roots=[process.env.LORE_BASELINE_DIST||'/tmp/lore-menu-player-ui-staging/client/dist',path.resolve('client/dist')];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.json':'application/json'};
const servers=await Promise.all(roots.map(async(root,i)=>{const cache=new Map();const s=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+'/'))throw Error('path');let body=cache.get(file);if(!body){const raw=await fs.readFile(file);body=/\.(html|js|css|svg)$/.test(file)?gzipSync(raw):raw;cache.set(file,body);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','public,max-age=3600');if(/\.(html|js|css|svg)$/.test(file))res.setHeader('Content-Encoding','gzip');res.end(body);}catch{res.statusCode=404;res.end();}});await new Promise(r=>s.listen(5313+i,'127.0.0.1',r));return s;}));
const b=await chromium.launch({channel:'chrome',headless:true});const samples=[];
try{
 for(let trial=1;trial<=2;trial++)for(let version=0;version<2;version++){
  const context=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await apiFixture(p,r=>{const url=new URL(r.url).pathname;return url==='/api/auth/me'?{user:{id:'perf',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:0,losses:0}}:url==='/api/geo'?{country:'JP'}:url==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:{ok:true,friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[]}});
  await p.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);window.longTasks=[];new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'});});
  const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:10*1024*1024/8,uploadThroughput:1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
  const start=Date.now();await p.goto('http://127.0.0.1:'+(5313+version),{waitUntil:'domcontentloaded',timeout:180000});await p.waitForSelector('.lounge-home',{timeout:180000});await p.waitForSelector('.screen-loader',{state:'detached',timeout:180000});
  const duration=Date.now()-start;
  const data=await p.evaluate(()=>{const r=performance.getEntriesByType('resource');return{requests:r.length,imageRequests:r.filter(x=>/\.(png|webp|svg)(\?|$)/.test(x.name)).length,bodyBytes:r.reduce((s,x)=>s+x.encodedBodySize,0),transferBytes:r.reduce((s,x)=>s+x.transferSize,0),gameChunkAtHome:r.some(x=>/\/game-[^/]+\.js/.test(x.name)),longTasks:longTasks,tbt:longTasks.reduce((s,d)=>s+Math.max(0,d-50),0),paints:performance.getEntriesByType('paint').map(x=>({name:x.name,time:x.startTime})),assets:r.map(x=>({url:x.name,bytes:x.encodedBodySize}))}});
  const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(x=>['TaskDuration','ScriptDuration','JSHeapUsedSize','LayoutCount','RecalcStyleCount'].includes(x.name)).map(x=>[x.name,x.value]));
  await p.screenshot({path:`${out}/startup-${version?'after':'before'}-${trial}.png`});assert.deepEqual(errors,[]);samples.push({version:version?'after':'before',trial,ms:duration,...data,metrics,errors});console.log(JSON.stringify({version,trial,ms:duration,requests:data.requests,bytes:data.bodyBytes,tbt:data.tbt,gameChunkAtHome:data.gameChunkAtHome}));await context.close();
 }
 await fs.writeFile(out+'/startup-comparison.json',JSON.stringify({conditions:{viewport:'390x844',dpr:2,bandwidthMbps:10,latencyMs:40,cpuSlowdown:4,cache:'fresh context each trial',encoding:'gzip JS/CSS/HTML; original images',api:'fixture',entrance:'normal complete animation included'},samples},null,2));
}finally{await b.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
