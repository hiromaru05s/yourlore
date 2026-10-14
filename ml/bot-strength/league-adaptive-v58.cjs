// New-policy public-information round robin, including targeted anti-decay builds.
// Select fixed-size, uniform rosters by their weakest matchup against this field.
const fs=require('fs'),{createHash}=require('crypto');
const lab=process.env.BOT_LAB,C=require(lab+'/candidate.cjs'),[input,out]=process.argv.slice(2);
if(!out||fs.existsSync(out)||fs.existsSync(out+'.jsonl'))throw Error('Completed holdout and fresh output required');
const source=JSON.parse(fs.readFileSync(input)),samples=+(process.env.SAMPLES||8),seedBase=+(process.env.SEED_BASE||8310000),validation=process.env.VALIDATE==='1',rescore=process.env.RESCORE==='1';
const rust=n=>Array(n).fill('RUST_SHROOM');
const challengers=[
 [...rust(4),'WEAKEN_ALL','WEAKEN_ALL','COUNTERCALC','COUNTERCALC'],
 [...rust(5),'WEAKEN_ALL','COUNTERCALC','COUNTERCALC'],
 [...rust(4),'ACID_RAIN','ACID_RAIN','COUNTERCALC','COUNTERCALC'],
 [...rust(5),'BLOOD_RITE','COUNTERCALC','COUNTERCALC'],
 [...rust(7),'COUNTERCALC'],
 [...rust(4),'WEAKEN_ALL','NOURISHING_RAIN','BLOOD_RITE','COUNTERCALC'],
];
const decks=[],seen=new Set();for(const cards of (validation||rescore)?source.decks:[...source.scores.slice().sort((a,b)=>b.fitness-a.fitness).slice(0,10).map(s=>s.deck),...challengers]){
 const signature=cards.slice().sort().join(',');if(seen.has(signature))continue;seen.add(signature);
 if(JSON.stringify(C.sanitizeDeck(cards))!==JSON.stringify(cards))throw Error('Illegal build');decks.push(cards);
}
const modules={candidate:createHash('sha256').update(fs.readFileSync(lab+'/candidate.cjs')).digest('hex')},n=decks.length,points=Array.from({length:n},()=>Array(n).fill(0)),counts=Array.from({length:n},()=>Array(n).fill(0)),rows=rescore?source.rows:[],begin=Date.now();
if(rescore){if(source.modules.candidate!==modules.candidate)throw Error("Rescore must use the evaluated bundle");for(let a=0;a<n;a++)for(let b=0;b<n;b++){counts[a][b]=source.counts[a][b];points[a][b]=source.payoff[a][b]*counts[a][b];}}
if(!rescore)for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
 for(let r=0;r<samples;r++)for(let seat=0;seat<2;seat++){
  const seed=seedBase+a*1000+b*20+r,ds=seat?[decks[b],decks[a]]:[decks[a],decks[b]];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state,steps=0;
  (C.withoutMonsterPresentation??(work=>work()))(()=>{while(!g.over&&steps++<1600){const view=C.observationSample(g,C.actingSide(g),0),action=C.legalBotAction(g,C.safeGreedy(view),view),next=C.reduce(g,action).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng)throw Error('Illegal action');g=next;}});
  if(!g.over)throw Error('Unfinished game');const result=g.winner==null?.5:g.winner===seat?1:0;points[a][b]+=result;points[b][a]+=1-result;counts[a][b]++;counts[b][a]++;
  const row={a,b,seed,seat,result,turns:g.turn,steps};rows.push(row);fs.appendFileSync(out+'.jsonl',JSON.stringify(row)+'\n');
 }
 if(b===n-1)console.log(JSON.stringify({through:a,games:rows.length,seconds:(Date.now()-begin)/1000}));
}
const payoff=points.map((row,a)=>row.map((v,b)=>a===b?.5:v/counts[a][b]));
function evaluate(indices){const versus=Array.from({length:n},(_,b)=>indices.reduce((s,a)=>s+payoff[a][b],0)/indices.length);return {indices:indices.slice(),worst:Math.min(...versus),mean:versus.reduce((a,b)=>a+b,0)/n,versus};}
const eligible=decks.map((cards,i)=>i).filter(i=>!decks[i].some(id=>["INCUBATOR","INCUBATOR_S"].includes(id))||decks[i].some(id=>C.DB[id]?.hatch!=null||id==="ANCIENT_CIV"));
function select(size){let best=null;
 const visit=(start,chosen)=>{if(chosen.length===size){const score=evaluate(chosen);
  if(!best||score.worst>best.worst+1e-10||Math.abs(score.worst-best.worst)<1e-10&&score.mean>best.mean)best=score;return;}
  for(let k=start;k<=eligible.length-(size-chosen.length);k++){chosen.push(eligible[k]);visit(k+1,chosen);chosen.pop();}
 };visit(0,[]);return best;
}
const result={modules,samples,seedBase,validation,rescore,eligible,games:rows.length,seconds:rescore?source.seconds:(Date.now()-begin)/1000,decks,payoff,counts,hard:validation?evaluate(source.hard.indices):select(5),hell:validation?evaluate(source.hell.indices):select(7),rows};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({games:result.games,seconds:result.seconds,hard:result.hard,hell:result.hell}));
