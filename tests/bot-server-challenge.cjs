const fs=require('fs'),assert=require('assert/strict'),{DatabaseSync}=require('node:sqlite');
(async()=>{
 const temp=fs.mkdtempSync('/tmp/lore-bot-server-challenge-'), nativeWebSocket=globalThis.WebSocket;let db;
 try {
 const {build}=require(process.cwd()+'/node_modules/esbuild');
 // Observe only GameRoom's difficulty argument; delegate every decision to the real policy.
 const probe={path:'npc-bot-probe',namespace:'npc-bot-probe'};
 const observeDifficulty={name:'observe-npc-difficulty',setup(b){
  b.onResolve({filter:/^npc-bot-probe$/},()=>probe);
  b.onResolve({filter:/shared\/bot$/},a=>a.importer.endsWith('/server/src/gameRoom.ts')?probe:undefined);
  b.onLoad({filter:/.*/,namespace:probe.namespace},()=>({resolveDir:process.cwd(),contents:
   "export * from './client/src/shared/bot';import {botDecide as decide} from './client/src/shared/bot';export const calls=[],limits=[];export function botDecide(...args){calls.push(args[1]);limits.push(args[3]);return decide(...args)}"}));
 }};
 await build({plugins:[observeDifficulty],stdin:{contents:"export {calls as npcPolicyCalls,limits as npcPolicyLimits} from 'npc-bot-probe';export {GameRoom,npcThinkingDifficulty,npcThinkingNodes} from './server/src/gameRoom';export {handleRewards} from './server/src/rewards';export {botNpc} from './client/src/shared/botNpcs';export {ARIES_OPPONENTS} from './client/src/shared/ariesStory';export {DB} from './client/src/shared/cards';export {reduce} from './client/src/shared/engine';export {botDecide} from './client/src/shared/bot';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/server-core.mjs'});
 const E=await import(temp+'/server-core.mjs');db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/schema.sql','utf8'));
 class Stmt{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Stmt(this.sql,args)}async first(){return db.prepare(this.sql).get(...this.args)??null}async all(){return {results:db.prepare(this.sql).all(...this.args)}}async run(){return {meta:{changes:Number(db.prepare(this.sql).run(...this.args).changes)}}}}
 const env={DB:{prepare:sql=>new Stmt(sql),batch:async ss=>{db.exec('BEGIN');try{const rows=[];for(const s of ss)rows.push(await s.run());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}}}};
 globalThis.WebSocket={OPEN:1};const results=[];let serial=0;
 const card=id=>({...E.DB[id],uid:'server-proof-'+serial++});
 for(const tier of ['hard','hell']){
  const id='challenge-qa-'+tier;db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(id,id+'@test.invalid','disabled',id,Date.now());
  let saved,alarm;const state={id:{toString:()=>id+'-room'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async n=>{alarm=n},deleteAlarm:async()=>{alarm=null}},getWebSockets:()=>[]};
  let room=new E.GameRoom(state,env);const setup=await room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify({players:[{id,name:id},{id:'ignored',name:tier}],seed:1,challengeDifficulty:tier})}));assert.equal(setup.status,200);
  assert.equal(saved.challengeDifficulty,tier);assert.equal(E.botNpc(tier).decks.length,2);
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
  // Exercise the shallow policy near the deadline in a position with several legal actions.
  const heavy=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync('docs/bot-strength/2026-10-27/evidence/cpu-heavy-state.json.gz')));
  heavy.players[heavy.cur].hand=heavy.players[heavy.cur].hand.filter(c=>!['destroyMon','destroyEnch'].includes(c.act));
  const quick=E.botDecide(heavy,'normal'),next=E.reduce(heavy,quick).state;assert.notDeepEqual(next,heavy,'the reference action advances play');
  Object.assign(room.room,{game:heavy,turnStartAt:Date.now()-60000,turnBonusMs:0});room.room.bot.side=0;
  const callIndex=E.npcPolicyCalls.length,quickStart=performance.now();await room.runBot();
  assert.deepEqual(E.npcPolicyCalls.slice(callIndex),['normal'],'clock pressure calls the normal policy');
  assert.deepEqual(room.room.game,next,'server applies the real shallow decision on the authoritative state');
  assert.equal(room.room.challengeDifficulty,tier,'clock pressure does not lower the challenge or rewards');
  results.push({tier,clockPressure:true,remainingMs:30000,thinking:'normal',action:quick,reducerParity:true,ms:performance.now()-quickStart});
  assert.equal(E.npcThinkingNodes(20000),undefined);assert.equal(E.npcThinkingNodes(19999),2000);
  assert.equal(E.npcThinkingNodes(8000),2000);assert.equal(E.npcThinkingNodes(7999),500);
  const urgent=E.botDecide(heavy,'normal',undefined,500);
  Object.assign(room.room,{game:heavy,turnStartAt:Date.now()-85000,turnBonusMs:0});
  const urgentIndex=E.npcPolicyCalls.length;await room.runBot();
  assert.deepEqual(E.npcPolicyCalls.slice(urgentIndex),['normal']);
  assert.deepEqual(E.npcPolicyLimits.slice(urgentIndex),[500],'last seconds cap search without changing the selected NPC');
  assert.deepEqual(room.room.game,E.reduce(heavy,urgent).state);
  assert.equal(room.room.challengeDifficulty,tier);
  results.push({tier,clockPressure:true,remainingMs:5000,nodeLimit:500,action:urgent,reducerParity:true});
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
 const request=(path,body)=>E.handleRewards(env,new Request('https://local/api'+path,{method:'POST',headers:{cookie:'lore_session=rotation-session'},body:JSON.stringify(body)}),path);
 assert.equal((await request('/rewards/story/start',{})).status,403);
 assert.equal((await request('/rewards/bot/start',{difficulty:'hell'})).status,400);
 for(const tier of ['easy','normal','hard']){
  const npc=E.botNpc(tier),seen=new Set();
  for(let i=0;i<npc.decks.length;i++){
   const response=await E.handleRewards(env,new Request('https://local/api/rewards/bot/start',{method:'POST',headers:{cookie:'lore_session=rotation-session'},body:JSON.stringify({difficulty:tier})}),'/rewards/bot/start');
   assert.equal(response.status,200);const body=await response.json(),room=rooms.get(body.roomId);
   assert.equal(room.room.challengeDifficulty,tier);
   const signature=room.room.rewardDecks[1].filter(id=>id!=='STARTER_MANA').sort().join(',');seen.add(signature);
   assert.equal(!!room.room.game.botMarket,tier==='hard'||tier==='hell');
  }
  db.prepare('INSERT INTO rewards (user_id,key,amount,created_at) VALUES (?,?,0,?)').run(userId,'bot:first:'+tier,Date.now());
  assert.equal(seen.size,npc.decks.length,'HTTP start preserves every reserved strategy');
 }
 const starterDeck = ['Q_RUNE_SECRET', ...Array(7).fill('STARTER_TRASH')];
 db.prepare('UPDATE users SET deck=?, starter_cards=? WHERE id=?')
   .run(starterDeck.join(','),JSON.stringify({Q_RUNE_SECRET:1}),userId);
 assert.equal((await request('/rewards/story/start',{})).status,403,'NPC wins alone do not qualify');
 db.prepare('INSERT INTO rewards(user_id,key,amount,created_at) VALUES(?,?,0,?)').run(userId,'tutorial:onboarding:v1:basics',Date.now());
 assert.equal((await request('/rewards/story/start',{})).status,403,'normal matches are also required');
 for(let i=0;i<2;i++)db.prepare('INSERT INTO duel_reward_receipts(user_id,match_id,day,mode,amount,created_at) VALUES(?,?,?,?,0,?)').run(userId,'normal-'+i,'2026-11-18','online',Date.now());
 const direct=await request('/rewards/story/start',{});assert.equal(direct.status,200);
 const directBody=await direct.json();assert.equal(rooms.get(directBody.roomId).room.storyStage,2,'new challenges go directly to Aries');
 assert.equal(directBody.oppAvatar,E.ARIES_OPPONENTS[2].avatar);
 // An already running legacy Luca room can still finish and advance to Aries.
 let prior;
 for(const stage of [0,2]){
   let body;
   if(stage===0){
     const roomId='aries-'+crypto.randomUUID()+'-0',opponent=E.ARIES_OPPONENTS[0];
     const legacy=env.GAME_ROOM.get(roomId);
     const setup=await legacy.fetch(new Request('https://room/setup',{method:'POST',body:JSON.stringify({players:[{id:userId,name:userId,deck:starterDeck.join(',')},{id:opponent.avatar,name:opponent.name.ja}],seed:1,challengeDifficulty:'hell',storyStage:0})}));
     assert.equal(setup.status,200);body={roomId,oppName:opponent.name.ja,oppAvatar:opponent.avatar};
   }else{
     const res=await request('/rewards/story/start',{previous:prior});assert.equal(res.status,200);body=await res.json();
   }
   const {roomId,oppName,oppAvatar}=body;const room=rooms.get(roomId);assert.equal(room.room.storyStage,stage);
   assert.deepEqual(room.room.rewardDecks[1].filter(id=>id!=='STARTER_MANA').sort(),[...E.ARIES_OPPONENTS[stage].deck].sort(),'HTTP story start installs the updated deck');
   assert.deepEqual(room.room.game.players[1].botTune,E.ARIES_OPPONENTS[stage].tune,'HTTP story start installs the updated purchase policy');
   if (stage === 0) {
     assert.equal(oppName,'火走りのルカ');
     assert.equal(oppAvatar,'STORY_LUCA');
     const g = room.room.game, player = g.players[0];
     assert.equal(g.players[1].name,oppName);
     assert.equal(g.portraitAvatars[1],oppAvatar);
     const drawn = [...player.hand, ...player.deck];
     player.hand = ['Q_RUNE_SECRET','STARTER_MANA'].map(id=>drawn.find(c=>c.id===id));
     assert(player.hand.every(Boolean),'use the quest and fixed Attune from the account deck');
     player.deck = drawn.filter(c=>!player.hand.includes(c));
     Object.assign(g,{cur:0,turn:3,mulligan:undefined});
     Object.assign(room.room,{readied:[true,true],opening:undefined});
     const updates = [];
     const ws = {deserializeAttachment:()=>({side:0,gen:room.room.gen[0]}),send:raw=>updates.push(JSON.parse(raw))};
     room.state.getWebSockets = tag=>tag==='0'?[ws]:[];
     for (const progress of [0,1]) {
       const uid = room.room.game.players[0].hand[0].uid;
       await room.webSocketMessage(ws,JSON.stringify({type:'action',action:{type:'play',idx:0,sourceUid:uid}}));
       const update = updates.at(-1);
       assert.equal(update.type,'update');
       assert.equal(update.state.players[0].quests[0].progress,progress);
       if (progress) assert(update.events.some(e=>e.type==='log' && e.html.includes('1/18')));
     }
   }
   assert.equal(room.room.rewardDecks[1].filter(id=>id==='ELITE_GOBLIN').length,3);
   if(stage<2)assert.equal((await request('/rewards/story/start',{previous:roomId})).status,403);
   if(prior){const retry=await request('/rewards/story/start',{previous:prior});assert.equal((await retry.json()).roomId,roomId);}
   Object.assign(room.room,{readied:[true,true]});Object.assign(room.room.game,{over:true,winner:0});await room.recordResult();
   assert.equal(db.prepare("SELECT count(*) n FROM rewards WHERE user_id=? AND key='story:aries:clear'").get(userId).n,stage===2?1:0);
   prior=roomId;
 }
 const report={scope:'local real GameRoom setup, in-memory D1/storage, restore and runBot; not authenticated staging',results};if(process.env.LORE_BOT_SERVER_REPORT)fs.writeFileSync(process.env.LORE_BOT_SERVER_REPORT,JSON.stringify(report,null,2));console.log('PASS server Hard/Hell roster selection, difficulty restoration, lethal target, authoritative reducer parity, persistence and alarm',results);
 } finally {db?.close();globalThis.WebSocket=nativeWebSocket;fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
