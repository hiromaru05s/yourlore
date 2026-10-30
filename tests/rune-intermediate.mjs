import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';

const dir=await mkdtemp('/tmp/lore-rune-test-');
try {
  await build({stdin:{contents:'export * from "./client/src/shared/engine"; export {DB,STARTERS} from "./client/src/shared/cards"; export {GameRoom} from "./server/src/gameRoom";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
  const {DB,STARTERS,createGame,reduce,GameRoom}=await import(dir+'/core.mjs');
  let seq=0;
  const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'rune-'+(++seq)});
  const fresh=()=>{
    const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    g.cur=0;g.turn=3;g.pending=null;
    for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],hp:40,mana:10,maxMana:10});
    g.players[0].hand=[card('RUNE2')];return g;
  };
  assert.equal(DB.RUNE2.cost,5);
  for(const text of [DB.RUNE2.text,DB.RUNE2.textJa,DB.RUNE2.textEn]){assert.match(text,/\+2/);assert.doesNotMatch(text,/\+8/);}
  for(const side of [0,1]) {
    const g=fresh();g.cur=side;g.players[0].hand=[];
    const p=g.players[side];p.hand=[card('RUNE2')];p.deck=[card('M1'),card('M2')];p.discard=[card('S13')];
    const r=reduce(g,{type:'play',idx:0});
    assert.equal(r.state.players[side].maxMana,12,'exactly half qualifies, including spells in graveyard');
    assert.equal(r.state.players[side].mana,5,'maximum mana gain does not refill current mana');
    assert.equal(r.state.players[1-side].maxMana,10);
    assert(r.state.players[side].discard.some(c=>c.id==='RUNE2'));
    assert.doesNotMatch(JSON.stringify(r.events),/マナ\+8|마나 \+8/);
  }
  {
    const g=fresh();g.players[0].deck=[card('M1'),card('M2')];
    const r=reduce(g,{type:'play',idx:0});
    assert.equal(r.state.players[0].maxMana,10);assert.equal(r.state.players[0].mana,10);assert.equal(r.state.players[0].hand.length,1);
  }
  {
    const g=fresh();g.players[0].enchants=[{card:card('RUNE3'),turns:99,bornTurn:0}];
    const r=reduce(g,{type:'play',idx:0});
    assert.equal(r.state.players[0].maxMana,14,'Master repeats the new +2 effect once');assert.equal(r.state.players[0].mana,5);
  }
  {
    const g=fresh();g.players[0].field=[{...card('M1'),aura:'manaGrowthLock'}];
    assert.equal(reduce(g,{type:'play',idx:0}).state.players[0].maxMana,10,'existing growth lock still applies');
  }
  // Exercise the authoritative action route, persisted state and both client views.
  let saved;
  class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
  const sockets=[new Socket(0),new Socket(1)];
  const state=journalState({storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)});
  let room=new GameRoom(state,rewardTestEnv());
  await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:42,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
  room.room.game=fresh();
  await room.webSocketMessage(sockets[0],JSON.stringify({type:'action',action:{type:'play',idx:0}}));
  assert.equal(room.room.game.players[0].maxMana,12);
  for(const socket of sockets)assert.equal(socket.messages.filter(m=>m.state).at(-1).state.players[0].maxMana,12);
  room=new GameRoom(state,rewardTestEnv());
  await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
  assert.equal(room.room.game.players[0].maxMana,12,'hibernation restores +2 result');
  console.log('PASS RUNE2 +2, three languages, both sides, condition boundary/rejection, mana cost, echo, growth lock, authoritative views and persistence');
} finally {await rm(dir,{recursive:true,force:true});}
