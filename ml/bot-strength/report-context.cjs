// Aggregate the predeclared independent final policy comparisons. Never pool
// tuning rounds, partial games or training proxy outcomes into these rates.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{gzipSync}=require('node:zlib');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const batches=[['easy','holdout-easy',32,9100],['normal','holdout2-normal-a',16,9400],['normal','holdout2-normal-b',16,9408],['hard','holdout3-hard-a',8,9500],['hard','holdout3-hard-b',8,9504],['hard','holdout3-hard-c',8,9508]];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const initial=fs.readFileSync(root+'/final/candidate.cjs','utf8'),normal=fs.readFileSync(root+'/r11/candidate.cjs','utf8'),release=fs.readFileSync(root+'/r12/candidate.cjs','utf8');
assert.equal(normal.replace('normal: 1e4','normal: 6e3').replace('diff === \"hard\" || diff === \"normal\" ? \"hell\" : diff','diff === \"hard\" ? \"hell\" : diff'),initial,'The r11 changes must affect Normal only');
// These exact transformations remove only the Hard/Hell budget and the expert
// branch whose flag is false for Easy/Normal. Verify the entire bundled module,
// not just a selected snippet, before reusing the unchanged tier experiments.
const withoutExpert=release
 .replace('hard: 3e4, hell: 3e4','hard: 18e3, hell: 18e3')
 .replace('function searchDecide(g, level, prove = true, onProgress, expertBaseline = false)', 'function searchDecide(g, level, prove = true, onProgress)')
 .replace('return decideSearch(g, level, prove, onProgress, expertBaseline);','return decideSearch(g, level, prove, onProgress);')
 .replace('function decideSearch(g, level, prove, onProgress, expertBaseline)','function decideSearch(g, level, prove, onProgress)')
 .replace('const base = expertBaseline ? searchDecide(g, "hard", false, onProgress) : turnPlan(', 'const base = turnPlan(')
 .replace('}, diff === "hard" || diff === "hell"), () => completed);','}), () => completed);');
assert.equal(withoutExpert,normal,'The r12 changes must affect Hard/Hell only');
const candidateByTier={easy:hash(root+'/final/candidate.cjs'),normal:hash(root+'/r11/candidate.cjs'),hard:hash(root+'/r12/candidate.cjs')},baseline=hash(root+'/before.cjs'),all=[];
for(const [tier,name,n,seed] of batches){
 const r=JSON.parse(fs.readFileSync(root+'/results/'+name+'.json'));
 assert.deepEqual(r.modules,{candidate:candidateByTier[tier],baseline});assert.equal(r.n,n);assert.equal(r.start,seed);assert.equal(r.total,n);assert.equal(r.invalid,0);assert.equal(r.rows.length,n);assert.equal(r.mirror,true);assert.equal(r.value.learned,0);
 for(const [i,row] of r.rows.entries()){assert(row.finished&&!row.bad);assert.equal(row.pair,seed+Math.floor(i/2));assert.equal(row.seat,i%2);assert.equal(row.decks[0],row.decks[1]);all.push({...row,tier,batch:name});}
 fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({...r,rows:undefined},null,2)+'\n');
 fs.writeFileSync(out+'/'+name+'.jsonl.gz',gzipSync(fs.readFileSync(root+'/results/'+name+'.jsonl')));
}
const totals={};
for(const tier of ['easy','normal','hard']){
 const rows=all.filter(r=>r.tier===tier),wins=rows.filter(r=>r.winner===r.seat).length,draws=rows.filter(r=>r.winner==null).length;
 const keys=new Map();for(const r of rows){if(!keys.has(r.pair))keys.set(r.pair,[]);keys.get(r.pair).push(r);}
 const paired=[...keys.values()].map(rr=>{assert.equal(rr.length,2);return rr.reduce((v,r)=>v+(r.winner==null?.5:r.winner===r.seat?1:0),0)/2;});
 let seed=331187;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const boot=[];for(let i=0;i<10000;i++){let sum=0;for(let j=0;j<paired.length;j++)sum+=paired[Math.floor(random()*paired.length)];boot.push(sum/paired.length);}boot.sort((a,b)=>a-b);
 const score=(wins+draws*.5)/rows.length,radius=Math.sqrt(Math.log(40)/(2*paired.length)),timings=rows.flatMap(r=>r.actionTimes.filter(t=>t.side===r.seat).map(t=>t.ms)).sort((a,b)=>a-b);
 const counts=rr=>({n:rr.length,wins:rr.filter(r=>r.winner===r.seat).length,draws:rr.filter(r=>r.winner==null).length});
 totals[tier]={n:rows.length,wins,draws,score,independentPairs:paired.length,pairedBootstrap95:[boot[250],boot[9750]],pairedHoeffding95:[Math.max(0,score-radius),Math.min(1,score+radius)],bySeat:[0,1].map(s=>counts(rows.filter(r=>r.seat===s))),byStarter:Object.fromEntries([...new Set(rows.map(r=>r.decks[0]))].map(name=>[name,counts(rows.filter(r=>r.decks[0]===name))])),decisionMs:{p50:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)}};
}
const result={baselineCommit:'914dc9bab',balance:'v101',modules:{candidateByTier,baseline,release:candidateByTier.hard},unaffectedTierProof:'r11 is byte-identical to initial after two Normal-only substitutions. r12 is byte-identical to r11 after removing the Hard/Hell-only budget and expert branch (flag false for Easy/Normal). Each tier retains its actual tested module hash.',games:all.length,invalid:0,protocol:'Fixed current starter cards, identical deck mirror, paired seats and shared seeds; actual botDecide on both sides; unbiased market; no wall-clock server deadline',uncertainty:'Pairs are independent units. Small-sample bootstrap can be narrow; bounded Hoeffding intervals are also supplied. These are Bot-versus-Bot results, not human win rates.',timingScope:'Concurrent and CPU-scheduled local simulations; process pauses may inflate timings. Not production latency',tiers:totals};
fs.writeFileSync(out+'/holdout.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
