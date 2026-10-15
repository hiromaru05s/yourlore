import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-exp-tests-');
try {
 await build({stdin:{contents:`export {default as worker,GameRoom} from './server/src/index';export * from './server/src/progression';export * from './client/src/shared/progression';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {worker,GameRoom,experienceStatements,experienceReceipt,seekerLevel,levelReward}=await import(dir+'/module.mjs');
 const db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));
 // The deploy migration is additive and safe to apply twice, including fresh schema.
 db.exec(await fs.readFile('server/migrations/0018_player_experience.sql','utf8'));
 let failAt=-1;
 class Stmt {
  constructor(q,a=[]){this.q=q;this.a=a;}bind(...a){return new Stmt(this.q,a);}
  async first(){return db.prepare(this.q).get(...this.a)??null;}
  async all(){return {results:db.prepare(this.q).all(...this.a)};}
  async run(){const r=db.prepare(this.q).run(...this.a);return {meta:{changes:Number(r.changes)}};}
 }
 const env={APP_ORIGIN:'*',DB:{prepare:q=>new Stmt(q),batch:async list=>{db.exec('BEGIN');try{const out=list.map((s,i)=>{if(i===failAt){failAt=-1;throw Error('injected outage');}const r=db.prepare(s.q).run(...s.a);return {meta:{changes:Number(r.changes)}};});db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const add=id=>{db.prepare('INSERT INTO users(id,email,password,display,created_at,wins,losses) VALUES(?,?,?,?,?,99,99)').run(id,id+'@invalid.test','fixture',id,Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now()+60000);};
 const user=id=>db.prepare('SELECT credits,COALESCE(exp,0) exp FROM users LEFT JOIN player_experience ON users.id=user_id WHERE id=?').get(id);
 const grant=(id,key,n)=>env.DB.batch(experienceStatements(env,id,key,n));
 const req=(path,id,body)=>worker.fetch(new Request('https://test.yourlore.xyz/api/'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(id?{cookie:'lore_session='+id}:{})},body:body?JSON.stringify(body):undefined}),env);
 const bot=(id,difficulty,won=true,draw=false)=>req('track/bot',id,{difficulty,won,draw});
 add('bot');
 assert.equal((await (await req('auth/me','bot')).json()).user.exp,0,'historical W/L does not become EXP');
 for(const [difficulty,amount] of [['easy',20],['normal',35],['hard',60],['hell',120]]){
  const before=user('bot').exp;
  await bot('bot',difficulty,false);await bot('bot',difficulty,false,true);assert.equal(user('bot').exp,before);
  const result=await (await bot('bot',difficulty)).json();assert.equal(result.experience.after-result.experience.before,amount);
  await Promise.all(Array.from({length:8},()=>bot('bot',difficulty)));assert.equal(user('bot').exp,before+amount,'first clear paid only once');
 }
 assert.deepEqual({...user('bot')},{credits:200,exp:235});
 assert.equal((await bot(null,'easy')).status,401);
 for(const invalid of ['impossible','__proto__',null,[],['easy'],{},1])assert.equal((await bot('bot',invalid)).status,400);
 await req('track/bot','bot',{won:true});assert.equal(user('bot').exp,235,'legacy reports without difficulty grant nothing');
 assert.deepEqual((await (await req('auth/me','bot')).json()).user.botClears.sort(),['easy','hard','hell','normal']);
 console.log('PASS BOT amounts, losses/draws, duplicate/concurrent claims, legacy/invalid reports, auth, zero historical conversion');
 add('levels');let expected=0;
 for(let level=2;level<=50;level++){
  const reward=({10:300,20:500,30:700,40:1000,50:3000})[level]??100;expected+=reward;
  await grant('levels','level:'+level,100);
  assert.equal(user('levels').credits,expected);assert.equal(seekerLevel(user('levels').exp).level,level);assert.equal(levelReward(level),reward);
 }
 assert.equal(expected,9900);assert.equal(user('levels').exp,4900);
 await grant('levels','after-max',120);assert.equal(user('levels').credits,9900);assert.equal(user('levels').exp,4900);assert.equal(seekerLevel(99999).max,true);
 assert.equal(seekerLevel(99).level,1);assert.equal(seekerLevel(100).level,2);assert.equal(seekerLevel(NaN).level,1);
 add('jump');await grant('jump','start',890);const before=user('jump').credits;await grant('jump','jump',120);assert.equal(user('jump').credits-before,400,'Lv10 milestone plus Lv11 ordinary reward');
 add('cap');await grant('cap','start',4895);const capBefore=user('cap').credits;await grant('cap','win',20);assert.equal(user('cap').exp,4900);assert.equal(user('cap').credits-capBefore,3000);
 add('rollback');failAt=3;await assert.rejects(grant('rollback','retry',120));assert.deepEqual({...user('rollback')},{credits:0,exp:0});assert.equal(await experienceReceipt(env,'rollback','retry'),null);await grant('rollback','retry',120);await grant('rollback','retry',120);assert.deepEqual({...user('rollback')},{credits:100,exp:120});
 add('parallel');await Promise.all([grant('parallel','room-a',60),grant('parallel','room-b',60)]);assert.deepEqual({...user('parallel')},{credits:100,exp:120});
 console.log('PASS every Lv2–50 reward, all milestones, multi-level crossing, Lv50 cap, transaction rollback/retry, concurrent rooms');
 add('winner');add('loser');
 const room=(id,ranked,winner=0,joined=true)=>{const messages=[[],[]];const sockets=[0,1].map(side=>({deserializeAttachment:()=>({side,gen:0}),send:m=>messages[side].push(JSON.parse(m))}));const r=new GameRoom({id:{toString:()=>id},storage:{put:async()=>{},setAlarm:async()=>{}},getWebSockets:tag=>sockets.filter((_,i)=>String(i)===tag)},env);r.room={players:[{id:'winner'},{id:'loser'}],ranked,gen:[0,0],readied:[joined,joined],recorded:false,startedAt:Date.now()-1000,game:{over:true,winner,turn:6,players:[{},{}]}};return {r,messages};};
 for(const ranked of [false,true]){
  const id='match-'+ranked,{r,messages}=room(id,ranked);await r.recordResult();assert.equal(r.room.recorded,true);assert.equal(messages[0].find(m=>m.type==='experienceResult').after-messages[0].find(m=>m.type==='experienceResult').before,20);assert.equal(messages[1].find(m=>m.type==='experienceResult').after-messages[1].find(m=>m.type==='experienceResult').before,5);
  const before=user('winner').exp;await room(id,ranked).r.recordResult();assert.equal(user('winner').exp,before);
 }
 assert.equal(user('winner').exp,40);assert.equal(user('loser').exp,10);
 await room('draw',false,null).r.recordResult();await room('void',true,0,false).r.recordResult();assert.equal(user('winner').exp,40);assert.equal(user('loser').exp,10);
 const failed=room('atomic-fail',false);failAt=9;await failed.r.recordResult();assert.equal(failed.r.room.recorded,false);assert.equal(user('winner').exp,40);assert.equal(db.prepare("SELECT count(*) n FROM matches WHERE id='atomic-fail'").get().n,0);await failed.r.recordResult();assert.equal(user('winner').exp,60);
 console.log('PASS real casual/Ranked GameRoom settlement, both sides, draw/void, replay, receipt, match/EXP atomic rollback');
 db.close();
} finally {await fs.rm(dir,{recursive:true,force:true});}
