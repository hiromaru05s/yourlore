import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const root=path.resolve(process.env.LORE_TEST_DIST||'client/dist'),out=process.env.LORE_TEST_OUT||'/tmp/lore-first-boot';
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
 const etag='\"'+createHash('sha256').update(bytes).digest('hex')+'\"';res.setHeader('ETag',etag);
 if(req.headers['if-none-match']===etag){res.statusCode=304;res.end();return;}
 if(/\.(html|js|css|svg|json)$/.test(file))res.setHeader('Content-Encoding','gzip');res.end(bytes);
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={base,baseline,api:'fixture; real static assets',conditions:{bandwidthMbps:10,latencyMs:40,cpu:2,serviceWorkers:process.env.LORE_TEST_SW||'block'},cases:[]};
try {for(const width of (process.env.LORE_TEST_WIDTHS||'1280,390').split(',').map(Number)){
 for(const signedIn of [true,false]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,serviceWorkers:process.env.LORE_TEST_SW==='allow'?'allow':'block'}),page=await context.newPage(),errors=[],http=[];
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)http.push([r.url(),r.status()]);});
 await apiFixture(page,r=>{const n=new URL(r.url).pathname;
 if(n==='/api/auth/me')return {user:signedIn?{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:47,losses:19}:null};
 if(n==='/api/rewards/tutorial')return {offered:true,keys:[],credits:100};
 if(n==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
 if(n==='/api/gifts')return {gifts:[],unread:0};
 return {ok:true,country:'JP',entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};});
 await page.addInitScript(()=>{
  localStorage.setItem('lore_lang','ja');performance.setResourceTimingBufferSize(20000);window.__phases=[];let phase='';new MutationObserver(()=>{const next=[...document.querySelectorAll('.loading-phase')].map(e=>e.textContent).join(' | ');if(next!==phase){phase=next;window.__phases.push({at:performance.now(),phase:next})}}).observe(document,{childList:true,subtree:true,characterData:true});
 });
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:10*1024*1024/8,uploadThroughput:1024*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:2});
 for(const temperature of ['cold','warm']){
 const at=Date.now();await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector(signedIn?'.lounge-home-main':'.auth-card');await page.waitForSelector('.screen-loader',{state:'detached'});await page.waitForSelector('#startup',{state:'detached'});
 const readyMs=Date.now()-at;
 const stats=await page.evaluate(()=>({resources:performance.getEntriesByType('resource').map(r=>({url:r.name,start:r.startTime,end:r.responseEnd,bytes:r.encodedBodySize,transfer:r.transferSize,type:r.initiatorType})),phases:window.__phases}));
 const imageTransfers=stats.resources.filter(r=>r.transfer>0&&/\.(png|webp)(?:$|\?)/.test(r.url));
 if(!baseline){
  assert(!imageTransfers.some(r=>/stage-v1\/sigil.png|duel-ink-v1\/disc.png/.test(r.url)),'HOME must not fetch obsolete mode artwork');
  const critical=imageTransfers.filter(r=>r.url.includes('/assets/startup-'));
  assert.equal(new Set(critical.map(r=>r.url)).size,critical.length,'Each startup image transfers at most once');
  if(temperature==='warm')assert.equal(critical.length,0,'Reopening must reuse immutable startup images');
  if(signedIn)for(const [id,mode] of [['bot','single'],['online','normal'],['rankedMode','ranked']]){
   await page.locator('#'+id).click();await page.waitForSelector(`#ranked[data-mode=${mode}][data-ready=true]`);
  }
 }
 await page.screenshot({path:`${out}/${signedIn?'home':'login'}-${width}-${temperature}.png`});
 const transferredBytes=stats.resources.reduce((s,r)=>s+r.transfer,0);
 report.cases.push({width,signedIn,temperature,readyMs,transferredBytes,stats,errors:[...errors],http:[...http]});await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);console.log(JSON.stringify({width,signedIn,temperature,readyMs,transferredBytes}));
 }
 await context.close();
 }
 }}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
