import {createGame,reduce} from '../../../shared/engine';
import {DB,STARTERS} from '../../../shared/cards';
import type {CardInst,GameEvent} from '../../../shared/types';
export const card=(id:string,uid:string):CardInst=>({...((DB as any)[id]||(STARTERS as any)[id]),uid});
export function arrivalFixture(cardId:string,owner:0|1,seedValue=724){
 let g=createGame({mode:'bot',seed:seedValue,starting:owner,p0:{id:'r3self',name:'YOU'},p1:{id:'r3opp',name:'OPPONENT'}}).state;
 g.cur=owner;g.turn=3;g.pending=null;g.opening=undefined;
 for(const p of g.players){p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.mana=30;p.maxMana=30;p.dew=20;p.hp=60;p.shield=0;p.hand=[];p.discard=[];p.deck=[card('M2',`r3-deck-${p.id}`)];}
 function seed(id:string,side=owner,uid='r3-support'){
  g.cur=side;g.players[side].hand=[card(id,uid)];g=reduce(g,{type:'play',idx:0}).state;
  if(g.players[side].hand.some(c=>c.uid===uid))throw Error(`Fixture seed ${id} was rejected`);
  g.players[side].mana=30;g.cur=owner;
 }
 if(['INCUBATOR','INCUBATOR_S','EGG_MASTER','EGG_HUNTER'].includes(cardId))seed('BEAST_EGG',owner,'r3-egg');
 if(cardId==='TPO1')seed('M2',(1-owner) as 0|1,'r3-prey');
 if(cardId==='GENESIS_MAGIC')seed('TGE1');
 if(cardId==='LAND_GRANT')seed('CASTLE');
 if(['SLUM','MERCH1','MERCH2'].includes(cardId))seed('GUILD_CO');
 if(cardId==='BUYOUT'){
  for(let i=0;i<2;i++){g.players[owner].supply[0]=card('M2',`r3-buy-${i}`);g=reduce(g,{type:'buySupply',i:0}).state;}
 }
 if(cardId==='GENESIS_SONG'){g.players[owner].deck=[card('TGE2','r3-origin-deck')];g.players[owner].discard=[card('TGE3','r3-origin-shelf')];}
 const quick=!!card(cardId,'').quick;
 if(quick){seed('VITAL3');g.players[owner].supply[0]=card(cardId,'r3-focus');}
 else g.players[owner].hand=[card(cardId,'r3-focus')];
 const before=structuredClone(g);
 let result=reduce(g,quick?{type:'buySupply',i:0}:{type:'play',idx:0});
 const events:GameEvent[]=[...result.events];let after=result.state;
 if(['INCUBATOR','INCUBATOR_S'].includes(cardId)&&after.pending){result=reduce(after,{type:'chooseTarget',uid:'r3-egg'});events.push(...result.events);after=result.state;}
 const accepted=quick?events.some(e=>e.type==='buy'):events.some(e=>(e.type==='summon'&&e.uid==='r3-focus')||(e.type==='playSpell'&&e.id===cardId));
 if(!accepted)throw Error(`${cardId}: 現行ルールで${quick?'購入':'プレイ'}未成立`);
 return {before,after,events,trigger:quick?'purchase':'play'};
}
