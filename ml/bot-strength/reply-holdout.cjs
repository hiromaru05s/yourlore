// Paired actual-difficulty holdout; freeze before.cjs before changing the policy.
const fs=require('node:fs'), assert=require('node:assert/strict'), {createHash}=require('node:crypto');
const [lab,out,from='0',to='48']=process.argv.slice(2);
assert(lab&&out&&!fs.existsSync(out)&&!fs.existsSync(out+'.jsonl'),'fresh output required');
const C=require(lab+'/candidate.cjs'), B=require(lab+'/before.cjs');
const definitions=m=>JSON.stringify([m.BALANCE_VERSION,m.DB,m.STARTERS,m.DECK_POOL,m.BUYABLE_POOL]);
assert.equal(definitions(C),definitions(B),'card balance must not change');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modules={candidate:hash(lab+'/candidate.cjs'),baseline:hash(lab+'/before.cjs')};
const markets={natural:null,recovery:['PRIEST','HIGH_PRIEST','IRON_WALL','DESERTIFICATION','S15','ELF','WORLD_HEART'],control:['BLACK_REVERSE','STRONG_ACID','DISARM1','DISARM2','POISON_MASTER','S15','M2'],elf:['ELF','HIGH_ELF','DARK_ELF','WORLD_TREE','PRIEST','DESERTIFICATION','DISARM1'],curse:['BLACK_REVERSE','BLACK_CURSE','BLACK_INFINITY','SOUL_HARVEST','DISARM1','POISON_MASTER','S15']};
const counters=JSON.parse(fs.readFileSync('docs/bot-strength/2026-10-13-v2/counters.json')).map(x=>x.cards);
const opponents=[...counters,...B.BOT_HELL_DECKS.map(x=>x.cards)];
for(const deck of [...opponents,...C.BOT_ELITE_DECKS.map(x=>x.cards),...C.BOT_HELL_DECKS.map(x=>x.cards)])assert.deepEqual(C.sanitizeDeck(deck),deck,'invalid holdout deck');
for(const ids of Object.values(markets))for(const id of ids??[])assert(C.BUYABLE_POOL.includes(id),'invalid fixed market');
const rows=[];let index=0,caseIndex=0;const started=Date.now();
for(const tier of ['hard','hell'])for(const deck of tier==='hard'?C.BOT_ELITE_DECKS:C.BOT_HELL_DECKS){
 const market=Object.keys(markets)[caseIndex%5],other=opponents[caseIndex%opponents.length],seed=8157000+caseIndex++;
 for(const seat of [0,1])for(const version of ['before','after']){
  const rowIndex=index++;if(rowIndex<+from||rowIndex>=+to)continue;
  const ds=seat?[other,deck.cards]:[deck.cards,other];
  let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;
  for(const p of g.players)p.botTune={minBuyEarly:6,minBuy:11,chestTurn:6};
  if(markets[market]){g.market=markets[market].map((id,i)=>({...C.DB[id],uid:'fixed-'+i}));g.marketStock=g.market.map(()=>3);}
  const initialMarket=g.market.map(c=>c.id),policy=version==='after'?C:B;
  let steps=0,maxMs=0,invalid=null;
  while(!g.over&&steps<1600){
   const side=C.actingSide(g),mod=side===seat?policy:B,start=performance.now();
   const action=mod.botDecide(g,side===seat?tier:'hard');
   maxMs=Math.max(maxMs,performance.now()-start);
   const next=C.reduce(g,action).state;
   if(!C.actionChangesState(g,next)&&next.rng===g.rng){invalid={action,turn:g.turn};fs.writeFileSync(out+'.failure.json',JSON.stringify({g,action}));break;}
   g=next;steps++;
  }
  const row={rowIndex,tier,name:deck.name,ownDeck:deck.cards,opponentDeck:other,seed,seat,version,market,initialMarket,finished:g.over,result:g.over?(g.winner===seat?1:g.winner==null?.5:0):null,steps,turns:g.turn,maxMs,invalid};
  rows.push(row);fs.appendFileSync(out+'.jsonl',JSON.stringify(row)+'\n');console.log(JSON.stringify({rowIndex,tier,version,result:row.result,seconds:(Date.now()-started)/1000,maxMs}));
 }
}
fs.writeFileSync(out,JSON.stringify({modules,balance:C.BALANCE_VERSION,opponentTier:'hard',rowRange:[+from,+to],plannedRows:index,seconds:(Date.now()-started)/1000,rows},null,2));
assert(rows.every(r=>r.finished&&!r.invalid),'unfinished/illegal matches');
