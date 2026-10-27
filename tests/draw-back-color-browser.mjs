import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-draw-back-color';await fs.mkdir(out,{recursive:true});
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'draw-back-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url==='/draw-back'){res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="app"></div><script type="module" src="/draw-back-fixture.js"></script></body></html>');}
 else if(req.url==='/draw-back-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fixture);}else next();
});}}],server:{host:'127.0.0.1',port:5598,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}}),page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window),pending=[];window.freezeDraw=false;window.freezeAt=0;window.requestAnimationFrame=cb=>raf(t=>{if(window.freezeDraw&&cb===window.frozenCallback){pending.push(cb);return;}cb(t);const card=document.querySelector('.native-draw-card');if(window.freezeAt&&+card?.dataset.progress>=window.freezeAt){window.freezeDraw=true;window.frozenCallback=cb;window.freezeAt=0;}});window.resumeDraw=()=>{window.freezeDraw=false;pending.splice(0).forEach(cb=>requestAnimationFrame(cb));};});
try{
 await page.goto('http://127.0.0.1:5598/draw-back');await page.waitForFunction(()=>window.monsterQA&&document.querySelector('[data-scene-ready=true]'));
 for(const width of [1280,390])for(const side of ['me','opp']){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.evaluate(()=>{const q=monsterQA;q.reset();q.g.players[0].hand=[{...q.DB.ELF,uid:'new'}];q.g.players[1].hand=[{...q.DB.ELF,uid:'hidden'}];q.render();});await page.waitForTimeout(200);
  await page.evaluate(side=>{window.freezeAt=.22;window.drawDone=monsterQA.A.animateDraw(document.querySelector(side==='me'?'#hand':'#oppHand'),1,side,{durationScale:3});},side);
  await page.waitForFunction(()=>window.freezeDraw,null,{polling:50});
  const state=await page.evaluate(()=>{const root=document.querySelector('.native-draw-card'),back=root.querySelector('.draw-stock-back');return{progress:root.dataset.progress,backImage:getComputedStyle(back).backgroundImage,backFilter:getComputedStyle(back).filter,paintedPlanes:[...root.children].filter(n=>n!==back&&!n.classList.contains('card')).map(n=>({background:getComputedStyle(n).backgroundColor,opacity:getComputedStyle(n).opacity,mask:getComputedStyle(n).maskImage,backface:getComputedStyle(n).backfaceVisibility})),privateFaces:root.querySelectorAll('.card-art,[data-card-id]').length};});
  await page.screenshot({path:`${out}/${side}-${width}.png`});
  if(process.env.LORE_DRAW_DIAGNOSE==='1'){
   await page.evaluate(()=>{const root=document.querySelector('.native-draw-card');for(const n of root.children)if(n!==root.querySelector('.draw-stock-back')&&!n.classList.contains('card'))n.style.opacity='0';});
   await page.screenshot({path:`${out}/${side}-${width}-without-tint.png`});
  }else assert.equal(state.paintedPlanes.length,0,'A draw must not paint a colored plane across the sleeve');
  assert.equal(state.backFilter,'none');assert(state.backImage.includes('url('));if(side==='opp')assert.equal(state.privateFaces,0);
  await page.evaluate(()=>window.resumeDraw());await page.evaluate(()=>window.drawDone);assert.equal(await page.locator('.native-draw-layer,.draw-stock-canvas').count(),0);checks.push({width,side,...state});
 }
 // Normal speed remains continuous; no debug freeze on this pass.
 await page.evaluate(()=>{const q=monsterQA;q.reset();q.g.players[0].hand=[{...q.DB.ELF,uid:'normal'}];q.render();window.drawDone=q.A.animateDraw(document.querySelector('#hand'),1,'me');});await page.evaluate(()=>window.drawDone);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,scope:'Real board/controller with fixture state; default sleeve, both sides, desktop/mobile, frozen turn plus normal-speed draw. Not authenticated multiplayer.'},null,2));console.log('PASS draw sleeve color, opponent privacy, normal timing and cleanup');
}finally{await context.close();await fs.rename(await page.video().path(),out+'/continuous.webm');await browser.close();await server.close();}
