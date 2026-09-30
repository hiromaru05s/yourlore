import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-production-security-');
await build({stdin:{contents:`export {default as worker} from './server/src/index';export {GameRoom} from './server/src/gameRoom';export {handleRewards} from './server/src/rewards';export {createGame,reduce} from './client/src/shared/engine';export {redactFor} from './client/src/shared/protocol';export {DB} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/test.mjs'});
const {worker,GameRoom,handleRewards,createGame,reduce,redactFor,DB}=await import(dir+'/test.mjs');
const checks=[];
async function test(name,fn){try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.message});}console.log(checks.at(-1));}
function fixture(){
 let saved;const sockets=[0,1].map(side=>({messages:[],deserializeAttachment:()=>({side,gen:0}),send(raw){this.messages.push(JSON.parse(raw));},close(){}}));
 const state={id:{toString:()=> 'qa-audit-room'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter((_,i)=>String(i)===tag)};
 return {room:new GameRoom(state,{}),sockets,state};
}
const setupBody={seed:22,players:[{id:'qa-a',name:'A'},{id:'qa-b',name:'B'}]};
const setup=async f=>f.room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify(setupBody)}));
await test('public room route cannot provision a ranked room',async()=>{
 const f=fixture();const env={DB:{prepare(){return{bind(){return this},first:async()=>({id:'qa-a',display:'A',expires_at:Date.now()+10000})}}},GAME_ROOM:{idFromName:x=>x,get:()=>({fetch:r=>f.room.fetch(r)})}};
 const res=await worker.fetch(new Request('https://test.yourlore.xyz/ws/room/audit/setup',{method:'POST',headers:{cookie:'lore_session=fixture'},body:JSON.stringify({...setupBody,ranked:true})}),env);
 assert(res.status>=400);assert.equal(f.room.room,null);
});
await test('anonymous matchmaking cannot consume an authenticated opponent',async()=>{
 const res=await worker.fetch(new Request('https://local/ws/queue',{headers:{Upgrade:'websocket'}}),{});assert.equal(res.status,401);
});
await test('missing admin secret never authorizes season finalization',async()=>{
 const res=await worker.fetch(new Request('https://local/api/rank/finalize',{method:'POST',headers:{Authorization:'Bearer undefined'}}),{APP_ORIGIN:'*'});assert.equal(res.status,401);
});
await test('setup is single-use and POST-only',async()=>{
 const f=fixture();assert.equal((await setup(f)).status,200);const game=structuredClone(f.room.room.game);
 assert.equal((await setup(f)).status,409);assert.deepEqual(f.room.room.game,game);
 assert.equal((await f.room.fetch(new Request('https://do/setup'))).status,405);
});
await test('hidden hand and draw order cannot be correlated with known card UIDs',()=>{
 const g=createGame({mode:'online',seed:12,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
 g.players[1].hand=[{...DB.ELF,uid:'known-elf'}];g.players[1].deck=[{...DB.M1,uid:'known-mana'},{...DB.ELF,uid:'known-second'}];
 g.players[1].revealedCards=[{id:'ELF',uid:'known-elf'},{id:'M1',uid:'known-mana'},{id:'ELF',uid:'known-second'}];
 const hidden=redactFor(g,0);assert(!hidden.players[1].hand.some(c=>c.uid==='known-elf'));assert(!hidden.players[1].deck.some(c=>c.uid.startsWith('known-')));
 g.players[1].deck.reverse();assert.deepEqual(redactFor(g,0).players[1].deck,hidden.players[1].deck,'hidden shuffle is indistinguishable');
 g.pending={kind:'cardChoice',reason:'HIGH_ELF_HAND',owner:0,allowCancel:false,hint:''};assert.equal(redactFor(g,0).players[1].hand[0].uid,'known-elf','legitimate hand selection retains target UID');
 g.pending.reason='CREATION';assert(redactFor(g,0).players[1].deck.some(c=>c.uid==='known-mana'),'legitimate deck selection retains target UID');
});
await test('malformed socket input cannot throw or mutate authoritative state',async()=>{
 const f=fixture();await setup(f);const before=structuredClone(f.room.room.game);
 for(const msg of [null,[],{type:'action'},{type:'action',action:null},{type:'action',action:{type:'play',idx:'__proto__'}},{type:'action',action:{type:'surrender',player:3}}])await f.room.webSocketMessage(f.sockets[0],JSON.stringify(msg));
 assert.deepEqual(f.room.room.game,before);
});
await test('mandatory target timeout advances the turn',async()=>{
 for(const kind of ['oppMon','myMon','giantShop','purge']){
  const f=fixture();await setup(f);const r=f.room.room,g=r.game;delete r.opening;r.readied=[true,true];r.joinBy=null;r.turnStartAt=Date.now()-200000;
  g.turn=3;g.cur=0;for(const p of g.players){p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.hand=[];}
  const mon={...DB.ELF,uid:'target',atk:5,def:8,dmg:0,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0,exhausted:false};
  g.players[kind==='oppMon'?1:0].field=[mon];g.players[0].hand=[{...DB.M1,uid:'hand'}];
  g.pending={kind,reason:kind==='oppMon'?'setAtk2':kind==='myMon'?'buffTurn':kind==='giantShop'?'civChoice':'handCap',hint:'',allowCancel:false,data:kind==='giantShop'?{ids:['DRAGON_EGG','BEAST_EGG']}:{val:1,zone:'hand'}};
  await f.room.alarm();assert(g.turn!==f.room.room.game.turn||f.room.room.game.over,kind+' must not stall');
 }
});
await test('enchantment cast preserves triggered curse and unique physical identity',()=>{
 const g=createGame({mode:'bot',seed:32,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
 g.players[0].mana=30;g.players[0].hand=[{...DB.MERC_ART,uid:'cast'}];g.players[0].discard=[];
 g.players[1].field=[{...DB.HEXER3,uid:'hex',dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0}];
 const p=reduce(g,{type:'play',idx:0}).state.players[0];assert.equal(p.enchants.filter(e=>e.card.uid==='cast').length,1);assert(!p.discard.some(c=>c.uid==='cast'));assert.equal(p.discard.filter(c=>c.id==='CURSE').length,1);
});
function dbFixture(){
 const sqlite=new DatabaseSync(':memory:');let failCredits=false;
 const run=(sql,args=[])=>{if(failCredits&&/UPDATE users SET credits/.test(sql))throw Error('injected credit write failure');const stmt=sqlite.prepare(sql);if(/^\s*SELECT/i.test(sql))return {results:stmt.all(...args)};const r=stmt.run(...args);return{meta:{changes:Number(r.changes)}};};
 const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this},run:async()=>run(sql,args),first:async()=>run(sql,args).results?.[0]??null,all:async()=>run(sql,args),execute:()=>run(sql,args)}},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return {DB,sqlite,fail(value){failCredits=value}};
}
const schema=await readFile('server/schema.sql','utf8');
async function creditFixture(){const f=dbFixture();f.sqlite.exec(schema);f.sqlite.exec('ALTER TABLE users ADD COLUMN furniture TEXT');for(const id of ['qa-a','qa-b']){f.sqlite.prepare('INSERT INTO users (id,email,password,display,created_at,verified) VALUES (?,?,?,?,?,1)').run(id,id+'@example.test','fixture',id,Date.now());f.sqlite.prepare('INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(id,id,Date.now(),Date.now()+100000);}return f;}
const claim=(f,path,body,id='qa-a')=>handleRewards({DB:f.DB,APP_ORIGIN:'*'},new Request('https://local'+path,{method:'POST',headers:{cookie:'lore_session='+id},body:JSON.stringify(body)}),path);
await test('reward credit failure rolls back claim and retry grants once',async()=>{
 const f=await creditFixture();try{f.fail(true);await assert.rejects(claim(f,'/rewards/claim',{key:'tuto:1'}));f.fail(false);const res=await (await claim(f,'/rewards/claim',{key:'tuto:1'})).json();assert.equal(res.credits,50);const again=await (await claim(f,'/rewards/claim',{key:'tuto:1'})).json();assert.equal(again.granted,false);assert.equal(again.credits,50);}finally{f.sqlite.close()}
});
await test('coupon cap remains one under concurrent redemption',async()=>{
 const f=await creditFixture();try{f.sqlite.prepare('INSERT INTO coupons (code,amount,max_uses,uses) VALUES (?,100,1,0)').run('AUDIT');const responses=await Promise.all(['qa-a','qa-b'].map(id=>claim(f,'/rewards/coupon',{code:'AUDIT'},id)));assert.deepEqual(responses.map(r=>r.status).sort(),[200,410]);assert.equal(f.sqlite.prepare('SELECT uses FROM coupons').get().uses,1);assert.equal(f.sqlite.prepare('SELECT SUM(credits) AS total FROM users').get().total,100);}finally{f.sqlite.close()}
});
await test('coupon write failure rolls back redemption',async()=>{
 const f=await creditFixture();try{f.sqlite.prepare('INSERT INTO coupons (code,amount,max_uses,uses) VALUES (?,100,1,0)').run('AUDIT');f.fail(true);await assert.rejects(claim(f,'/rewards/coupon',{code:'AUDIT'}));f.fail(false);assert.equal((await claim(f,'/rewards/coupon',{code:'AUDIT'})).status,200);assert.equal(f.sqlite.prepare('SELECT credits FROM users WHERE id=?').get('qa-a').credits,100);}finally{f.sqlite.close()}
});
await writeFile(process.env.LORE_AUDIT_SECURITY_OUT||dir+'/results.json',JSON.stringify({checks},null,2));
await rm(dir,{recursive:true,force:true});if(checks.some(c=>!c.passed))process.exitCode=1;
