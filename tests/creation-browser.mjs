import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5563',out=process.env.LORE_TEST_OUT||'/tmp/creation-runtime-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  const {createGame,reduce}=await import('/src/shared/engine.ts'),{DB,STARTERS}=await import('/src/shared/cards.ts');window.creationAnim=await import('/src/ui/anim.ts');document.querySelector('.tempo-controls')?.remove();
  window.creationFixture=async(player=0,before=9)=>{
   const c=window.combatTempo.controller;c.afterApply=()=>{};c.fastForward();await c.queue;c.stopTimer();
   const g=createGame({mode:'bot',seed:42,starting:player,p0:{id:'self',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;g.turn=3;g.cur=player;g.phase='main';g.pending=null;
   for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],removed:[],hp:28,mana:20,maxMana:20,shield:0,dew:0,brand:0,openingDrawReady:false});
   g.players[player].hand=[{...DB.CREATION,uid:'creation-source'}];g.players[player].deck=[{...STARTERS.STARTER_CHEST,uid:'existing-draw'}];g.players[player].discard=[{...DB.VAMP2,uid:'old-grave'}];g.players[player].removed=Array.from({length:before},(_,i)=>({...DB.CREATION,uid:'rift-'+i}));g.players[1-player].deck=[{...DB.ELF,uid:'enemy-original'}];
   const res=reduce(g,{type:'play',idx:0});c.show(g);c.view.setHandOpen(false);await new Promise(r=>setTimeout(r,180));creationAnim.setFxSkip(false);return{c,g,res};
  };
  window.creationRun=async(player=0,before=9,copy=false,mode='normal')=>{
   const {c,res}=await creationFixture(player,before);const batch=copy?reduce(res.state,{type:'pick',uid:'enemy-original'}):res;if(copy){c.show(res.state);await new Promise(r=>setTimeout(r,100));creationAnim.setFxSkip(false);}
   let running=true;const frames=[],start=performance.now();const tick=()=>{const fx=document.querySelector('[data-creation-fx]');frames.push({t:performance.now()-start,fx:fx?.dataset.creationFx??null,ms:Number(fx?.dataset.time??0),fallback:!!document.querySelector('[data-creation-fallback]'),spell:!!document.querySelector('[data-spell-frame]'),hp:document.querySelector(player===0?'#hp-me':'#hp-opp')?.textContent});if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   // Exercise applyResult and the real presentation queue; the fixture suppresses only the picker after playback.
   c.applyResult(batch);const work=c.queue;
   if(mode!=='normal')setTimeout(()=>{if(mode==='skip')creationAnim.setFxSkip(true);if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}},700);
   await work;running=false;if(mode==='hidden')delete document.hidden;creationAnim.setFxSkip(false);c.stopTimer();
   return{frames,remaining:document.querySelectorAll('[data-creation-fx],[data-creation-capture],[data-creation-fallback]').length,source:document.querySelectorAll('.fx-card-flight[data-uid="creation-source"]').length,events:batch.events.filter(e=>e.type==='creationBorn'),hp:batch.state.players[player].hp,grave:batch.state.players[player].discard.map(c=>({id:c.id,uid:c.uid})),rift:batch.state.players[player].removed.some(c=>c.uid==='creation-source'),original:batch.state.players[1-player].deck.some(c=>c.uid==='enemy-original')};
  };
 });
 for(const [width,player,copy] of [[1280,0,false],[1280,0,true],[1280,1,false],[1280,1,true],[390,0,false],[390,0,true],[390,1,false],[390,1,true]]){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(args=>{window.creationPlaying=creationRun(...args);},[player,9,copy]);await page.waitForSelector('[data-creation-fx]',{state:'attached',timeout:45000});await page.waitForTimeout(400);await page.screenshot({path:`${out}/${width}-${player}-${copy?'copy':'birth'}.png`});const r=await page.evaluate(()=>creationPlaying);await fs.writeFile(`${out}/latest.json`,JSON.stringify(r,null,2));assert.equal(r.remaining,0);assert.equal(r.source,0);assert.equal(r.events.length,1);assert(r.frames.filter(f=>f.fx).length>8,'real renderer frames');assert(r.rift&&r.original);assert.equal(r.grave.length,copy?3:2);await fs.writeFile(`${out}/${width}-${player}-${copy}.json`,JSON.stringify(r));checks.push({width,player,copy,frames:r.frames.length,active:r.frames.filter(f=>f.fx).length});
 }
 for(const mode of ['skip','resize','hidden','reduced']){await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});const r=await page.evaluate(mode=>creationRun(0,8,false,mode==='reduced'?'normal':mode),mode);assert.equal(r.remaining,0);assert.equal(r.source,0);if(mode==='reduced')assert(r.frames.some(f=>f.fallback));checks.push({mode,remaining:r.remaining});}
 // Two public copies can share a frame without leaving WebGL canvases behind.
 await page.emulateMedia({reducedMotion:'no-preference'});
 const concurrent=await page.evaluate(async()=>{await creationFixture();const {playCreation}=await import('/src/ui/creation/runtime.ts'),{DB}=await import('/src/shared/cards.ts');const abort=new AbortController();let maximum=0;const watch=setInterval(()=>maximum=Math.max(maximum,document.querySelectorAll('[data-creation-fx]').length),20);await Promise.all(['me','opp'].map((side,i)=>playCreation({...DB.ELF,uid:'parallel-'+i},side,null,true,abort.signal)));clearInterval(watch);return{maximum,left:document.querySelectorAll('[data-creation-fx],[data-creation-capture]').length};});assert.equal(concurrent.maximum,2);assert.equal(concurrent.left,0);checks.push({concurrent});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors,JSON.stringify(await page.evaluate(async()=>({result:await window.creationPlaying.then(({frames,...r})=>({...r,active:frames.filter(f=>f.fx).length})),deck:[...document.querySelectorAll('.pile--deck,.pile-draw-anchor')].map(n=>({id:n.id,cls:n.className,rect:n.getBoundingClientRect().toJSON()}))})).catch(()=>null)));throw e;}finally{await context.close();await browser.close();}
