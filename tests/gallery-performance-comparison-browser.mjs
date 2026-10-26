import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-gallery-comparison';await fs.mkdir(out,{recursive:true});
const reference='b5295ad0',names=['assetHints','assetReadiness','cardView'];
const original=new Map(names.map(name=>['/client/src/ui/'+name+'.ts',execFileSync('git',['show',reference+':client/src/ui/'+name+'.ts'],{encoding:'utf8'})]));
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'before-gallery-admission',enforce:'pre',transform(code,id){for(const [suffix,source] of original)if(id.endsWith(suffix))return source;}}],server:{host:'127.0.0.1',port:5489,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),samples=[];
try{for(const [label,origin] of [['before','http://127.0.0.1:5489'],['after','http://127.0.0.1:5488']]){
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),p=await context.newPage(),errors=[],requests=new Map();p.setDefaultTimeout(180000);p.on('pageerror',e=>errors.push(e.message));
 await apiFixture(p,r=>new URL(r.url).pathname==='/api/auth/me'?{user:{id:'local-guest-user',display:'SEEKER',credits:100,avatar:'SEEKER_BLUE'}}:new URL(r.url).pathname==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:{ok:true,offered:true,entries:[],rows:[],gifts:[],unread:0,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]});
 await p.addInitScript(()=>localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10)));
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached'});
 const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:5*1024*1024/8,uploadThroughput:1024*1024/8});
 cdp.on('Network.requestWillBeSent',e=>{if(/\/art\/cards-(xs|sm)\//.test(e.request.url))requests.set(e.requestId,{url:e.request.url,bytes:0})});
 cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)r.bytes=e.encodedDataLength});
 const started=Date.now();await p.locator('[data-nav="cards"]').click();await p.waitForSelector('#grid .card');await p.waitForSelector('.screen-loader,.asset-tray',{state:'detached'});
 const readyMs=Date.now()-started;
 const state=await p.evaluate(()=>{const grid=document.querySelector('#grid'),bounds=grid.getBoundingClientRect(),cards=[...grid.querySelectorAll('.card')];const visible=cards.filter(c=>{const r=c.getBoundingClientRect();return r.top<Math.min(bounds.bottom,innerHeight)&&r.bottom>Math.max(0,bounds.top)});return{total:cards.length,lazy:grid.querySelectorAll('img[loading="lazy"]').length,visible:visible.length,broken:visible.filter(c=>{const i=c.querySelector('.card-art-img');return !i?.complete||!i.naturalWidth}).map(c=>c.dataset.cardId)}});
 assert.deepEqual(state.broken,[]);assert.deepEqual(errors,[]);
 samples.push({label,origin,readyMs,...state,cardRequests:requests.size,uniqueCardUrls:new Set([...requests.values()].map(r=>r.url)).size,cardTransferBytes:[...requests.values()].reduce((n,r)=>n+r.bytes,0)});console.log(JSON.stringify(samples.at(-1)));await context.close();
}
 assert.equal(samples[0].total,samples[1].total);assert.equal(samples[0].visible,samples[1].visible);assert(samples[1].cardRequests<samples[0].cardRequests/2);assert(samples[1].lazy>samples[1].total/2);
}finally{await fs.writeFile(out+'/report.json',JSON.stringify({reference,changedModules:names,conditions:{viewport:'1280x900',bandwidthMbps:5,latencyMs:40,cache:'fresh context per case; service workers blocked to measure direct HTTP',api:'fixture',code:'Same current worktree; only three gallery admission modules substituted for baseline',cpu:'unthrottled shared host'},samples},null,2));await browser.close();await server.close()}
