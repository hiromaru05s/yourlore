import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5563',out='/tmp/creation-busy-qa';await fs.mkdir(out,{recursive:true});
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
   g.players[player].field=Array.from({length:3},(_,i)=>({...DB.M1,uid:'busy-mon-'+i,exhausted:false,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}));
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
 for(const width of [1280,390])for(const owner of [0,1]){await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(owner=>{window.creationPlaying=creationRun(owner,9,false);},owner);await page.waitForSelector('[data-creation-fx]');const r=await page.evaluate(owner=>{const s=document.querySelector('.fx-card-flight[data-uid="creation-source"]').getBoundingClientRect(),m=document.querySelector((owner?'#oppRow':'#meRow')+' .zone-mon .card').getBoundingClientRect();return{source:s.toJSON(),monster:m.toJSON(),clear:s.right+1.55*s.width<=m.left+1};},owner);assert(r.clear,'source and full peeled face must clear the first occupied card');await page.screenshot({path:out+'/'+width+'-'+owner+'.png'});const result=await page.evaluate(()=>creationPlaying);assert.equal(result.remaining,0);checks.push({width,owner,...r});}assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checks,errors},null,2));console.log('PASS 4 occupied-board source and sheet clearance cases');
}finally{await context.close();await browser.close();}
