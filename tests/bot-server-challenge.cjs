const fs=require('fs'),assert=require('assert/strict'),{DatabaseSync}=require('node:sqlite');
(async()=>{
 const temp=fs.mkdtempSync('/tmp/lore-bot-server-challenge-'), nativeWebSocket=globalThis.WebSocket;let db;
 try {
 const {build}=require(process.cwd()+'/node_modules/esbuild');
 await build({stdin:{contents:"export {GameRoom} from './server/src/gameRoom';export {botNpc} from './client/src/shared/botNpcs';export {DB} from './client/src/shared/cards';export {reduce} from './client/src/shared/engine';export {botDecide} from './client/src/shared/bot';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/server-core.mjs'});
 const E=await import(temp+'/server-core.mjs');db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/schema.sql','utf8'));
 class Stmt{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Stmt(this.sql,args)}async first(){return db.prepare(this.sql).get(...this.args)??null}async all(){return {results:db.prepare(this.sql).all(...this.args)}}async run(){return {meta:{changes:Number(db.prepare(this.sql).run(...this.args).changes)}}}}
 const env={DB:{prepare:sql=>new Stmt(sql),batch:async ss=>{db.exec('BEGIN');try{const rows=[];for(const s of ss)rows.push(await s.run());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}}}};
 globalThis.WebSocket={OPEN:1};const results=[];let serial=0;
 const card=id=>({...E.DB[id],uid:'server-proof-'+serial++});
 for(const tier of ['hard','hell']){
  const id='challenge-qa-'+tier;db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run(id,id+'@test.invalid','disabled',id,Date.now());
  let saved,alarm;const state={id:{toString:()=>id+'-room'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async n=>{alarm=n},deleteAlarm:async()=>{alarm=null}},getWebSockets:()=>[]};
  let room=new E.GameRoom(state,env);const setup=await room.fetch(new Request('https://do/setup',{method:'POST',body:JSON.stringify({players:[{id,name:id},{id:'ignored',name:tier}],seed:1,challengeDifficulty:tier})}));assert.equal(setup.status,200);
  assert.equal(saved.challengeDifficulty,tier);assert.equal(E.botNpc(tier).decks.length,tier==='hard'?5:7);
  const initial=saved.rewardDecks[1].filter(id=>id!=='STARTER_MANA').sort();assert(E.botNpc(tier).decks.some(d=>JSON.stringify([...d.cards].sort())===JSON.stringify(initial)));
  let g=room.room.game;g.turn=8;g.cur=1;g.pending=null;g.market=[];
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:2,maxMana:8});
  g.players[1].field=[9,2].map((atk,i)=>({...card('M2'),tribe:undefined,atk,def:5,dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:i===0,summonedTurn:0}));g.players[1].hand=[card('S3')];g.players[0].hp=5;
  g=E.reduce(g,{type:'play',idx:0}).state;const expected=E.botDecide(g,tier);assert.equal(expected.uid,g.players[1].field[1].uid);
  Object.assign(room.room,{game:g,readied:[true,true],previewDone:true,opening:undefined,turnStartAt:Date.now()-1});await room.persist();
  room=new E.GameRoom(state,env);await room.restore();const start=performance.now();await room.runBot();const ms=performance.now()-start;
  assert.deepEqual(room.room.game,E.reduce(g,expected).state);assert.deepEqual(saved.game,room.room.game);assert.equal(saved.challengeDifficulty,tier);assert(typeof alarm==='number'&&alarm>=room.room.turnStartAt);
  results.push({tier,roster:E.botNpc(tier).decks.length,setup:true,restoredDifficulty:saved.challengeDifficulty,action:expected,reducerParity:true,persisted:true,alarmRearmed:true,ms});
 }
 const report={scope:'local real GameRoom setup, in-memory D1/storage, restore and runBot; not authenticated staging',results};if(process.env.LORE_BOT_SERVER_REPORT)fs.writeFileSync(process.env.LORE_BOT_SERVER_REPORT,JSON.stringify(report,null,2));console.log('PASS server Hard/Hell roster selection, difficulty restoration, lethal target, authoritative reducer parity, persistence and alarm',results);
 } finally {db?.close();globalThis.WebSocket=nativeWebSocket;fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
