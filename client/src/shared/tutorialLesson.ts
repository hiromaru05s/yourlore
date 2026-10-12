import { DB, STARTERS } from './cards';
import { createGame, reduce } from './engine';
import type { Action, CardInst, FieldMon, GameState, ReduceResult } from './types';
import { TUT_STEPS, type LessonId } from './tutorialSteps';

/** Shared deterministic practice setup and success checks. Never changes card definitions. */
export interface LessonRun { id: LessonId; state: GameState; actions: Action[]; facts: Set<string>; done: boolean; }
export const TUTORIAL_ACTION_LIMIT = 120;
export function createLesson(id: LessonId): LessonRun {
  if (!TUT_STEPS.some(s => s.id === id)) throw new Error('Unknown lesson');
  const { state: g } = createGame({mode:'bot', seed:20261012, starting:0, p0:{id:'learner',name:'SEEKER'}, p1:{id:'guide',name:'MANA',isBot:true}});
  const card = (id: string): CardInst => ({...structuredClone(DB[id] ?? STARTERS[id]), uid:`lesson-${++g.uidSeq}`});
  const mon = (id: string): FieldMon => ({...card(id), exhausted:false, tempAtk:0, atkMod:0, defMod:0, summonedTurn:0});
  for (const p of g.players) { p.hand=[]; p.deck=[]; p.discard=[]; p.field=[]; p.hp=40; }
  const me=g.players[0], opp=g.players[1];
  me.deck=Array.from({length:9},()=>card('STARTER_TRASH'));
  opp.deck=Array.from({length:9},()=>card('STARTER_TRASH'));
  // Predictable genuine offers retain the production market rules and card costs.
  g.market[0]=card('M4');
  switch(id) {
    case 'mana': me.hand=[card('STARTER_MANA')]; break;
    case 'summon': me.hand=[card('M4')]; break;
    case 'combat': me.field=[mon('M4')]; opp.field=[mon('M1')]; break;
    case 'spell': me.hand=[card('S3')]; me.field=[mon('M4')]; break;
    case 'cycle': me.deck=[]; break;
    case 'market': break;
    case 'rift': me.hand=[card('STARTER_TRASH')]; break;
    case 'chest': me.hand=[card('STARTER_CHEST')]; break;
    case 'enchant': me.hand=[card('E3')]; break;
    case 'tribe': me.maxMana=7; me.mana=7; me.hand=[card('TSO2'),card('TSO3')]; break;
    case 'hand': me.hand=Array.from({length:8},()=>card('STARTER_CHEST')); break;
    case 'duel': me.maxMana=6; me.mana=6; me.hand=[card('M4'),card('M4'),card('S1')]; opp.field=[mon('M1')]; opp.hp=8; break;
  }
  return {id,state:g,actions:[],facts:new Set(),done:false};
}

/** The learner controls side 0 only; the guide can ONLY pass its turn. */
export function advanceLesson(run: LessonRun, action: Action): ReduceResult {
  if(run.done || run.actions.length >= TUTORIAL_ACTION_LIMIT || action.type==='surrender' || (run.state.cur===1 && action.type!=='endTurn')) return {state:run.state,events:[]};
  const prev=run.state;
  const result=reduce(prev,action);
  run.actions.push(structuredClone(action)); run.state=result.state;
  const me=run.state.players[0], facts=run.facts;
  for(const e of result.events) {
    if('player' in e && e.player===0) {
      facts.add(e.type);
      if(e.type==='buy')facts.add(`buy:${e.id}`);
      if(e.type==='playSpell')facts.add(`play:${e.id}`);
      if(e.type==='attack')facts.add(e.targetUid ? 'targetAttack' : 'directAttack');
    }
  }
  if(action.type==='refresh' && prev.cur===0 && (me.mana<prev.players[0].mana || (me.refreshTokens??0)<(prev.players[0].refreshTokens??0)))facts.add('refresh');
  if(prev.pending?.reason==='handCap' && (action.type==='pick'||action.type==='chooseTarget') && action.uid && prev.players[0].hand.some(c=>c.uid===action.uid) && !me.hand.some(c=>c.uid===action.uid))facts.add('choseDiscard');
  switch(run.id) {
    case 'mana': run.done=facts.has('play:STARTER_MANA') && me.maxMana>4; break;
    case 'summon': run.done=facts.has('summon') && facts.has('directAttack'); break;
    case 'combat': run.done=facts.has('targetAttack') && run.state.players[1].field.length===0 && run.state.players[1].hp<40; break;
    case 'spell': run.done=facts.has('play:S3') && !run.state.pending && me.field.some(m=>m.atkMod>0); break;
    case 'cycle': run.done=facts.has('buy:M4') && facts.has('reshuffle') && me.hand.some(c=>c.id==='M4'); break;
    case 'market': run.done=facts.has('refresh'); break;
    case 'rift': run.done=(me.removed??[]).some(c=>c.id==='STARTER_TRASH'); break;
    case 'chest': run.done=facts.has('treasure'); break;
    case 'enchant': run.done=facts.has('play:E3') && run.state.turn>=3 && run.state.cur===0 && facts.has('enchantActivate'); break;
    case 'tribe': run.done=me.tribesFired.length>0 && me.field.some(m=>m.id==='TSO2') && me.field.some(m=>m.id==='TSO3'); break;
    case 'hand': run.done=facts.has('choseDiscard') && run.state.turn>=3 && run.state.cur===0; break;
    case 'duel': run.done=run.state.over && run.state.winner===0; break;
  }
  // Mandatory choices must resolve before a completion overlay can hide them.
  if(run.state.pending)run.done=false;
  return result;
}
export function replayLesson(id: LessonId, actions: Action[]): boolean {
  if(actions.length===0 || actions.length>TUTORIAL_ACTION_LIMIT)return false;
  const run=createLesson(id);
  for(const action of actions) { if(run.done)return false; advanceLesson(run,action); }
  return run.done;
}
