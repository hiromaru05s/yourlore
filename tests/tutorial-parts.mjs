import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';

const dir=await mkdtemp(tmpdir()+'/lore-tutorial-parts-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialParts';export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialGuide';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/parts.mjs',logLevel:'silent'});
 const lib=await import(dir+'/parts.mjs');
 assert.equal(lib.TUTORIAL_PARTS.length,13);
 assert.deepEqual(lib.TUTORIAL_PARTS.map(p=>p.kind),['board','board','board','practice','practice','practice','practice','practice','practice','practice','practice','home','deck']);
 assert.equal(lib.PART_TOURS[0].length,25,'the first board tour exposes each essential control separately');
 assert(lib.PART_TOURS[0].every((step,i,all)=>i===0||all.slice(0,i).some(prev=>!prev.skipOnBack)),'every step can be reached again with Back');
 {
  const {run,history}=lib.createPartStart(0),[me,opp]=run.state.players;
  assert.equal(opp.hp,10,'the first duel starts at opposing Spirit 10');
  assert(me.field.some(c=>c.id==='DRAGON_RIDER')&&me.enchants.some(e=>e.card.id==='E3')&&opp.field.some(c=>c.id==='M1'),'monster, effect card and enemy target are on the board');
  assert(history.filter(e=>e.type==='turnHeader').length>=4&&history.some(e=>e.type==='log'&&/14/.test(e.html)),'the battle log holds the real opening history');
  lib.advanceLesson(run,{type:'play',idx:me.hand.findIndex(c=>c.id==='STARTER_MANA')});
  assert.deepEqual([run.state.players[0].mana,run.state.players[0].maxMana],[2,6],'Attune spends mana and raises the maximum');
  lib.advanceLesson(run,{type:'attack',uid:run.state.players[0].field[0].uid});
  lib.advanceLesson(run,{type:'chooseTarget',uid:run.state.players[1].field[0].uid});
  assert.equal(run.state.winner,0,'Dragon Rider pierces through Spark Imp for the win');
 }
 assert.equal(lib.PART_TOURS[3].length,3,'both markets and reroll are introduced before buying');
 for(const part of [0,1,2])assert.equal(lib.partScenes(part).length,1);
 const solved=[];
 for(let part=3;part<=10;part++){
  const run=lib.createPartRun(part);
  for(let n=0;n<240&&!run.done;n++){
   let action;
   if(run.phase==='review')action={type:'continueLesson'};
   else if(lib.actingSide(run.state)===1)action=lib.tutorialOpponentAction(run);
   else action=lib.botActions(run.state).filter(a=>lib.tutorialActionAllowed(run,a)).find(a=>{const next=lib.reduce(run.state,a);return next.state.rng!==run.state.rng||lib.actionChangesState(run.state,next.state);});
   assert(action,`part ${part+1}, scene ${run.scene}, step ${run.step}: no legal action`);
   lib.advanceLesson(run,action);
  }
  assert(run.done,`part ${part+1} completes`);solved.push(run);
 }
 assert(solved[1].actions.some(a=>a.type==='buySupply'||a.type==='buyMarket')&&solved[1].actions.some(a=>a.type==='endTurn'),'purchase cycle is physically performed');
 assert(solved[2].state.players[0].field.some(c=>c.id==='M2'),'drawn monster is summoned');
 assert(solved[3].state.players[1].discard.some(c=>c.id==='M1'),'destroyed monster reaches graveyard');
 assert.equal(solved.at(-1).state.winner,0,'passive HP10 practice AI can be defeated');
 assert(solved.every(run=>run.scenes.every(scene=>!scene.question)),'the outline has no detached quizzes');
 console.log('PASS 13-part tutorial outline; board tours and 8 playable parts complete through the production reducer');
}finally{await rm(dir,{recursive:true,force:true});}
