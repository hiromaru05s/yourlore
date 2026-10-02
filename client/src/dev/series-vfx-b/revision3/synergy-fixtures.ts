import {reduce} from '../../../shared/engine';
import type {Action,GameState,GameEvent} from '../../../shared/types';
import {arrivalFixture,card} from './fixtures';
export const synergyCues=new Set(['A165','A166','A170','A171','A172','A173']);
export type SynergyFixture={before:GameState;after:GameState;events:GameEvent[];participants:string[];family:string;threshold:number;owner:0|1};
export function synergyFixture(cue:string,last:string,owner:0|1):SynergyFixture{
 const threshold=cue==='A171'?3:cue==='A172'?4:cue==='A173'?6:2;
 const family=cue==='A165'?'S18':cue==='A166'?'S19':'S16';
 const pool=family==='S18'?['TPO2','TPO3','TPO1','TPO5']:family==='S19'?['TAR1','TAR2','TAR3','TAR5']:['TGE1','TGE2','TGE3','TGE4','TGE5','TGE6'];
 const chosen=[...pool.filter(id=>id!==last).slice(0,threshold-1),last];
 let g=arrivalFixture('M2',owner).before,events:GameEvent[]=[];g.players[owner].hand=[];
 const apply=(a:Action)=>{const r=reduce(g,a);g=r.state;events.push(...r.events);};
 if(chosen.includes('TPO1')){g.cur=(1-owner) as 0|1;g.players[1-owner].hand=[card('M2','r3-synergy-prey')];apply({type:'play',idx:0});g.cur=owner;}
 let before=structuredClone(g);
 for(let i=0;i<chosen.length;i++){
  const id=chosen[i],uid=`r3-synergy-${i}`;g.players[owner].hand=[card(id,uid)];
  if(i===chosen.length-1){before=structuredClone(g);events=[];}
  apply({type:'play',idx:0});
  if(g.pending?.reason==='emberBuff'){const m=g.players[owner].field.find(m=>m.uid!==uid&&m.tribe==='시초');if(m)apply({type:'chooseTarget',uid:m.uid});}
  if(g.pending?.reason==='bounceLow')apply({type:'chooseTarget',uid:'r3-synergy-prey'});
  if(g.pending?.allowCancel&&!g.over)apply({type:'chooseTarget',uid:null});
 }
 const tribe=family==='S18'?'포식':family==='S19'?'귀족':'시초';
 if(!g.players[owner].tribesFired.includes(`${tribe}:${threshold}`))throw Error('Current synergy threshold did not fire');
 if(cue==='A173'&&!events.some(e=>e.type==='win'&&e.winner===owner))throw Error('Origin victory event missing');
 return {before,after:g,events,participants:g.players[owner].field.filter(m=>m.tribe===tribe).map(m=>m.uid),family,threshold,owner};
}
