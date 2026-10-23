import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-gacha-benchmark',ref=process.env.LORE_BASE_REF||'4eb5ac61';
await fs.mkdir(out,{recursive:true});
const results=[];
for(const version of ['before','after']){
 const dir=out+'/'+version;await fs.mkdir(dir,{recursive:true});
 await build({stdin:{contents:"import {openGachaCinematic} from './client/src/ui/gachaCinematic';window.openGacha=()=>openGachaCinematic({count:1,edition:'ivory',rewards:[{id:'STARTER_CHEST',owned:1,refund:0}],onClose:()=>{}});",resolveDir:process.cwd()},bundle:true,format:'esm',target:'es2022',outfile:dir+'/bench.js',plugins:[{name:'snapshot',setup(b){b.onLoad({filter:/client\/src\/.*\.ts$/},async args=>{const path=args.path.slice(process.cwd().length+1);let text=version==='before'?execFileSync('git',['show',ref+':'+path],{encoding:'utf8',maxBuffer:20e6}):await fs.readFile(args.path,'utf8');text=text.replace(/new URL\('\.\/assets\/([^']+)',import.meta.url\)\.href/g,(_,f)=>JSON.stringify(origin+'/src/ui/gachaAzure/assets/'+f));return {contents:text,loader:'ts'};});}}]});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.route('**/__gacha-bench/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').pop();if(name==='index.html')return route.fulfill({contentType:'text/html',body:'<html><head><link rel="stylesheet" href="bench.css"></head><body><script type="module" src="bench.js"></script></body></html>'});await route.fulfill({path:dir+'/'+name});});
 await page.goto(origin+'/__gacha-bench/index.html');await page.waitForFunction(()=>window.openGacha);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1250000,uploadThroughput:1250000});
 await page.evaluate(()=>{window.started=performance.now();window.stop=window.openGacha();});await page.waitForSelector('.gacha-cinematic[data-phase="animation"]',{timeout:90000});
 const ms=await page.evaluate(()=>performance.now()-window.started);const assets=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/gachaAzure\/assets|reading-board|cosmetics|frames/.test(e.name)).map(e=>({url:e.name,bytes:e.encodedBodySize,duration:e.duration})));
 results.push({version,ms,assetBytes:assets.reduce((n,e)=>n+e.bytes,0),assets});await page.screenshot({path:dir+'/ready.png'});await page.evaluate(()=>window.stop());
 }finally{await browser.close();}
}
await fs.writeFile(out+'/report.json',JSON.stringify({network:{latencyMs:80,downloadMbps:10},ref,results,boundary:'Same local assets and browser; fresh context, cold cinematic only, no speculative prewarm. API excluded.'},null,2));console.log(JSON.stringify(results.map(({version,ms,assetBytes})=>({version,ms,assetBytes}))));
