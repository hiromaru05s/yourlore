import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-balance-caps-room-');
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

 // Server snapshots and both socket views must retain the rule counters.
 g.players[0].hand=[card('GOBLIN_RAIDER'),card('GOBLIN_RAIDER')];room.room.game=g;
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].field.length,1);
 const mana=room.room.game.players[0].mana;await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].mana,mana);assert.equal(room.room.game.players[0].hand.length,1);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
 assert.equal(room.room.game.players[0].field[0].expireOpponentOf,0);
 await send(0,{type:'endTurn'});await send(1,{type:'endTurn'});
 for(const socket of sockets)assert.equal(socket.messages.filter(m=>m.state).at(-1).state.players[0].field.length,0);

 const current=room.room.game;current.players[0].hand=[card('S10')];current.players[0].deck=[];current.players[0].discard=[];current.players[0].mana=20;current.players[0].maxMana=20;current.market[0]=card('QUICK_GRIMOIRE');current.marketStock[0]=3;
 await send(0,{type:'buyMarket',i:0});assert.deepEqual(room.room.game.players[0].spellDiscountCharges,[5]);
 for(let i=0;i<4;i++)await send(0,{type:'play',idx:0});
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 assert.deepEqual(room.room.game.players[0].spellDiscountCharges,[1]);const paid=room.room.game.players[0].mana;
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].mana,paid);
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].mana,paid-1);
 for(const socket of sockets)assert.deepEqual(socket.messages.filter(m=>m.state).at(-1).state.players[0].spellDiscountCharges,[]);

 room.room.game.players[0].hand=[card('DOMINION')];room.room.game.players[0].deck=[];room.room.game.players[0].discard=[];
 for(let i=0;i<3;i++)await send(0,{type:'play',idx:0});
 assert.equal(room.room.game.players[0].uses.DOMINION,3);assert.equal(room.room.game.players[1].skipTurns,1);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].uses.DOMINION,3);assert.equal(room.room.game.players[0].hand[0].id,'DOMINION');
 for(const socket of sockets){const view=socket.messages.filter(m=>m.state).at(-1).state;assert.equal(view.players[0].uses.DOMINION,3);assert.equal(view.players[1].skipTurns,1);}
 await send(0,{type:'endTurn'});assert.equal(room.room.game.cur,0);assert.equal(room.room.game.players[1].skipTurns,0);
 await send(0,{type:'endTurn'});room.room.game.players[1].hand=[card('DOMINION')];await send(1,{type:'play',idx:0});assert.equal(room.room.game.players[1].uses.DOMINION,1);
 console.log('PASS authoritative balance caps: duplicate rejection, deadline through hibernation, 5/6 cost boundary, Dominion 3/4, per-player counters, both clients');
} finally {await rm(dir,{recursive:true,force:true});}
