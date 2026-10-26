import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-card-continuity',origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5576';
await fs.mkdir(out,{recursive:true});
const engine=process.env.LORE_QA_ENGINE||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{channel:'chrome',headless:true});
const results=[];
try{for(const width of (process.env.LORE_QA_WIDTHS||'1280,390').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:width<500?844:900},deviceScaleFactor:width<500?3:2,recordVideo:{dir:out+'/video',size:{width,height:width<500?844:900}}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Native capture fallback|\[playback\]|Shader Error|GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  document.querySelector('.tempo-controls').style.display='none';const {DB}=await import('/src/shared/cards.ts'),{redactFor}=await import('/src/shared/protocol.ts');
  window.setupContinuity=async(effect='default')=>{const c=combatTempo.controller;await c.queue;const g=combatTempo.fixture('summon',0).prev;g.opening=undefined;g.effects=[effect,effect];
   for(const p of g.players)Object.assign(p,{hand:[],field:[],discard:[],enchants:[],quests:[],traps:[],mana:40,maxMana:40});
   g.players[0].field=[{...DB.SOLDIER2,uid:'continuity-field',exhausted:true,summonedTurn:g.turn,tempAtk:0,atkMod:0,defMod:0,dmg:0}];
   g.players[0].hand=[{...DB.RUST_SHROOM,uid:'continuity-hand-'+effect}];g.players[0].discard=[{...DB.ELF,uid:'continuity-old'}];g.market[0]={...DB.SOLDIER2,uid:'continuity-market'};
   (await import('/src/ui/cardFinish.ts')).syncCardEffects(g,0);c.show(redactFor(g,0));await new Promise(r=>setTimeout(r,350));return g;
  };await setupContinuity();
 });
 const idle=await page.evaluate(async()=>{
  const source=document.querySelector('[data-uid="continuity-field"]'),art=source.querySelector('.card-art');let mutations=0;const observer=new MutationObserver(r=>mutations+=r.length);observer.observe(source,{attributes:true,attributeFilter:['style']});
  await new Promise(r=>setTimeout(r,350));observer.disconnect();return{mutations,visible:getComputedStyle(source).opacity,filter:getComputedStyle(source).filter,artWidth:art.offsetWidth,cardWidth:source.offsetWidth,clones:document.querySelectorAll('.duet-card').length};
 });assert.equal(idle.visible,'1');assert.equal(idle.filter,'none');assert.equal(idle.clones,0);assert(idle.mutations<=2,JSON.stringify(idle));assert(idle.artWidth>=idle.cardWidth*1.99);
 await page.screenshot({path:`${out}/${engine}-${width}-idle.png`});
 const snapshot=await page.evaluate(async()=>{
  const {captureCardSurface}=await import('/src/ui/cardSurface.ts'),{FRAME_BACK}=await import('/src/shared/cards.ts');
  const source=document.querySelector('[data-uid="continuity-field"]'),begin=performance.now();const a=await captureCardSurface(source,FRAME_BACK,true,false);const cold=performance.now()-begin,second=performance.now();const b=await captureCardSurface(source,FRAME_BACK,true,false);
  const p=b.face.getContext('2d').getImageData(0,0,b.face.width,b.face.height).data;let opaque=0;for(let i=3;i<p.length;i+=4)if(p[i]>230)opaque++;
  return{coldMs:cold,warmMs:performance.now()-second,width:a.face.width,height:a.face.height,opaque,cornerAlpha:p[3],image:b.face.toDataURL()};
 });await fs.writeFile(`${out}/${engine}-${width}-print.png`,Buffer.from(snapshot.image.split(',')[1],'base64'));delete snapshot.image;console.log('SNAPSHOT',snapshot);assert(snapshot.width>=952&&snapshot.width<=1905);assert(snapshot.opaque>10000);assert(snapshot.cornerAlpha<32,JSON.stringify(snapshot));
 // Draw owns exactly the original art node and returns it on normal completion.
 const draw=[];
 for(const effect of ['effect:stardust-foil','effect:crystal-facets','effect:prism-veil']){
  const sample=await page.evaluate(async effect=>{
   const g=await setupContinuity(effect),A=await import('/src/ui/anim.ts'),node=document.querySelector('#hand .card'),art=node.querySelector('.card-art'),canvas=art.querySelector('canvas');
   let seen=false,sameDuring=true,running=true;const observe=()=>{const flying=document.querySelector('.native-draw-card .card-art');if(flying){seen=true;sameDuring&&=flying===art;}if(running)requestAnimationFrame(observe);};observe();
   await A.animateDraw(document.querySelector('#hand'),1,'me',{uids:[g.players[0].hand[0].uid]});running=false;await new Promise(r=>setTimeout(r,40));
   return{effect,seen,sameDuring,sameAfter:node.querySelector('.card-art')===art,canvasRetained:canvas===art.querySelector('canvas')&&canvas.width>0,left:document.querySelectorAll('.native-draw-layer').length};
  },effect);assert(sample.seen&&sample.sameDuring&&sample.sameAfter&&sample.canvasRetained,JSON.stringify(sample));assert.equal(sample.left,0);draw.push(sample);
 }
 // Real controller purchase, ending print and snapshot reuse.
 const purchase=await page.evaluate(async()=>{
  const g=await setupContinuity(),{reduce}=await import('/src/shared/engine.ts'),{redactFor}=await import('/src/shared/protocol.ts'),c=combatTempo.controller;
  let frame,seen=false,running=true;const samples=[];const sample=()=>{const n=document.querySelector('.native-card-flight');if(n){seen=true;frame??=n.querySelector('.card-frame');samples.push(n.getBoundingClientRect().toJSON());}if(running)requestAnimationFrame(sample);};sample();
  const r=reduce(g,{type:'buyMarket',i:0});c.applyResult({state:redactFor(r.state,0),events:r.events});await c.queue;running=false;
  const final=document.querySelector('#pile-myDisc .pile-print .card');return{seen,reused:final?.querySelector('.card-frame')===frame,id:final?.dataset.cardId,count:document.querySelectorAll('#pile-myDisc .pile-print').length,samples};
 });assert(purchase.seen&&purchase.reused);assert.equal(purchase.id,'SOLDIER2');assert.equal(purchase.count,1);await page.screenshot({path:`${out}/${engine}-${width}-purchase.png`});
 // An actual lethal attack must finish its public graveyard exit even while
 // the controller commits the next board and offers the next attack.
 const exits=await page.evaluate(async()=>{
  const finished=[];const listen=e=>finished.push(e.detail);window.addEventListener('lore:mana-destruction-finished',listen);
  await combatTempo.run('lethal',0);const until=performance.now()+12000;while((!finished.length||document.querySelector('.mana-destruction,[data-combat-exit]'))&&performance.now()<until)await new Promise(r=>setTimeout(r,100));window.removeEventListener('lore:mana-destruction-finished',listen);
  return{finished,left:document.querySelectorAll('.mana-destruction,[data-combat-exit]').length,grave:[...document.querySelectorAll('#pile-oppDisc .pile-print .card')].map(n=>n.dataset.cardId),painted:!!document.querySelector('#pile-oppDisc .pile-print .card-frame')&&!!document.querySelector('#pile-oppDisc .pile-print .card-art img')};
 });assert(exits.finished.length>0,JSON.stringify(exits));assert(exits.finished.every(e=>e.complete),JSON.stringify(exits));assert.equal(exits.left,0);assert.deepEqual(exits.grave,['M1']);assert(exits.painted);await page.screenshot({path:`${out}/${engine}-${width}-grave.png`});
 assert.deepEqual(errors,[]);results.push({engine,width,idle,snapshot,draw,purchase,exits,errors});await fs.writeFile(out+'/report.json',JSON.stringify({results,boundary:'Local actual board/controller, engine actions and public presentation. Browser emulation, not a physical device or authenticated PvP.'},null,2));console.log('PASS',engine,width,{idle,snapshot,draw,purchase:{...purchase,samples:purchase.samples.length},exits});await context.close();
}}finally{await browser.close();}
