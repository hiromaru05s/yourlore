import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-starter-tools/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-draw-hand-tone';
await fs.mkdir(out,{recursive:true});
// Real board/controller, with explicit game-state fixtures and normal motion timing.
const fixture=(await fs.readFile('tests/monster-adoption-browser.mjs','utf8')).match(/const fixture=`([\s\S]*?)`;/)[1];
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'draw-tone-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url==='/draw-tone'){res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="app"></div><script type="module" src="/draw-tone-fixture.js"></script></body></html>');}
 else if(req.url==='/draw-tone-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fixture);}else next();
});}}],server:{host:'127.0.0.1',port:5599,strictPort:true,hmr:false}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}});
const page=await context.newPage(),checks=[],errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5599/draw-tone');await page.waitForFunction(()=>window.monsterQA&&document.querySelector('[data-scene-ready=true]'));
 for(const [label,mana,goblin] of [['condition-blocked',20,false],['mana-blocked-condition-met',0,true],['playable-condition-met',20,true]]){
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:width===390?844:900});
   await page.evaluate(({mana,goblin})=>{const q=monsterQA;q.reset();const p=q.g.players[0];p.mana=mana;p.field=goblin?[q.mon('goblin',{...q.DB.GOBLIN})]:[];p.hand=[{...q.DB.GOBLIN_SETTLEMENT,uid:'old'},{...q.DB.GOBLIN_SETTLEMENT,uid:'new'}];q.render();q.ctl.view.setHandOpen(true);},{mana,goblin});
   await page.waitForTimeout(300);
   const before=await page.evaluate(()=>{const n=document.querySelector('#hand [data-uid="new"]');return{dim:n.classList.contains('is-dim'),condition:n.classList.contains('has-play-condition'),tone:[...n.children].map(c=>({filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity}))};});
   assert.equal(before.dim,mana===0||!goblin);assert.equal(before.condition,goblin);
   await page.evaluate(()=>{window.drawDone=monsterQA.A.animateDraw(document.querySelector('#hand'),1,'me',{uids:['new']});});
   await page.waitForFunction(()=>+document.querySelector('.native-draw-card')?.dataset.progress>.58);
   const during=await page.evaluate(()=>{
    const n=document.querySelector('.native-draw-card .card');
    const grip=[...document.querySelector('.native-draw-layer').children].find(c=>c.classList.contains('card'));
    return{classes:n.className,effects:n.querySelectorAll('.hand-condition-effect').length,filter:getComputedStyle(n).filter,tones:[...n.children].map(c=>({filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity})),grip:[...grip.children].map(c=>({filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity}))};
   });
   assert(!/is-dim|has-play-condition|is-playable/.test(during.classes));assert.equal(during.effects,0);assert.equal(during.filter,'none');
   assert(during.tones.every(t=>!t.filter.includes('grayscale')&&t.opacity==='1'));
   assert.deepEqual(during.grip,before.tone,'existing hand preserves its per-layer presentation');
   await page.screenshot({path:`${out}/${label}-${width}-flight.png`});await page.evaluate(()=>window.drawDone);
   const after=await page.evaluate(()=>{const n=document.querySelector('#hand [data-uid="new"]');return{visible:getComputedStyle(n).visibility,dim:n.classList.contains('is-dim'),condition:n.classList.contains('has-play-condition'),tone:[...n.children].map(c=>({filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity})),copies:document.querySelectorAll('.native-draw-layer').length};});
   assert.equal(after.visible,'visible');assert.equal(after.dim,before.dim);assert.equal(after.condition,before.condition);assert.deepEqual(after.tone,before.tone);assert.equal(after.copies,0);
   await page.screenshot({path:`${out}/${label}-${width}-landed.png`});checks.push({label,width,before,during,after});
  }
 }
 // A landed first card must already be dim while the second is still arriving.
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>{const q=monsterQA;q.reset();q.g.players[0].mana=0;q.g.players[0].hand=[{...q.DB.GOBLIN_SETTLEMENT,uid:'first'},{...q.DB.GOBLIN_SETTLEMENT,uid:'second'}];q.render();window.drawDone=q.A.animateDraw(document.querySelector('#hand'),2,'me',{uids:['first','second'],durationScale:3});});
 await page.waitForFunction(()=>{const cards=document.querySelectorAll('.native-draw-card');return cards.length===2&&cards[0].style.display==='none'&&cards[1].style.display==='block'&&+cards[1].dataset.progress>.8;});
 const multi=await page.evaluate(()=>{const layer=document.querySelector('.native-draw-layer'),landed=[...layer.children].find(n=>n.classList.contains('card')),flying=layer.querySelector('.native-draw-card[style*="display: block"] .card');return{landed:getComputedStyle(landed.querySelector('.card-art')).filter,flying:getComputedStyle(flying.querySelector('.card-art')).filter};});
 assert(multi.landed.includes('grayscale(1)'));assert.equal(multi.flying,'none');await page.evaluate(()=>window.drawDone);checks.push({multi});
 for(const mode of ['abort','resize','skip','reduce','opponent']){
  await page.evaluate(()=>{const q=monsterQA;q.reset();q.g.players[0].mana=0;q.g.players[0].hand=[{...q.DB.GOBLIN_SETTLEMENT,uid:'new'}];q.g.players[1].hand=[{...q.DB.GOBLIN_SETTLEMENT,uid:'hidden'}];q.render();});
  if(mode==='reduce')await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(mode=>{window.drawAbort=new AbortController();window.drawDone=monsterQA.A.animateDraw(document.querySelector(mode==='opponent'?'#oppHand':'#hand'),1,mode==='opponent'?'opp':'me',{signal:window.drawAbort.signal});},mode);
  if(mode!=='reduce'){
   await page.waitForSelector('.native-draw-card');
   if(mode==='opponent')assert.equal(await page.locator('.native-draw-card .card-art,.native-draw-card [data-card-id]').count(),0);
   else await page.evaluate(mode=>{if(mode==='abort')window.drawAbort.abort();if(mode==='resize')dispatchEvent(new Event('resize'));if(mode==='skip')monsterQA.A.setFxSkip(true);},mode);
  }
  await page.evaluate(()=>window.drawDone);assert.equal(await page.locator('.native-draw-layer,.draw-stock-canvas').count(),0);assert.equal(await page.locator('#hand .card').evaluate(n=>getComputedStyle(n).visibility),'visible');await page.emulateMedia({reducedMotion:'no-preference'});checks.push(mode);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,boundary:'Local Chrome, real board/controller and normal draw timing; game-state fixture, not authenticated multiplayer or user visual approval.'},null,2));console.log('PASS draw flight neutral print, landed hand cues, existing hand tone, desktop/mobile, sequential landing, cancellation and opponent privacy');
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();await fs.rename(await page.video().path(),out+'/continuous.webm');await browser.close();await server.close();}
