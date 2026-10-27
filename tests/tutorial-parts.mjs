import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-tutorial-parts-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialParts';export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/parts.mjs',logLevel:'silent'});
 const lib=await import(dir+'/parts.mjs');
 assert.equal(lib.TUTORIAL_PARTS.length,13);
 for(const tour of [...Object.values(lib.PART_TOURS),lib.HOME_TOUR,lib.DECK_TOUR,lib.CARDS_TOUR])for(const s of tour){
  for(const k of ['title','body']){assert(s[k].ja&&s[k].en&&s[k].ko);assert(!/[가-힣]/.test(s[k].ja),'Japanese copy is translated');assert(!/[가-힣]/.test(s[k].en),'English copy is translated');}
 }
 assert.notEqual(lib.tutorialPartKey(0,'alice'),lib.tutorialPartKey(0,'bob'),'progress is account scoped');
 assert(!lib.PART_TOURS[0].some(s=>s.action==='play'),'UI tour has no premature combat or mana exercise');
 assert.equal(lib.PART_TOURS[0].filter(s=>s.selector?.includes('log')).length,2,'log is open/read-and-close');
 const solved=[];
 for(let part=1;part<=10;part++){
  const run=lib.createPartRun(part);
  if(part===1)assert.deepEqual(run.state.players[0].hand.map(c=>c.id),['STARTER_MANA']);
  if(part===4)assert(run.state.players[0].deck.length&&run.state.players[0].discard.length);
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
 assert.deepEqual([solved[1].state.players[0].mana,solved[1].state.players[0].maxMana],[2,6]);
 assert(solved[2].state.players[0].removed.some(c=>c.id==='STARTER_TRASH'));
 assert(solved[2].actions.filter(a=>a.type==='play').length===3,'Stone Pup, Cull and Chest are played');
 assert.deepEqual(solved[3].actions.map(a=>a.type),['buyMarket','buySupply','refresh','continueLesson']);
 assert.equal(solved[3].state.players[0].mana,3);
 assert(solved[4].state.players[0].hand.some(c=>c.id==='M4'),'purchased Hare is actually drawn after shuffle');
 assert.equal(solved[6].state.players[1].hp,35,'overflow 3 plus Hare kill effect 2 are explained');
 assert.equal(solved[7].state.players[1].field[0].dmg,1);
 assert.equal(solved[10].state.winner,0);
 assert(solved.filter(Boolean).every(run=>run.scenes.every(scene=>!scene.question)));
 console.log('PASS new tutorial: all ten practices, real purchases/refresh/shuffle, starters/dice, attacks/victory, translations and account isolation');
}finally{await rm(dir,{recursive:true,force:true});}
