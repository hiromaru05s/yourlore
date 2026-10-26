import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-sage-goblin-room-');
try {
 await build({stdin:{contents:'export {GameRoom} from "./server/src/gameRoom";export * from "./client/src/shared/engine";export {DB} from "./client/src/shared/cards";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,createGame,DB}=await import(dir+'/room.mjs');let saved;
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 const sockets=[new Socket(0),new Socket(1)],state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 let room=new GameRoom(journalState(state),rewardTestEnv());
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
 let seq=0;const card=id=>({...DB[id],uid:'sg-room-'+(++seq)}),mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
 const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;
 for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],dew:0,shield:0,hp:40,mana:0,maxMana:6});
 g.players[0].field=[mon('NMD6')];g.players[0].hand=[card('S10')];g.players[0].deck=Array.from({length:12},()=>card('S10'));room.room.game=g;
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].hand.length,1);assert.equal(room.room.game.players[0].deck.length,12);
 room.room.game.players[0].mana=1;await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].mana,0);assert.equal(room.room.game.players[0].hand.length,DB.S10.val);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 const hand=room.room.game.players[0].hand.length;await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].hand.length,hand);
 room.room.game.players[0].field=[mon('GOBLIN')];room.room.game.players[1].field=[{...mon('GOBLIN'),def:20}];
 const attacker=room.room.game.players[0].field[0].uid,target=room.room.game.players[1].field[0].uid;
 await send(0,{type:'attack',uid:attacker});assert.equal(room.room.game.players[0].hp,40);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
 await send(0,{type:'chooseTarget',uid:target});assert.equal(room.room.game.players[0].hp,39);assert.equal(room.room.game.players[1].field[0].dmg,1);
 for(const socket of sockets){const view=socket.messages.filter(m=>m.state).at(-1).state;assert.equal(view.players[0].hp,39);assert.equal(view.players[1].field[0].dmg,1);}
 await send(0,{type:'chooseTarget',uid:target});assert.equal(room.room.game.players[0].hp,39);
 console.log('PASS authoritative Sage payment and Goblin penalty, pending-attack hibernation, duplicate target action, both client views');
}finally{await rm(dir,{recursive:true,force:true});}
