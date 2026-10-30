import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'lore-opening-server-'));
await build({entryPoints:['server/src/gameRoom.ts'],bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'room.mjs')});
const {GameRoom}=await import(path.join(temp,'room.mjs'));
let now=2_000_000;const realNow=Date.now;Date.now=()=>now;
class Socket {
  messages=[];constructor(side){this.side=side;}
  deserializeAttachment(){return {side:this.side,gen:0};}
  send(message){this.messages.push(JSON.parse(message));}
  close(){}
}
async function fixture(ranked=false){
  const sockets=[new Socket(0),new Socket(1)];let saved;let alarm=null;
  const storage={get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async at=>{alarm=at;},deleteAlarm:async()=>{alarm=null;}};
  const state={storage,getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
  const room=new GameRoom(journalState(state),rewardTestEnv());
  await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  const send=(side,msg)=>room.webSocketMessage(sockets[side],JSON.stringify(msg));
  return {room,state,sockets,send,saved:()=>saved,alarm:()=>alarm};
}
try {
 for (const ranked of [false,true]) {
  const f=await fixture(ranked),total=ranked?65000:90000;
  for(const side of [0,1])await f.send(side,{type:'ready',openingVersion:2,turnReadyVersion:1});
  if(ranked)for(const side of [0,1])await f.send(side,{type:'startReady'});
  for(const side of [0,1])await f.send(side,{type:'openingReady'});
  let g=f.saved().game,cur=g.cur,turn=g.turn;
  const ready=()=>({type:'turnReady',turn,cur});
  await f.send(cur,ready());assert(f.saved().turnReadyBy,'cannot acknowledge before opening');
  now=f.saved().turnStartAt+8000;
  assert.equal(f.room.redact(cur).turnLeftMs,total,'opening/draw consumes no time');
  await f.send(1-cur,ready());assert(f.saved().turnReadyBy,'opponent cannot start clock');
  await f.send(cur,{...ready(),turn:turn+1});assert(f.saved().turnReadyBy,'wrong turn ignored');
  await f.send(cur,{...ready(),turn:-1});assert(f.saved().turnReadyBy,'invalid message ignored');
  // Restore the real serialized pending wait before acknowledging.
  const restored=new GameRoom(journalState(f.state),rewardTestEnv());await restored.restore();
  assert.equal(restored.room.turnReadyBy,f.saved().turnReadyBy);
  await restored.webSocketMessage(f.sockets[cur],JSON.stringify(ready()));
  assert.equal(restored.room.turnReadyBy,null);assert.equal(restored.room.turnStartAt,now);
  assert.equal(f.alarm(),now+total+7000);
  for(const socket of f.sockets)assert.equal(socket.messages.at(-1).type,'turnClock');
  now+=5000;await restored.webSocketMessage(f.sockets[cur],JSON.stringify(ready()));
  assert.equal(restored.redact(cur).turnLeftMs,total-5000,'duplicate cannot restore time');
  await restored.webSocketMessage(f.sockets[cur],JSON.stringify({type:'ready',openingVersion:2,turnReadyVersion:1}));
  assert.equal(restored.redact(cur).turnLeftMs,total-5000,'reconnect keeps running clock');
  // Real engine endTurn (including hand-cap resolution) must prepare the next turn.
  for(let i=0;i<3&&restored.room.game.turn===turn;i++)await restored.handleAction(cur,{type:'endTurn'});
  assert(restored.room.game.turn>turn);turn=restored.room.game.turn;cur=restored.room.game.cur;
  assert(restored.room.turnReadyBy);now+=12000;
  assert.equal(restored.redact(cur).turnLeftMs,total,'ordinary turn draw consumes no time');
  const waitingUntil=restored.room.turnReadyBy;
  await restored.webSocketMessage(f.sockets[cur],JSON.stringify({type:'ready',openingVersion:2,turnReadyVersion:1}));
  assert.equal(restored.room.turnReadyBy,waitingUntil,'reconnect cannot extend readiness wait');
  now=waitingUntil;await restored.alarm();assert.equal(restored.room.turnReadyBy,null,'missing ack has bounded fallback');
  assert.equal(restored.redact(cur).turnLeftMs,total);
  now+=total+7000;await restored.alarm();assert(restored.room.game.turn>turn,'timeout still enforced');
  assert(restored.room.turnReadyBy,'forced end also waits for next draw');
  // TIMEWARP-style same-side/new-number transition uses a fresh handshake.
  restored.room.game.turn+=2;restored.prepareTurnClock();assert(restored.room.turnReadyBy);
  const key=restored.room.game.turn;now+=2500;
  await restored.webSocketMessage(f.sockets[restored.room.game.cur],JSON.stringify({type:'turnReady',turn:key-2,cur:restored.room.game.cur}));
  assert(restored.room.turnReadyBy,'old same-side acknowledgement cannot start new turn');
  restored.room.bot={side:restored.room.game.cur,id:'bot',nextAt:null};restored.prepareTurnClock();
  assert.equal(restored.room.turnReadyBy,null,'server bot needs no browser acknowledgement');
 }
 console.log('PASS turn readiness: 65s ranked/90s casual, first and subsequent turns, sender/turn validation, duplicates, hibernation, reconnect, bounded fallback, enforced timeout, same-side extra turns and bot');
} finally {Date.now=realNow;await rm(temp,{recursive:true,force:true});}
