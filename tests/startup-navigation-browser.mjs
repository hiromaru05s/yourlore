import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const root=path.resolve(process.env.LORE_TEST_DIST||'client/dist'),out=process.env.LORE_TEST_OUT||'/tmp/lore-startup-after';
const baseline=process.env.LORE_BASELINE==='1';
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const cache=new Map();
const server=createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+'/'))throw Error('path');
 let bytes=cache.get(file);if(!bytes){const raw=await fs.readFile(file);bytes=/\.(html|js|css|svg|json)$/.test(file)?gzipSync(raw):raw;cache.set(file,bytes);}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control',name.startsWith('/assets/')?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate');
 if(/\.(html|js|css|svg|json)$/.test(file))res.setHeader('Content-Encoding','gzip');res.end(bytes);
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={base,baseline,api:'fixture; real static assets',conditions:{bandwidthMbps:10,latencyMs:40,cpu:2,serviceWorkers:process.env.LORE_TEST_SW||'block'},cases:[]};
try {for(const width of (process.env.LORE_TEST_WIDTHS||'1280,390').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,serviceWorkers:process.env.LORE_TEST_SW==='allow'?'allow':'block'}),page=await context.newPage(),errors=[],http=[];
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)http.push([r.url(),r.status()]);});
 await apiFixture(page,r=>{const n=new URL(r.url).pathname;
 if(n==='/api/auth/me')return {user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:47,losses:19}};
 if(n==='/api/rewards/tutorial')return {offered:true,keys:[],credits:100};
 if(n==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
 if(n==='/api/gifts')return {gifts:[],unread:0};
 return {ok:true,country:'JP',entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};});
 await page.addInitScript(()=>{
  localStorage.setItem('lore_lang','ja');performance.setResourceTimingBufferSize(20000);window.__covers=0;window.__inkContexts=0;window.__longTasks=[];
  new PerformanceObserver(l=>window.__longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'});
  new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof Element&&n.matches('.screen-loader'))window.__covers++;}).observe(document,{childList:true,subtree:true});
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&this.classList.contains('home-duel-ink'))window.__inkContexts++;return get.call(this,type,...args);};
 });
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:10*1024*1024/8,uploadThroughput:1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:2});
 const at=Date.now();await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lounge-home-main');await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForSelector('#startup',{state:'detached'});
 const homeMs=Date.now()-at;await page.screenshot({path:`${out}/home-${width}.png`});
 const modes=[];
 for(const [id,mode] of [['bot','single'],['online','normal'],['rankedMode','ranked'],['bot','single'],['rankedMode','ranked']]){
  const start=Date.now();await page.locator('#'+id).click();await page.waitForSelector(`#ranked[data-mode=${mode}][data-ready=true]`);modes.push({mode,ms:Date.now()-start});
 }
 const contexts=await page.evaluate(()=>window.__inkContexts);if(!baseline)assert.equal(contexts,1,'Mode switches must reuse the GPU context');
 await page.locator('#ranked').hover();await page.waitForFunction(()=>document.querySelector('#ranked')?.dataset.phase==='flowing');
 await page.screenshot({path:`${out}/flow-${width}.png`});await page.mouse.move(0,0);
 await page.evaluate(()=>window.__covers=0);
 const routes=[];
 for(const key of ['cards','deck','home','cards','deck']){
  const start=Date.now();await page.locator(`[data-nav=${key}]`).click();await page.waitForSelector(`[data-nav=${key}][aria-current=page]`);
  const interactiveMs=Date.now()-start,inert=await page.locator('#app').evaluate(e=>e.inert);
  if(!baseline)assert.equal(inert,false,'Navigation must remain usable during image loading');
  await page.waitForSelector('.screen-loader,.asset-tray',{state:'detached'});
  if(key==='cards')await page.waitForSelector('#grid>.card');
  await page.waitForFunction(()=>[...document.querySelectorAll('#app .card-art-img')].every(img=>{
   const r=img.getBoundingClientRect();let top=0,left=0,right=innerWidth,bottom=innerHeight;
   for(let p=img.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right);}if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}
   return !r.width||!r.height||r.bottom<=top||r.top>=bottom||r.right<=left||r.left>=right||img.complete&&img.naturalWidth>0;
  }));
  routes.push({key,interactiveMs,readyMs:Date.now()-start,inert});
  if(routes.length<3)await page.screenshot({path:`${out}/${key}-${width}.png`});
 }
 if(!baseline){
  const deckRequests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
  assert(!deckRequests.some(u=>u.includes('/art/deck-masters-v1/')),'Deck must use bounded display assets');
  assert(!deckRequests.some(u=>/modular\/(cost|attack|health)\.png/.test(u)),'Deck must not do client-side PNG matting');
  await page.locator('[data-nav=home]').click();await page.waitForSelector('#ranked[data-ready=true]');
  const retained=await page.evaluate(async()=>{const canvas=document.querySelector('.home-duel-ink');for(let i=0;i<30;i++)document.querySelector(['#bot','#online','#rankedMode'][i%3]).click();await new Promise(r=>setTimeout(r,100));return canvas===document.querySelector('.home-duel-ink');});
  assert(retained);await page.waitForSelector('#ranked[data-mode=ranked][data-ready=true]');
 }
 const covers=await page.evaluate(()=>window.__covers);if(!baseline)assert.equal(covers,0,'Page navigation must not mount full screen loaders');
 const stats=await page.evaluate(()=>({requests:performance.getEntriesByType('resource').length,bytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.encodedBodySize,0),longTasks:window.__longTasks}));
 report.cases.push({width,homeMs,modes,contexts,covers,routes,stats,errors,http});await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);console.log(JSON.stringify({width,homeMs,modes,contexts,covers,routes}));await context.close();
 }}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
