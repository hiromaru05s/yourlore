const fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib');
const [lab='/tmp/lore-bot99',out='docs/bot-strength/2026-11-18-v99']=process.argv.slice(2);
const jobs=JSON.parse(fs.readFileSync(path.join(lab,'final-jobs.json'))),provenance=JSON.parse(fs.readFileSync(path.join(out,'provenance.json')));
const groups=new Map();
for(const job of jobs){
 const file=path.join(lab,'results',job.name+'.json');if(!fs.existsSync(file))throw Error('Incomplete: '+job.name);
 const result=JSON.parse(fs.readFileSync(file));
 if(result.rows.length!==job.n||result.invalid||result.total!==job.n)throw Error('Invalid/incomplete '+job.name);
 if(result.modules.candidate!==provenance.candidateSHA256||result.modules.baseline!==provenance.baselineSHA256)throw Error('Policy drift '+job.name);
 fs.writeFileSync(path.join(out,job.name+'.json.gz'),gzipSync(fs.readFileSync(file),{level:9}));
 const name=job.name.replace(/-\d+$/,'');if(!groups.has(name))groups.set(name,[]);groups.get(name).push(...result.rows);
}
let rng=78124;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296;};
const result=[];
for(const [name,rows] of groups){
 const pairs=new Map();for(const row of rows){if(!pairs.has(row.pair))pairs.set(row.pair,[]);pairs.get(row.pair).push(row);}
 const scores=[...pairs.values()].map(pair=>{if(pair.length!==2||new Set(pair.map(r=>r.seat)).size!==2)throw Error('Unpaired '+name);return pair.reduce((n,r)=>n+(r.winner==null?.5:r.winner===r.seat?1:0),0)/2;});
 const boot=Array.from({length:10000},()=>scores.reduce(n=>n+scores[Math.floor(random()*scores.length)],0)/scores.length).sort((a,b)=>a-b);
 const times=(isA)=>{const xs=rows.flatMap(r=>r.actionTimes.filter(a=>(a.side===r.seat)===isA).map(a=>a.ms)).sort((a,b)=>a-b);return {n:xs.length,p50:xs[Math.floor(xs.length*.5)],p95:xs[Math.floor(xs.length*.95)],p99:xs[Math.floor(xs.length*.99)],max:xs.at(-1),over15Seconds:xs.filter(x=>x>15000).length};};
 result.push({name,games:rows.length,pairs:pairs.size,wins:rows.filter(r=>r.winner===r.seat).length,draws:rows.filter(r=>r.winner==null).length,score:scores.reduce((a,b)=>a+b)/scores.length,pairedBootstrap95:[boot[250],boot[9750]],endedAtTurnCap:rows.filter(r=>r.turns>=60).length,meanTurns:rows.reduce((n,r)=>n+r.turns,0)/rows.length,decisionMs:{A:times(true),B:times(false)}});
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({method:'Paired seats, real botDecide and opening mulligan, fixed v99 rules, market preference disabled. Confidence interval resamples complete seed pairs; CPU timings are from a shared batch machine.',provenance,result},null,2));
console.log(JSON.stringify(result,null,2));
