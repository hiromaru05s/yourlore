import { actingSide, reduce, monsterCanAttack } from './engine';
import { botActions, actionChangesState } from './botActions';
import type { Action, GameEvent, GameState, ReduceResult } from './types';
import { type LessonId, TUT_STEPS } from './tutorialSteps';
import { practiceBoard, type PracticeScene } from './tutorial/model';
import { tutorialScenes } from './tutorial/scenes';
export type TutorialAction=Action|{type:'continueLesson'}|{type:'answer';choice:number};
export const TUTORIAL_ACTION_LIMIT=240;
export interface LessonRun {id:LessonId;state:GameState;actions:TutorialAction[];facts:Set<string>;done:boolean;scene:number;step:number;phase:'play'|'question'|'review';wrongAnswer:boolean;events:GameEvent[];stepTurn:number;scenes:PracticeScene[];}
export function createLesson(id:LessonId):LessonRun {
 if(!TUT_STEPS.some(s=>s.id===id))throw Error('Unknown lesson');
 const scenes=tutorialScenes(id),state=practiceBoard(scenes[0]);
 return{id,state,scenes,actions:[],facts:new Set(),done:false,scene:0,step:0,phase:'play',wrongAnswer:false,events:[],stepTurn:state.turn};
}
export function currentScene(run:LessonRun):PracticeScene{return run.scenes[run.scene];}
export function tutorialOpponentAction(run:LessonRun):Action|null {
 const g=run.state;if(run.done||run.phase!=='play'||g.over||actingSide(g)!==1)return null;
 const mode=currentScene(run).opponent;
 const candidates=botActions(g).filter(a=>g.pending||mode==='duel'?true:mode==='attack'?a.type==='attack'||a.type==='endTurn':mode==='summon'?a.type==='endTurn'||a.type==='play'&&g.players[1].hand[a.idx]?.t==='mon':a.type==='endTurn');
 // Stable ordering: resolve choices, play the prepared hand, attack, then pass.
 for(const a of candidates){const next=reduce(g,a);if(next.state.rng!==g.rng||actionChangesState(g,next.state))return a;}
 return {type:'endTurn'};
}
function choiceMatches(run:LessonRun,uid:string,id:string):boolean {
 return run.state.players.some(p=>[...p.hand,...p.deck,...p.discard,...p.field,...(p.removed??[])].some(c=>c.uid===uid&&c.id===id));
}
export function tutorialActionAllowed(run:LessonRun,action:TutorialAction):boolean {
 if(run.done||run.actions.length>=TUTORIAL_ACTION_LIMIT)return false;
 if(action.type==='continueLesson')return run.phase==='review';
 if(action.type==='answer')return run.phase==='question'&&Number.isInteger(action.choice)&&action.choice>=0&&action.choice<(currentScene(run).question?.options.length??0);
 if(run.phase!=='play'||action.type==='surrender')return false;
 if(actingSide(run.state)===1)return JSON.stringify(action)===JSON.stringify(tutorialOpponentAction(run));
 if(action.type==='reorder')return true;
 if(run.state.pending){
   const step=currentScene(run).steps[run.step],target=step?.targetId;
   if(step?.requiredChoice===run.state.pending.reason&&(action.type==='pick'||action.type==='chooseTarget')){
    if(action.uid===null||target&&!choiceMatches(run,action.uid,target))return false;
   }
   if(target&&run.state.pending.reason==='attack'&&(action.type==='pick'||action.type==='chooseTarget'))return run.state.players[1].field.some(m=>m.uid===action.uid&&m.id===target);
   return action.type==='pick'||action.type==='chooseTarget';
 }
 const step=currentScene(run).steps[run.step];if(!step)return false;
 if(step.action==='free')return true;
 if(action.type!==step.action)return false;
 if(action.type==='play'){
   if(step.requiredChoice&&action.targets!==undefined&&(!action.targets.length||step.targetId&&action.targets.some(uid=>!choiceMatches(run,uid,step.targetId!))))return false;
   return run.state.players[0].hand[action.idx]?.id===step.id;
 }
 if(action.type==='buyMarket')return run.state.market[action.i]?.id===step.id;
 if(action.type==='buySupply')return run.state.players[0].supply[action.i]?.id===step.id;
 if(action.type==='attack')return run.state.players[0].field.some(m=>m.uid===action.uid&&(!step.id||m.id===step.id)&&monsterCanAttack(run.state,run.state.players[0],m));
 return true;
}
function stepCompleted(run:LessonRun):boolean {
 const {state:g,events}=run,step=currentScene(run).steps[run.step];
 if(g.pending)return false;
 if(step.goal)return step.goal(g,events);
 switch(step.action){
 case 'play':return events.some(e=>(e.type==='playSpell'&&e.id===step.id&&e.player===0)||(e.type==='summon'&&e.id===step.id&&e.player===0))||g.players[0].quests?.some(q=>q.card.id===step.id)===true;
 case 'attack':return events.some(e=>e.type==='attack'&&e.player===0);
 case 'buyMarket':case 'buySupply':return events.some(e=>e.type==='buy'&&e.player===0&&e.id===step.id);
 case 'refresh':return run.facts.has('refresh');
 case 'endTurn':return g.over||(g.cur===0&&g.turn>run.stepTurn);
 default:return false;
 }
}
/** The exact same scene, enemy policy, actions and answers are replayed on the server. */
export function advanceLesson(run:LessonRun,action:TutorialAction):ReduceResult {
 if(!tutorialActionAllowed(run,action))return{state:run.state,events:[]};
 run.actions.push(structuredClone(action));
 if(action.type==='answer'){
   run.wrongAnswer=action.choice!==currentScene(run).question!.correct;
   if(!run.wrongAnswer)run.phase='review';
   return{state:run.state,events:[]};
 }
 if(action.type==='continueLesson'){
   if(run.scene===run.scenes.length-1){run.done=true;return{state:run.state,events:[]};}
   run.scene++;run.step=0;run.phase='play';run.events=[];run.facts.clear();run.wrongAnswer=false;
   const names=run.state.players.map(p=>p.name);run.state=practiceBoard(currentScene(run));run.state.players.forEach((p,i)=>p.name=names[i]);run.stepTurn=run.state.turn;
   return{state:run.state,events:[]};
 }
 const previous=run.state,result=reduce(previous,action);run.state=result.state;run.events.push(...result.events);
 for(const e of result.events){run.facts.add(e.type);if('id'in e)run.facts.add(`${e.type}:${e.id}`);}
 if(action.type==='refresh'&&run.state.players[0].mana<previous.players[0].mana)run.facts.add('refresh');
 if(stepCompleted(run)){
   run.step++;run.events=[];run.stepTurn=run.state.turn;
   if(run.step>=currentScene(run).steps.length)run.phase=currentScene(run).question?'question':'review';
 }
 return result;
}
export function replayLesson(id:LessonId,actions:TutorialAction[]):boolean {
 if(!actions.length||actions.length>TUTORIAL_ACTION_LIMIT)return false;
 const run=createLesson(id);
 for(const action of actions){if(!tutorialActionAllowed(run,action))return false;advanceLesson(run,action);}
 return run.done;
}
