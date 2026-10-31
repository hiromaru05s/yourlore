import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-v74-server-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export {GameRoom} from './server/src/gameRoom';export {DB,STARTERS,BALANCE_VERSION} from './client/src/shared/cards';export {createGame} from './client/src/shared/engine';export {OPENING_VERSION} from './client/src/shared/opening';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,DB,STARTERS,createGame,OPENING_VERSION}=await import(dir+'/room.mjs');let saved,seq=0;
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return{side:this.side,gen:0};}send(s){this.messages.push(JSON.parse(s));}close(){}}
 const sockets=[new Socket(0),new Socket(1)];
 const state={id:{toString:()=> 'v74-server'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 const env=rewardTestEnv();let room=new GameRoom(journalState(state),env);
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready',openingVersion:OPENING_VERSION}));
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'server-v74-'+(++seq)});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,maxMana:20,mana:20,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[]});return g;};
 const send=(owner,action)=>room.webSocketMessage(sockets[owner],JSON.stringify({type:'action',action}));
 const setup=g=>{room.room.game=g;room.room.opening=undefined;room.room.readied=[true,true];room.room.turnStartAt=Date.now()-1;};

 for(const side of [0,1]) {
  let g=fresh();g.cur=side;const other=1-side;g.players[side].hand=[card('BLACK_REVERSE'),card('BLACK_REVERSE'),card('BLACK_REVERSE')];setup(g);
  await send(other,{type:'play',idx:0});assert.equal(room.room.game.players[side].mana,20);
  await send(side,{type:'play',idx:0});await send(side,{type:'play',idx:0});
  assert.equal(room.room.game.players[side].uses.BLACK_REVERSE,2);
  room=new GameRoom(journalState(state),env);await room.restore();const before=room.room.game.players[side].mana;
  await send(side,{type:'play',idx:0});assert.equal(room.room.game.players[side].mana,before);assert.equal(room.room.game.players[side].hand.length,1);
 }
 let g=fresh();g.players[1].maxMana=5;g.players[0].hand=[card('AMBUSH')];setup(g);await send(0,{type:'play',idx:0});await send(0,{type:'endTurn'});await send(1,{type:'endTurn'});
 room=new GameRoom(journalState(state),env);await room.restore();assert.equal(room.room.game.players[0].ambushUsedPreviousOwnTurn,true);
 room.room.game.players[0].hand.push(card('AMBUSH'));const mana=room.room.game.players[0].mana;await send(0,{type:'play',idx:room.room.game.players[0].hand.length-1});assert.equal(room.room.game.players[0].mana,mana);
 g=fresh();const target=card('M2');g.players[0].deck=[target];g.players[0].hand=[card('BLOOD_SORROW')];g.players[1].hand=[card('M3')];setup(g);
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].hp,93);assert.equal(room.room.game.pending.reason,'bloodSorrow');
 const privateView=sockets[1].messages.filter(m=>m.state).at(-1).state;assert(privateView.players[0].deck.every(c=>c.id==='HIDDEN'));
 room=new GameRoom(journalState(state),env);await room.restore();await send(1,{type:'pick',uid:target.uid});assert(room.room.game.pending);await send(0,{type:'pick',uid:'forged'});assert(room.room.game.pending);await send(0,{type:'pick',uid:target.uid});assert.equal(room.room.game.pending,null);assert(room.room.game.players[0].removed.some(c=>c.uid===target.uid));
 g=fresh();const returned=card('M3');g.players[0].removed=[returned];g.players[0].hand=[card('TIMEWARP')];setup(g);await send(0,{type:'play',idx:0});assert.equal(room.room.game.pending.reason,'TIMEWARP');
 room=new GameRoom(journalState(state),env);await room.restore();await send(0,{type:'pick',uid:returned.uid});assert(room.room.game.players[0].discard.some(c=>c.uid===returned.uid));assert.equal(room.room.game.players[0].removed.length,0);
 await send(0,{type:'pick',uid:returned.uid});assert.equal(room.room.game.players[0].discard.filter(c=>c.uid===returned.uid).length,1);
 g=fresh();g.players[0].hand=[card('GS8_0')];g.players[1].deck=[card('M1')];g.players[1].discard=[card('M2')];const damage=g.players[1].deck[0].cost+g.players[1].discard[0].cost;setup(g);await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[1].removed.length,2);assert.equal(room.room.game.players[1].hp,100-damage);
 console.log('PASS v74 server: Reverse caps on both sides through restore, Ambush cooldown, Sorrow ownership/hidden deck/invalid picks, post-roll recovery, Silvermoon authoritative damage');
}finally{await rm(dir,{recursive:true,force:true});}
