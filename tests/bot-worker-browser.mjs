import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.LORE_PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5276';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.route('**/bot-worker-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body>BOT worker lifecycle test</body>'}));await page.goto(origin+'/bot-worker-fixture.html');
 const longGame=JSON.parse(await fs.readFile('tests/fixtures/bot-long-game.json','utf8')).g;
 const heavyGame=JSON.parse(await fs.readFile('tests/fixtures/bot-tactical-heavy.json','utf8'));
 const result=await page.evaluate(async({longGame,heavyGame})=>{
  const {BotThinker}=await import('/src/game/botThinker.ts'),{LocalController}=await import('/src/game/controller.ts'),{createGame,reduce}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts'),{actionChangesState}=await import('/src/shared/botActions.ts');
  const state=()=>createGame({seed:55,mode:'bot',starting:1,p0:{id:'h',name:'Human'},p1:{id:'b',name:'BOT',isBot:true,deck:['GHOST','GHOST','GAMBLER','GAMBLER','RIFT','TRIAL_AREA','STARTER_TRASH','STARTER_TRASH']}}).state;
  let ticks=0;const timer=setInterval(()=>ticks++,5),stats=[];
  for(const difficulty of ['easy','normal','hard','hell']){const thinker=new BotThinker(),g=state(),before=JSON.stringify(g),t=performance.now(),action=await thinker.decide(g,difficulty);stats.push({difficulty,ms:performance.now()-t,action,advanced:!!action&&actionChangesState(g,reduce(g,action).state),pure:before===JSON.stringify(g)});thinker.destroy();}
  longGame.pending=null;longGame.players[longGame.cur].mana=longGame.players[longGame.cur].maxMana;for(const m of longGame.players[longGame.cur].field){m.exhausted=false;m.summonedTurn=0;}
  const stressThinker=new BotThinker(),stressStart=performance.now(),ticksBefore=ticks,stressAction=await stressThinker.decide(longGame,'hell');const stress={ms:performance.now()-stressStart,ticks:ticks-ticksBefore,action:stressAction,advanced:!!stressAction&&actionChangesState(longGame,reduce(longGame,stressAction).state)};stressThinker.destroy();
  const heavyThinker=new BotThinker(),heavyStart=performance.now(),heavyTicks=ticks,heavyAction=await heavyThinker.decide(heavyGame,'hell');const heavy={ms:performance.now()-heavyStart,ticks:ticks-heavyTicks,action:heavyAction,advanced:!!heavyAction&&actionChangesState(heavyGame,reduce(heavyGame,heavyAction).state)};heavyThinker.destroy();
  const nativeWorker=window.Worker;let fallbackAdvanced=false;
  try {window.Worker=class{constructor(){throw new Error('worker blocked for test');}};const fallback=new BotThinker(),fg=state(),fa=await fallback.decide(fg,'hell');fallbackAdvanced=!!fa&&actionChangesState(fg,reduce(fg,fa).state);fallback.destroy();}finally{window.Worker=nativeWorker;}
  const nativeTimeout=window.setTimeout;let timeoutResult,timeoutTerminated=false;
  try {window.Worker=class{postMessage(){}terminate(){timeoutTerminated=true;}};window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===15000?20:ms,...args);const timed=new BotThinker();timeoutResult=await timed.decide(state(),'hell');timed.destroy();}finally{window.Worker=nativeWorker;window.setTimeout=nativeTimeout;}
  let anytimeResult,anytimeTerminated=false,progressResolved=false;
  try {
   window.Worker=class{postMessage({id}){this.onmessage({data:{id,action:{type:'endTurn'},progress:true}});}terminate(){anytimeTerminated=true;}};
   window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===15000?20:ms,...args);
   const anytime=new BotThinker(),promise=anytime.decide(state(),'hell');promise.then(()=>{progressResolved=true;});await Promise.resolve();const resolvedBeforeDeadline=progressResolved;anytimeResult=await promise;anytime.destroy();if(resolvedBeforeDeadline)throw Error('progress must not apply before search completes or times out');
  }finally{window.Worker=nativeWorker;window.setTimeout=nativeTimeout;}
  const canceled=new BotThinker(),pending=canceled.decide(state(),'hell');canceled.destroy();const canceledResult=await pending;
  const superseded=new BotThinker(),oldSearch=superseded.decide(state(),'hell'),newSearch=superseded.decide(state(),'hard');const supersededResult=await oldSearch,newResult=await newSearch;superseded.destroy();
  const makeController=()=>{const c=Object.create(LocalController.prototype);Object.assign(c,{state:state(),you:0,difficulty:'hell',thinker:new BotThinker(),botBusy:false,botDisposed:false,botTurnNo:-1,botTurnSteps:0,applied:0});c.applyResult=()=>{c.applied++;};return c;};
  const stale=makeController(),stalePromise=stale.botStep();stale.state={...stale.state,turn:99};await stalePromise;stale.thinker.destroy();
  const disposed=makeController(),disposedPromise=disposed.botStep();disposed.botDisposed=true;disposed.thinker.destroy();await disposedPromise;
  const active=makeController();await active.botStep();active.thinker.destroy();
  const g=state();g.cur=0;g.players[1].dew=2;g.players[1].field=[{...DB.WORLD_TREE,uid:'tree',atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0}];g.pending={kind:'cardChoice',owner:1,reason:'WORLD_TREE_DEFEND',hint:'',hintJa:'',allowCancel:false,data:{targetUid:'tree'}};const defense=new BotThinker(),action=await defense.decide(g,'hard');defense.destroy();
  const exhausted=makeController();exhausted.state=g;exhausted.botTurnNo=g.turn;exhausted.botTurnSteps=200;let budgetAdvanced=false;exhausted.applyResult=r=>{budgetAdvanced=actionChangesState(g,r.state);};await exhausted.botStep();exhausted.thinker.destroy();clearInterval(timer);
  return {anytimeResult,anytimeTerminated,supersededResult,newResult,stats,stress,heavy,ticks,budgetAdvanced,fallbackAdvanced,timeoutResult,timeoutTerminated,canceledResult,staleApplied:stale.applied,disposedApplied:disposed.applied,activeApplied:active.applied,defense:action};
 },{longGame,heavyGame});
 assert.deepEqual(result.anytimeResult,{type:'endTurn'});assert(result.anytimeTerminated);assert.equal(errors.length,0,errors.join('\n'));assert.equal(result.supersededResult,null);assert(result.newResult);assert(result.stats.every(x=>x.advanced&&x.pure));assert(result.ticks>3);assert(result.stress.advanced);assert(result.heavy.advanced);assert(result.heavy.ticks>3);assert(result.stress.ticks>3);assert.equal(result.canceledResult,null);assert.equal(result.staleApplied,0);assert.equal(result.disposedApplied,0);assert.equal(result.activeApplied,1);assert(result.defense);assert(result.budgetAdvanced);assert(result.fallbackAdvanced);assert.equal(result.timeoutResult,null);assert(result.timeoutTerminated);
 await fs.mkdir((process.env.BOT_QA_OUT || 'docs/bot-strength/2026-10-13'),{recursive:true});await fs.writeFile((process.env.BOT_QA_OUT || 'docs/bot-strength/2026-10-13')+'/browser.json',JSON.stringify({...result,errors},null,2));console.log(JSON.stringify(result));
} finally {await browser.close();}
