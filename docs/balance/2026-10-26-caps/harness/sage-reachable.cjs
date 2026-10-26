const fs=require('fs'),assert=require('node:assert/strict');const [core,out]=process.argv.slice(2),C=require(core);const DB={...C.DB,...C.STARTERS};
let g=C.createGame({seed:6275001,mode:'online',starting:0,p0:{id:'a',name:'A',deck:Array(8).fill('FLAME')},p1:{id:'b',name:'B',deck:Array(8).fill('STARTER_TRASH')}}).state;
const ids=['NMD6','EROSION','S10','ND2','DISARM1','NWL3','PRIEST'];g.market=ids.map((id,i)=>({...DB[id],uid:'sage-market-'+i}));g.marketStock=Array(7).fill(3);const counts={};const actions=[];
for(let n=0;n<600&&!g.over;n++){
 const p=g.players[g.cur];let a={type:'endTurn'};
 if(g.pending){assert.equal(g.pending.reason,'handCap');const sorted=[...p.hand].sort((a,b)=>((a.id==='FLAME'?0:a.id==='STARTER_MANA'?1:2)-(b.id==='FLAME'?0:b.id==='STARTER_MANA'?1:2)));a={type:'pick',uid:sorted[0].uid};}
 else if(g.cur===0){
  const play=id=>{const idx=p.hand.findIndex(c=>c.id===id&&!C.playBlockReason(g,0,c));return idx<0?null:{type:'play',idx};};
  if(p.maxMana<6&&play('STARTER_MANA'))a=play('STARTER_MANA');
  else if(!p.field.some(m=>m.id==='NMD6')&&play('NMD6'))a=play('NMD6');
  else if(!p.enchants.some(e=>e.card.id==='EROSION')&&play('EROSION'))a=play('EROSION');
  else if(p.field.some(m=>m.id==='NMD6')&&p.enchants.some(e=>e.card.id==='EROSION')&&C.playCost({...DB.S10,uid:'test'},p)===0&&(play('S10')||play('ND2')))a=play('S10')||play('ND2');
  else {for(const [id,max] of [['NMD6',1],['EROSION',1],['S10',3],['ND2',2]]){const i=g.market.findIndex(c=>c.id===id);if((counts[id]??0)<max&&i>=0&&C.marketStockOf(g,i)>0&&C.buyCost(p,g.market[i])<=p.mana&&C.purchaseAllowed(g,p,g.market[i])){a={type:'buyMarket',i};break;}}}
 }
 const id=a.type==='play'?p.hand[a.idx].id:a.type==='buyMarket'?g.market[a.i].id:null;
 const r=C.reduce(g,a);assert(C.actionChangesState(g,r.state)||g.rng!==r.state.rng,JSON.stringify({a,id,turn:g.turn,pending:g.pending}));if(a.type==='buyMarket')counts[id]=(counts[id]??0)+1;
 actions.push({turn:g.turn,side:g.cur,a,id,cost:a.type==='play'?C.playCost(p.hand[a.idx],p):null,mana:r.state.players[0].mana,hp:r.state.players.map(p=>p.hp)});g=r.state;
}
const casts=actions.filter(x=>x.side===0&&x.a.type==='play'&&['S10','ND2'].includes(x.id));
const result={scope:'legal opening; FLAME x8 starter, chosen fixed market, passing opponent; no Grimoire; not competitive win rate',deck:Array(8).fill('FLAME'),market:ids,seed:6275001,counts,over:g.over,winner:g.winner,turn:g.turn,hp:g.players.map(p=>p.hp),casts:casts.length,castTurns:[...new Set(casts.map(x=>x.turn))],actions};assert.equal(result.winner,0);assert(result.castTurns.length===1&&casts.every(x=>x.cost===0));fs.writeFileSync(out,JSON.stringify(result,null,2));console.log({...result,actions:result.actions.length});
