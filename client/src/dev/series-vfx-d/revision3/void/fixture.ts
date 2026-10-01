import {reduce,effectChoices} from '../../../../shared/engine';import {hasPassive} from '../../../../shared/cards';
import type {GameState,CardInst,Action,GameEvent,Side} from '../../../../shared/types';import type {Config} from '../fixture';import {inst,mon} from '../fixture';
export function resolveChoices(state:GameState,events:GameEvent[],max=16){
 let g=state;
 for(let step=0;step<max&&g.pending;step++){
  const pending=g.pending,p=g.players[pending.owner??g.cur],o=g.players[1-(pending.owner??g.cur)];let uid:string|null=null;
  if(pending.kind==='cardChoice')uid=effectChoices(g)[0]?.uid??null;
  else if(pending.kind==='purge'){const zone=pending.data?.zone;const cards=zone==='hand'?p.hand:zone==='discard'?p.discard:[...p.discard,...p.deck];uid=cards.find(c=>!hasPassive(c,'relic'))?.uid??null;}
  else if(pending.kind==='recall')uid=p.discard[0]?.uid??null;
  else if(pending.kind==='oppMon'||pending.kind==='oppBoard')uid=o.field.find(c=>!hasPassive(c,'aura'))?.uid??null;
  else if(pending.kind==='myMon')uid=(pending.reason==='chosenMage'?p.field.find(c=>c.id==='CHOSEN_MAGE'&&!(pending.data?.fired as string[]|undefined)?.includes(c.uid)):p.field[0])?.uid??null;
  else if(pending.kind==='oppRmz')uid=o.removed?.[0]?.uid??null;
  else if(pending.kind==='giantShop')uid=(pending.data?.ids as string[]|undefined)?.[0]??null;
  const result=reduce(g,{type:'pick',uid});events.push(...result.events);if(JSON.stringify(g.pending)===JSON.stringify(result.state.pending)&&!result.events.length)break;g=result.state;
 }
 return g;
}
export function runVoid(g:GameState,cfg:Config,source:CardInst){
 const p=g.players[cfg.side],opp=(1-cfg.side)as Side;let action:Action={type:'play',idx:0},sourceZone:'hand'|'field'|'enchant'|'market'|'quest'|'deck'='hand';
 if(source.id==='ORIGIN_QUEST')p.field.push(mon('SOLDIER2','r3-origin-token'));
 if(cfg.item==='A144'){p.hand.push(inst('STARTER_CHEST','r3-discard-chest'),inst('M4','r3-discard-hare'));p.deck=Array.from({length:7},(_,i)=>inst('M4',`r3-handreset-draw-${i}`));}
 if(cfg.item==='A145'){p.deck=[];p.discard=Array.from({length:5},(_,i)=>inst('M4',`r3-rebuild-${i}`));}
 if(source.quick){p.hand=p.hand.filter(c=>c.uid!==source.uid);p.supply[0]=source;sourceZone='market';action={type:'buySupply',i:0};if(source.id==='QUICK_REBIRTH')p.discard.unshift(mon('M4','r3-rebirth-target'));}
 if(cfg.item==='A135'){p.deck=Array.from({length:3},(_,i)=>inst('STARTER_TRASH',`r3-sorter-deck-${i}`));p.discard=Array.from({length:3},(_,i)=>inst('STARTER_TRASH',`r3-sorter-shelf-${i}`));}
 if(cfg.item==='A080'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);p.enchants.push({card:source,turns:99,bornTurn:1});sourceZone='enchant';g.cur=opp;g.players[opp].hand.unshift(inst('EXILE_NUKE1','r3-conversion-trigger'));
 }
 if(cfg.item==='A052'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);p.deck=[source];p.discard=[];p.hand.unshift(inst('FOCUS','r3-protection-trigger'));sourceZone='deck';
 }
 if(cfg.item==='A019'&&source.id==='CHOSEN_MAGE'){p.hand=p.hand.filter(c=>c.uid!==source.uid);p.field=[mon(source.id,source.uid)];p.removed=[inst('STARTER_TRASH','r3-mage-cull')];sourceZone='field';g.cur=opp;action={type:'endTurn'};}
 if(cfg.item==='A018'&&source.id==='Q_RIFT'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);(p.quests??=[]).push({card:source,progress:9,startedTurn:1});p.hand.unshift(inst('STARTER_TRASH','r3-quest-trigger'));sourceZone='quest';
 }
 if(cfg.item==='A017'&&source.id==='Q_ASSASSIN'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);(p.quests??=[]).push({card:source,progress:(source.quest?.target||1)-1,startedTurn:1});p.field.push(mon('ASSASSIN2','r3-assassin-trigger'));sourceZone='quest';action={type:'attack',uid:'r3-assassin-trigger'};
 }
 if(cfg.item==='A014'){
  p.hand=p.hand.filter(c=>c.uid!==source.uid);const m=mon(source.id,source.uid);p.field=[m];sourceZone='field';g.cur=opp;g.players[opp].field=[mon('M4','r3-killer')];g.players[opp].field[0].atkMod=25;action={type:'attack',uid:'r3-killer'};
 }
 if(['A019','A020'].includes(cfg.item)&&source.t==='mon'){
  // Their printed on-summon choice is resolved against real removed-zone instances.
  g.players[opp].removed=[inst('STARTER_TRASH','r3-return-cull'),inst('M4','r3-return-hare'),inst('MIMIC','r3-return-mimic')];
 }
 let result=reduce(g,action),events=[...result.events];
 if(cfg.item==='A052'&&result.state.pending){result=reduce(result.state,{type:'pick',uid:source.uid});events.push(...result.events);if(result.state.pending){result=reduce(result.state,{type:'pick',uid:null});events.push(...result.events);}return {state:result.state,events,sourceZone};}
 if(cfg.item==='A017'&&source.id==='Q_ASSASSIN'&&result.state.pending?.kind==='oppMon'){result=reduce(result.state,{type:'chooseTarget',uid:null});events.push(...result.events);}
 if(cfg.item==='A014'&&result.state.pending){result=reduce(result.state,{type:'chooseTarget',uid:source.uid});events.push(...result.events);}
 return {state:resolveChoices(result.state,events),events,sourceZone};
}
