import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const tmp=await mkdtemp(path.join(tmpdir(),'lore-rank-'));
await build({entryPoints:['server/src/rank.ts'],bundle:true,format:'esm',platform:'node',outfile:tmp+'/rank.mjs'});
const {calculateRating,settleRanked,getRating,rankPosition,handleRank,seasonKey,tierOf}=await import(tmp+'/rank.mjs');
const sql=new DatabaseSync(':memory:');
sql.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,display TEXT);CREATE TABLE ratings(user_id TEXT,season TEXT,mmr INTEGER,wins INTEGER,losses INTEGER,peak_mmr INTEGER,updated_at INTEGER,final_rank INTEGER,final_tier TEXT,PRIMARY KEY(user_id,season));`);
sql.exec(await readFile('server/migrations/0014_ranked_results.sql','utf8'));
let fail=false;
class Stmt {
 constructor(query,args=[]){this.query=query;this.args=args;}
 bind(...args){return new Stmt(this.query,args);}
 async first(){return sql.prepare(this.query).get(...this.args)??null;}
 async all(){return {results:sql.prepare(this.query).all(...this.args)};}
 async run(){return sql.prepare(this.query).run(...this.args);}
}
const env={DB:{prepare:q=>new Stmt(q),batch:async list=>{sql.exec('BEGIN');try{const out=[];for(const [i,s] of list.entries()){out.push(sql.prepare(s.query).run(...s.args));if(fail&&i===1){fail=false;throw Error('injected outage');}}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const at=Date.UTC(2026,8,21),season='2026-09';
const add=(id,mmr=1000)=>{sql.prepare('INSERT INTO users VALUES (?,?)').run(id,id);sql.prepare('INSERT INTO ratings VALUES (?,?,?,0,0,?,1,NULL,NULL)').run(id,season,mmr,mmr);};
add('a');add('b');add('c');
assert.deepEqual(calculateRating(1000,1000,1),[1018,984]);assert.deepEqual(calculateRating(1000,1000,0.5),[1000,1000]);assert(calculateRating(800,1400,1)[0]-800>18);assert.equal(calculateRating(0,1000,0)[0],0);
await Promise.all(Array.from({length:8},()=>settleRanked(env,'match-one','a','b','a',at)));
assert.equal(sql.prepare('SELECT wins FROM ratings WHERE user_id=?').get('a').wins,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ranked_results').get().n,1);
await Promise.all([settleRanked(env,'match-two','a','c','a',at),settleRanked(env,'match-three','a','b','b',at)]);
assert.equal(sql.prepare('SELECT wins+losses n FROM ratings WHERE user_id=?').get('a').n,3);
const before=sql.prepare('SELECT * FROM ratings WHERE user_id=?').get('a');fail=true;
await assert.rejects(()=>settleRanked(env,'outage','a','c','a',at));
assert.deepEqual(sql.prepare('SELECT * FROM ratings WHERE user_id=?').get('a'),before);
await settleRanked(env,'outage','a','c','a',at);await settleRanked(env,'outage','a','c','a',at);
assert.equal(sql.prepare('SELECT wins+losses n FROM ratings WHERE user_id=?').get('a').n,4);
await settleRanked(env,'draw','b','c',null,at);assert.equal(sql.prepare('SELECT losses FROM ratings WHERE user_id=?').get('c').losses,2);
add('tie-a',1600);add('tie-b',1600);assert.equal(await rankPosition(env,'tie-a',season),1);assert.equal(await rankPosition(env,'tie-b',season),2);
const response=await handleRank(env,new Request('https://local/rank/leaderboard?season='+season),'/rank/leaderboard',null);const list=await response.json();assert.equal(list.entries[0].display,'tie-a');assert.equal(list.entries[1].rank,2);
const october=await getRating(env,'tie-a','2026-10');assert.equal(october.mmr,1300);
assert.equal(seasonKey(new Date('2026-12-31T23:59:59Z')),'2026-12');assert.equal(tierOf(1150),'gold');
await assert.rejects(()=>settleRanked(env,'self','a','a','a',at));
console.log('PASS: Elo, floor, draws, 8 duplicate settlements, concurrent rooms, atomic rollback/retry, tie ordering, soft reset, invalid participants');
sql.close();await rm(tmp,{recursive:true,force:true});
