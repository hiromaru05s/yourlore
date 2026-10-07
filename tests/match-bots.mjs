import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
const tmp=await fs.mkdtemp('/tmp/lore-match-bots-');
await build({stdin:{contents:`export {Matchmaker} from './server/src/matchmaker'; export {GameRoom} from './server/src/gameRoom'; export * from './server/src/matchBots'; export {actingSide,reduce} from './client/src/shared/engine'; export {OPENING_VERSION} from './client/src/shared/opening'; export {DB as CARDS} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:tmp+'/test.mjs'});
const {Matchmaker,GameRoom,MATCH_BOTS,ensureMatchBots,matchBotActions,actingSide,OPENING_VERSION,CARDS}=await import(tmp+'/test.mjs');
let now=Date.now();const realNow=Date.now;Date.now=()=>now;
globalThis.WebSocket={OPEN:1};
const timers=new Set(),realSet=setInterval,realClear=clearInterval;
globalThis.setInterval=fn=>{timers.add(fn);return fn};globalThis.clearInterval=fn=>timers.delete(fn);
const db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));db.exec('PRAGMA foreign_keys = ON');
class Stmt{constructor(q,args=[]){this.q=q;this.args=args}bind(...args){return new Stmt(this.q,args)}async first(){return db.prepare(this.q).get(...this.args)??null}async all(){return {results:db.prepare(this.q).all(...this.args)}}async run(){const r=db.prepare(this.q).run(...this.args);return {meta:{changes:Number(r.changes)}}}}
const DB={prepare:q=>new Stmt(q),batch:async statements=>{db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
const env={DB,MATCH_TEST_BOTS:'1'};
const socket=side=>({side,readyState:1,messages:[],deserializeAttachment(){return {side,gen:0}},send(m){this.messages.push(JSON.parse(m))},close(){this.readyState=3}});
const waiter=(id,ranked=false)=>({id,name:id,ws:socket(0),ranked,mmr:1000,since:0,avatar:null,sleeve:null,furniture:null,deck:null});
const checks=[];async function test(name,fn){await fn();checks.push(name);console.log('PASS',name)}
const tick=()=>new Promise(r=>setImmediate(r));
let roomSeq=0;
async function fixture(ranked=false,index=0,seed=23){
 const bot=MATCH_BOTS[index],id='human-'+(++roomSeq);db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(id,id+'@test.invalid','disabled',id,now);
 const ws=socket(0);let saved,alarm=null;
 const state={id:{toString:()=>id+'-room'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async n=>{alarm=n},deleteAlarm:async()=>{alarm=null}},getWebSockets:tag=>tag==='0'&&ws.readyState===1?[ws]:[]};
 let room=new GameRoom(state,env);
 await room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify({players:[{id,name:id},{id:bot.id,name:bot.name}],seed,ranked,botId:bot.id})}));
 const f={id,ws,state,get room(){return room},saved:()=>saved,alarm:()=>alarm,send:msg=>room.webSocketMessage(ws,JSON.stringify(msg)),restore:()=>{room=new GameRoom(state,env)}};
 return f;
}
async function start(f,ranked=false){
 await f.send({type:'ready',openingVersion:OPENING_VERSION});
 if(ranked){assert(f.ws.messages.some(m=>m.type==='preview'));assert(f.saved().previewUntil>now);await f.send({type:'startReady'});}
 await f.send({type:'openingReady'});assert(f.saved().opening.startsAt>now);now=f.saved().turnStartAt+1;
}
try{
 await test('ten distinct accounts, five deck types, idempotent seeding, no sessions',async()=>{await ensureMatchBots(env);await ensureMatchBots(env);assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,10);assert.equal(new Set(MATCH_BOTS.map(b=>b.id)).size,10);assert.equal(new Set(MATCH_BOTS.map(b=>b.deck.name)).size,5);assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);await assert.rejects(ensureMatchBots({DB}));});
 await test('normal and ranked queues rotate all ten BOT profiles after waiting',async()=>{
  const setups=[];const mm=new Matchmaker({}, {...env,GAME_ROOM:{idFromName:x=>x,get:()=>({fetch:async(url,opt)=>{setups.push(JSON.parse(opt.body));return new Response('ok')}})}});
  for(let i=0;i<10;i++){const w=waiter('q'+i,i%2===1);mm.onMsg(w,{data:'{"type":"queue"}'});mm.sweepRanked();await tick();assert.equal(setups.length,i);now+=10001;mm.sweepRanked();await tick();assert.equal(w.ws.messages.at(-1).type,'matched');assert.equal(setups[i].botId,MATCH_BOTS[i].id);assert.equal(setups[i].ranked,w.ranked);assert.equal(w.ws.messages.at(-1).you,0);}
  assert.equal(timers.size,0);
 });
 await test('production defaults off, human priority, cancellation and failed setup',async()=>{
  let setups=0;const rooms={idFromName:x=>x,get:()=>({fetch:async()=>{setups++;return new Response('ok')}})};
  const off=new Matchmaker({}, {DB,GAME_ROOM:rooms});const a=waiter('off');off.onMsg(a,{data:'{"type":"queue"}'});now+=20000;off.sweepRanked();await tick();assert.equal(setups,0);off.remove(a.ws);
  for(const ranked of [false,true]){const mm=new Matchmaker({}, {...env,GAME_ROOM:rooms}),a=waiter('a',ranked),b=waiter('b',ranked);mm.onMsg(a,{data:'{"type":"queue"}'});mm.onMsg(b,{data:'{"type":"queue"}'});await tick();assert.equal(a.ws.messages.at(-1).oppName,'b');mm.syncSweep();}
  assert.equal(setups,2);
  const cancel=new Matchmaker({}, {...env,GAME_ROOM:rooms}),c=waiter('cancel');cancel.onMsg(c,{data:'{"type":"queue"}'});cancel.onMsg(c,{data:'{"type":"cancel"}'});now+=20000;cancel.sweepRanked();await tick();assert.equal(setups,2);
  const failure=new Matchmaker({}, {...env,GAME_ROOM:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('failed',{status:503})})}}),w=waiter('retry');failure.onMsg(w,{data:'{"type":"queue"}'});now+=20000;failure.sweepRanked();await tick();assert.equal(w.phase,undefined);assert.equal(w.ws.messages.at(-1).type,'error');assert.equal(timers.size,0);
 });
 await test('internal setup rejects unknown and disabled bot identities',async()=>{
  for(const [botId,bindings] of [['fake',env],[MATCH_BOTS[0].id,{DB}]]){const room=new GameRoom({storage:{get:async()=>undefined}},bindings);const res=await room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify({players:[{id:'a'},{id:botId}],seed:1,botId})}));assert.equal(res.status,403);}
 });
 await test('normal/ranked startup, first turn gate, durable bot moves, no hidden information leaks',async()=>{
  for(const ranked of [false,true]){const f=await fixture(ranked);await start(f,ranked);assert.equal(f.saved().readied[1],true);assert.equal(f.saved().previewDone,true);const deadline=f.alarm();assert(deadline>now);const initial=JSON.stringify(f.saved().game);now=deadline-1;await f.room.alarm();assert.equal(JSON.stringify(f.saved().game),initial);f.restore();now=deadline;await f.room.alarm();assert.notEqual(JSON.stringify(f.saved().game),initial);const updates=f.ws.messages.filter(m=>m.type==='update');assert(updates.length>0);assert.equal(updates.at(-1).state.rng,0);assert(updates.at(-1).state.players[1].hand.every(c=>c.id==='HIDDEN'));const post=JSON.stringify(f.saved().game);await f.room.alarm();assert.equal(JSON.stringify(f.saved().game),post,'same alarm retry cannot make a second immediate move');
   const opening=f.saved().opening.startsAt;await f.send({type:'ready',openingVersion:OPENING_VERSION});assert.equal(f.saved().opening.startsAt,opening);
  }
 });
 await test('all ten profiles complete multi-turn gameplay without rejected-action loops',async()=>{
  for(let i=0;i<10;i++){const f=await fixture(false,i,100+i);await start(f);let steps=0;while(f.saved().game.turn<7&&!f.saved().game.over&&steps++<180){const g=f.saved().game;if(actingSide(g)===1){const deadline=f.alarm();assert(deadline!=null);now=Math.max(now+1,deadline);await f.room.alarm();}else{const action=g.pending?matchBotActions(g,0)[0]:{type:'endTurn'};await f.send({type:'action',action});now+=1500;}}assert(steps<180,`BOT ${i+1} made no progress`);assert(f.saved().game.turn>=7||f.saved().game.over);}
 });
 await test('BOT answers defender-owned choices during the human turn',async()=>{
  const f=await fixture(false,0,22);await start(f);const g=f.room.room.game;g.turn=3;g.cur=0;g.pending=null;
  let seq=0;const mon=id=>({...CARDS[id],uid:'choice-'+(++seq),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],field:[],enchants:[],traps:[],quests:[],dew:5,shield:12,hp:100,mana:30,maxMana:30});
  g.players[0].field=[mon('M1'),mon('WORLD_TREE')];g.players[1].field=[mon('M2'),mon('WORLD_TREE')];g.players[1].field[0].def=30;
  await f.send({type:'action',action:{type:'attack',uid:g.players[0].field[0].uid}});await f.send({type:'action',action:{type:'pick',uid:g.players[1].field[0].uid}});await f.send({type:'action',action:{type:'pick',uid:'grow'}});
  assert.equal(f.saved().game.pending.owner,1);assert.equal(f.saved().game.cur,0);assert(f.saved().bot.nextAt>now);f.restore();now=f.alarm();await f.room.alarm();assert.equal(f.saved().game.pending,null);assert.equal(f.saved().game.players[1].field[0].defMod,6);assert.equal(f.saved().bot.nextAt,null,'return control to human');
 });
 await test('ranked result uses real exactly-once receipt and survives restore',async()=>{
  const f=await fixture(true);await start(f,true);await f.send({type:'action',action:{type:'surrender',player:0}});const receipt=f.ws.messages.find(m=>m.type==='rankResult');assert(receipt);assert(receipt.after<receipt.before);assert(f.saved().recorded);const count=db.prepare('SELECT COUNT(*) n FROM ranked_results WHERE match_id=?').get(f.id+'-room').n;assert.equal(count,1);const after=db.prepare('SELECT mmr FROM ratings WHERE user_id=?').get(f.id).mmr;f.restore();await f.room.alarm();await f.send({type:'ready',openingVersion:OPENING_VERSION});assert.equal(f.ws.messages.at(-1).type,'rankResult');assert.equal(db.prepare('SELECT mmr FROM ratings WHERE user_id=?').get(f.id).mmr,after);assert.equal(db.prepare('SELECT losses FROM users WHERE id=?').get(f.id).losses,1);
 });
 await test('no-show void, human disconnect pauses BOT, reconnect resumes it',async()=>{
  const absent=await fixture(true);now=absent.saved().joinBy+1;await absent.room.alarm();assert(absent.saved().recorded);assert.equal(db.prepare('SELECT COUNT(*) n FROM matches WHERE id=?').get(absent.id+'-room').n,0);
  const f=await fixture();await start(f);f.ws.readyState=3;await f.room.webSocketClose(f.ws);assert.equal(f.saved().bot.nextAt,null);now+=2000;const before=JSON.stringify(f.saved().game);await f.room.alarm();assert.equal(JSON.stringify(f.saved().game),before);f.ws.readyState=1;await f.send({type:'ready',openingVersion:OPENING_VERSION});assert(f.saved().bot.nextAt>now);now=f.alarm();await f.room.alarm();assert.notEqual(JSON.stringify(f.saved().game),before);
 });
 console.log(`PASS: ${checks.length} matchmaking BOT checks`);
}finally{Date.now=realNow;globalThis.setInterval=realSet;globalThis.clearInterval=realClear;db.close();await fs.rm(tmp,{recursive:true,force:true});}
