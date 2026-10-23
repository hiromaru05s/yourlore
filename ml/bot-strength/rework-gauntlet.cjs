// Fixed pre-rework policy, shared current rules, paired seats/seeds, recorded actions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-rework-20261023';
const C=require(path.join(lab,'candidate.cjs')),B=require(path.join(lab,'before.cjs'));
const out=process.argv[2];if(!out||fs.existsSync(out))throw Error('fresh output path required');
const markets={natural:null,wall:['NWL3','WALLBREAK1','S15','ADVANCE','DISARM1','M2','TRAINING_GROUND'],recovery:['PRIEST','HIGH_PRIEST','IRON_WALL','DESERTIFICATION','S15','NWL3','DISARM1'],suppression:['NWL3','DISARM1','DISARM2','ADVANCE','S15','POISON_MASTER','TRAINING_GROUND']};
let opponents={control:['WEAKEN_ALL','WEAKEN_ALL','COUNTERCALC','GAMBLER','GAMBLER','RUST_SHROOM','RUST_SHROOM','BLOOD_RITE'],goblin:['GOBLIN','GOBLIN','GOBLIN_RAIDER','GOBLIN_RAIDER','GOBLIN_SETTLEMENT','WEAKEN_ALL','COUNTERCALC','BLOOD_RITE'],decay:B.BOT_HELL_DECKS[0].cards};
if(process.env.OPPONENTS)opponents=JSON.parse(fs.readFileSync(process.env.OPPONENTS));
const decks=process.env.DECKS?JSON.parse(fs.readFileSync(process.env.DECKS)):Object.fromEntries(B.BOT_HELL_DECKS.map(d=>[d.name,d.cards]));
for(const deck of Object.values({...decks,...opponents}))if(JSON.stringify(C.sanitizeDeck(deck))!==JSON.stringify(deck))throw Error('illegal deck '+deck);
for(const ids of Object.values(markets))for(const id of ids??[])if(!C.BUYABLE_POOL.includes(id))throw Error('illegal market '+id);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const meta={candidate:hash(path.join(lab,'candidate.cjs')),before:hash(path.join(lab,'before.cjs')),balance:C.BALANCE_VERSION};
fs.writeFileSync(out+'.meta.json',JSON.stringify(meta));
function enemy(g,tier){
 const side=C.actingSide(g),view=B.observationSample(g,side,0),p=view.players[side],o=view.players[1-side];
 let action;
 if(!view.pending){
  const own=[...p.hand,...p.deck,...p.discard,...p.field];
  // Adversarial counter policy establishes the lock, then acquires its wall / recovery engine.
  const weaken=p.hand.findIndex(c=>c.ench==='weakenAll'&&!B.playBlockReason(view,side,c)&&o.field.some(m=>B.effAtk(o,m,view)>0));
  if(weaken>=0)action={type:'play',idx:weaken};
  const needs=['NWL3','PRIEST','HIGH_PRIEST','TRAINING_GROUND'].filter(id=>!own.some(c=>c.id===id));
  if(!action)for(const id of needs){const i=view.market.findIndex(c=>c.id===id&&B.buyableByBot(p,c,view));if(i>=0){action={type:'buyMarket',i};break;}}
 }
 return B.legalBotAction(g,action||(tier==='greedy'?B.safeGreedy(view):B.botDecide(g,tier)),view);
}
const {Worker}=require('node:worker_threads');
const workers=new Map();let deadlineHits=0;
async function decideWorker(mod,g,tier){
 const file=path.join(lab,mod===C?'candidate.cjs':'before.cjs');
 let w=workers.get(file);
 if(!w){w=new Worker(`const {parentPort,workerData}=require('node:worker_threads');const C=require(workerData);parentPort.on('message',({g,tier})=>{try{const a=C.botDecide(g,tier,a=>parentPort.postMessage({progress:a}));parentPort.postMessage({action:a});}catch(e){parentPort.postMessage({error:String(e)});}});`,{eval:true,workerData:file});workers.set(file,w);}
 return new Promise((resolve,reject)=>{
  let best;
  const cleanup=()=>{clearTimeout(timer);w.removeListener('message',message);w.removeListener('error',error);};
  const message=data=>{if(data.progress){best=data.progress;return;}cleanup();data.error?reject(Error(data.error)):resolve(data.action);};
  const error=e=>{cleanup();reject(e);};
  const timer=setTimeout(()=>{cleanup();workers.delete(file);void w.terminate();deadlineHits++;const view=mod.observationSample(g,mod.actingSide(g),0);resolve(best??mod.legalBotAction(g,mod.safeGreedy(view),view));},15000);
  w.on('message',message);w.on('error',error);w.postMessage({g,tier});
 });
}
async function main(){
const rows=[],start=Date.now();let index=0;
const tiers=(process.env.TIERS||'greedy').split(','),samples=+(process.env.SAMPLES||2),offset=+(process.env.SEED_BASE||13000000);
for(const [di,[name,deck]] of Object.entries(decks).entries())for(const [mi,market] of (process.env.MARKETS||Object.keys(markets).join(',')).split(',').entries())for(let r=0;r<samples;r++)for(const seat of [0,1])for(const tier of tiers)for(const version of (process.env.VERSIONS||'before,after').split(',')){
 const rowIndex=index++;if(rowIndex<+(process.env.ROW_START||0)||rowIndex>=+(process.env.ROW_END||Infinity))continue;
 const opponent=Object.keys(opponents)[(process.env.COMMON_SEEDS?r:di+r)%Object.keys(opponents).length],other=opponents[opponent],seed=offset+r*100+mi+(process.env.COMMON_SEEDS?0:di*10000);
 const ownDeck=process.env.PRODUCT&&version==='before'?(tier==='hard'?B.BOT_ELITE_DECKS:B.BOT_HELL_DECKS)[di%(tier==='hard'?B.BOT_ELITE_DECKS:B.BOT_HELL_DECKS).length].cards:deck;
 const lists=seat?[other,ownDeck]:[ownDeck,other];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:lists[0]},p1:{id:'b',name:'b',deck:lists[1]}}).state;
 g.players.forEach(p=>p.botTune={minBuy:11,minBuyEarly:6,chestTurn:6});
 if(markets[market]){g.market=markets[market].map((id,i)=>({...C.DB[id],uid:'gauntlet-market-'+i}));g.marketStock=g.market.map(()=>3);}
 const initialMarket=g.market.map(c=>c.id),mod=version==='after'?C:B;let steps=0,maxMs=0,invalid=null;const buys=[],trace=[];
 while(!g.over&&steps<1600){const side=C.actingSide(g),t=performance.now();let a;
  if(side!==seat)a=enemy(g,process.env.OPPONENT_TIER||'greedy');
  else if(tier==='greedy'){const view=mod.observationSample(g,side,0);a=mod.legalBotAction(g,mod.safeGreedy(view),view);}
  else a=process.env.DEADLINE?await decideWorker(mod,g,tier):mod.botDecide(g,tier);
  maxMs=Math.max(maxMs,performance.now()-t);
  if(side===seat&&a.type.startsWith('buy'))buys.push({turn:g.turn,id:(a.type==='buyMarket'?g.market:g.players[side].supply)[a.i]?.id});
  if(side===seat&&a.type==='play')trace.push({turn:g.turn,id:g.players[side].hand[a.idx]?.id});
  const next=C.reduce(g,a).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng){invalid=a;break;}g=next;steps++;
 }
 const row={rowIndex,name,deck:ownDeck,opponent,other,market,initialMarket,seed,seat,tier,version,deadlineHits,result:g.over?(g.winner===seat?1:g.winner==null?.5:0):null,turn:g.turn,steps,maxMs,invalid,buys,plays:trace};rows.push(row);fs.appendFileSync(out,JSON.stringify(row)+'\n');
 if(rows.length%8===0)console.log(JSON.stringify({games:rows.length,seconds:(Date.now()-start)/1000,last:{tier,market,version,result:row.result,maxMs}}));
}
const groups={};for(const r of rows){const k=[r.tier,r.market,r.version].join('/'),v=groups[k]??={games:0,points:0,invalid:0,maxMs:0};v.games++;v.points+=r.result??0;v.invalid+=r.result==null||r.invalid?1:0;v.maxMs=Math.max(v.maxMs,r.maxMs);}
fs.writeFileSync(out+'.summary.json',JSON.stringify({meta,seconds:(Date.now()-start)/1000,groups},null,2));console.log(groups);if(rows.some(r=>r.result==null||r.invalid))process.exitCode=1;

}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const w of workers.values())void w.terminate();});
