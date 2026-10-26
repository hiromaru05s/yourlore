import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-rift-train-bank-room-');
try {
 await build({stdin:{contents:'export {GameRoom} from "./server/src/gameRoom";export * from "./client/src/shared/engine";export {DB} from "./client/src/shared/cards";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,createGame,DB}=await import(dir+'/room.mjs');let saved;
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 const sockets=[new Socket(0),new Socket(1)];
 const state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 let room=new GameRoom(journalState(state),rewardTestEnv());
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
 let seq=0;const card=id=>({...DB[id],uid:'room-'+(++seq)}),mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
 const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;
 for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],dew:0,shield:0,hp:100,mana:30,maxMana:30});


 g.players[0].removed=[card('M1'),card('M2')];g.players[1].hand=[card('GM6_1')];
 const jailer=g.players[1].hand[0];
 g.pending={kind:'cardChoice',owner:0,reason:'HIGH_ELF_HAND',hint:'',hintJa:'',allowCancel:false,data:{left:1}};room.room.game=g;
 await send(0,{type:'pick',uid:jailer.uid});
 assert.equal(room.room.game.pending.reason,'RIFT_JAILER');assert.equal(room.room.game.pending.owner,1);assert.equal(room.room.game.cur,0);
 const first=room.room.game.players[0].removed[0].uid;
 await send(0,{type:'pick',uid:first});assert.equal(room.room.game.players[0].removed.length,2);
 await send(1,{type:'pick',uid:'invalid'});assert.equal(room.room.game.players[0].removed.length,2);
 await send(1,{type:'pick',uid:first});assert.equal(room.room.game.players[0].removed.length,1);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 assert.equal(room.room.game.pending.reason,'RIFT_JAILER');assert.equal(room.room.game.pending.owner,1);
 await send(1,{type:'pick',uid:null});assert.equal(room.room.game.pending,null);assert(room.room.game.players[1].discard.some(c=>c.uid===jailer.uid));
 for(const socket of sockets){assert(socket.messages.at(-1).state.players[1].discard.some(c=>c.uid===jailer.uid));assert.equal(socket.messages.at(-1).state.pending,null);}
 const active=room.room.game;active.players[0].maxMana=10;active.players[0].mana=10;active.players[0].hand=[card('MAGIC_BANK'),card('MAGIC_TRAIN')];active.players[0].deck=Array.from({length:10},()=>card('M1'));active.players[0].discard=[];
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].maxMana,9);assert.equal(room.room.game.players[0].mana,6);
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].magicTrainTurns,6);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
 assert.equal(room.room.game.players[0].magicTrainTurns,6);assert.equal(room.room.game.players[0].enchants.find(e=>e.card.id==='MAGIC_BANK').turns,2);
 await send(0,{type:'endTurn'});assert.equal(room.room.game.turn,4);
 await send(1,{type:'endTurn'});assert.equal(room.room.game.turn,11);assert.equal(room.room.game.cur,0);
 assert.equal(room.room.game.players[0].hand.length,3);assert.equal(room.room.game.players[0].enchants.length,0);
 for(const socket of sockets)assert.equal(socket.messages.at(-1).state.turn,11);
 console.log('PASS authoritative Rift/Train/Bank: inactive owner authorization, invalid/cancel selection, persisted return, bank cast cost, train reservation and clocks across reconnect, both clients');
} finally {await rm(dir,{recursive:true,force:true});}
