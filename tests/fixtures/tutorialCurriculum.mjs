import assert from 'node:assert/strict';
/** Drive legal actions, including the opponent, through the production reducer. */
export function solveTutorial(lib,lesson,onScene=()=>{}){
 const {createLesson,advanceLesson,currentScene,tutorialOpponentAction,tutorialActionAllowed,botActions,reduce,actionChangesState,actingSide}=lib;
 const run=createLesson(lesson),observed=new Set();
 for(let n=0;n<240&&!run.done;n++){
  if(run.phase!=='play'&&!observed.has(run.scene)){observed.add(run.scene);onScene(run);}
  const g=run.state;let action;
  if(run.phase==='review')action={type:'continueLesson'};
  else if(run.phase==='question')action={type:'answer',choice:currentScene(run).question.correct};
  else if(actingSide(g)===1)action=tutorialOpponentAction(run);
  else action=botActions(g).filter(a=>tutorialActionAllowed(run,a)).find(a=>{const next=reduce(g,a);return next.state.rng!==g.rng||actionChangesState(g,next.state);});
  assert(action,`${lesson} scene ${run.scene} step ${run.step}: no legal next action`);
  advanceLesson(run,action);
 }
 assert(run.done,`${lesson}: did not complete`);return run;
}

/** Isolated bundle keeps browser QA runnable without pre-existing temporary files. */
export async function tutorialTranscripts(){
 const {build}=await import('esbuild'),fs=await import('node:fs/promises'),{tmpdir}=await import('node:os'),path=await import('node:path');
 const dir=await fs.mkdtemp(path.join(tmpdir(),'lore-tutorial-transcripts-'));
 try{await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialSteps';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/rules.mjs',logLevel:'silent'});const lib=await import(dir+'/rules.mjs');return Object.fromEntries(lib.TUT_STEPS.map(s=>[s.id,solveTutorial(lib,s.id).actions]));}finally{await fs.rm(dir,{recursive:true,force:true});}
