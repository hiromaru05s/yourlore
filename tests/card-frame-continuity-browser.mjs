import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5264',out=process.env.LORE_TEST_OUT||'/tmp/lore-frame-continuity',engine=process.env.LORE_QA_ENGINE||'chromium';await fs.mkdir(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{channel:'chrome',headless:true}),results=[];
try{for(const width of (process.env.LORE_QA_WIDTHS||'1280,390').split(',').map(Number)){
 const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<500?2:1,recordVideo:{dir:out+'/video',size:{width,height:900}}}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Native capture fallback|could not be prepared|Shader Error|GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 for(const frame of (process.env.LORE_QA_FRAMES?.split(',')??['frame:mirror-silver','frame:flowing-gold','frame:obsidian-ember','frame:nacre-prism','frame:verdigris-runes'])){
 const result=await page.evaluate(async(frame)=>{
  const {DB,FRAME_BACK}=await import('/src/shared/cards.ts'),{redactFor}=await import('/src/shared/protocol.ts'),{reduce}=await import('/src/shared/engine.ts'),F=await import('/src/ui/cardFrame.ts'),A=await import('/src/ui/anim.ts'),c=combatTempo.controller;await c.queue;
  const g=combatTempo.fixture('summon',0).prev;g.opening=undefined;g.frames=[frame,frame];g.effects=['effect:prism-veil','default'];
  for(const p of g.players)Object.assign(p,{hand:[],field:[],discard:[],enchants:[],quests:[],traps:[],mana:40,maxMana:40});
  g.players[0].field=[{...DB.SOLDIER2,uid:'frame-field',exhausted:true,summonedTurn:g.turn,tempAtk:0,atkMod:0,defMod:0,dmg:0}];g.players[0].hand=[{...DB.RUST_SHROOM,uid:'frame-hand'}];g.players[0].discard=[{...DB.ELF,uid:'frame-old'}];g.market[0]={...DB.SOLDIER2,uid:'frame-market'};
  c.show(redactFor(g,0));await new Promise(r=>setTimeout(r,500));
  const source=document.querySelector('[data-uid="frame-hand"]');await F.ensureCardFrameReady(source);const layer=source.querySelector('.card-frame-material'),initial=layer?.toDataURL();
  let seen=false,same=true,live=false,running=true;const sample=()=>{const card=document.querySelector('.native-draw-card .card');if(card){seen=true;same&&=card.querySelector('.card-frame-material')===layer;live||=layer.toDataURL()!==initial;}if(running)requestAnimationFrame(sample);};sample();
  await A.animateDraw(document.querySelector('#hand'),1,'me',{uids:['frame-hand']});running=false;
  const draw={seen,same,live,returned:source.querySelector('.card-frame-material')===layer};
  const {captureCardSurface}=await import('/src/ui/cardSurface.ts');const capture=await captureCardSurface(source,FRAME_BACK,true,false);const print=capture.face.toDataURL();
  let flightSeen=false,missing=false,purchaseRunning=true;const watch=()=>{for(const node of document.querySelectorAll('.native-card-flight')){flightSeen=true;missing||=node.dataset.cardFrame!==frame||!node.querySelector('.card-frame-material')||node.querySelectorAll('.seal-face .card-frame-material').length<1;}if(purchaseRunning)requestAnimationFrame(watch);};watch();
  const buy=reduce(g,{type:'buyMarket',i:0});c.applyResult({state:redactFor(buy.state,0),events:buy.events});await c.queue;purchaseRunning=false;await new Promise(r=>setTimeout(r,120));
  const final=document.querySelector('#pile-myDisc .pile-print .card');const purchase={flightSeen,missing,frame:final?.dataset.cardFrame,layers:final?.querySelectorAll('.card-frame-material').length};
  const play=reduce(buy.state,{type:'play',idx:0});c.applyResult({state:redactFor(play.state,0),events:play.events});await c.queue;await new Promise(r=>setTimeout(r,120));
  const landed=document.querySelector('#meRow [data-uid="frame-hand"]');const summon={frame:landed?.dataset.cardFrame,layers:landed?.querySelectorAll('.card-frame-material').length};
  const cards=[...document.querySelectorAll('#meRow .card,#pile-myDisc .pile-print .card')].filter(n=>!n.classList.contains('card--back')).map(n=>({id:n.dataset.cardId,frame:n.dataset.cardFrame,layers:n.querySelectorAll('.card-frame-material').length}));
  return {frame,draw,purchase,summon,cards,print};
 },frame);
 await fs.writeFile(`${out}/${engine}-${width}-${frame.split(':')[1]}-capture.png`,Buffer.from(result.print.split(',')[1],'base64'));delete result.print;assert(result.draw.seen&&result.draw.same&&result.draw.live&&result.draw.returned,JSON.stringify(result));assert(result.purchase.flightSeen&&!result.purchase.missing&&result.purchase.frame===frame&&result.purchase.layers>=2,JSON.stringify(result));assert(result.summon.frame===frame&&result.summon.layers>=4,JSON.stringify(result));assert(result.cards.every(c=>c.frame===frame&&c.layers>=2),JSON.stringify(result));
 await page.screenshot({path:`${out}/${engine}-${width}-${frame.split(':')[1]}.png`});results.push({engine,width,...result});console.log('PASS',engine,width,frame);await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,boundary:'Local real board/reducer/controller; emulated viewports, no authenticated PvP.'},null,2));
 }
 assert.deepEqual(errors,[]);await ctx.close();
}}finally{await browser.close();}
