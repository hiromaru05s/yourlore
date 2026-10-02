import {reduce} from '../../../../shared/engine';
import type {GameState,GameEvent,CardInst,Action,Side} from '../../../../shared/types';
import type {Config} from '../fixture';
import {inst,mon} from '../fixture';
export interface DiceRun {state:GameState;events:GameEvent[];sourceZone:'hand'|'field'|'enchant'|'quest';initialRolls?:number[];prediction?:number;success:boolean}
export function runDice(g:GameState,cfg:Config,source:CardInst):DiceRun {
 const p=g.players[cfg.side],opp=(1-cfg.side)as Side;let sourceZone:DiceRun['sourceZone']='hand',action:Action={type:'play',idx:0};
 const cue=cfg.item.startsWith('A');let prediction:number|undefined;
 const putField=()=>{p.hand=p.hand.filter(c=>c.uid!==source.uid);p.field.push(mon(source.id,source.uid));sourceZone='field';};
 const putEnchant=()=>{p.hand=p.hand.filter(c=>c.uid!==source.uid);p.enchants.push({card:source,turns:99,bornTurn:1});sourceZone='enchant';};
 if(cue&&cfg.card==='GAMBLER'||cue&&cfg.card==='LEGEND_GAMBLER'){
  putField();g.cur=opp;action={type:'endTurn'};
 }else if(cue&&cfg.card==='CASINO'){
  putField();p.field.at(-1)!.gcount=11;p.hand.unshift(inst('S1','r3-trigger'));for(const pl of g.players)pl.hp=120;
 }else if(cue&&['FATE_WHEEL','LUCKY_ECHO','NO_PAIN'].includes(cfg.card)){
  putEnchant();if(cfg.card==='NO_PAIN'){p.hand.unshift(inst('CURSE','r3-trigger'));}else p.hand.unshift(inst(cfg.card==='FATE_WHEEL'?'S1':'GAMBLE','r3-trigger'));
 }else if(cue&&cfg.card==='Q_CHEAT'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);(p.quests??=[]).push({card:source,progress:cfg.outcome==='miss'?18:19,startedTurn:1});sourceZone='quest';p.hand.unshift(inst('S1','r3-trigger'));
 }
 let result=reduce(g,action);let events=[...result.events];let initialRolls:number[]|undefined;
 if(result.state.pending?.reason==='gamblerGuess'){
  prediction=1;const chosen=reduce(result.state,{type:'pick',uid:'1'});result=chosen;events.push(...chosen.events);
  if(result.state.pending?.reason==='gamblerPick'){const reward=reduce(result.state,{type:'pick',uid:cfg.outcome==='heal'?'2':'1'});result=reward;events.push(...reward.events);}
 }
 if(result.state.pending?.kind==='reroll'){
  if(cfg.outcome!=='miss')initialRolls=events.filter((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice').flatMap(e=>e.rolls);
  const rerolled=reduce(result.state,{type:'pick',uid:cfg.outcome==='miss'?null:'re'});result=rerolled;events.push(...rerolled.events);
 }
 // Complete the real quest picker using a visible enemy monster.
 if(cue&&cfg.card==='Q_CHEAT'&&result.state.pending){const picked=reduce(result.state,{type:'pick',uid:result.state.players[opp].deck[0]?.uid??null});result=picked;events.push(...picked.events);}
 const ownDice=events.filter((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice'&&e.player===cfg.side);
 let success=true;
 if(cfg.card==='FATE_WHEEL'&&cue)success=cfg.outcome!=='miss';
 else if(cfg.card==='Q_CHEAT'&&cue)success=!result.state.players[cfg.side].quests?.some(q=>q.card.uid===source.uid);
 else if(cfg.card==='S1')success=(ownDice[0]?.rolls[0]||0)<=2;
 if(cfg.card==='ND3'){success=result.state.players[cfg.side].maxMana>g.players[cfg.side].maxMana;prediction=events.find((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice'&&e.player===opp)?.rolls[0];}
 else if(cfg.card==='LEGEND_GAMBLER'&&cue)success=ownDice.flatMap(e=>e.rolls).includes(prediction!);
 else if(cfg.card==='CASINO'&&cue)success=(ownDice.find(e=>e.variant==='casino')?.rolls[0]??0)>=3;
 else if(cfg.card==='LUCKY_ECHO'&&cue)success=ownDice.some(e=>e.rolls.includes(6));
 else if(cfg.card==='NO_PAIN'&&cue)success=result.state.players[cfg.side].maxMana>p.maxMana;
 else if(ownDice.some(e=>e.success!==undefined))success=ownDice.filter(e=>e.success!==undefined).at(-1)!.success!;
 return {state:result.state,events,sourceZone,initialRolls,prediction,success};
}
