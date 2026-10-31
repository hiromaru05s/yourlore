import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-v60-room-');
const realNow=Date.now;let now=2_000_000;Date.now=()=>now;
try {
  await build({stdin:{contents:`export {GameRoom} from './server/src/gameRoom';export {createGame} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
  const {GameRoom,createGame,DB}=await import(dir+'/room.mjs');let saved,seq=0,checks=0;
  class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
  const sockets=[new Socket(0),new Socket(1)],state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
  const room=new GameRoom(journalState(state),rewardTestEnv());await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
  const send=(r,owner,a)=>r.webSocketMessage(sockets[owner],JSON.stringify({type:'action',action:a}));
  const card=id=>({...structuredClone(DB[id]),uid:`farm-room-${++seq}`});
  for(const owner of [0,1]) {
    const g=createGame({mode:'online',seed:42,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=5;g.pending=null;g.phase='main';
    for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],uses:{},usesTurn:{},dew:0,shield:0,brand:0,hp:100,mana:30,maxMana:30});
    g.players[owner].hand=[card('FARM'),card('FARMER'),card('HARVEST'),card('FLAME')];g.players[owner].uses.FLAME=9;
    room.room.game=g;room.room.turnStartAt=now;
    for(let i=0;i<4;i++)await send(room,owner,{type:'play',idx:0});
    assert.equal(room.room.game.players[1-owner].hp,95);assert.equal(room.room.game.players[owner].uses.FLAME,10);checks++;
    for(let i=0;i<6;i++)await send(room,room.room.game.cur,{type:'endTurn'});
    const restored=new GameRoom(journalState(state),rewardTestEnv());await restored.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));
    assert.equal(restored.room.game.players[owner].enchants.find(e=>e.card.id==='FARM').turns,1);assert.equal(restored.room.game.players[owner].uses.FLAME,10);checks++;
    for(let i=0;i<2;i++)await send(restored,restored.room.game.cur,{type:'endTurn'});
    assert.equal(restored.room.game.players[owner].hand.filter(c=>c.id==='GOLDEN_APPLE').length,2);
    assert.deepEqual(restored.room.game.players[owner].enchants.map(e=>e.card.id),['FARMER_PRAYER']);
    assert(sockets[owner].messages.at(-1).state.players[owner].hand.some(c=>c.id==='GOLDEN_APPLE'));
    assert(sockets[1-owner].messages.at(-1).state.players[owner].hand.every(c=>c.id==='HIDDEN'));checks++;
    const farm=card('FARM');restored.room.game.players[owner].enchants.unshift({card:farm,turns:1,bornTurn:0});
    restored.room.game.cur=1-owner;restored.room.turnStartAt=now-100000;await restored.alarm();
    assert.equal(restored.room.game.players[owner].hand.filter(c=>c.id==='GOLDEN_APPLE').length,3);assert(!restored.room.game.players[owner].enchants.some(e=>e.card.id==='FARM'));checks++;
  }
  console.log(`PASS ${checks} authoritative v60 checks: farm/prayer/harvest, lifetime uses, hibernation, private rewards and timeout in both seats`);
} finally {Date.now=realNow;await fs.rm(dir,{recursive:true,force:true});}
