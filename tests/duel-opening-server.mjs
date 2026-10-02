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
  const room=new GameRoom(state,{});
  await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  const send=(side,msg)=>room.webSocketMessage(sockets[side],JSON.stringify(msg));
  return {room,state,sockets,send,saved:()=>saved,alarm:()=>alarm};
}
try{
  const f=await fixture();
  await f.send(0,{type:'ready',openingVersion:2});
  const turn=f.room.room.game.turn;
  await f.send(0,{type:'action',action:{type:'endTurn'}});
  assert.equal(f.room.room.game.turn,turn,'no play before opponent joins');
  await f.send(1,{type:'ready',openingVersion:2});
  const deadline=f.saved().opening.prepareBy;
  assert.equal(deadline,now+8000);assert.equal(f.alarm(),deadline);
  assert.equal(f.sockets[1].messages.at(-1).state.opening.startsAt,null);
  await f.send(0,{type:'openingReady'});assert.equal(f.saved().opening.startsAt,null);
  await f.send(1,{type:'openingReady'});
  const starts=f.saved().opening.startsAt,playable=starts+6930;
  assert.equal(starts,now+350);assert.equal(f.saved().turnStartAt,playable);
  for(const socket of f.sockets){const state=socket.messages.at(-1).state;assert.equal(state.opening.playableAt,playable);assert.equal(state.turnLeftMs,90000);assert.equal(state.rng,0);assert(state.players[1-socket.side].hand.every(c=>c.id==='HIDDEN'));}
  now+=500;await f.send(0,{type:'openingReady'});await f.send(0,{type:'ready',openingVersion:2});
  assert.equal(f.saved().opening.startsAt,starts,'duplicate ready and reconnect never restart');
  await f.send(0,{type:'action',action:{type:'endTurn'}});assert.equal(f.room.room.game.turn,turn);
  now=playable-1;await f.send(0,{type:'action',action:{type:'endTurn'}});assert.equal(f.room.room.game.turn,turn);
  // Hibernation restores the same start and rejects an early action.
  const restored=new GameRoom(f.state,{});
  await restored.webSocketMessage(f.sockets[0],JSON.stringify({type:'ready',openingVersion:2}));
  assert.equal(f.sockets[0].messages.at(-1).state.opening.playableAt,playable);
  now=playable+2000;
  await restored.webSocketMessage(f.sockets[0],JSON.stringify({type:'ready',openingVersion:2}));
  assert.equal(f.sockets[0].messages.at(-1).state.turnLeftMs,88000,'rejoin keeps real elapsed clock');
  await restored.webSocketMessage(f.sockets[0],JSON.stringify({type:'action',action:{type:'endTurn'}}));
  assert.equal(restored.room.game.turn,turn+1,'action accepted once playable');
  assert.equal(f.sockets[0].messages.at(-1).state.opening,undefined,'later turns have no opening metadata');

  const timeout=await fixture();await timeout.send(0,{type:'ready',openingVersion:2});await timeout.send(1,{type:'ready',openingVersion:2});
  const by=timeout.saved().opening.prepareBy;now=by;await timeout.room.alarm();
  assert.equal(timeout.saved().opening.startsAt,now+350,'missing asset acknowledgements are bounded');
  const original=timeout.saved().opening.startsAt;await timeout.room.alarm();assert.equal(timeout.saved().opening.startsAt,original,'alarm retry is idempotent');

  const ranked=await fixture(true);await ranked.send(0,{type:'ready',openingVersion:2});await ranked.send(1,{type:'ready',openingVersion:2});
  assert.equal(ranked.saved().opening.prepareBy,null);assert(ranked.saved().previewUntil>now);
  await ranked.send(0,{type:'startReady'});await ranked.send(1,{type:'startReady'});
  assert.equal(ranked.saved().previewDone,true);assert.equal(ranked.saved().opening.prepareBy,now+8000);
  // The opening deadline participates in the existing single alarm schedule.
  ranked.room.room.forfeitAt[1]=now+1000;ranked.room.syncAlarm();assert.equal(ranked.alarm(),now+1000);

  // A room started before this deploy keeps its persisted first-turn deadline.
  const older=await fixture();await older.send(0,{type:'ready',openingVersion:2});await older.send(1,{type:'ready',openingVersion:2});
  await older.send(0,{type:'openingReady'});await older.send(1,{type:'openingReady'});
  older.room.room.turnStartAt=older.room.room.opening.startsAt+5800;
  assert.equal(older.room.redact(0).opening.playableAt,older.room.room.turnStartAt,'deployment does not stretch an existing room deadline');

  const legacy=await fixture();await legacy.send(0,{type:'ready',openingVersion:2});await legacy.send(1,{type:'ready'});
  assert.equal(legacy.saved().opening,undefined,'mixed client versions do not deadlock');
  assert.equal(legacy.saved().turnStartAt,now);
  const pendingAlarm=await fixture();await pendingAlarm.send(0,{type:'ready',openingVersion:2});await pendingAlarm.send(1,{type:'ready',openingVersion:2});delete pendingAlarm.room.room.opening.version;now=pendingAlarm.saved().opening.prepareBy;await pendingAlarm.room.alarm();assert.equal(pendingAlarm.saved().turnStartAt-pendingAlarm.saved().opening.startsAt,10450,'old pending alarm keeps its original cinematic duration');
  const v1=await fixture();await v1.send(0,{type:'ready',openingVersion:2});await v1.send(1,{type:'ready',openingVersion:1});
  assert.equal(v1.saved().opening,undefined,'mixed cinematic versions skip rather than disagree on the first-turn deadline');
  const pendingOld=await fixture();delete pendingOld.room.room.opening.version;await pendingOld.send(0,{type:'ready',openingVersion:2});await pendingOld.send(1,{type:'ready',openingVersion:2});assert.equal(pendingOld.saved().opening,undefined,'a pending room created before this release keeps the legacy path');
  console.log('PASS: two-player readiness, authoritative clock/input, reconnect/hibernation, timeout/retry, ranked preview, alarm ordering, hidden hands, old clients');
}finally{Date.now=realNow;await rm(temp,{recursive:true,force:true});}
