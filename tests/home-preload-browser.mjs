import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'docs/performance/2026-10-15-home';await fs.mkdir(out,{recursive:true});
const root=path.resolve(process.env.LORE_TEST_DIST||'client/dist'),requests=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const imagePath=p=>/^\/(art|ui|frames|cosmetics)\//.test(p);
const server=createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname;requests.push({url:req.url,at:Date.now(),preload:!!req.headers['x-lore-asset-preload']});
 const file=path.join(root,name==='/'?'index.html':name),raw=await fs.readFile(file).catch(()=>fs.readFile(path.join(process.cwd(),'client/public',name)));
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control',name.startsWith('/assets/')?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate');
 if(/\.(html|js|css|svg|json)$/.test(file)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(raw));}else res.end(raw);
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={base,api:'fixture; public static resources real',cases:[]};
const widths=(process.env.LORE_TEST_WIDTHS||'1280,390').split(',').map(Number);
let monitor;
try{for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});const p=await context.newPage();p.setDefaultTimeout(180000);
 const transfers=[],network=new Map();
 const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');
 cdp.on('Network.requestWillBeSent',e=>network.set(e.requestId,{url:e.request.url,at:e.wallTime*1000,preload:Object.keys(e.request.headers).some(k=>k.toLowerCase()==='x-lore-asset-preload')}));
 cdp.on('Network.requestServedFromCache',e=>{const r=network.get(e.requestId);if(r)r.cached=true;});
 cdp.on('Network.responseReceived',e=>{const r=network.get(e.requestId);if(r)r.cached||=e.response.fromDiskCache||e.response.fromServiceWorker||e.response.fromPrefetchCache;});
 cdp.on('Network.loadingFinished',e=>{const r=network.get(e.requestId);if(r&&!r.cached&&e.encodedDataLength>0&&imagePath(new URL(r.url).pathname))transfers.push({...r,bytes:e.encodedDataLength});});
 const errors=[],httpErrors=[],networkImages=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});if(imagePath(new URL(r.url()).pathname)&&!r.fromServiceWorker())networkImages.push({url:r.url(),at:Date.now()});});
 await apiFixture(p,r=>{const u=new URL(r.url),name=u.pathname;
  if(name==='/api/auth/me')return {user:{id:'home-cache-qa',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:47,losses:19}};
  if(name==='/api/rewards/tutorial')return {offered:true,keys:[],credits:100};
  if(name==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',rank:123,wins:0,losses:0}};
  if(name.startsWith('/api/social/profile'))return {profile:{id:'home-cache-qa',self:true,display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:47,losses:19,sleeves:['default'],furnitures:[],badges:[],recent:[],h2h:[],stats_public:true}};
  return {ok:true,country:'JP',season:'2026-10',entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};
 });
 await p.addInitScript(()=>{window.__styleReads=0;const nativeStyle=window.getComputedStyle;window.getComputedStyle=(...args)=>{window.__styleReads++;return nativeStyle(...args);};performance.setResourceTimingBufferSize(20000);window.__longTasks=[];new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'});});
 const started=Date.now();await p.goto(base,{waitUntil:'domcontentloaded'});
 monitor=setInterval(async()=>{try{const state=await p.evaluate(()=>({loader:document.querySelector('.screen-loader')?.textContent,retry:document.querySelector('.asset-retry')?.textContent,cache:document.documentElement.dataset.menuCache}));console.log('progress',width,JSON.stringify(state));await fs.writeFile(out+'/monitor.json',JSON.stringify({width,state,errors,httpErrors},null,2));}catch{}},15000);
 await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached',timeout:600000});
 const homeMs=Date.now()-started;await p.evaluate(()=>window.__homeCanvas=document.querySelector('.home-spirit-host canvas'));await p.screenshot({path:`${out}/home-${width}.png`});
 const actions=[],afterHome=Date.now();
 async function action(name,run,ready){const reads=await p.evaluate(()=>window.__styleReads);const start=Date.now(),count=networkImages.length;await run();if(ready)await ready();await p.waitForSelector('.screen-loader',{state:'detached'});await p.waitForFunction(()=>![...document.querySelectorAll('#app img')].some(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&(!i.complete||i.naturalWidth===0)));const data={name,ms:Date.now()-start,styleReads:await p.evaluate(reads=>window.__styleReads-reads,reads),imageNetworkResponses:networkImages.slice(count)};actions.push(data);console.log('action',width,name,data.ms,data.imageNetworkResponses.length);}
 await action('bot opponents',async()=>{await p.locator('#bot').click();await p.locator('#ranked').click();},()=>p.waitForFunction(()=>[...document.querySelectorAll('.diff-card img')].every(i=>i.complete&&i.naturalWidth>0)));await p.locator('#diffCancel').click();
 await action('cards',()=>p.locator('[data-nav=cards]').click(),()=>p.waitForSelector('#grid:not([aria-busy]) .card'));
 await action('cards page 2',()=>p.locator('#nextPage').click(),()=>p.waitForSelector('#grid:not([aria-busy]) .card'));
 await p.screenshot({path:`${out}/cards-${width}.png`});
 await action('card zoom',()=>p.locator('#grid .card').first().click(),()=>p.waitForFunction(()=>document.querySelector('.zoom-overlay img')?.complete));await p.locator('.inspect-close').click();
 await action('deck',()=>p.locator('[data-nav=deck]').click(),()=>p.waitForSelector('.deck-screen'));
 await action('shop',()=>p.locator('[data-nav=shop]').click(),()=>p.waitForSelector('.gacha-page'));
 await action('shop astral',()=>p.locator('.gacha-editions [data-edition=astral]').click());
 await action('shop crimson',()=>p.locator('.gacha-editions [data-edition=crimson]').click());
 await action('sleeves',()=>p.locator('[data-category=sleeve]').click());
 await action('furniture',()=>p.locator('[data-category=furniture]').click(),()=>p.waitForFunction(()=>document.querySelectorAll('.shop-furniture-preview img').length>0&&!document.querySelector('.shop-furniture-loading')));
 await p.screenshot({path:`${out}/shop-${width}.png`});
 await action('ranking',()=>p.locator('[data-nav=leaderboard]').click(),()=>p.waitForSelector('.lb-empty'));
 await action('friends',()=>p.locator('[data-nav=friends]').click());
 await action('profile',()=>p.locator('[data-profile]').click(),()=>p.waitForSelector('.pf-ava'));
 await action('guide',()=>p.locator('[data-nav=tutorial]').click());
 await action('home return',()=>p.locator('[data-nav=home]').click());
 const state=await p.evaluate(()=>({sameHomeCanvas:window.__homeCanvas===document.querySelector('.home-spirit-host canvas'),cache:document.documentElement.dataset.menuCache,worker:!!navigator.serviceWorker?.controller,heap:performance.memory?.usedJSHeapSize,errors:[...document.querySelectorAll('img')].filter(i=>i.getClientRects().length&&(!i.complete||!i.naturalWidth)).map(i=>i.src)}));
 const lateImages=networkImages.filter(r=>r.at>afterHome);const wireImageTransfers=transfers.filter(r=>r.at>afterHome);const serverImageTransfers=requests.filter(r=>r.at>afterHome&&imagePath(new URL(r.url,'http://localhost').pathname));report.cases.push({width,homeMs,actions,lateImages,serverImageTransfers,wireImageTransfers,state,errors,httpErrors});
 await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);assert.deepEqual(state.errors,[]);
 if(process.env.LORE_EXPECT_CACHE!=='0'){assert.equal(state.sameHomeCanvas,true,'Returning HOME must reuse its GPU scene');assert.equal(state.cache,'ready');assert.deepEqual(wireImageTransfers,[],'Browser network trace must show no image bytes after admission');if(!process.env.LORE_TEST_ORIGIN)assert.deepEqual(serverImageTransfers,[],'Menu navigation must use the prepared artwork without network image transfers');}
 if(process.env.LORE_EXPECT_CACHE!=='0'){
  const at=Date.now();await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached',timeout:600000});
  report.cases.at(-1).warmReload={ms:Date.now()-at,preloadTransfers:[...network.values()].filter(r=>r.at>=at&&r.preload).length};
  assert.equal(report.cases.at(-1).warmReload.preloadTransfers,0,'A warm start reuses original artwork across page reloads');
 }
 clearInterval(monitor);await context.close();
 }}finally{clearInterval(monitor);await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/last-state.png'}).catch(()=>{});await browser.close();await new Promise(r=>server.close(r));}
