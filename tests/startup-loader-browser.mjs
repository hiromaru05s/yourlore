/** The first HTTP document must paint the approved loader without JS/CSS downloads. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-goblin-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-startup-loader';await fs.mkdir(out,{recursive:true});
const root=path.resolve('client/dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(name==='/api/auth/me'?{user:null}:{country:'JP'}));return;}const file=path.join(root,name==='/'?'index.html':name);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{
 for(const [width,height,language,js] of [[1280,720,'ja',true],[390,844,'ja',true],[320,568,'ko',true],[844,390,'en',true],[390,844,'ja',false]]){
  const context=await browser.newContext({viewport:{width,height},locale:'en-US',javaScriptEnabled:js,...(width===1280?{recordVideo:{dir:out+'/video',size:{width,height}}}:{})});
  const p=await context.newPage();
  if(js)await p.addInitScript(language=>localStorage.setItem('lore_lang',language),language);
  await p.route('**/*',route=>['script','stylesheet'].includes(route.request().resourceType())?route.abort():route.continue());
  await p.goto(base+'/',{waitUntil:'domcontentloaded'});
  await p.locator('#startup .loading-card--hero').waitFor({state:'visible'});
  const status=await p.locator('#startup-status').textContent();
  assert.equal(status,language==='ja'?'書庫を開いています':language==='ko'?'서고를 여는 중':'Opening the library');
  assert.equal(await p.locator('#app').textContent(),'');
  assert.equal(await p.locator('#startup .loading-card').count(),3);
  assert(await p.locator('#startup-reload').isVisible());
  const hero=await p.locator('.loading-card--hero').boundingBox();const bar=await p.locator('.loading-progress').boundingBox();
  assert(hero.width>90&&hero.height>100,'rendered card must have its inline styling');
  assert(bar.x>=0&&bar.x+bar.width<=width&&bar.y+bar.height<=height,'progress fits');
  const name=`${width}-${height}-${language}-${js?'blocked-modules':'no-js'}`;
  await p.screenshot({path:`${out}/${name}.png`});
  if(js){
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   assert(await p.locator('.loading-ritual').evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running')));
   if(width===1280){await p.waitForTimeout(11500);assert.equal(await p.locator('progress').evaluate(el=>el.value),0,'no fake timed progress');}
   await p.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await p.locator('.loading-ritual').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  }
  results.push({name,status,cards:3,externalJsCss:'blocked',passed:true});
  await context.close();
 }
 // Delay session lookup to exercise the actual boot-to-runtime animation handoff.
 const context=await browser.newContext({viewport:{width:1280,height:720},locale:'ja-JP'});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 let sessionRoute;await p.route('**/api/auth/me',route=>{sessionRoute=route;});
 await p.goto(base+'/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('#startup .loading-card--hero')?.getAnimations()[0]?.currentTime>1000);
 await p.evaluate(()=>{
   const old=document.querySelector('#startup');
   window.bootClock=old.querySelector('.loading-card--hero').getAnimations()[0].startTime;
   new MutationObserver((_,observer)=>{
     if(old.isConnected)return;
     const next=document.querySelector('.screen-loader .loading-card--hero');
     window.handoffClock=next?.getAnimations()[0]?.startTime;
     window.handoffBounds=next?.getBoundingClientRect().toJSON();
     observer.disconnect();
   }).observe(document.body,{childList:true});
 });
 while(!sessionRoute)await p.waitForTimeout(50);
 await sessionRoute.fulfill({status:200,contentType:'application/json',body:'{"user":null}'});
 await p.waitForSelector('#startup',{state:'detached'});
 const clocks=await p.evaluate(()=>({before:window.bootClock,after:window.handoffClock}));
 assert.equal(typeof clocks.before,'number');assert.equal(clocks.after,clocks.before,'runtime continues the original animation clock');
 await p.waitForSelector('.screen-loader',{state:'detached',timeout:60000});
 assert(await p.locator('#email').isVisible());assert.deepEqual(errors,[]);
 results.push({name:'runtime-handoff',clocks,login:true,errors,passed:true});await context.close();
 console.log('PASS first-document loader',results);
}finally{await fs.writeFile(out+'/report.json',JSON.stringify({base,results},null,2));await browser.close();await new Promise(r=>server.close(r));}
