const {C,DB,decks}=require('./sim.cjs'),fs=require('fs');
const configs={cull:Array(8).fill('STARTER_TRASH'),weak:['WEAKEN_ALL','WEAKEN_ALL',...Array(6).fill('STARTER_TRASH')],ramp:['WEAKEN_ALL','WEAKEN_ALL','GAMBLER','GAMBLER',...Array(4).fill('STARTER_TRASH')],refresh:['WEAKEN_ALL','WEAKEN_ALL','REFRESH_HAND','REFRESH_HAND',...Array(4).fill('STARTER_TRASH')]};
function run(deck,other,seed,seat,counter=false){const lists=seat?[other,deck]:[deck,other];let g=C.createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A',deck:lists[0]},p1:{id:'b',name:'B',deck:lists[1]}}).state;
const market=['EROSION','S10','QUICK_GRIMOIRE','NWL3','DISARM1','S15','NT_SEAL3'];g.market=market.map((id,i)=>({...DB[id],uid:'combo-m-'+i}));g.marketStock=Array(7).fill(3);
let steps=0,bad=null,loop=0;const plays={},buys={},trace=[];
return C.withoutMonsterPresentation(()=>{while(!g.over&&steps<1500){const side=C.actingSide(g),p=g.players[side],view=C.observationSample(g,side,0);let a;
if(side===seat){const q=g.pending;
 if(q)a=C.safeGreedy(view);
 else{
  view.market=[];for(const pl of view.players)pl.supply=[];view.players[side].refreshBlockTurn=true;
  const own=C.publicInventory(p),has=id=>own.some(c=>c.id===id),inPlay=id=>p.enchants.some(e=>e.card.id===id)||p.field.some(c=>c.id===id);
  const playable=id=>p.hand.findIndex(c=>c.id===id&&!C.playBlockReason(g,side,c));
  const play=id=>{const idx=playable(id);if(idx>=0){a={type:'play',idx};return true;}return false;};
  const buy=id=>{const i=g.market.findIndex(c=>c.id===id&&C.marketStockOf(g,g.market.indexOf(c))>0&&C.buyableByBot(p,c,g));if(i>=0){a={type:'buyMarket',i};return true;}return false;};
  if(play('STARTER_TRASH')){}
  else if(play('WEAKEN_ALL')){}
  else if(inPlay('EROSION')&&playable('S10')>=0&&p.spellDiscountTurn){play('S10');loop++;}
  else if(inPlay('EROSION')&&playable('S10')>=0&&buy('QUICK_GRIMOIRE')){}
  else if(play('DISARM1')){}
  else if(play('NWL3')){}
  else if(play('GAMBLER')){}
  else if(p.maxMana<6&&play('STARTER_MANA')){}
  else if(play('EROSION')){}
  else if(!has('NWL3')&&g.players[1-side].field.some(m=>C.effAtk(g.players[1-side],m,g)>0)&&buy('NWL3')){}
  else if(!has('EROSION')&&buy('EROSION')){}
  else if(!has('S10')&&buy('S10')){}
  else if(!has('DISARM1')&&g.players[1-side].enchants.length&&buy('DISARM1')){}
  else if(play('S10')){}
  else a=C.safeGreedy(view);
 }
}else{a=C.legalBotAction(g,C.safeGreedy(view),view);if(counter&&!g.pending){const has=p.field.some(c=>c.id==='NT_SEAL3')||p.hand.some(c=>c.id==='NT_SEAL3')||p.deck.some(c=>c.id==='NT_SEAL3')||p.discard.some(c=>c.id==='NT_SEAL3');const idx=p.hand.findIndex(c=>c.id==='NT_SEAL3'&&!C.playBlockReason(g,side,c));if(idx>=0)a={type:'play',idx};else if(!has){const i=g.market.findIndex(c=>c.id==='NT_SEAL3'&&C.buyableByBot(p,c,g));if(i>=0)a={type:'buyMarket',i};}}}
const id=a.type==='play'?p.hand[a.idx]?.id:a.type==='buyMarket'?g.market[a.i]?.id:null,r=C.reduce(g,a);if(r.events.some(e=>e.type==='rejected')||!C.actionChangesState(g,r.state)&&g.rng===r.state.rng){bad={a,pending:g.pending};break;}
if(side===seat){if(a.type==='play')plays[id]=(plays[id]||0)+1;if(a.type==='buyMarket')buys[id]=(buys[id]||0)+1;}
trace.push({turn:g.turn,side,a,id,hp:r.state.players.map(p=>p.hp)});g=r.state;steps++;
}return {seed,seat,counter,deck,other,result:g.over?(g.winner==null?.5:g.winner===seat?1:0):null,turn:g.turn,steps,bad,loop,plays,buys,...(loop>15?{trace}:{})};});}
if(require.main===module){const out='/tmp/lore-card-audit-20261026/combo.jsonl',fd=fs.openSync(out,'wx');for(const [name,deck]of Object.entries(configs))for(const opponent of ['rally','mixed','control','ghost','decay','castle'])for(let r=0;r<4;r++)for(const seat of [0,1])for(const counter of [false,true]){const row=run(deck,decks[opponent],6290000+r,seat,counter);fs.writeSync(fd,JSON.stringify({name,opponent,...row})+'\n');}fs.closeSync(fd);console.log('completed');}
