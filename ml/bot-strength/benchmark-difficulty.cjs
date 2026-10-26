// Full shipped policies, same current engine for both versions; paired seats.
const fs=require('node:fs'),{createHash}=require('node:crypto'),{Worker,isMainThread,parentPort}=require('node:worker_threads');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-training-20261027',C=require(lab+'/candidate.cjs'),B=require(lab+'/before.cjs');
const random=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const opponents={
 aggro:['GOBLIN','GOBLIN','GOBLIN','GOBLIN','GOBLIN','GOBLIN','GOBLIN_RAIDER','COUNTERCALC'],
 antiAggro:['CASTLE','CASTLE','WEAKEN_ALL','WEAKEN_ALL','COUNTERCALC','GAMBLER','GAMBLER','BLOOD_RITE'],
 decay:['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','RUST_SHROOM','ACID_RAIN','COUNTERCALC','BLOOD_RITE','STARTER_TRASH'],
 recovery:['ELF_HAVEN','HALF_ELF','NOURISHING_RAIN','NOURISHING_RAIN','CASTLE','WEAKEN_ALL','COUNTERCALC','STARTER_TRASH'],
 ramp:['GAMBLER','GAMBLER','GAMBLER','GAMBLER','STARTER_CHEST','STARTER_CHEST','WEAKEN_ALL','COUNTERCALC'],
 balanced:['RUST_SHROOM','RUST_SHROOM','GOBLIN','GOBLIN','GOBLIN_RAIDER','COUNTERCALC','TRUMPET','BLOOD_RITE'],
 beginner:['STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_CHEST','STARTER_CHEST'],
};
function play(job){
 const {tier,version,pair,seat}=job,mod=version==='after'?C:B,roster=mod.botNpc(tier).decks,deck=roster[pair%roster.length],opponent=Object.keys(opponents)[(pair+Math.floor(pair/7))%7],other=opponents[opponent],ds=seat?[other,deck.cards]:[deck.cards,other],seed=+(process.env.SEED_BASE||30100000)+pair;
 let g=C.createGame({mode:'bot',seed,starting:0,challenge:version==='after'?{difficulty:tier,side:seat}:undefined,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;
 g.players[seat].botTune={...deck.tune};const opening=g.market.map(c=>c.id),buys=[],plays=[],timings=[];let steps=0,invalid=null;
 const rngs=[random(seed^725),random(seed^125)];
 C.withoutMonsterPresentation(()=>{while(!g.over&&steps<1800){const side=C.actingSide(g);Math.random=rngs[side];const start=performance.now();let action;
  if(side===seat)action=mod.botDecide(g,tier);
  else {const view=B.observationSample(g,side,0);action=C.legalBotAction(g,B.safeGreedy(view),view);}
  if(side===seat){timings.push(performance.now()-start);if(action.type==='buyMarket'||action.type==='buySupply')buys.push((action.type==='buyMarket'?g.market:g.players[side].supply)[action.i]?.id);if(action.type==='play')plays.push(g.players[side].hand[action.idx]?.id);}
  const next=C.reduce(g,action).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng){invalid=action;break;}g=next;steps++;
 }});
 timings.sort((a,b)=>a-b);return {...job,deck:deck.name,cards:deck.cards,opponent,seed,result:g.over?(g.winner==null?.5:g.winner===seat?1:0):null,turn:g.turn,steps,invalid,opening,buys,plays,ms:{p50:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)}};
}
if(!isMainThread)parentPort.on('message',job=>{try{parentPort.postMessage(play(job));}catch(e){parentPort.postMessage({...job,error:String(e.stack)});}});
else{
 const out=process.argv[2]||lab+'/benchmark.jsonl';if(fs.existsSync(out))throw Error('fresh output required');
 const tiers=(process.env.TIERS||'easy,normal,hard,hell').split(','),versions=(process.env.VERSIONS||'before,after').split(','),pairs=+(process.env.PAIRS||7),jobs=[];
 for(const tier of tiers)for(let pair=0;pair<pairs;pair++)for(const seat of [0,1])for(const version of versions)jobs.push({tier,version,pair,seat});
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');fs.writeFileSync(out+'.meta.json',JSON.stringify({balance:C.BALANCE_VERSION,candidate:hash(lab+'/candidate.cjs'),before:hash(lab+'/before.cjs'),opponents,tiers,pairs,scope:'full policy vs public-information greedy scripted opponents; not human win rate'}));
 let next=0,done=0;const started=Date.now(),workers=[],rows=[];
 for(let i=0;i<+(process.env.JOBS||3);i++){const w=new Worker(__filename);workers.push(w);w.on('error',e=>{console.error(e);process.exitCode=1;workers.forEach(x=>x.terminate());});w.on('message',row=>{rows.push(row);fs.appendFileSync(out,JSON.stringify(row)+'\n');done++;console.log(JSON.stringify({done,total:jobs.length,seconds:(Date.now()-started)/1000,last:{tier:row.tier,version:row.version,deck:row.deck,opponent:row.opponent,result:row.result,error:row.error}}));if(done===jobs.length){const groups={};for(const r of rows){const v=groups[r.tier+'/'+r.version]??={games:0,points:0,invalid:0,maxMs:0};v.games++;v.points+=r.result??0;v.invalid+=r.result==null||r.invalid||r.error?1:0;v.maxMs=Math.max(v.maxMs,r.ms?.max??0);}fs.writeFileSync(out+'.summary.json',JSON.stringify({groups,seconds:(Date.now()-started)/1000},null,2));workers.forEach(x=>x.terminate());if(rows.some(r=>r.result==null||r.invalid||r.error))process.exitCode=1;}else dispatch(w);});dispatch(w);}
 function dispatch(w){if(next<jobs.length)w.postMessage(jobs[next++]);}
}
