import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const root=path.resolve('client/dist'),out=process.env.LORE_TEST_OUT||'/tmp/lore-startup-overlap';await fs.mkdir(out,{recursive:true});
const entry=(await fs.readFile(root+'/index.html','utf8')).match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];assert(entry);
const events=[],now=()=>Math.round(performance.now()),pause=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname;
 try{
  if(name.startsWith('/api/')){
   let body={ok:true,offered:true,entries:[],rows:[],gifts:[],unread:0,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
   if(name==='/api/rank/me')body={rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
   if(name==='/api/auth/me'){events.push({event:'auth-start',at:now()});await pause(500);body={user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE'}};events.push({event:'auth-end',at:now()});}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return;
  }
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));if(!file.startsWith(root+'/'))throw Error('path');
  const body=await fs.readFile(file);
  if(name!==entry&&/\/main-[^/]+\.js$/.test(name)){events.push({event:'main-start',at:now()});await pause(2000);events.push({event:'main-end',at:now()});}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(5490,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10)));
 await p.goto('http://127.0.0.1:5490',{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main',{timeout:60000});await p.waitForSelector('.screen-loader',{state:'detached',timeout:60000});
 const time=event=>events.find(e=>e.event===event)?.at;
 assert.equal(events.filter(e=>e.event==='auth-start').length,1,'Boot reuses the prefetched session');
 assert(time('auth-start')<time('main-end'));assert(time('auth-end')<time('main-end'),'Auth completes while application code is still downloading');assert.deepEqual(errors,[]);
 const resources=await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));assert(!resources.some(url=>/\/admin-[^/]+\.js/.test(url)),'Normal startup excludes admin module');
 await p.screenshot({path:out+'/home.png'});await fs.writeFile(out+'/report.json',JSON.stringify({origin:'http://127.0.0.1:5490',root,api:'fixture',art:'built production assets',controlledDelayMs:{auth:500,main:2000},events,errors},null,2));console.log('PASS auth overlaps module download, one session request, admin chunk excluded, current HOME renders');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
