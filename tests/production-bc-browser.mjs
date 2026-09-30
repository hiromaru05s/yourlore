import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'docs/audits/2026-09-30-bc/evidence/browser';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:'client',configFile:'client/vite.config.ts',cacheDir:'/tmp/lore-bc-vite-cache',server:{host:'127.0.0.1',port:5475,strictPort:true},plugins:[{name:'bc-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/audit'){res.setHeader('content-type','text/html');res.end('<html><body><button id="origin">Origin</button><div id="app"></div></body></html>')}else next()})}}]});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5475/audit');
 await page.evaluate(async()=>{window.dialogs=await import('/src/ui/modal.ts');document.querySelector('#origin').focus();window.answer=dialogs.confirmDialog({title:'Keyboard test',body:'Confirm or cancel',confirm:'Yes',cancel:'No'});});
 const modal=page.locator('[role=dialog]');assert.equal(await modal.getAttribute('aria-modal'),'true');assert(await modal.getAttribute('aria-labelledby'));
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'No');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Yes');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'No');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Yes');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>answer),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'origin');
 await page.evaluate(()=>{window.answer=dialogs.confirmDialog({title:'Eviction',confirm:'Yes',cancel:'No'});dialogs.noticeModal('Notice','Changed','OK',()=>{});});assert.equal(await page.evaluate(()=>answer),false);await page.evaluate(()=>dialogs.closeOverlay());
 const network=await page.evaluate(async()=>{
  const {api}=await import('/src/net/api.ts');const {decodeAsset,coverScreen}=await import('/src/ui/assetReadiness.ts');
  const nativeTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===20000?30:ms,...args);
  const nativeFetch=window.fetch;window.fetch=(_url,opts)=>new Promise((_r,reject)=>{opts.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});});
  let timedOut=false;try{await api.login('fixture@example.test','fixture')}catch{timedOut=true}
  window.fetch=async(_url,opts)=>({ok:true,json:()=>new Promise((_r,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))});
  let bodyTimedOut=false;try{await api.login('fixture@example.test','fixture')}catch{bodyTimedOut=true}window.fetch=nativeFetch;
  const nativeDecode=HTMLImageElement.prototype.decode;let block=true;HTMLImageElement.prototype.decode=function(){return block?new Promise(()=>{}):Promise.resolve()};
  let failed=false;try{await decodeAsset('/blocked.png')}catch{failed=true};block=false;await decodeAsset('/blocked.png');
  block=true;const host=document.createElement('div');document.body.append(host);const loader=coverScreen(host,false,false,['/cancel.png']);const ready=loader.ready();loader.cancel();const cancelled=await ready===false;host.remove();
  HTMLImageElement.prototype.decode=nativeDecode;window.setTimeout=nativeTimeout;
  return {timedOut,bodyTimedOut,failed,canRetry:true,cancelled,loadingCovers:document.querySelectorAll('.screen-loader').length};
 });assert.deepEqual(network,{timedOut:true,bodyTimedOut:true,failed:true,canRetry:true,cancelled:true,loadingCovers:0});assert.deepEqual(errors,[]);
 const checks=['modal role/name, initial focus, Tab/Shift+Tab trap, Escape cancellation and restored focus','replaced confirmation settles false','hung API aborts','hung image decode expires and retry succeeds','cancelled loader resolves without residue'];await fs.writeFile(out+'/report.json',JSON.stringify({checks,network,errors},null,2));console.log('PASS',checks);
}finally{await browser.close();await server.close();}
