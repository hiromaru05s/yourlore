import {reduce} from '../../../shared/engine';
import type {GameState,GameEvent,Action} from '../../../shared/types';
import {arrivalFixture,card} from './fixtures';
export const eggCues=new Set(['A105','A106','A107','A108','A109','A110']);
export {eggStages} from './stages';
export type EggFixture={before:GameState;after:GameState;events:GameEvent[];eggId:string;focusUid:string;stage:string;seed:number;resultIds:string[]};
export function eggFixture(cue:string,selected:string,owner:0|1,stage:string):EggFixture{
 const eggId=cue==='A108'?'TGE1':cue==='A109'?'DRAGON_EGG':cue==='A110'||cue==='A107'||selected==='EGG_HUNTER'?'BEAST_EGG':selected;
 const hatch=['A108','A109','A110'].includes(cue);
 for(let seed=724;seed<980;seed++){
  let g=arrivalFixture(eggId,owner,seed).after,events:GameEvent[]=[];
  g.players[owner].maxMana=8;g.players[owner].mana=8;
  const apply=(action:Action)=>{const r=reduce(g,action);g=r.state;events.push(...r.events);};
  const play=(id:string,uid:string,who=owner)=>{g.cur=who;g.players[who].hand=[card(id,uid)];apply({type:'play',idx:0});};
  g.players[owner].deck=Array.from({length:12},(_,i)=>card('M2',`r3-next-${i}`));
  let before=structuredClone(g);
  if(cue==='A105'){
   events=[];if(stage==='tick')apply({type:'endTurn'});
  }else if(cue==='A107'){
   g.players[owner].hand=[card(selected,'r3-support')];before=structuredClone(g);events=[];apply({type:'play',idx:0});
   if(g.pending?.reason==='incubate')apply({type:'chooseTarget',uid:'r3-focus'});
  }else if(cue==='A106'){
   const foe=(1-owner) as 0|1;
   // Distinct real attackers allow repeated legal hits without resetting attack
   // counters or editing egg durability. The last hit is the captured action.
   const attacker=selected==='EGG_HUNTER'?'EGG_HUNTER':'M2';
   for(let i=0;i<7;i++){
    if(!g.players[owner].field.some(m=>m.uid==='r3-focus'))break;
    play(attacker,`r3-attacker-${i}`,foe);before=structuredClone(g);events=[];
    apply({type:'attack',uid:`r3-attacker-${i}`});
    if(g.pending?.reason==='attack')apply({type:'chooseTarget',uid:'r3-focus'});
    if(stage==='hit'||!g.players[owner].field.some(m=>m.uid==='r3-focus'))break;
   }
  }else if(hatch){
   if(cue==='A110'){
    for(let i=0;i<3;i++)play('M2',`r3-divine-target-${i}`,(1-owner) as 0|1);
    g.cur=owner;
   }
   for(let turn=0;turn<12;turn++){
    before=structuredClone(g);events=[];apply({type:'endTurn'});
    if(!g.players[owner].field.some(m=>m.uid==='r3-focus'))break;
   }
   const summoned=events.filter((e):e is Extract<GameEvent,{type:'summon'}>=>e.type==='summon');
   if(!summoned.some(e=>e.id===stage))continue;
   if(cue==='A110')for(let i=0;i<3&&g.pending;i++)apply({type:'chooseTarget',uid:`r3-divine-target-${i}`});
  }
  if(cue==='A106'&&!events.some(e=>e.type==='hit'))throw Error(`${cue}: no real hit event`);
  if(cue==='A106'&&stage==='break'&&g.players[owner].field.some(m=>m.uid==='r3-focus'))throw Error('Egg destruction did not occur');
  return {before,after:g,events,eggId,focusUid:'r3-focus',stage,seed,resultIds:events.filter((e):e is Extract<GameEvent,{type:'summon'}>=>e.type==='summon').flatMap(e=>e.id?[e.id]:[])};
 }
 throw Error(`${cue}/${stage}: no current reducer seed produced this hatch branch`);
}
