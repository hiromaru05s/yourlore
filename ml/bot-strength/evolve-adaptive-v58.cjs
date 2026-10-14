// Family-constrained evolution keeps distinct win conditions, not just names.
const fs=require('fs'),path=require('path'),{createHash}=require('crypto');
const lab=process.env.BOT_LAB||'/tmp/lore-bot-adaptive-v58',C=require(path.join(lab,'candidate.cjs'));
const candidateHash=createHash('sha256').update(fs.readFileSync(path.join(lab,'candidate.cjs'))).digest('hex');
const {opponents}=require('./adaptive-v58.cjs');const out=process.argv[2];
if(!out||fs.existsSync(out)||fs.existsSync(out+'.jsonl'))throw Error('Fresh output required');
const families={
 DECAY:['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM'],
 AGGRO:['GHOST','GHOST','AMBUSH'],
 GAMBLER:['GAMBLER','GAMBLER','GAMBLER'],
 RIFT:['RIFT','RIFT','TRIAL_AREA'],
 ELF:['ELF_HAVEN','NOURISHING_RAIN','HALF_ELF'],
 CASTLE:['CASTLE','CASTLE','TRUMPET'],
 VAMPIRE:['NIGHT_CASTLE_GIFT','NIGHT_CASTLE_GIFT','BLOOD_RITE'],
 ASSASSIN:['GUILD_HALL','GUILD_HALL','TRUMPET'],
};
const pool=['RUST_SHROOM','RUST_SHROOM','GHOST','GHOST','COUNTERCALC','WEAKEN_ALL','RIFT','TRIAL_AREA','SELECTED_SHIELD','NOURISHING_RAIN','GAMBLER','STARTER_TRASH','STARTER_TRASH','REFRESH_HAND','FOCUS'];
let seed=671217;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const key=d=>[...d].sort().join(',');
const start=Date.now(),scores=[],rows=[];let games=0;
function evaluate(family,deck,generation){let points=0,invalid=0;const pairScores=[];
 for(const [j,[opponent,other]] of Object.entries(Object.entries(opponents))){let pair=0;for(let seat=0;seat<2;seat++){
  const ds=seat?[other,deck]:[deck,other];let g=C.createGame({mode:'bot',seed:4910000+generation*100+Number(j),starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;
  let steps=0,bad=false;while(!g.over&&steps++<1600){const side=C.actingSide(g),view=C.observationSample(g,side,0),a=C.legalBotAction(g,C.safeGreedy(view),view),next=C.reduce(g,a).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng){bad=true;break;}g=next;}
  const result=!bad&&g.over?(g.winner===seat?1:g.winner==null?.5:0):null;if(result===null)invalid++;else {points+=result;pair+=result/2;}
  const row={family,deck,generation,opponent,seat,result,steps,turn:g.turn};fs.appendFileSync(out+'.jsonl',JSON.stringify(row)+'\n');games++;
 }pairScores.push(pair);}
 // Reward general strength, using worst-opponent result as a tie-breaker.
 return {family,deck,generation,points,invalid,fitness:points/16+Math.min(...pairScores)*.05};
}
for(const [family,anchors] of Object.entries(families)){
 let population=[];const unique=new Set();
 const add=d=>{const k=key(d);if(!unique.has(k)){unique.add(k);population.push(d);}};
 add([...anchors,'RUST_SHROOM','RUST_SHROOM','GHOST','COUNTERCALC','WEAKEN_ALL']);
 add([...anchors,'RIFT','TRIAL_AREA','SELECTED_SHIELD','STARTER_TRASH','STARTER_TRASH']);
 while(population.length<12)add([...anchors,...Array.from({length:5},()=>pool[Math.floor(rnd()*pool.length)])]);
 let scored=[];
 for(let generation=0;generation<3;generation++){
  scored=population.map(deck=>evaluate(family,deck,generation)).sort((a,b)=>b.fitness-a.fitness);
  scores.push(...scored);console.log(JSON.stringify({family,generation,games,best:scored[0],seconds:(Date.now()-start)/1000}));
  population=scored.slice(0,3).map(s=>s.deck);unique.clear();population.forEach(d=>unique.add(key(d)));
  while(population.length<12){const parent=scored[Math.floor(rnd()*5)].deck,d=[...parent];d[3+Math.floor(rnd()*5)]=pool[Math.floor(rnd()*pool.length)];add(d);}
 }
 const summary={games,seconds:(Date.now()-start)/1000,modules:{candidate:candidateHash},families,scores};fs.writeFileSync(out,JSON.stringify(summary,null,2));
}
