import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-v58-room-');
const realNow=Date.now;let now=2_000_000;Date.now=()=>now;
try {
  await build({stdin:{contents:`export {GameRoom} from './server/src/gameRoom';export {createGame} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
  const {GameRoom,createGame,DB}=await import(dir+'/room.mjs');let saved,seq=0,checks=0;
  class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
  const sockets=[new Socket(0),new Socket(1)],state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
  const room=new GameRoom(state,rewardTestEnv());await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
  const send=(r,owner,a)=>r.webSocketMessage(sockets[owner],JSON.stringify({type:'action',action:a}));
  const card=id=>({...structuredClone(DB[id]),uid:`gift-room-${++seq}`});
  for(const owner of [0,1]) {
    const g=createGame({mode:'online',seed:42,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=5;g.pending=null;g.phase='main';
    for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],dew:0,shield:0,brand:0,hp:100,mana:30,maxMana:30});
    g.players[owner].hand=[card('NIGHT_CASTLE_GIFT')];room.room.game=g;room.room.turnStartAt=now;
    await send(room,owner,{type:'play',idx:0});
    for(let i=0;i<8;i++)await send(room,room.room.game.cur,{type:'endTurn'});
    assert.equal(room.room.game.pending.reason,'NIGHT_CASTLE_GIFT');assert.equal(room.room.game.pending.owner,owner);
    await send(room,1-owner,{type:'pick',uid:'VAMP_WARD'});assert.equal(room.room.game.pending.reason,'NIGHT_CASTLE_GIFT');checks++;
    const restored=new GameRoom(state,rewardTestEnv());await restored.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));assert.equal(restored.room.game.pending.reason,'NIGHT_CASTLE_GIFT');assert.equal(restored.room.game.players[owner].enchants[0].turns,0);checks++;
    await send(restored,owner,{type:'pick',uid:'VAMP_WARD'});assert.equal(restored.room.game.pending,null);assert.equal(restored.room.game.players[owner].enchants.length,0);assert.equal(restored.room.game.players[owner].hand.filter(c=>c.id==='VAMP_WARD').length,1);
    assert(sockets[owner].messages.at(-1).state.players[owner].hand.some(c=>c.id==='VAMP_WARD'));assert(sockets[1-owner].messages.at(-1).state.players[owner].hand.every(c=>c.id==='HIDDEN'));checks++;
    // Let the authoritative timer finish an unresolved mandatory choice.
    const timeoutGame=structuredClone(g);timeoutGame.players[owner].hand=[];timeoutGame.players[owner].enchants=[{card:card('NIGHT_CASTLE_GIFT'),turns:0,bornTurn:0}];
    timeoutGame.pending={kind:'cardChoice',owner,reason:'NIGHT_CASTLE_GIFT',hint:'',hintJa:'',allowCancel:false,data:{sourceUid:timeoutGame.players[owner].enchants[0].card.uid}};
    restored.room.game=timeoutGame;restored.room.turnStartAt=now-100000;await restored.alarm();
    assert.equal(restored.room.game.pending,null);assert.equal(restored.room.game.players[owner].enchants.length,0);assert.equal(restored.room.game.cur,1-owner);assert.equal(restored.room.game.players[owner].hand.filter(c=>['VAMP_PACT','VAMP_WARD'].includes(c.id)).length,1);checks++;
  }
  console.log(`PASS ${checks} authoritative Gift checks: owner authorization, persistence/reconnect, private reward, timeout for both seats`);
} finally {Date.now=realNow;await fs.rm(dir,{recursive:true,force:true});}
