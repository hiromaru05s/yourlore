import assert from 'node:assert/strict';
import{build}from'esbuild';import{mkdtemp,rm,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';import{solveTutorial}from'./fixtures/tutorialCurriculum.mjs';
const dir=await mkdtemp(tmpdir()+'/lore-pace-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialSteps';export * from './client/src/shared/tutorialBrief';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/lib.mjs',logLevel:'silent'});
 const l=await import(dir+'/lib.mjs');let chars=0,originalChars=0,scenes=0,playerActions=0,questions=0,reviews=0,opponentActions=0;
 for(const lesson of l.TUT_STEPS){const solved=solveTutorial(l,lesson.id),r=l.createLesson(lesson.id);
  r.scenes.forEach((s,i)=>{const b=l.tutorialBrief(lesson.id,i);assert(b.intro&&b.result,lesson.id+':'+i);const extra=(s.question?s.question.prompt.ja.length+s.question.options.map(o=>o.ja).join('').length:0)+s.steps.map(x=>x.hint?.ja??'').join('').length;chars+=b.intro.length+b.result.length+extra;originalChars+=s.intro.ja.length+s.result.ja.length+extra;scenes++;});
  for(const action of solved.actions){if(action.type==='answer')questions++;else if(action.type==='continueLesson'){if(!l.currentScene(r).question)reviews++;}else if(l.actingSide(r.state))opponentActions++;else playerActions++;l.advanceLesson(r,action);}
  assert(l.replayLesson(lesson.id,solved.actions));
 }
 assert.equal(scenes,66);assert.equal(questions,35);assert.equal(playerActions,133);assert.equal(l.TUT_STEPS.reduce((n,s)=>n+s.reward,0),5000);assert(chars<originalChars);
 // Design budget, NOT a measured human completion time. Reading and action time
 // are added (no assumed overlap). Cold downloads and voluntary rereading excluded.
 const assumptions={japaneseCharactersPerMinute:800,secondsPerPlayerAction:1.5,secondsPerAnswerOrReview:1,systemAndPaymentAllowanceSeconds:60};
 const seconds=chars/assumptions.japaneseCharactersPerMinute*60+playerActions*assumptions.secondsPerPlayerAction+(questions+reviews)*assumptions.secondsPerAnswerOrReview+assumptions.systemAndPaymentAllowanceSeconds;
 assert(seconds<=900,`Quick-path design budget ${seconds}s exceeds 15 minutes`);
 const report={lessons:36,scenes,questions,playerActions,opponentActions,manualReviews:reviews,extraPostAnswerConfirmations:0,betweenLessonClicks:0,chars,originalChars,assumptions,designBudgetSeconds:Math.round(seconds),humanStudy:false};
 if(process.env.TUTORIAL_PACE_REPORT)await writeFile(process.env.TUTORIAL_PACE_REPORT,JSON.stringify(report,null,2)+'\n');console.log('PASS tutorial pace design budget',JSON.stringify(report));
}finally{await rm(dir,{recursive:true,force:true});}
