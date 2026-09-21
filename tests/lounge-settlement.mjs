import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const tmp=await mkdtemp(tmpdir()+'/lore-settlement-');
await build({entryPoints:['server/src/gameRoom.ts'],bundle:true,format:'esm',platform:'node',outfile:tmp+'/room.mjs'});
const {GameRoom}=await import(tmp+'/room.mjs');
const sql=new DatabaseSync(':memory:');sql.exec(await readFile('server/schema.sql','utf8'));
for(const id of ['qa-a','qa-b'])sql.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES (?,?,?,?,?)').run(id,id+'@invalid.test','no-login',id,Date.now());
let failRank=false;
class Stmt{constructor(q,a=[]){this.q=q;this.a=a;}bind(...a){return new Stmt(this.q,a);}async first(){return sql.prepare(this.q).get(...this.a)??null;}async all(){return{results:sql.prepare(this.q).all(...this.a)};}async run(){return sql.prepare(this.q).run(...this.a);}}
const env={DB:{prepare:q=>new Stmt(q),batch:async list=>{sql.exec('BEGIN');try{for(const s of list){if(failRank&&s.q.includes('INSERT OR IGNORE INTO ranked_results')){failRank=false;throw Error('injected rank outage');}sql.prepare(s.q).run(...s.a);}sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const run=(id,ranked=true,joined=true)=>{const writes=[],alarms=[];const state={id:{toString:()=>id},storage:{put:async(k,v)=>writes.push(structuredClone(v)),setAlarm:async t=>alarms.push(t)},getWebSockets:()=>[]};const room=new GameRoom(state,env);room.room={players:[{id:'qa-a'},{id:'qa-b'}],ranked,readied:[joined,joined],recorded:false,startedAt:Date.now()-1000,game:{over:true,winner:0,turn:6,players:[{},{}]}};return{room,writes,alarms};};
try{
 const first=run('room-1');failRank=true;await first.room.recordResult();assert.equal(first.room.room.recorded,false);assert.equal(first.alarms.length,1);assert.equal(sql.prepare('SELECT wins FROM users WHERE id=?').get('qa-a').wins,1);
 await first.room.recordResult();assert.equal(first.room.room.recorded,true);assert.equal(sql.prepare('SELECT wins FROM users WHERE id=?').get('qa-a').wins,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ranked_results').get().n,1);
 const replay=run('room-1');await replay.room.recordResult();assert.equal(sql.prepare('SELECT wins FROM users WHERE id=?').get('qa-a').wins,1);
 const concurrent=run('room-2');await Promise.all([concurrent.room.recordResult(),concurrent.room.recordResult()]);assert.equal(sql.prepare('SELECT wins FROM users WHERE id=?').get('qa-a').wins,2);
 const casual=run('casual',false);await casual.room.recordResult();assert.equal(sql.prepare('SELECT wins FROM users WHERE id=?').get('qa-a').wins,3);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ranked_results').get().n,2);
 const phantom=run('void',true,false);await phantom.room.recordResult();assert.equal(sql.prepare('SELECT COUNT(*) n FROM matches').get().n,3);
 console.log('PASS: real GameRoom settlement, telemetry/rank partial outage, alarm retry, duplicate/restarted room, concurrent callbacks, casual exclusion, no-contest exclusion');
}finally{sql.close();await rm(tmp,{recursive:true,force:true});}
