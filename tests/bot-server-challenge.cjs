const fs=require('fs'),assert=require('assert/strict'),{DatabaseSync}=require('node:sqlite');
(async()=>{
 const temp=fs.mkdtempSync('/tmp/lore-bot-server-challenge-'), nativeWebSocket=globalThis.WebSocket;let db;
 try {
 const {build}=require(process.cwd()+'/node_modules/esbuild');
 await build({stdin:{contents:"export {GameRoom,npcThinkingDifficulty} from './server/src/gameRoom';export {handleRewards} from './server/src/rewards';export {botNpc} from './client/src/shared/botNpcs';export {DB} from './client/src/shared/cards';export {reduce} from './client/src/shared/engine';export {botDecide} from './client/src/shared/bot';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/server-core.mjs'});
 const E=await import(temp+'/server-core.mjs');db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/schema.sql','utf8'));
 class Stmt{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Stmt(this.sql,args)}async first(){return db.prepare(this.sql).get(...this.args)??null}async all(){return {results:db.prepare(this.sql).all(...this.args)}}async run(){return {meta:{changes:Number(db.prepare(this.sql).run(...this.args).changes)}}}}
 const env={DB:{prepare:sql=>new Stmt(sql),batch:async ss=>{db.exec('BEGIN');try{const rows=[];for(const s of ss)rows.push(await s.run());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}}}};
 globalThis.WebSocket={OPEN:1};const results=[];let serial=0;
 const card=id=>({...E.DB[id],uid:'server-proof-'+serial++});
 for(const tier of ['hard','hell']){
  const id='challenge-qa-'+tier;db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(id,id+'@test.invalid','disabled',id,Date.now());
  let saved,alarm;const state={id:{toString:()=>id+'-room'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async n=>{alarm=n},deleteAlarm:async()=>{alarm=null}},getWebSockets:()=>[]};
  let room=new E.GameRoom(state,env);const setup=await room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify({players:[{id,name:id},{id:'ignored',name:tier}],seed:1,challengeDifficulty:tier})}));assert.equal(setup.status,200);
  assert.equal(saved.challengeDifficulty,tier);assert.equal(E.botNpc(tier).decks.length,7);
  assert.equal(saved.game.botMarket.side,1);assert.equal(saved.game.botDifficulty,tier);
  const initial=saved.rewardDecks[1].filter(id=>id!=='STARTER_MANA').sort();assert(E.botNpc(tier).decks.some(d=>JSON.stringify([...d.cards].sort())===JSON.stringify(initial)));
  let g=room.room.game;g.turn=8;g.cur=1;g.pending=null;g.market=[];
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:2,maxMana:8});
  g.players[1].field=[9,2].map((atk,i)=>({...card('M2'),tribe:undefined,atk,def:5,dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:i===0,summonedTurn:0}));g.players[1].hand=[card('S3')];g.players[0].hp=5;
  g=E.reduce(g,{type:'play',idx:0}).state;const expected=E.botDecide(g,tier);assert.equal(expected.uid,g.players[1].field[1].uid);
  Object.assign(room.room,{game:g,readied:[true,true],previewDone:true,opening:undefined,turnStartAt:Date.now()-1});await room.persist();
  room=new E.GameRoom(state,env);await room.restore();const start=performance.now();await room.runBot();const ms=performance.now()-start;
  assert.deepEqual(room.room.game,E.reduce(g,expected).state);assert.deepEqual(saved.game,room.room.game);assert.equal(saved.challengeDifficulty,tier);assert(typeof alarm==='number'&&alarm>=room.room.turnStartAt);
  results.push({tier,roster:E.botNpc(tier).decks.length,setup:true,restoredDifficulty:saved.challengeDifficulty,action:expected,reducerParity:true,persisted:true,alarmRearmed:true,ms});
  assert.equal(E.npcThinkingDifficulty(tier,45000),tier);
  assert.equal(E.npcThinkingDifficulty(tier,44999),'normal');
  // Recorded long-turn position: full search plays idx 1, but shallow search
  // buys market slot 1. Exercise the actual server route near its turn deadline.
  const heavy=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync('docs/bot-strength/2026-10-27/evidence/cpu-heavy-state.json.gz')));
  const quick=E.botDecide(heavy,'normal');assert.deepEqual(quick,{type:'buyMarket',i:1});
  Object.assign(room.room,{game:heavy,turnStartAt:Date.now()-60000,turnBonusMs:0});room.room.bot.side=0;
  const quickStart=performance.now();await room.runBot();
  assert.deepEqual(room.room.game,E.reduce(heavy,quick).state,'remaining clock selects the shallow policy');
  assert.equal(room.room.challengeDifficulty,tier,'clock pressure does not lower the challenge or rewards');
  results.push({tier,clockPressure:true,remainingMs:30000,thinking:'normal',action:quick,reducerParity:true,ms:performance.now()-quickStart});
 }
 for(const tier of ['easy','normal'])assert.equal(E.npcThinkingDifficulty(tier,1000),tier);
 // Exercise the authenticated HTTP start path, including its separate roster
 // object and the selected index reaching the authoritative room unchanged.
 const userId='rotation-http';db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(userId,userId+'@test.invalid','disabled',userId,Date.now());
 db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run('rotation-session',userId,Date.now(),Date.now()+300000);
 const rooms=new Map();env.GAME_ROOM={idFromName:name=>name,get:id=>{
  if(!rooms.has(id)){
   const values=new Map(),storage={get:async key=>structuredClone(values.get(key)),put:async(key,value)=>{values.set(key,structuredClone(value));},setAlarm:async()=>{},deleteAlarm:async()=>{}};
   storage.transaction=async fn=>fn(storage);
   const state={id:{toString:()=>id},storage,getWebSockets:()=>[]};rooms.set(id,new E.GameRoom(state,env));
  }
  return rooms.get(id);
 }};
 for(const tier of ['easy','normal','hard','hell']){
  const npc=E.botNpc(tier),seen=new Set();
  for(let i=0;i<npc.decks.length;i++){
   const response=await E.handleRewards(env,new Request('https://local/api/rewards/bot/start',{method:'POST',headers:{cookie:'lore_session=rotation-session'},body:JSON.stringify({difficulty:tier})}),'/rewards/bot/start');
   assert.equal(response.status,200);const body=await response.json(),room=rooms.get(body.roomId);
   assert.equal(room.room.challengeDifficulty,tier);
   const signature=room.room.rewardDecks[1].filter(id=>id!=='STARTER_MANA').sort().join(',');seen.add(signature);
   assert.equal(!!room.room.game.botMarket,tier==='hard'||tier==='hell');
  }
  assert.equal(seen.size,npc.decks.length,'HTTP start preserves every reserved strategy');
 }
 const report={scope:'local real GameRoom setup, in-memory D1/storage, restore and runBot; not authenticated staging',results};if(process.env.LORE_BOT_SERVER_REPORT)fs.writeFileSync(process.env.LORE_BOT_SERVER_REPORT,JSON.stringify(report,null,2));console.log('PASS server Hard/Hell roster selection, difficulty restoration, lethal target, authoritative reducer parity, persistence and alarm',results);
 } finally {db?.close();globalThis.WebSocket=nativeWebSocket;fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
