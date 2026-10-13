const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(process.env.BOT_LAB || '.bot-strength');
const old = require(process.env.BOT_BASELINE || path.join(root,'baseline.cjs'));
const now = require(process.env.BOT_MODULE || path.join(root,'candidate.cjs'));
const [A='new:hard', B='old:hard', count='20', offset='0', dest='smoke'] = process.argv.slice(2);
if(process.env.SEARCH) Object.assign(now.SEARCH,JSON.parse(process.env.SEARCH));
if(process.env.VALUE_MODEL) Object.assign(now.VALUE_WEIGHTS,JSON.parse(fs.readFileSync(process.env.VALUE_MODEL)));
if(process.env.TACTICS) Object.assign(now.TACTICS,JSON.parse(process.env.TACTICS));
if(process.env.VALUE) Object.assign(now.VALUE,JSON.parse(process.env.VALUE));
if(process.env.BASELINE_VALUE) Object.assign(old.VALUE,JSON.parse(process.env.BASELINE_VALUE));
const checkpoint=process.env.RESUME_FROM?JSON.parse(fs.readFileSync(process.env.RESUME_FROM)):null;
const n=Number(count), start=Number(offset), rows=checkpoint?.rows??[];
const resumedGames=rows.length;
if(!Number.isInteger(n)||n<=0||n%2)throw new Error('Use a positive even game count for paired seats');
fs.mkdirSync(path.join(root,'results'),{recursive:true});
if(fs.existsSync(path.join(root,'results',dest+'.jsonl')))throw new Error('Choose a new output name; existing game evidence is never appended to');
const customA=process.env.ROSTER_A_FILE?JSON.parse(fs.readFileSync(process.env.ROSTER_A_FILE)):null,customB=process.env.ROSTER_B_FILE?JSON.parse(fs.readFileSync(process.env.ROSTER_B_FILE)):null;
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const config=JSON.parse(JSON.stringify({A,B,n,start,search:now.SEARCH,tactics:now.TACTICS,valueModel:process.env.VALUE_MODEL?digest(process.env.VALUE_MODEL):null,value:now.VALUE,baselineValue:old.VALUE,modules:{candidate:digest(process.env.BOT_MODULE||path.join(root,'candidate.cjs')),baseline:digest(process.env.BOT_BASELINE||path.join(root,'baseline.cjs'))},customA,customB,rosterA:process.env.ROSTER_A??'balanced',rosterB:process.env.ROSTER_B??'balanced'}));
if(checkpoint){
 assert.deepEqual(checkpoint.config,config,'Resume requires identical policy hashes, parameters, rosters and seed range');
 assert(rows.length<=n);rows.forEach((r,i)=>{assert.equal(r.pair,start+Math.floor(i/2));assert.equal(r.seat,i%2);if(customA&&customB){const a=customA[r.pair%customA.length],b=customB[Math.floor(r.pair/customA.length)%customB.length];assert.deepEqual(r.decks,r.seat===0?[a.name,b.name]:[b.name,a.name]);}});
 // Write a new result file, preserving the original evidence without edits.
 fs.writeFileSync(path.join(root,'results',dest+'.jsonl'),rows.map(r=>JSON.stringify(r)+'\n').join(''));
}
const pick = (label,g) => { const [version,tier] = label.split(':'); const mod=version==='old'?old:now; return tier==='greedy'? (mod.safeGreedy??mod.greedyDecide)(g,false):mod.botDecide(g,tier); };
const rand = seed => () => {seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296};
let total=rows.filter(r=>r.finished&&!r.bad).length, invalid=rows.length-total, wins=rows.filter(r=>r.finished&&!r.bad&&r.winner===r.seat).length, draws=rows.filter(r=>r.finished&&!r.bad&&r.winner==null).length, times=[];
const begin=Date.now();
for(let i=resumedGames;i<n;i++){
 const pair=start+Math.floor(i/2), seat=i%2;
 const da=pair%old.BOT_DECKS.length, db=Math.floor(pair/old.BOT_DECKS.length)%old.BOT_DECKS.length;
 const rosterA=customA??(process.env.ROSTER_A==='counter'?now.BOT_ELITE_DECKS.filter(d=>d.name==='BOT · COUNTER'):process.env.ROSTER_A==='hell'?now.BOT_HELL_DECKS:process.env.ROSTER_A==='elite'?now.BOT_ELITE_DECKS:old.BOT_DECKS);
 const rosterB=customB??(process.env.ROSTER_B==='hell'?now.BOT_HELL_DECKS:process.env.ROSTER_B==='elite'?now.BOT_ELITE_DECKS:old.BOT_DECKS);
 const aDeck=rosterA[pair%rosterA.length],bDeck=rosterB[Math.floor(pair/rosterA.length)%rosterB.length];
 const [d0,d1]=customA||customB||process.env.ROSTER_A||process.env.ROSTER_B?(seat===0?[aDeck,bDeck]:[bDeck,aDeck]):[old.BOT_DECKS[da],old.BOT_DECKS[db]];
 let g=now.createGame({seed:712000+pair,mode:'bot',starting:0,p0:{id:'A',name:'A',isBot:true,deck:d0.cards},p1:{id:'B',name:'B',isBot:true,deck:d1.cards}}).state;
 g.players[0].botTune=d0.tune;g.players[1].botTune=d1.tune;
 const rngs=[rand(917+pair*2),rand(918+pair*2)];
 let steps=0,bad=null;
 while(!g.over&&steps<1600){
  const side=now.actingSide(g);Math.random=rngs[side];
  const label=side===seat?A:B;
  const t=performance.now(),a=pick(label,g),ms=performance.now()-t;
  if(side===seat)times.push(ms);
  const next=now.reduce(g,a).state;
  if(!now.actionChangesState(g,next)) {bad={label,a,pending:g.pending,turn:g.turn};fs.writeFileSync(path.join(root,'results',dest+'-invalid-state.json'),JSON.stringify({g,a}));break;}
  g=next;steps++;
 }
 const row={pair,seat,da,db,decks:[d0.name,d1.name],finished:g.over,winner:g.over?g.winner:null,turns:g.turn,steps,bad};
 if(bad||!g.over)invalid++;else {total++;if(g.winner===seat)wins++;else if(g.winner==null)draws++;}
 rows.push(row);
 fs.appendFileSync(path.join(root,'results',dest+'.jsonl'),JSON.stringify(row)+'\n');
 if((i+1)%10===0||i+1===n)console.error(JSON.stringify({A,B,games:i+1,wins,total,invalid,elapsed:((Date.now()-begin)/1000).toFixed(1)}));
}
times.sort((a,b)=>a-b);
const p=wins/Math.max(1,total),z=1.96,d=1+z*z/Math.max(1,total),center=(p+z*z/(2*Math.max(1,total)))/d,half=z*Math.sqrt(p*(1-p)/Math.max(1,total)+z*z/(4*Math.max(1,total)**2))/d;
const pairs=new Map();
for(const r of rows) {if(!pairs.has(r.pair))pairs.set(r.pair,[]);pairs.get(r.pair).push(r);}
const validPairs=[...pairs.values()].filter(pair=>pair.length===2&&pair.every(r=>r.finished&&!r.bad));
const pairedScores=validPairs.map(pair=>pair.reduce((s,r)=>s+(r.winner==null?.5:r.winner===r.seat?1:0),0)/2);
const boot=[],bootstrapRng=rand(650813);
for(let b=0;b<5000&&pairedScores.length;b++){let sum=0;for(let j=0;j<pairedScores.length;j++)sum+=pairedScores[Math.floor(bootstrapRng()*pairedScores.length)];boot.push(sum/pairedScores.length);}boot.sort((a,b)=>a-b);
const result={resume:checkpoint?{games:resumedGames,checkpointSHA256:digest(process.env.RESUME_FROM),timingScope:"current process only; prior observations excluded"}:null,A,B,n,start,search:now.SEARCH,tactics:now.TACTICS,valueModel:process.env.VALUE_MODEL?digest(process.env.VALUE_MODEL):null,value:now.VALUE,baselineValue:old.VALUE,modules:{candidate:digest(process.env.BOT_MODULE||path.join(root,'candidate.cjs')),baseline:digest(process.env.BOT_BASELINE||path.join(root,'baseline.cjs'))},completePairs:validPairs.length,pairedScore:pairedScores.reduce((s,v)=>s+v,0)/Math.max(1,pairedScores.length),pairedBootstrap95:[boot[Math.floor(boot.length*.025)],boot[Math.floor(boot.length*.975)]],draws,customA,customB,rosterA:process.env.ROSTER_A??'balanced',rosterB:process.env.ROSTER_B??'balanced',wins,total,invalid,rate:p,wilson95:[center-half,center+half],seconds:(Date.now()-begin)/1000,ms:{p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)},rows};
fs.writeFileSync(path.join(root,'results',dest+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined}));
