import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5576',out=process.env.LORE_TEST_OUT||'/tmp/creation-random-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  const {createGame,reduce}=await import('/src/shared/engine.ts'),{DB,STARTERS}=await import('/src/shared/cards.ts'),{redactFor}=await import('/src/shared/protocol.ts');const A=await import('/src/ui/anim.ts');document.querySelector('.tempo-controls')?.remove();
  window.creationRun=async(player=0,echo=false,mode='normal')=>{
   const c=window.combatTempo.controller;c.afterApply=()=>{};c.fastForward();await c.queue;c.stopTimer();
   const g=createGame({mode:'bot',seed:42,starting:player,p0:{id:'self',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;Object.assign(g,{turn:3,cur:player,phase:'main',pending:null});
   for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],removed:[],hp:28,mana:20,maxMana:20,shield:0,dew:0,brand:0,openingDrawReady:false});
   g.players[player].hand=[{...DB.CREATION,uid:'creation-source'}];g.players[player].deck=[{...STARTERS.STARTER_CHEST,uid:'existing-draw'}];
   if(echo){const rune=Object.values(DB).find(c=>c.ench==='runeEcho');g.players[player].enchants=[{card:{...rune,uid:'echo'},turns:99}];}
   const raw=reduce(g,{type:'play',idx:0}),res={...raw,state:redactFor(raw.state,0)};c.show(redactFor(g,0));c.view.setHandOpen(mode!=='closed');await new Promise(r=>setTimeout(r,200));A.setFxSkip(false);
   let running=true;const frames=[],start=performance.now();const tick=()=>{const fx=[...document.querySelectorAll('[data-creation-fx]')];frames.push({t:performance.now()-start,fx:fx.map(n=>({ms:Number(n.dataset.time),destination:n.dataset.creationDestination,uid:n.dataset.creationUid})),hidden:[...document.querySelectorAll('#hand .card,#oppHand .card--back')].filter(n=>n.style.visibility==='hidden').length});if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   c.applyResult(res);const work=c.queue;if(mode!=='normal')setTimeout(()=>{if(mode==='skip')A.setFxSkip(true);if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}},1500);
   await work;running=false;if(mode==='hidden')delete document.hidden;A.setFxSkip(false);c.stopTimer();
   return {frames,remaining:document.querySelectorAll('[data-creation-fx],[data-creation-capture],[data-creation-fallback],.fx-card-flight[data-uid="creation-source"]').length,hidden:[...document.querySelectorAll('#hand .card,#oppHand .card--back')].filter(n=>n.style.visibility==='hidden').length,hand:res.state.players[player].hand.map(c=>({id:c.id,uid:c.uid})),privateHand:raw.state.players[player].hand.map(c=>c.id),hp:raw.state.players[player].hp,deck:raw.state.players[player].deck.length,grave:raw.state.players[player].discard.length,rift:raw.state.players[player].removed.length,events:res.events.filter(e=>e.type==='creationGranted')};
  };
 });
 for(const [width,player,echo] of [[1280,0,false],[1280,1,false],[390,0,false],[390,1,false],[1280,0,true],[390,1,true]]){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(args=>{window.creationPlaying=creationRun(...args);},[player,echo]);
  await page.waitForSelector('[data-creation-fx]',{state:'attached'});await page.waitForTimeout(700);await page.screenshot({path:`${out}/${width}-${player}-${echo}-birth.png`});await page.waitForTimeout(1000);await page.screenshot({path:`${out}/${width}-${player}-${echo}-arrival.png`});
  const r=await page.evaluate(()=>creationPlaying);await fs.writeFile(`${out}/${width}-${player}-${echo}.json`,JSON.stringify(r,null,2));
  assert.equal(r.remaining,0);assert.equal(r.hidden,0);assert.equal(r.hand.length,echo?2:1);assert.equal(r.hp,28);assert.equal(r.deck,1);assert.equal(r.grave,0);assert.equal(r.rift,1);assert(r.frames.filter(f=>f.fx.length).length>8);assert(r.frames.flatMap(f=>f.fx).every(f=>f.destination==='hand'));if(player===1){assert(r.hand.every(c=>c.id==='HIDDEN'));assert(r.frames.flatMap(f=>f.fx).every(f=>f.uid.startsWith('hidden-creation-')));}
  checks.push({width,player,echo,frames:r.frames.length,active:r.frames.filter(f=>f.fx.length).length,hidden:r.hidden,remaining:r.remaining});
 }
 for(const mode of ['closed','skip','resize','hidden','reduced']){await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});const r=await page.evaluate(mode=>creationRun(0,false,mode==='reduced'?'normal':mode),mode);assert.equal(r.remaining,0);assert.equal(r.hidden,0);assert.equal(r.hand.length,1);checks.push({mode,remaining:r.remaining});}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
} catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw e;}finally{await context.close();await browser.close();}
