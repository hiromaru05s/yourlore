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
sql.exec(await readFile('server/schema.sql','utf8'));
let fail=false,failAfterApply=false;
class Stmt {
 constructor(query,args=[]){this.query=query;this.args=args;}
 bind(...args){return new Stmt(this.query,args);}
 async first(){return sql.prepare(this.query).get(...this.args)??null;}
 async all(){return {results:sql.prepare(this.query).all(...this.args)};}
 async run(){return sql.prepare(this.query).run(...this.args);}
}
const env={GAME_ROOM:{idFromName:name=>({toString:()=> 'durable-'+name})},DB:{prepare:q=>new Stmt(q),batch:async list=>{sql.exec('BEGIN');try{const out=[];for(const [i,s] of list.entries()){out.push(sql.prepare(s.query).run(...s.args));if((fail&&i===1)||(failAfterApply&&s.query.includes('SET a_rank_after'))){fail=false;failAfterApply=false;throw Error('injected outage');}}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const at=Date.UTC(2026,8,21),season='2026-09';
const add=(id,mmr=1000,played=false)=>{sql.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES (?,?,?,?,0)').run(id,id+'@invalid.test','fixture',id);sql.prepare('INSERT INTO ratings VALUES (?,?,?,?,0,?,1,NULL,NULL)').run(id,season,mmr,played?1:0,mmr);};
add('a');add('b');add('c');
const leaderboard=async(seasonValue=season,query='')=>(await handleRank(env,new Request('https://local/rank/leaderboard?season='+seasonValue+query),'/rank/leaderboard',null)).json();
assert.deepEqual((await leaderboard()).entries,[],'merely creating a rating must not enter the ladder');
assert.equal((await leaderboard()).total,0);
assert.equal(await rankPosition(env,'a',season),null);
add('unplayed-master',3000);
assert.equal(await rankPosition(env,'unplayed-master',season),null,'high MMR alone is not participation');
assert.deepEqual(calculateRating(1000,1000,1),[1018,984]);assert.deepEqual(calculateRating(1000,1000,0.5),[1000,1000]);assert(calculateRating(800,1400,1)[0]-800>18);assert.equal(calculateRating(0,1000,0)[0],0);
await Promise.all(Array.from({length:8},()=>settleRanked(env,'match-one','a','b','a',at)));
assert.equal((await leaderboard()).total,2,'both a first win and a first loss qualify');
assert.deepEqual((await leaderboard()).entries.map(e=>e.display),['a','b']);
assert.equal((await settleRanked(env,'match-one','a','b','a',at)).a.rankBefore,undefined);
assert.equal(sql.prepare('SELECT wins FROM ratings WHERE user_id=?').get('a').wins,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ranked_results').get().n,1);
await Promise.all([settleRanked(env,'match-two','a','c','a',at),settleRanked(env,'match-three','a','b','b',at)]);
assert.equal(sql.prepare('SELECT wins+losses n FROM ratings WHERE user_id=?').get('a').n,3);
const before=sql.prepare('SELECT * FROM ratings WHERE user_id=?').get('a');fail=true;
await assert.rejects(()=>settleRanked(env,'outage','a','c','a',at));
assert.deepEqual(sql.prepare('SELECT * FROM ratings WHERE user_id=?').get('a'),before);
await settleRanked(env,'outage','a','c','a',at);await settleRanked(env,'outage','a','c','a',at);
assert.equal(sql.prepare('SELECT wins+losses n FROM ratings WHERE user_id=?').get('a').n,4);
await settleRanked(env,'draw','b','c',null,at);assert.equal(sql.prepare('SELECT losses FROM ratings WHERE user_id=?').get('c').losses,2);
add('tie-a',1600,true);add('tie-b',1600,true);assert.equal(await rankPosition(env,'tie-a',season),1);assert.equal(await rankPosition(env,'tie-b',season),2);
const response=await handleRank(env,new Request('https://local/rank/leaderboard?season='+season),'/rank/leaderboard',null);const list=await response.json();assert.equal(list.entries[0].display,'tie-a');assert.equal(list.entries[1].rank,2);
const october=await getRating(env,'tie-a','2026-10');assert.equal(october.mmr,1300);
assert.equal(seasonKey(new Date('2026-12-31T23:59:59Z')),'2026-12');assert.equal(tierOf(1150),'gold');
await assert.rejects(()=>settleRanked(env,'self','a','a','a',at));
// GM eligibility crosses the top-25 boundary at settlement, preserved after ladder changes.
for(let i=0;i<24;i++)add('leader-'+i,1800+i,true);
add('gm-challenger',1595,true);
const gmResult=await settleRanked(env,'gm-entry','gm-challenger','tie-a','gm-challenger',at);
assert.equal(gmResult['gm-challenger'].tierBefore,'master');
assert.equal(gmResult['gm-challenger'].tierAfter,'gm');
assert.equal(gmResult['gm-challenger'].rankAfter,25);
assert.equal(gmResult['tie-a'].tierBefore,'gm');
assert.equal(gmResult['tie-a'].tierAfter,'master');
add('late-leader',1900,true);
assert.deepEqual(await settleRanked(env,'gm-entry','gm-challenger','tie-a','gm-challenger',at),gmResult,'history cannot change when ladder changes');
const recover=async(user,match='gm-entry')=>{const r=await handleRank(env,new Request('https://local/rank/result?matchId='+match),'/rank/result',user&&{id:user});return {status:r.status,body:await r.json()};};
assert.deepEqual((await recover('gm-challenger')).body.result,gmResult['gm-challenger']);
assert.equal((await recover('a')).body.result,null,'unrelated users cannot read a result');
assert.equal((await recover(null)).status,401);
assert.equal((await recover('a','pending')).body.result,null);
for(const [mmr,key] of [[0,'iron'],[1029,'iron'],[1030,'bronze'],[1090,'silver'],[1150,'gold'],[1250,'platinum'],[1400,'diamond'],[1550,'master']])assert.equal(tierOf(mmr),key);
// Draws qualify at atomic settlement, never from pending/rolled-back results.
add('draw-only-a');add('draw-only-b');
fail=true;await assert.rejects(()=>settleRanked(env,'first-draw','draw-only-a','draw-only-b',null,at));
assert.equal(await rankPosition(env,'draw-only-a',season),null);
failAfterApply=true;await assert.rejects(()=>settleRanked(env,'first-draw','draw-only-a','draw-only-b',null,at));
assert.equal(sql.prepare('SELECT COUNT(*) n FROM ranked_results WHERE match_id=?').get('first-draw').n,0,'late settlement failure rolls back applied receipt too');
assert.equal(await rankPosition(env,'draw-only-b',season),null);
const firstDraw=await settleRanked(env,'first-draw','draw-only-a','draw-only-b',null,at);
assert.equal(firstDraw['draw-only-a'].rankBefore,undefined);
for(const id of ['draw-only-a','draw-only-b']){
 assert.equal(sql.prepare('SELECT wins+losses n FROM ratings WHERE user_id=?').get(id).n,0);
 assert.equal(firstDraw[id].rankAfter,await rankPosition(env,id,season));
 assert((await leaderboard()).entries.some(e=>e.display===id));
}
add('casual-only');sql.prepare('UPDATE users SET wins=10,losses=2 WHERE id=?').run('casual-only');
for(const mode of ['online','bot'])sql.prepare('INSERT INTO matches(id,player_a,player_b,mode,created_at,ended_at) VALUES (?,?,?,?,?,?)').run(mode,'casual-only','a',mode,at,at+1);
add('pending-a');add('pending-b');
sql.prepare('INSERT INTO ranked_results(match_id,season,a_id,b_id,a_before,b_before,a_after,b_after,created_at) VALUES (?,?,?,?,1000,1000,1000,1000,?)').run('pending',season,'pending-a','pending-b',at);
const complete=await leaderboard();
for(const id of ['unplayed-master','casual-only','pending-a','pending-b']){
 assert(!complete.entries.some(e=>e.display===id));assert.equal(await rankPosition(env,id,season),null);
}
assert.equal(complete.total,complete.entries.length);
const paged=await leaderboard(season,'&offset=2&limit=3');
assert.equal(paged.total,complete.total);assert.deepEqual(paged.entries,complete.entries.slice(2,5));
for(const entry of complete.entries)assert.equal(await rankPosition(env,entry.display,season),entry.rank);
// Once played, eligibility carries across a soft reset, including a draw-only player.
await getRating(env,'draw-only-a','2026-10');await getRating(env,'unplayed-master','2026-10');
assert((await leaderboard('2026-10')).entries.some(e=>e.display==='draw-only-a'));
assert(!(await leaderboard('2026-10')).entries.some(e=>e.display==='unplayed-master'));
await getRating(env,'draw-only-a','2026-08');
assert(!(await leaderboard('2026-08')).entries.some(e=>e.display==='draw-only-a'),'future games cannot qualify an earlier season');
const personal=await (await handleRank(env,new Request('https://local/rank/me'),'/rank/me',{id:'unplayed-master'})).json();
assert.equal(personal.rating.rank,null);assert.notEqual(personal.rating.tier,'gm');
const history=await (await handleRank(env,new Request('https://local/rank/history'),'/rank/history',{id:'unplayed-master'})).json();
assert.deepEqual(history.seasons,[]);
const finalized=await (await handleRank({...env,AUTH_SECRET:'fixture'},new Request('https://local/rank/finalize?season='+season,{method:'POST',headers:{Authorization:'Bearer fixture'}}),'/rank/finalize',null)).json();
assert.equal(finalized.finalized,complete.total);
assert.equal(sql.prepare('SELECT final_rank FROM ratings WHERE user_id=? AND season=?').get('unplayed-master',season).final_rank,null);
assert.equal(sql.prepare('SELECT final_rank FROM ratings WHERE user_id=? AND season=?').get('draw-only-a',season).final_rank,await rankPosition(env,'draw-only-a',season));
console.log('PASS: ranked participation eligibility, first win/loss/draw, unplayed and casual exclusion, pagination, previous seasons, personal standing, finalization, late atomic rollback; exact GM entry/exit, immutable snapshots, authenticated match recovery, all tier thresholds; Elo, floor, draws, 8 duplicate settlements, concurrent rooms, atomic rollback/retry, tie ordering, soft reset, invalid participants');
sql.close();await rm(tmp,{recursive:true,force:true});
