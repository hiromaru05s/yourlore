import {reduce} from '../../../../shared/engine';
import type {GameState,GameEvent,CardInst,Action,Side} from '../../../../shared/types';
import type {Config} from '../fixture';import {mon} from '../fixture';
export function runCorrosion(g:GameState,cfg:Config,source:CardInst){
 const p=g.players[cfg.side],opp=(1-cfg.side)as Side,o=g.players[opp];let action:Action={type:'play',idx:0},sourceZone:'hand'|'field'|'enchant'|'market'='hand';
 if(cfg.card==='QUICK_POISON'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);p.supply[0]=source;action={type:'buySupply',i:0};sourceZone='market';
 }
 const collapse=['A041','A042'].includes(cfg.item)||cfg.item==='A040'&&cfg.card==='POISON_MASTER';
 if(collapse){
  o.field=[mon('M4','r3-decay-target'),mon('ELF','r3-decay-neighbor')];o.field[0].decayCnt=cfg.card==='POISON_MASTER'?0:2;
  p.hand=p.hand.filter(c=>c.uid!==source.uid);
  if(source.t==='mon'){p.field.push(mon(source.id,source.uid));sourceZone='field';}else{p.enchants.push({card:source,turns:99,bornTurn:1});sourceZone='enchant';p.field.push(mon('RUST_SHROOM','r3-decay-attacker'));}
  action={type:'attack',uid:source.t==='mon'?source.uid:'r3-decay-attacker'};
 }
 let result=reduce(g,action);const events:GameEvent[]=[...result.events];
 for(let step=0;step<4&&result.state.pending;step++){
  const pending=result.state.pending;let uid:string|null=null;
  if(pending.reason==='grantDecay')uid=result.state.players[cfg.side].field.find(m=>!m.passive?.includes('decay')&&!m.passivesG?.includes('decay'))?.uid??null;
  else if(pending.kind==='oppMon')uid=collapse?'r3-decay-target':result.state.players[opp].field.find(m=>m.id==='M4')?.uid??null;
  else if(pending.kind==='cardChoice')uid=result.state.players[opp].field.find(m=>m.id==='M4')?.uid??null;
  const next=reduce(result.state,{type:'chooseTarget',uid});if(JSON.stringify(next.state.pending)===JSON.stringify(result.state.pending)&&next.events.length===0)break;result=next;events.push(...next.events);
 }
 return {state:result.state,events,sourceZone};
}
