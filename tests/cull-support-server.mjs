import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-cull-room-');
const realNow=Date.now;let now=2_000_000;Date.now=()=>now;
try {
 await build({stdin:{contents:'export {GameRoom} from "./server/src/gameRoom";export {createGame} from "./client/src/shared/engine";export {DB,STARTERS} from "./client/src/shared/cards";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,createGame,DB,STARTERS}=await import(dir+'/room.mjs');let seq=0;
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'cull-room-'+(++seq)});
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 for(const owner of [0,1]) {
  let saved;const sockets=[new Socket(0),new Socket(1)];
  const state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
  let room=new GameRoom(journalState(state),rewardTestEnv());await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
  const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
  const g=createGame({mode:'online',seed:42,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=5;g.pending=null;g.phase='main';
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],uses:{},usesTurn:{},dew:0,shield:0,brand:0,hp:100,mana:20,maxMana:20});
  const s=card('SCRAPPER'),a=card('M1'),b=card('M1');g.players[owner].hand=[s,a,card('STARTER_TRASH')];room.room.game=g;room.room.turnStartAt=now;
  await send(owner,{type:'play',idx:0});assert.equal(room.room.game.players[owner].mana,20);assert.equal(room.room.game.players[owner].hand.length,3);
  room.room.game.players[owner].hand.push(b);
  await send(owner,{type:'play',idx:0,sourceUid:s.uid,targets:[a.uid]});assert.equal(room.room.game.players[owner].mana,20);
  await send(owner,{type:'play',idx:0});assert.equal(room.room.game.players[owner].mana,18);assert.equal(room.room.game.pending.reason,'scrapper');
  await send(owner,{type:'pick',uid:a.uid});assert.equal(room.room.game.players[owner].maxMana,20);
  room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));
  assert.equal(room.room.game.pending.data.val,1);assert.equal(room.room.game.pending.reason,'scrapper');
  await send(owner,{type:'pick',uid:null});assert.equal(room.room.game.pending.data.val,1);
  room.room.turnStartAt=now-100000;await room.alarm();assert.equal(room.room.game.players[owner].maxMana,21);assert.equal(room.room.game.players[owner].removed.length,2);assert.equal(room.room.game.cur,1-owner);
  for(const socket of sockets){const view=socket.messages.filter(m=>m.state).at(-1).state;assert.equal(view.players[owner].maxMana,21);assert.equal(view.players[owner].removed.length,2);}
  const current=room.room.game;current.cur=owner;room.room.turnStartAt=now;current.players[owner].hand=[card('FURNACE'),card('IRON_WALL'),card('IRON_WALL')];current.players[owner].mana=20;
  await send(owner,{type:'play',idx:0});await send(owner,{type:'play',idx:0});await send(owner,{type:'play',idx:0});assert.equal(room.room.game.players[owner].shield,7);
  room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));
  assert(room.room.game.players[owner].enchants.some(e=>e.card.id==='FURNACE'));assert.equal(room.room.game.players[owner].shield,7);
  for(const socket of sockets)assert.equal(socket.messages.filter(m=>m.state).at(-1).state.players[owner].shield,7);
 }
 console.log('PASS authoritative Cull rework in both seats: pre-payment rejection, mandatory two-card payment, hibernation, timeout, shield cap and both socket views');
} finally {Date.now=realNow;await rm(dir,{recursive:true,force:true});}
