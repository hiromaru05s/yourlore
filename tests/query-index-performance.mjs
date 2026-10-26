/** Deterministic synthetic scale check; elapsed times are local SQLite, not D1 latency. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-query-perf-'),db=new DatabaseSync(':memory:');
try {
 await build({stdin:{contents:`export {rankPosition} from './server/src/rank';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {rankPosition}=await import(dir+'/test.mjs');
 const baselineSource=execFileSync('git',['show','f9f05fe5:server/src/rank.ts'],{encoding:'utf8'});
 await build({stdin:{contents:`export {rankPosition} from './server/src/rank';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/baseline.mjs',plugins:[{name:'baseline-rank',setup(b){b.onLoad({filter:/server\/src\/rank\.ts$/},args=>({contents:baselineSource,loader:'ts',resolveDir:new URL('../server/src/',import.meta.url).pathname}));}}]});
 const {rankPosition:baselineRank}=await import(dir+'/baseline.mjs');
 db.exec(await readFile('server/schema.sql','utf8'));
 db.exec('DROP INDEX idx_ranked_results_applied_a;DROP INDEX idx_ranked_results_applied_b;');
 db.exec('BEGIN');
 const user=db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,0)');
 const rating=db.prepare("INSERT INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES(?,'2026-10',1000,0,0,1000,0)");
 const result=db.prepare("INSERT INTO ranked_results(match_id,season,a_id,b_id,winner,a_before,b_before,a_after,b_after,applied,created_at) VALUES(?,'2026-09',?,?,NULL,1000,1000,1000,1000,1,0)");
 for(let i=0;i<1000;i++){const id='scale-'+String(i).padStart(4,'0');user.run(id,id+'@invalid.test','disabled',id);rating.run(id);for(let j=0;j<12;j++)result.run(id+'-'+j,id,'scale-'+String((i+1)%1000).padStart(4,'0'));}
 db.exec('COMMIT');
 let query,args;
 const env={DB:{prepare(sql){query=sql;return {bind(...values){args=values;return {first:async()=>db.prepare(sql).get(...values)}}}}}};
 assert.equal(await baselineRank(env,'scale-0500','2026-10'),501);
 const measure=()=>{const samples=[];let value;for(let i=0;i<5;i++){const start=performance.now();value=db.prepare(query).get(...args);samples.push(performance.now()-start);}return {samplesMs:samples,medianMs:[...samples].sort((a,b)=>a-b)[2],value,plan:db.prepare('EXPLAIN QUERY PLAN '+query).all(...args).map(r=>r.detail)}};
 const before=measure();db.exec(await readFile('server/migrations/0028_query_indexes.sql','utf8'));db.exec(await readFile('server/migrations/0028_query_indexes.sql','utf8'));assert.equal(await rankPosition(env,'scale-0500','2026-10'),501);const after=measure();
 assert.deepEqual(before.value,after.value);assert(after.plan.some(s=>s.includes('idx_ranked_results_applied_a')));assert(after.plan.some(s=>s.includes('idx_ranked_results_applied_b')));
 const report={kind:'synthetic local SQLite; baseline f9f05fe5 query and indexes versus optimized query/indexes',players:1000,results:12000,before,after,speedup:before.medianMs/after.medianMs};
 if(process.env.LORE_QUERY_REPORT)await writeFile(process.env.LORE_QUERY_REPORT,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
} finally {db.close();await rm(dir,{recursive:true,force:true})}
