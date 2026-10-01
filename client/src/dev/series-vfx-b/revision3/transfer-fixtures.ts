import {reduce} from '../../../shared/engine';
import type {Action,GameState,GameEvent} from '../../../shared/types';
import {arrivalFixture,card} from './fixtures';
export const transferCues=new Set(['A006','A008','A010','A016']);
export type TransferFixture={before:GameState;after:GameState;events:GameEvent[];sourceUid:string;sourceId:string;seed:number;returnedUid?:string;origins:Record<string,'deck'|'shelf'|'effect'>};
export function transferFixture(cue:string,selected:string,owner:0|1):TransferFixture{
 for(let seed=724;seed<980;seed++){
  let f=arrivalFixture(cue==='A008'?'GENESIS_SONG':cue==='A010'?'TPO3':cue==='A016'?'TPO1':selected,owner,seed);
  let g=f.after,before=f.before,events:GameEvent[]=[...f.events],sourceUid='r3-focus',returnedUid:string|undefined;
  const apply=(a:Action)=>{const r=reduce(g,a);g=r.state;events.push(...r.events);};
  if(cue==='A010'){
   const foe=(1-owner) as 0|1;g.cur=foe;g.players[foe].hand=[card('M2','r3-copy-target')];apply({type:'play',idx:0});
   g.cur=owner;g.players[owner].hand=[card('TGE7','r3-copy-attacker')];apply({type:'play',idx:0});
   before=structuredClone(g);events=[];apply({type:'attack',uid:'r3-copy-attacker'});if(g.pending?.reason==='attack')apply({type:'chooseTarget',uid:'r3-copy-target'});
   if(!events.some(e=>e.type==='summon'&&e.id==='M2'))continue;
  }else if(cue==='A016'){
   before=structuredClone(g);events=[];apply({type:'chooseTarget',uid:'r3-prey'});returnedUid='r3-prey';
   if(!g.players[1-owner].hand.some(c=>c.uid===returnedUid)||g.players[1-owner].field.some(c=>c.uid===returnedUid))throw Error('Actual return-to-hand did not resolve');
  }else if(cue==='A006'&&!events.some(e=>e.type==='summon'))continue;
  const origins:TransferFixture['origins']={};
  for(const e of events)if(e.type==='summon')origins[e.uid]=cue==='A008'?(before.players[owner].deck.some(c=>c.id===e.id)?'deck':'shelf'):'effect';
  return {before,after:g,events,sourceUid,sourceId:cue==='A008'?'GENESIS_SONG':cue==='A010'?'TPO3':cue==='A016'?'TPO1':selected,seed,returnedUid,origins};
 }
 throw Error(`${cue}: no seed produced the requested actual effect`);
}
