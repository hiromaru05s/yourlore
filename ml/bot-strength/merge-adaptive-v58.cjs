const fs=require('fs'),assert=require('assert/strict');
const [out,...inputs]=process.argv.slice(2);if(!out||!inputs.length||fs.existsSync(out))throw Error('Fresh output and completed shards required');
const all=inputs.map(p=>JSON.parse(fs.readFileSync(p)));const first=all[0],rows=[],seen=new Set();
for(const item of all){for(const key of ['modules','opponentTier','balance','mode','samples','offset','plannedRows','candidates','opponents'])assert.deepEqual(item[key],first[key],`Mixed ${key}`);for(const r of item.rows){assert(r.finished&&!r.invalid&&r.result!=null,'Unfinished or invalid trial');assert(r.rowIndex>=item.rowRange[0]&&r.rowIndex<item.rowRange[1],'Outside declared shard');assert(!seen.has(r.rowIndex),'Duplicate row index');seen.add(r.rowIndex);rows.push(r);}}
assert.equal(seen.size,first.plannedRows,'Incomplete trial plan');for(let i=0;i<first.plannedRows;i++)assert(seen.has(i),'Missing planned row');
rows.sort((a,b)=>a.rowIndex-b.rowIndex);
const groups={};for(const row of rows){const key=[row.name,row.tier,row.market,row.version].join('/'),g=groups[key]??={games:0,points:0,invalid:0};g.games++;g.points+=row.result??0;g.invalid+=row.invalid||!row.finished?1:0;}
fs.writeFileSync(out,JSON.stringify({...first,seconds:all.some(s=>s.seconds==null)?null:Math.max(...all.map(s=>s.seconds)),shardSeconds:all.map(s=>s.seconds),rowRange:[0,rows.length],inputs,groups,rows},null,2));console.log({games:rows.length,invalid:rows.filter(r=>r.invalid||!r.finished).length});
