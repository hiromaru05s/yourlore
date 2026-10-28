import { DB, STARTERS, hasPassive } from '../cards';
import { createGame } from '../engine';
import type { CardInst, FieldMon, GameState, GameEvent, Side } from '../types';
import { copy, type Copy } from '../tutorialSteps';
export {copy as c};
export type PracticeAction = 'play'|'attack'|'buyMarket'|'buySupply'|'refresh'|'endTurn'|'free';
export interface PracticeStep {action:PracticeAction;id?:string;targetId?:string;requiredChoice?:string;hint?:Copy;goal?:(g:GameState,events:GameEvent[])=>boolean;}
export interface Question {prompt:Copy;options:Copy[];correct:number;explanation:Copy;}
export interface PracticeScene {
 setup:(b:Board)=>void; steps:PracticeStep[]; intro:Copy; result:Copy; question?:Question;
 opponent?:'pass'|'attack'|'duel'|'summon'; seed?:number;
}
export interface Board {g:GameState;me:GameState['players'][0];opp:GameState['players'][0];card:(id:string)=>CardInst;mon:(id:string,side?:Side,extra?:Partial<FieldMon>)=>FieldMon;hand:(...ids:string[])=>void;mana:(n:number)=>void;removed:(n:number,id?:string)=>void;}
export function practiceBoard(scene:PracticeScene):GameState {
 const {state:g}=createGame({mode:'bot',seed:scene.seed??20261015,starting:0,p0:{id:'learner',name:'SEEKER'},p1:{id:'guide',name:'Zeno',isBot:true}});
 const card=(id:string):CardInst=>{const def=DB[id]??STARTERS[id];if(!def)throw Error('Missing tutorial card: '+id);return {...structuredClone(def),uid:`practice-${++g.uidSeq}`};};
 for(const p of g.players){p.hand=[];p.deck=[];p.discard=[];p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.removed=[];p.exile=[];p.hp=40;p.mana=p.maxMana=4;p.uses={};p.usesTurn={};p.tribesFired=[];p.supply=[null,null,null];}
 const [me,opp]=g.players;
 me.deck=Array.from({length:12},()=>card('STARTER_TRASH'));opp.deck=Array.from({length:12},()=>card('STARTER_TRASH'));
 g.market[0]=card('M4');g.marketStock=Array(7).fill(3);g.pending=null;delete g.opening;
 const mon=(id:string,side:Side=0,extra:Partial<FieldMon>={}):FieldMon=>{const c=card(id);const m:FieldMon={...c,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0,...(hasPassive(c,'guts')?{guts:1}:{}),...(c.hatchTurns?{hatch:c.hatchTurns,dur:c.hatchDur}:{}),...extra};g.players[side].field.push(m);return m;};
 scene.setup({g,me,opp,card,mon,hand:(...ids)=>{me.hand=ids.map(card);},mana:(n)=>{me.maxMana=me.mana=n;},removed:(n,id='STARTER_TRASH')=>{me.removed=Array.from({length:n},()=>card(id));}});
 // Prepared dice examples must not depend on initial market/deck RNG consumption.
 if(scene.seed!==undefined)g.rng=scene.seed;
 for(const p of g.players)p.supply=g.players[0].supply.slice();
 return g;
}
export const play=(id:string,hint?:Copy):PracticeStep=>({action:'play',id,hint});
export const attack=(id?:string,hint?:Copy):PracticeStep=>({action:'attack',id,hint});
export const end=(hint?:Copy):PracticeStep=>({action:'endTurn',hint});
export const buy=(id:string,offer=false):PracticeStep=>({action:offer?'buySupply':'buyMarket',id});
export const free=(goal:NonNullable<PracticeStep['goal']>,hint:Copy):PracticeStep=>({action:'free',goal,hint});
export function q(prompt:Copy,correct:Copy,wrong:Copy,explanation:Copy):Question {
 const position=[...prompt.en].reduce((n,c)=>n+c.charCodeAt(0),0)%2;
 return {prompt,options:position?[wrong,correct]:[correct,wrong],correct:position,explanation};
}
export function scene(setup:PracticeScene['setup'],steps:PracticeStep[],intro:Copy,result:Copy,question?:Question,opponent:PracticeScene['opponent']='pass'):PracticeScene{return{setup,steps,intro,result,question,opponent};}
