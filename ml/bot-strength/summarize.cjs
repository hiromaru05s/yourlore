const fs = require('node:fs');
const assert = require('node:assert/strict');
const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) throw new Error('Usage: summarize.cjs output.json shard1.json ...');
const runs = inputs.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
for (const run of runs) for (const key of ['A', 'B', 'rosterA', 'rosterB', 'modules', 'search', 'value', 'tactics', 'customA', 'customB', 'valueModel']) assert.deepEqual(run[key], runs[0][key], `Mixed ${key}`);
const rows = runs.flatMap(r => r.rows).sort((a,b) => a.pair-b.pair || a.seat-b.seat);
const seen = new Set(), pairs = new Map();
for (const row of rows) {
  const key = `${row.pair}:${row.seat}`;
  assert(!seen.has(key), `Duplicate ${key}`); seen.add(key);
  if (!pairs.has(row.pair)) pairs.set(row.pair, []);
  pairs.get(row.pair).push(row);
}
const valid = rows.filter(r => r.finished && !r.bad);
const validPairs = [...pairs.values()].filter(p => p.length === 2 && p.every(r => r.finished && !r.bad));
const score = r => r.winner == null ? .5 : Number(r.winner === r.seat);
const scores = validPairs.map(p => (score(p[0]) + score(p[1])) / 2);
assert(scores.length, 'No complete valid pairs');
let seed = 650813;
const rnd = () => {seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296;};
const boot = [];
for (let i=0;i<10000;i++) {let s=0;for(let j=0;j<scores.length;j++)s+=scores[Math.floor(rnd()*scores.length)];boot.push(s/scores.length);}
boot.sort((a,b)=>a-b);
const result = {A:runs[0].A,B:runs[0].B,rosterA:runs[0].rosterA,rosterB:runs[0].rosterB,
  tactics:runs[0].tactics,customA:runs[0].customA,customB:runs[0].customB,valueModel:runs[0].valueModel,modules:runs[0].modules,search:runs[0].search,value:runs[0].value,
  games:rows.length,valid:valid.length,invalid:rows.length-valid.length,
  wins:valid.filter(r=>r.winner===r.seat).length,draws:valid.filter(r=>r.winner==null).length,
  completePairs:scores.length,pairedScore:scores.reduce((a,b)=>a+b,0)/scores.length,
  pairedBootstrap95:[boot[250],boot[9750]],
  ms:runs.some(r=>r.resume)?null:{p50ShardRange:[Math.min(...runs.map(r=>r.ms.p50)),Math.max(...runs.map(r=>r.ms.p50))],
    p95ShardRange:[Math.min(...runs.map(r=>r.ms.p95)),Math.max(...runs.map(r=>r.ms.p95))],max:Math.max(...runs.map(r=>r.ms.max))},
  sources:inputs.map(f=>require('node:path').basename(f)),rows};
fs.writeFileSync(output, JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,rows:undefined}));
