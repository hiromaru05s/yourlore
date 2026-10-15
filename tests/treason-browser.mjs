import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5576',out=process.env.LORE_TEST_OUT||'/tmp/treason-browser';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1280,height:960}}),report={checks:[],runs:[],errors:[]};p.setDefaultTimeout(120000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(base+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await p.evaluate(async()=>{
  const {createGame,reduce}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');window.treasonAnim=await import('/src/ui/anim.ts');document.querySelector('.tempo-controls')?.remove();
  window.treasonFixture=async(side=0)=>{
   const c=window.combatTempo.controller;c.fastForward();await c.queue;c.stopTimer();const g=createGame({mode:'online',seed:71,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;g.turn=3;g.cur=side;g.phase='main';g.pending=null;
   for(const [i,q]of g.players.entries())Object.assign(q,{field:['ELF','CASTLE','INFKNIGHT'].map(id=>({...DB[id],uid:`treason-${i}-${id}`,exhausted:false,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0,gcount:id==='CASTLE'?2:0})),enchants:['E2','NHEAL'].map(id=>({card:{...DB[id],uid:`treason-${i}-${id}`},turns:3,bornTurn:1})),quests:[{card:{...DB.Q_CASTLE,uid:`quest-${i}`},progress:2,startedTurn:1}],traps:[],hand:[],deck:[],discard:[{...DB.ELF,uid:`discard-${i}`}],removed:[],hp:30,mana:20,maxMana:20,brand:1,openingDrawReady:false});
   g.players[side].hand=[{...DB.TREASON,uid:'treason-source'}];const res=reduce(g,{type:'play',idx:0});c.show(g);c.view.setHandOpen(true);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));treasonAnim.setFxSkip(false);return{c,g,res};
  };
  window.treasonObserve=async(side=0)=>{
   const {c,res}=await treasonFixture(side),chain=new Set(),native=new Set(),prepared=[],finished=[];const onFinish=e=>finished.push(e.detail);window.addEventListener('lore:mana-destruction-finished',onFinish);
   const observe=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof HTMLElement){if(n.matches('.treason-chains'))chain.add(n);if(n.matches('.mana-destruction')){native.add(n);prepared.push(n.dataset.prepared);}}});observe.observe(document.body,{childList:true,subtree:true});
   c.applyResult(res);await c.queue;c.stopTimer();observe.disconnect();window.removeEventListener('lore:mana-destruction-finished',onFinish);
   return{chain:chain.size,native:native.size,prepared,finished,brand:c.state.players[1-side].brand,field:c.state.players[1-side].field.length,enchants:c.state.players[1-side].enchants.length,quests:c.state.players[1-side].quests.length,remaining:document.querySelectorAll('.treason-chains,.mana-destruction').length};
  };
 });
 for(const [width,side]of [[1280,0],[1280,1],[390,0],[390,1]]){
  await p.setViewportSize({width,height:width===390?844:960});const r=await p.evaluate(side=>treasonObserve(side),side);report.runs.push({width,side,...r});assert.equal(r.chain,1);assert.equal(r.native,5);assert(r.prepared.every(x=>x==='true'));assert.equal(r.finished.length,5);assert(r.finished.every(x=>x.complete));assert.equal(r.brand,4);assert.equal(r.field,0);assert.equal(r.enchants,0);assert.equal(r.quests,1);assert.equal(r.remaining,0);report.checks.push(`controller ${width} side ${side}: 03 once, native x5 once, prepared, brand/quest/cleanup`);console.log(report.checks.at(-1));
 }
 await p.setViewportSize({width:1280,height:960});
 for(const mode of ['prepare-skip','skip','resize','hidden','reduced','fallback']){
  await p.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const r=await p.evaluate(async mode=>{
   const {c,res}=await treasonFixture();const original=HTMLCanvasElement.prototype.getContext;if(mode==='fallback')HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)};
   c.applyResult(res);
   if(!['reduced','fallback'].includes(mode)){
    await new Promise(resolve=>{const tick=()=>{if(document.querySelector(mode==='prepare-skip'?'.treason-chains':'.treason-chains[data-phase="binding"]'))resolve();else requestAnimationFrame(tick)};tick()});
    if(mode==='skip'||mode==='prepare-skip')c.fastForward();if(mode==='resize')dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}
   }
   await c.queue;c.stopTimer();HTMLCanvasElement.prototype.getContext=original;if(mode==='hidden')delete document.hidden;treasonAnim.setFxSkip(false);
   return{brand:c.state.players[1].brand,remaining:document.querySelectorAll('.treason-chains,.mana-destruction').length,field:document.querySelectorAll('#oppRow .zone-mon .card').length};
  },mode);assert.equal(r.brand,4);assert.equal(r.remaining,0);assert.equal(r.field,0);report.checks.push(mode);console.log(mode);
 }
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>treasonFixture());await p.screenshot({path:out+'/ready.png'});assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.stack;throw e;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await b.close();}
