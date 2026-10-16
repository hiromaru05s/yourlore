import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {preview} from 'vite';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-menu-performance';await fs.mkdir(out,{recursive:true});
const server=process.env.LORE_TEST_ORIGIN?undefined:await preview({root:'client',configFile:'client/vite.config.ts',preview:{host:'127.0.0.1',port:5647,strictPort:true}});
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5647';
const browser=await chromium.launch({channel:'chrome',headless:true});const report={base,api:'fixture',cases:[]};
try{for(const width of (process.env.LORE_TEST_WIDTHS||'1280,700').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[],http=[];p.setDefaultTimeout(120000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)http.push([r.url(),r.status()]);});
 await apiFixture(p,r=>{const n=new URL(r.url).pathname;
 if(n==='/api/auth/me')return {user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE',wins:47,losses:19}};
 if(n==='/api/rewards/tutorial')return {offered:true,keys:[],credits:100};
 if(n==='/api/rank/me')return {rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}};
 if(n==='/api/gifts')return {gifts:[],unread:0};
 return {ok:true,country:'JP',entries:[],friends:[],incoming:[],outgoing:[],challenges:[],keys:[],rows:[],sleeves:['default'],furnitures:[]};});
 await p.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached'});
 const routes=[];
 for(const round of [1,2])for(const key of ['deck','cards','leaderboard','friends','shop','home']){
  const start=Date.now();await p.locator(`[data-nav="${key}"]`).click();await p.waitForSelector(`[data-nav="${key}"][aria-current="page"]`);await p.waitForSelector('.screen-loader,.asset-tray',{state:'detached'});
  await p.waitForTimeout(100);const broken=await p.evaluate(()=>[...document.images].filter(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&i.loading!=='lazy'&&(!i.complete||!i.naturalWidth)).map(i=>i.src));
  routes.push({round,key,ms:Date.now()-start,broken});assert.deepEqual(broken,[]);if(round===1)await p.screenshot({path:`${out}/${key}-${width}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);report.cases.push({width,routes,errors,http});console.log(JSON.stringify({width,routes}));await context.close();
}}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));}
