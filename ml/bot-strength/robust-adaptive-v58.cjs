// Search against the previous strongest rosters AND their counter-builds.
const fs=require('fs'),path=require('path'),{createHash}=require('crypto');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-v58-release',C=require(lab+'/candidate.cjs'),B=require(lab+'/before.cjs');
const out=process.argv[2];if(!out||fs.existsSync(out)||fs.existsSync(out+'.jsonl'))throw Error('Fresh output required');
const modules={candidate:createHash('sha256').update(fs.readFileSync(lab+'/candidate.cjs')).digest('hex'),baseline:createHash('sha256').update(fs.readFileSync(lab+'/before.cjs')).digest('hex')};
const counters=JSON.parse(fs.readFileSync('docs/bot-strength/2026-10-13-v2/counters.json')).map(d=>d.cards);
const continuation = process.env.CONTINUE_FROM ? JSON.parse(fs.readFileSync(process.env.CONTINUE_FROM)) : null;
const opponents=continuation ? [...B.BOT_HELL_DECKS.map(d=>d.cards),...counters,B.BOT_ELITE_DECKS[1].cards,continuation.scores.slice().sort((a,b)=>b.fitness-a.fitness)[0].deck] : [...B.BOT_HELL_DECKS.map(d=>d.cards),...counters,B.BOT_ELITE_DECKS[1].cards,C.BOT_HELL_DECKS[5].cards];
let population=[...B.BOT_HELL_DECKS.map(d=>d.cards),...counters,...C.BOT_HELL_DECKS.map(d=>d.cards),...B.BOT_ELITE_DECKS.map(d=>d.cards)];
if (continuation) population=continuation.scores.slice().sort((a,b)=>b.fitness-a.fitness).slice(0,12).map(s=>s.deck);
const generationCount=+(process.env.GENERATIONS||5), seedOffset=+(process.env.SEED_OFFSET||0);
let seed=6712141+seedOffset;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},key=d=>[...d].sort().join(',');
const pool=['RUST_SHROOM','GHOST','COUNTERCALC','WEAKEN_ALL','RIFT','GAMBLER','STARTER_TRASH','REFRESH_HAND','CASTLE','BLOOD_RITE','TRIAL_AREA','NOURISHING_RAIN','RUST_SHROOM','RUST_SHROOM','BLOOD_RITE'];
const begin=Date.now(),history=[];let games=0;
function play(deck,other,seed,seat){const ds=seat?[other,deck]:[deck,other];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;let steps=0;
 while(!g.over&&steps++<1600){const side=C.actingSide(g),mod=side===seat?C:B,view=mod.observationSample(g,side,0),a=mod.legalBotAction(g,mod.safeGreedy(view),view),next=C.reduce(g,a).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng)return null;g=next;}
 return g.over?(g.winner===seat?1:g.winner==null?.5:0):null;
}
for(let generation=0;generation<generationCount;generation++){
 const seen=new Set(population.map(key));
 while(population.length<48){const d=[...population[Math.floor(rnd()*Math.min(16,population.length))]];for(let j=0;j<(rnd()<.3?3:1);j++){const options=rnd()<.75?pool:C.DECK_POOL;d[Math.floor(rnd()*8)]=options[Math.floor(rnd()*options.length)];}if(!seen.has(key(d))&&JSON.stringify(C.sanitizeDeck(d))===JSON.stringify(d)){seen.add(key(d));population.push(d);}}
 const scores=[];
 for(const [index,deck] of population.entries()){let points=0,oldHell=0,invalid=0;const matchups=[];
  for(let opponent=0;opponent<opponents.length;opponent++){let subtotal=0;for(let r=0;r<2;r++)for(let seat=0;seat<2;seat++){
   const matchSeed=5110000+seedOffset+generation*1000+opponent*10+r,result=play(deck,opponents[opponent],matchSeed,seat);games++;if(result==null)invalid++;else{points+=result;subtotal+=result;if(opponent<3)oldHell+=result;}
   fs.appendFileSync(out+'.jsonl',JSON.stringify({generation,index,deck,opponent,seed:matchSeed,seat,result})+'\n');
  }matchups.push(subtotal/4);}
  scores.push({deck,points,oldHell,invalid,matchups,fitness:points/40*.6+oldHell/12*.4});
 }
 scores.sort((a,b)=>b.fitness-a.fitness);history.push({generation,scores});population=scores.filter(x=>!x.invalid).slice(0,16).map(x=>x.deck);
 fs.writeFileSync(out,JSON.stringify({modules,seedOffset,generationCount,continuation:process.env.CONTINUE_FROM??null,games,seconds:(Date.now()-begin)/1000,opponents,history},null,2));console.log(JSON.stringify({generation,games,seconds:(Date.now()-begin)/1000,best:scores.slice(0,3)}));
}
