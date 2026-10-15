import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const oldRoot=process.env.LORE_BASELINE_DIST||'/tmp/lore-perf2-before/dist',newRoot=path.resolve('client/dist'),out=process.env.LORE_TEST_OUT||'/tmp/lore-perf2-upgrade';await fs.mkdir(out,{recursive:true});let root=oldRoot;const requests=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'/index.html':url.pathname;requests.push({url:req.url,preload:!!req.headers['x-lore-asset-preload'],phase:root===oldRoot?'old':'new'});const bytes=await fs.readFile(path.join(root,name)).catch(()=>fs.readFile(path.join(oldRoot,name)));res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');res.setHeader('Cache-Control',name.startsWith('/assets/')||name.startsWith('/fonts/web/files/')?'public,max-age=31536000,immutable':'no-cache');if(/\.(js|css|html|json|svg)$/.test(name)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(bytes));}else res.end(bytes);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),errors=[];
async function page(){const p=await context.newPage();p.setDefaultTimeout(180000);p.on('pageerror',e=>errors.push(e.message));await apiFixture(p,r=>{const n=new URL(r.url).pathname;if(n==='/api/auth/me')return {user:{id:'local-guest-user',display:'SEEKER',credits:0,wins:0,losses:0}};if(n==='/api/rewards/tutorial')return {offered:true,keys:[]};return {ok:true,country:'JP',entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[]};});return p;}
async function ready(p){await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached',timeout:600000});}
try{
 const old=await page();await ready(old);const oldController=await old.evaluate(()=>navigator.serviceWorker.controller.scriptURL);console.log('Old build ready');
 root=newRoot;const current=await page();await ready(current);const controller=await current.evaluate(()=>navigator.serviceWorker.controller.scriptURL);assert(controller.endsWith('?v=3'));console.log('New build ready, controller upgraded');
 // An older live tab keeps its own binding even after the new worker claims it.
 await old.locator('[data-nav=cards]').click();await old.waitForSelector('#grid:not([aria-busy]) .card');assert.equal(await old.locator('#grid img').evaluateAll(nodes=>nodes.filter(n=>!n.complete||!n.naturalWidth).length),0);
 const cache=await current.evaluate(async()=>({art:(await(await caches.open('lore-menu-content-v1')).keys()).length,previews:(await(await caches.open('lore-furniture-previews-v1')).keys()).length}));assert(cache.previews>0);
 const count=requests.length;await current.reload({waitUntil:'domcontentloaded'});await current.waitForSelector('.screen-loader',{state:'detached',timeout:600000});await current.waitForSelector('.lounge-home-main');const repeat=requests.slice(count).filter(r=>r.preload);assert.deepEqual(repeat,[],'Restart after upgrade reuses all verified assets');assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({oldController,controller,cache,upgradeTransfers:requests.filter(r=>r.phase==='new'&&r.preload),repeat,errors},null,2));console.log('PASS: worker protocol upgrade, live old-build gallery, persisted catalog, warm reload without downloads');
}finally{await browser.close();await new Promise(r=>server.close(r));}
