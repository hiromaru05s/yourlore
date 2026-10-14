// Reproducible v58 policy/deck experiments. Every row is checkpointed, never overwritten.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-adaptive-v58';
const C=require(path.join(lab,'candidate.cjs')),B=require(path.join(lab,'before.cjs'));
const mode=process.argv[2]||'screen',out=process.argv[3];
if(require.main===module && (!out||fs.existsSync(out)||fs.existsSync(out+'.jsonl')))throw Error('Provide a fresh output path');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modules={candidate:sha(path.join(lab,'candidate.cjs')),baseline:sha(path.join(lab,'before.cjs'))};
const builds=JSON.parse(fs.readFileSync('ml/bot-strength/builds.json'));
const c='STARTER_TRASH',t='STARTER_CHEST';
let candidates={
 DECAY_ASSAULT:B.BOT_HELL_DECKS[0].cards,
 DECAY_CONTROL:['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','WEAKEN_ALL','WEAKEN_ALL','COUNTERCALC',c,c],
 RIFT:B.BOT_ELITE_DECKS[0].cards, COUNTER:B.BOT_ELITE_DECKS[1].cards,
 ELF_ENGINE:['ELF_HAVEN','ELF_HAVEN','HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN',c,c,c],
 ELF_RIFT:['ELF_HAVEN','RIFT','HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN',c,c,c],
 CASTLE_CONTROL:['CASTLE','CASTLE','WEAKEN_ALL','COUNTERCALC','RUST_SHROOM','RUST_SHROOM',c,c],
 CASTLE_RIFT:['CASTLE','RIFT','TRIAL_AREA','SELECTED_SHIELD','RUST_SHROOM','RUST_SHROOM',c,c],
 NIGHT_CASTLE:['NIGHT_CASTLE_GIFT','NIGHT_CASTLE_GIFT','RUST_SHROOM','RUST_SHROOM','COUNTERCALC','WEAKEN_ALL',c,c],
 NIGHT_RIFT:['NIGHT_CASTLE_GIFT','RIFT','TRIAL_AREA','SELECTED_SHIELD','RUST_SHROOM','RUST_SHROOM',c,c],
 GAMBLER_CONTROL:['GAMBLER','GAMBLER','RUST_SHROOM','RUST_SHROOM','WEAKEN_ALL','COUNTERCALC',c,c],
 GAMBLER_RIFT:['GAMBLER','GAMBLER','RIFT','TRIAL_AREA','SELECTED_SHIELD',c,c,c],
 ASSASSIN_CONTROL:['GUILD_HALL','GUILD_HALL','WEAKEN_ALL','COUNTERCALC','RUST_SHROOM','RUST_SHROOM',c,c],
 EGG_CONTROL:['ANCIENT_CIV','INCUBATOR_S','INCUBATOR_S','WEAKEN_ALL','RUST_SHROOM','RUST_SHROOM',c,c],
};
if(process.env.CANDIDATES)candidates=JSON.parse(fs.readFileSync(process.env.CANDIDATES));
let opponents={DECAY:B.BOT_HELL_DECKS[0].cards,COUNTER:B.BOT_ELITE_DECKS[1].cards,AGGRO:builds.AGGRO,
 ELF:['ELF_HAVEN','ELF_HAVEN','HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN',c,c,c],CONTROL:['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','WEAKEN_ALL','WEAKEN_ALL','COUNTERCALC',c,c],RIFT:builds.CULL,CASTLE:['CASTLE','CASTLE','WEAKEN_ALL','COUNTERCALC','RUST_SHROOM','RUST_SHROOM',c,c],GAMBLER:builds.GAMBLER};
if(process.env.OPPONENTS)opponents=JSON.parse(fs.readFileSync(process.env.OPPONENTS));
const markets={natural:null,recovery:['PRIEST','HIGH_PRIEST','IRON_WALL','DESERTIFICATION','S15','ELF','WORLD_HEART'],
 control:['BLACK_REVERSE','STRONG_ACID','DISARM1','DISARM2','POISON_MASTER','S15','M2'],
 elf:['ELF','HIGH_ELF','DARK_ELF','WORLD_TREE','PRIEST','DESERTIFICATION','DISARM1'],
 curse:['BLACK_REVERSE','BLACK_CURSE','BLACK_INFINITY','SOUL_HARVEST','DISARM1','POISON_MASTER','S15']};
for(const [name,deck] of Object.entries({...candidates,...opponents}))if(JSON.stringify(C.sanitizeDeck(deck))!==JSON.stringify(deck))throw Error('Invalid deck '+name);
// Static pools may not contain unbuyable starter-only permanents.
for(const ids of Object.values(markets))for(const id of ids??[])if(!C.BUYABLE_POOL.includes(id))throw Error('Invalid market '+id);
const rows=[],begin=Date.now();let serial=0, plannedRow=0;
function game({name,deck,opponent,other,seed,seat,version='after',tier='greedy',market='natural'}) {
 const rowIndex=plannedRow++;
 if(rowIndex<+(process.env.ROW_START||0)||rowIndex>=+(process.env.ROW_END||Infinity))return;
 const decks=seat?[other,deck]:[deck,other];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:decks[0]},p1:{id:'b',name:'b',deck:decks[1]}}).state;
 g.players.forEach(p=>p.botTune={minBuyEarly:6,minBuy:11,chestTurn:6});
 if(markets[market]){g.market=markets[market].map((id,i)=>({...C.DB[id],uid:`market-${i}`}));g.marketStock=g.market.map(()=>3);}
 const initialMarket=g.market.map(c=>c.id),policy=version==='after'?C:B;
 let invalid=null,steps=0,maxMs=0,buyIds=[];
 while(!g.over&&steps<1600){const side=C.actingSide(g),mod=side===seat?policy:B;
  const start=performance.now();let a;
  const enemyTier=process.env.OPPONENT_TIER==='same'?tier:process.env.OPPONENT_TIER||'greedy';
  const actingTier=side===seat?tier:enemyTier;
  if(actingTier==='greedy') {const view=mod.observationSample(g,side,0);a=mod.legalBotAction(g,mod.safeGreedy(view),view);}
  else a=mod.botDecide(g,actingTier);
  maxMs=Math.max(maxMs,performance.now()-start);
  const next=C.reduce(g,a).state;
  if(!C.actionChangesState(g,next)&&next.rng===g.rng){invalid={a,turn:g.turn,pending:g.pending};fs.writeFileSync(out+'.failure.json',JSON.stringify({g,a}));break;}
  if(side===seat&&['buyMarket','buySupply'].includes(a.type))buyIds.push((a.type==='buyMarket'?g.market:g.players[side].supply)[a.i]?.id);
  g=next;steps++;
 }
 const row={rowIndex,name,opponent,ownDeck:deck,opponentDeck:other,seed,seat,version,tier,market,initialMarket,finished:g.over,result:g.over?(g.winner===seat?1:g.winner==null?.5:0):null,turns:g.turn,steps,invalid,maxMs,buyIds};
 rows.push(row);fs.appendFileSync(out+'.jsonl',JSON.stringify(row)+'\n');
 if(++serial%20===0)console.log(JSON.stringify({games:serial,seconds:(Date.now()-begin)/1000,last:{name,opponent,version,tier,market}}));
}
module.exports={candidates,opponents,markets};
if(require.main===module){
const samples=+(process.env.SAMPLES||2),offset=+(process.env.OFFSET||0);
if(mode==='roster'){
 for(const [i,deck] of C.BOT_HELL_DECKS.entries())for(const [j,opponent] of B.BOT_HELL_DECKS.entries())for(let r=0;r<samples;r++)for(let seat=0;seat<2;seat++)game({name:deck.name,deck:deck.cards,opponent:opponent.name,other:opponent.cards,seed:3810000+offset+r*100+j,seat,tier:process.env.TIERS||'greedy'});
}
else if(mode==='screen')for(const [name,deck] of Object.entries(candidates))for(const [opponent,other] of Object.entries(opponents))for(let r=0;r<samples;r++)for(let seat=0;seat<2;seat++)game({name,deck,opponent,other,seed:1410000+offset+r*100+Object.keys(opponents).indexOf(opponent),seat});
else {
 const tiers=(process.env.TIERS||'greedy').split(',');
 const selected=JSON.parse(fs.readFileSync(process.env.ROSTER||path.join(lab,'selected.json')));
 for(const tier of tiers)for(const [name,deck] of Object.entries(selected).filter(([name])=>process.env.SHIPPED_ROSTER!=='1'||(tier==='hard'?C.BOT_ELITE_DECKS:C.BOT_HELL_DECKS).some(d=>d.name==='BOT · '+name)))for(const market of (process.env.MARKETS||Object.keys(markets).join(',')).split(','))for(let r=0;r<samples;r++)for(let seat=0;seat<2;seat++)for(const version of ['before','after']){
  const entries=Object.entries(opponents),[opponent,other]=entries[(Object.keys(markets).indexOf(market)+r+Object.keys(selected).indexOf(name))%entries.length];
  const ownDeck=mode==='product'&&version==='before'?(tier==='hard'?B.BOT_ELITE_DECKS:B.BOT_HELL_DECKS)[Object.keys(selected).indexOf(name)%3].cards:deck;
  game({name,deck:ownDeck,opponent,other,seed:2710000+offset+r*100+Object.keys(markets).indexOf(market)+(mode==='product'?Object.keys(selected).indexOf(name)*10000:0),seat,version,tier,market});
 }
}
const groups={};for(const row of rows){const k=[row.name,row.tier,row.market,row.version].join('/');const s=groups[k]??={games:0,points:0,invalid:0};s.games++;s.points+=row.result??0;s.invalid+=row.invalid||!row.finished?1:0;}
const result={rowRange:[+(process.env.ROW_START||0),process.env.ROW_END?+process.env.ROW_END:plannedRow],plannedRows:plannedRow,modules,opponentTier:process.env.OPPONENT_TIER||'greedy',balance:C.BALANCE_VERSION,mode,samples,offset,seconds:(Date.now()-begin)/1000,candidates,opponents,groups,rows};fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({groups,seconds:result.seconds,invalid:rows.filter(r=>r.invalid||!r.finished).length}));
if(rows.some(r=>r.invalid||!r.finished))process.exitCode=1;

}
