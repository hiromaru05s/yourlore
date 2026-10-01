import {reduce} from '../../../shared/engine';
import type {GameState,GameEvent,Action} from '../../../shared/types';
import {arrivalFixture,card} from './fixtures';
export {stateStages} from './stages';
export type StateFixture={before:GameState;after:GameState;events:GameEvent[];resource:'dew'|'shield';stage:string;sourceId:string;owner:0|1};
export function stateFixture(cue:string,owner:0|1,stage:string):StateFixture{
 let g=arrivalFixture('M2',owner).before,events:GameEvent[]=[];
 for(const p of g.players){p.dew=0;p.shield=0;p.hp=20;p.hand=[];p.deck=Array.from({length:6},(_,i)=>card('M2',`r3-state-deck-${p.id}-${i}`));}
 const apply=(a:Action)=>{const r=reduce(g,a);g=r.state;events.push(...r.events);};
 const resource=cue==='N001'?'dew':'shield',sourceId=cue==='N001'?'NOURISHING_RAIN':'DEFENSIVE_STANCE';
 g.players[owner].hand=[card(sourceId,'r3-state-source')];
 let before=structuredClone(g);apply({type:'play',idx:0});
 if(stage==='hold'){before=structuredClone(g);events=[];}
 else if(stage==='heal'||stage==='expire'){
  apply({type:'endTurn'});before=structuredClone(g);events=[];apply({type:'endTurn'});
 }else if(stage==='absorb'||stage==='break'){
  const foe=(1-owner) as 0|1;g.cur=foe;g.players[foe].hand=[card(stage==='absorb'?'M2':'TGE7','r3-state-attacker')];apply({type:'play',idx:0});
  before=structuredClone(g);events=[];apply({type:'attack',uid:'r3-state-attacker'});
 }
 if(stage==='gain'&&(g.players[owner][resource]??0)<=(before.players[owner][resource]??0))throw Error('Resource gain not produced');
 if(stage==='heal'&&(g.players[owner].hp<=before.players[owner].hp||g.players[owner].dew!==before.players[owner].dew))throw Error('Dew heal must preserve Dew');
 if(stage==='expire'&&g.players[owner].shield!==0)throw Error('Shield did not expire');
 if(stage==='absorb'&&((g.players[owner].shield??0)>=(before.players[owner].shield??0)||g.players[owner].hp!==before.players[owner].hp))throw Error('Shield absorption must preserve HP');
 if(stage==='break'&&(g.players[owner].shield!==0||g.players[owner].hp>=before.players[owner].hp))throw Error('Shield overflow did not reach HP');
 return {before,after:g,events,resource,stage,sourceId,owner};
}
