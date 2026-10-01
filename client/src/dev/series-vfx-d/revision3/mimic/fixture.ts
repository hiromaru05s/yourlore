import {reduce} from '../../../../shared/engine';import type {GameState,CardInst,Action,Side,GameEvent} from '../../../../shared/types';
import type {Config} from '../fixture';import {inst,mon} from '../fixture';
export function runMimic(g:GameState,cfg:Config,source:CardInst){
 const p=g.players[cfg.side],opp=(1-cfg.side)as Side;let action:Action={type:'play',idx:0},sourceZone:'hand'|'field'|'enchant'|'market'='hand';
 if(source.quick){p.hand=p.hand.filter(c=>c.uid!==source.uid);p.supply[0]=source;sourceZone='market';action={type:'buySupply',i:0};if(source.id==='QUICK_SURVIVAL')p.hp=15;}
 if(['A118','A119'].includes(cfg.item)&&cfg.outcome==='miss')p.removed=(p.removed||[]).slice(0,5);
 if(cfg.item==='A120'){p.hand=p.hand.filter(c=>c.uid!==source.uid);p.enchants.push({card:source,turns:99,bornTurn:1});p.field.push(mon('MIMIC','r3-host'));sourceZone='enchant';action={type:'endTurn'};}
 if(cfg.item==='A121'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);p.field.push(mon(source.id,source.uid),mon('MIMIC','r3-mimic-self'));g.players[opp].field.push(mon('MIMIC','r3-mimic-other'),mon('MIMIC2','r3-master-survives'));sourceZone='field';action={type:'endTurn'};
 }
 if(cfg.item==='A058'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);p.field.push(mon('MIMIC2',source.uid));for(const [s,pl]of g.players.entries())pl.hand=[inst('STARTER_CHEST',`r3-locked-${s}`),...pl.hand];sourceZone='field';action={type:'play',idx:0};
 }
 const result=reduce(g,action);const events:GameEvent[]=[...result.events];return {state:result.state,events,sourceZone};
}
