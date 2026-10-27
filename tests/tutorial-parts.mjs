import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-tutorial-parts-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialParts';export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/parts.mjs',logLevel:'silent'});
 const lib=await import(dir+'/parts.mjs');
 assert.equal(lib.TUTORIAL_PARTS.length,25);
 for(const tour of [...Object.values(lib.PART_TOURS),lib.HOME_TOUR,lib.DECK_TOUR,lib.CARDS_TOUR])for(const s of tour){
  for(const k of ['title','body']){assert(s[k].ja&&s[k].en&&s[k].ko);assert(!/[가-힣]/.test(s[k].ja),'Japanese copy is translated');assert(!/[가-힣]/.test(s[k].en),'English copy is translated');}
 }
 assert.notEqual(lib.tutorialPartKey(0,'alice'),lib.tutorialPartKey(0,'bob'),'progress is account scoped');
 assert(lib.PART_TOURS[0].some(s=>s.action==='inspect'),'first lesson requires real card inspection');
 assert.equal(lib.PART_TOURS[12].filter(s=>s.selector?.includes('log')).length,2,'log is open/read-and-close');
 for(const tour of Object.values(lib.PART_TOURS))for(const s of tour)if(s.action==='play'&&s.pointer?.startsWith('#hand'))assert(s.dragTo,'hand play has a visible destination');
 const solved=[];
 for(let part=0;part<lib.HOME_PART;part++){
  const run=lib.createPartRun(part);
  if(!run.scenes[0].steps.length){assert(lib.PART_TOURS[part]);continue;}
  if(part===2)assert.deepEqual(run.state.players[0].hand.map(c=>c.id),['STARTER_MANA']);
  if(part===6)assert(run.state.players[0].deck.length&&run.state.players[0].discard.length);
  for(let n=0;n<240&&!run.done;n++){
   let action;
   if(run.phase==='review')action={type:'continueLesson'};
   else if(lib.actingSide(run.state)===1)action=lib.tutorialOpponentAction(run);
   else action=lib.botActions(run.state).filter(a=>lib.tutorialActionAllowed(run,a)).find(a=>{const next=lib.reduce(run.state,a);return next.state.rng!==run.state.rng||lib.actionChangesState(run.state,next.state);});
   assert(action,`part ${part+1}, scene ${run.scene}, step ${run.step}: no legal action`);
   lib.advanceLesson(run,action);
  }
  assert(run.done,`part ${part+1} completes`);solved[part]=run;
 }
 assert.equal(solved[0].state.players[1].hp,41);
 assert.deepEqual([solved[2].state.players[0].mana,solved[2].state.players[0].maxMana],[2,6]);
 assert(solved[8].state.players[0].removed.some(c=>c.id==='STARTER_TRASH'));
 assert.deepEqual(solved[5].actions.map(a=>a.type),['buyMarket','buySupply','endTurn','endTurn','refresh','continueLesson']);
 assert.equal(solved[5].state.players[0].mana,6);
 assert(solved[6].state.players[0].hand.some(c=>c.id==='M4'),'purchased Hare actually drawn');
 assert.equal(solved[1].state.players[1].hp,35,'overflow and kill effect');
 assert.equal(solved[22].state.winner,0);
 assert(solved.filter(Boolean).every(run=>run.scenes.every(scene=>!scene.question)));
 console.log('PASS new tutorial: all 23 board parts, real purchases/refresh/shuffle, starters/dice, attacks/victory, translations and account isolation');
}finally{await rm(dir,{recursive:true,force:true});}
