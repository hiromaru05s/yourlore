import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-tutorial-parts-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialParts';export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialCheckpoints';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/parts.mjs',logLevel:'silent'});
 const lib=await import(dir+'/parts.mjs');
 assert.equal(lib.TUTORIAL_PARTS.length,1,'one continuous basic tutorial');
 assert.notEqual(lib.tutorialPartKey(0,'alice'),lib.tutorialPartKey(0,'bob'));
 const tour=lib.PART_TOURS[0],run=lib.createPartRun(0),turnDraws=[],history=[],checkpoints=new lib.TutorialCheckpoints();
 const data=run=>{const {scenes,...rest}=run;return rest;};
 let replayed=0;
 for(const [index,s] of tour.entries()){
  const presentation={handOpen:true,logOpen:false,inspection:{uid:run.state.players[0].hand[0]?.uid??'',scroll:32}};
  const expectedBefore=structuredClone({run:data(run),history,presentation});
  checkpoints.save(index,run,history,presentation);
  for(const k of ['title','body'])for(const lang of ['ja','en','ko'])assert(s[k][lang]);
  assert(!s.body.ja.includes('精神力'));
  if(s.action==='play'&&s.pointer?.startsWith('#hand'))assert(s.dragTo);
  if(s.action!=='play')continue;
  let solved=false;const moves=[];
  for(let n=0;n<20;n++){
   if(s.until(run.state)){solved=true;break;}
   const action=lib.actingSide(run.state)===1?lib.tutorialOpponentAction(run):lib.botActions(run.state).filter(a=>lib.tutorialActionAllowed(run,a)).find(a=>{const next=lib.reduce(run.state,a);return next.state.rng!==run.state.rng||lib.actionChangesState(run.state,next.state);});
   assert(action,`No action for ${s.title.en}: ${run.step}`);
   const before=run.state,prevHand=before.players[0].hand.length;
   moves.push(structuredClone(action));history.push(...lib.advanceLesson(run,action).events);
   if(before.cur===1&&run.state.cur===0)turnDraws.push(run.state.players[0].hand.length-prevHand);
  }
  assert(solved,`Tour completes real action: ${s.title.en}`);
  // The exact full state (including RNG, UID allocation, pending choices, both
  // players, decks, market stock and lesson facts) returns, then replays identically.
  const expectedAfter=structuredClone(data(run));
  checkpoints.save(index+.5,run,history,presentation);
  checkpoints.save(index,run,history,presentation); // rerender must not overwrite entry state
  const saved=checkpoints.rewind(index);
  assert.deepEqual(saved,expectedBefore,`complete rollback: ${s.title.en}`);
  assert.equal(checkpoints.previous(index+1),index,'abandoned future discarded');
  const replay={...saved.run,scenes:run.scenes};
  for(const move of moves){assert(lib.tutorialActionAllowed(replay,move));lib.advanceLesson(replay,move);}
  assert.deepEqual(data(replay),expectedAfter,`same result after rewind/replay: ${s.title.en}`);
  saved.history.length=0;replay.state.players[0].mana=-1;
  assert.deepEqual(checkpoints.rewind(index),expectedBefore,'snapshot stays immutable across repeated restores');
  replayed++;
 }
 assert.deepEqual(turnDraws,[3,3],'three normal draws on each own turn, before any extra-draw teaching');
 assert.equal(run.state.players[1].hp,43,'one direct damage and one overflow, without unexplained kill bonuses');
 assert.equal(run.state.players[1].field.length,0);
 assert.equal(run.state.players[0].field[0].atkMod,3);
 assert.equal(run.state.players[0].maxMana,5);
 assert.equal(run.state.players[0].mana,2);
 assert(run.state.players[0].hand.some(c=>c.id==='M4'),'purchase actually travels through graveyard and shuffle into hand');
 assert(run.state.players[0].removed.some(c=>c.id==='STARTER_TRASH'));
 assert.equal(run.state.marketStock[0],2);
 assert.deepEqual(run.state.players[0].supply,run.state.players[1].supply,'offers remain shared after purchases and refresh');
 assert.equal(run.phase,'review');
 lib.advanceLesson(run,{type:'continueLesson'});assert(run.done);
 const inspect=tour.findIndex(s=>s.action==='inspect'),summon=tour.findIndex(s=>s.until?.(lib.reduce(lib.createPartRun(0).state,{type:'play',idx:0}).state));
 assert(inspect>=0&&summon>inspect);
 for(const selector of ['.card-cost','.ad-atk','.ad-def'])assert(tour.some(s=>s.selector==='#zoomOverlay '+selector),'each card statistic has its own inspected highlight');
 assert(tour.filter(s=>s.selector?.endsWith('.mkt-stock')).length>=2,'stock, including its change, is highlighted directly');
 const fixedIntro=tour.findIndex(s=>s.selector==='#fixedMarket'),changingIntro=tour.findIndex(s=>s.selector==='#supplyMarket'),shared=tour.findIndex(s=>s.title.en==='Shared markets');
 assert(fixedIntro>=0&&changingIntro>fixedIntro&&shared>changingIntro,'identify each market on the board before explaining shared ownership');
 assert.deepEqual(tour[shared].region,['#fixedMarket','#supplyMarket']);assert(tour[shared].ringEach,'shared explanation marks both markets separately');
 assert(shared<tour.findIndex(s=>s.title.en==='Buy a card'),'market introductions precede purchase instructions');
 const text=tour.map(s=>s.body.ja).join('');
 assert(text.indexOf('マーケット')<text.indexOf('ダブルクリック'));
 assert(text.indexOf('カードを3枚引く')<text.indexOf('ターン終了を押そう'));
 assert(tour.length<=50,'bounded first-run interaction count');
 assert(text.length<1900,'bounded Japanese reading load');
 console.log(`PASS concise tutorial: ${tour.length} steps, ${text.length} Japanese characters; ${replayed} action checkpoints fully rolled back and replayed, including both turn draws`);
}finally{await rm(dir,{recursive:true,force:true});}
