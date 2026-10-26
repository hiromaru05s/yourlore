const C=require(process.env.CORE||'/tmp/lore-card-audit-20261026/candidate.cjs');
const fs=require('node:fs');
const DB={...C.DB,...C.STARTERS};
const decks={
 rally:['GOBLIN','GOBLIN','GOBLIN','GOBLIN_RAIDER','GOBLIN_RAIDER','GOBLIN_RAIDER','COUNTERCALC','TRUMPET'],
 mixed:['RUST_SHROOM','RUST_SHROOM','GOBLIN','GOBLIN','GOBLIN_RAIDER','GOBLIN_RAIDER','COUNTERCALC','BLOOD_RITE'],
 decay:['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','COUNTERCALC','COUNTERCALC','BLOOD_RITE','TRUMPET'],
 control:['WEAKEN_ALL','WEAKEN_ALL','GAMBLER','GAMBLER','RUST_SHROOM','RUST_SHROOM','COUNTERCALC','BLOOD_RITE'],
 ghost:['GHOST','GHOST','GHOST','GHOST','FLAME','FLAME','BLOOD_RITE','COUNTERCALC'],
 ghostfield:['GHOST','GHOST','GHOST','GHOST','BATTLEFIELD','BATTLEFIELD','BLOOD_RITE','COUNTERCALC'],
 fire:['FLAME','FLAME','FLAME','FLAME','FLAME','COUNTERCALC','GHOST','GHOST'],
 casino:['CASINO','GAMBLER','GAMBLER','GAMBLER','FATE_WHEEL','STARTER_CHEST','STARTER_CHEST','WEAKEN_ALL'],
 elf:['ELF_HAVEN','HALF_ELF','HALF_ELF','NOURISHING_RAIN','GAMBLER','WEAKEN_ALL','COUNTERCALC','STARTER_TRASH'],
 rift:['RIFT','TRIAL_AREA','TRIAL_AREA','CHOSEN_AREA','WEAKEN_ALL','BLOOD_RITE','FOCUS','STARTER_TRASH'],
 castle:['CASTLE','CASTLE','WEAKEN_ALL','GAMBLER','GAMBLER','BLOOD_RITE','COUNTERCALC','STARTER_TRASH'],
 cull:Array(8).fill('STARTER_TRASH')
};
const markets={natural:null,wall:['NWL3','WALLBREAK1','S15','ADVANCE','DISARM1','M2','TRAINING_GROUND'],recovery:['PRIEST','HIGH_PRIEST','IRON_WALL','DESERTIFICATION','S15','NWL3','DISARM1'],suppression:['NWL3','DISARM1','DISARM2','ADVANCE','S15','POISON_MASTER','TRAINING_GROUND']};
function simulate(job,trace=false){
 const list=job.seat?[job.other,job.deck]:[job.deck,job.other];
 for(const d of list)if(JSON.stringify(C.sanitizeDeck(d))!==JSON.stringify(d))throw Error('illegal deck');
 let g=C.createGame({mode:'bot',seed:job.seed,starting:0,p0:{id:'a',name:'A',deck:list[0]},p1:{id:'b',name:'B',deck:list[1]}}).state;
 for(const p of g.players)p.botTune={minBuy:11,minBuyEarly:6,chestTurn:6};
 if(markets[job.market]){g.market=markets[job.market].map((id,i)=>({...DB[id],uid:'audit-market-'+i}));g.marketStock=g.market.map(()=>3);}
 let steps=0,invalid=null,uses={},buys={},scheduled=false,offered=false;const actions=[];
 return C.withoutMonsterPresentation(()=>{
 while(!g.over&&steps<1600){
 const side=C.actingSide(g),p=g.players[side];
 // Controlled public offer: first own main phase with printed cost within supply range.
 // The same offer is installed in treatment/control. Only the priority-buy policy differs.
 if(job.card&&side===job.seat&&!g.pending&&!offered&&C.effMaxMana(p)>=DB[job.card].cost){
  const c={...DB[job.card],uid:'audit-offer'};for(const pl of g.players)pl.supply[0]=c;offered=true;
 }
 const view=C.observationSample(g,side,0);
 if(job.noBuy){view.market=[];for(const pl of view.players)pl.supply=[];view.players[side].refreshBlockTurn=true;}
 let a=C.safeGreedy(view);
 // A separate coverage policy helps expose starter combos omitted by the deployed heuristic.
 if(job.coverage&&!g.pending){
  const spare=['buyMarket','buySupply','refresh','endTurn'].includes(a.type);
  const blood=p.hand.findIndex(c=>c.id==='BLOOD_RITE'&&!C.playBlockReason(g,side,c));
  if(blood>=0&&p.field.some(c=>c.id==='GHOST')&&p.hand.some(c=>c.id==='FLAME'||c.id==='BATTLEFIELD'))a={type:'play',idx:blood};
  else if(spare){const idx=p.hand.findIndex(c=>!C.playBlockReason(g,side,c)&&['FLAME','BATTLEFIELD','GRAPE','SLUM','NOURISHING_RAIN','FOCUS','REFRESH_HAND','ANCIENT_CIV','NIGHT_CASTLE_GIFT','FATE_WHEEL'].includes(c.id));if(idx>=0)a={type:'play',idx};}
 }
 if(job.defender&&side!==job.seat&&!g.pending){
  const o=g.players[1-side],own=C.publicInventory(p);
  const suppress=p.hand.findIndex(c=>c.id==='WEAKEN_ALL'&&!C.playBlockReason(g,side,c));
  if(suppress>=0&&o.field.some(m=>C.effAtk(o,m,g)>0))a={type:'play',idx:suppress};
  else {
   const priorities=job.defender==='sweep'?['WALLBREAK2','PRIEST','NWL3']:job.defender==='wall'?['NWL3','PRIEST','IRON_WALL']:['PRIEST','NWL3','DISARM1'];
   const idx=p.hand.findIndex(c=>priorities.includes(c.id)&&!C.playBlockReason(g,side,c));
   if(idx>=0)a={type:'play',idx};
   else if(!g.over)for(const id of priorities){
    if(own.some(c=>c.id===id))continue;
    const mi=g.market.findIndex(c=>c.id===id&&C.buyableByBot(p,c,g)&&C.marketStockOf(g,g.market.indexOf(c))>0);
    const si=p.supply.findIndex(c=>c?.id===id&&C.buyableByBot(p,c,g));
    if(mi>=0){a={type:'buyMarket',i:mi};break;}if(si>=0){a={type:'buySupply',i:si};break;}
   }
  }
 }
 if(job.card&&job.priority&&side===job.seat&&!g.pending&&!scheduled){
  const i=p.supply.findIndex(c=>c?.id===job.card&&C.buyableByBot(p,c,g));if(i>=0){a={type:'buySupply',i};scheduled=true;}
 }
 a=C.legalBotAction(g,a,view);
 const id=a.type==='play'?p.hand[a.idx]?.id:a.type==='buySupply'?p.supply[a.i]?.id:a.type==='buyMarket'?g.market[a.i]?.id:null;
 const r=C.reduce(g,a);if(!C.actionChangesState(g,r.state)&&r.state.rng===g.rng){invalid=a;break;}
 if(side===job.seat){if(a.type==='play')uses[id]=(uses[id]||0)+1;if(a.type.startsWith('buy'))buys[id]=(buys[id]||0)+1;}
 if(trace)actions.push({turn:g.turn,side,a,id,hp:r.state.players.map(p=>p.hp),events:r.events.filter(e=>e.type==='turnSkipped')});
 g=r.state;steps++;
 }
 return {...job,result:g.over?(g.winner==null?.5:g.winner===job.seat?1:0):null,turn:g.turn,steps,invalid,uses,buys,offered,scheduled,hp:g.players.map(p=>p.hp),end:g.over?(g.turn>=60?'cap':g.players.some(p=>p.hp<=0)?'hp':'special'):'unfinished',...(trace?{actions}:{})};
 });
}
module.exports={C,DB,decks,markets,simulate};
if(require.main===module){const [input,out,shard='0',n='1']=process.argv.slice(2),jobs=JSON.parse(fs.readFileSync(input));const fd=fs.openSync(out,'wx');let done=0,bad=0,start=Date.now();for(let i=+shard;i<jobs.length;i+=+n){const r=simulate(jobs[i]);fs.writeSync(fd,JSON.stringify(r)+'\n');done++;if(r.result==null||r.invalid)bad++;if(done%100===0)console.log(JSON.stringify({done,bad,seconds:(Date.now()-start)/1000}));}fs.closeSync(fd);console.log(JSON.stringify({complete:true,done,bad,seconds:(Date.now()-start)/1000}));}
