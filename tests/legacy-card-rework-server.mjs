import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-legacy-room-');
try {
 await build({stdin:{contents:'export {GameRoom} from "./server/src/gameRoom";export * from "./client/src/shared/engine";export {DB,STARTERS} from "./client/src/shared/cards";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,createGame,DB,STARTERS}=await import(dir+'/room.mjs');let saved;
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 const sockets=[new Socket(0),new Socket(1)],state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 let room=new GameRoom(journalState(state),rewardTestEnv());
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready'}));
 let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'legacy-room-'+(++seq)}),mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
 const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;
 for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:0,shield:0,hp:40,mana:20,maxMana:20});
 g.players[0].hand=[card('M8')];g.players[1].dew=2;room.room.game=g;
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].dew,1);assert.equal(room.room.game.players[1].dew,1);
 // Start player 1's turn: both rest copies queue independent healing choices.
 room.room.game.players[1].enchants=[0,1].map(()=>({card:card('COLOSSEUM_REST'),turns:99,bornTurn:0}));
 room.room.game.players[1].removed=Array.from({length:10},()=>card('STARTER_TRASH'));
 room.room.game.players[1].field=[{...mon('M8'),dmg:3},{...mon('M12'),dmg:2},mon('NHEX'),mon('HEXER1')];
 await send(0,{type:'endTurn'});assert.equal(room.room.game.pending.reason,'COLOSSEUM_REST');assert.equal(room.room.game.pending.owner,1);
 assert.equal(room.room.game.players[0].discard.filter(c=>c.id==='CURSE').length,2);
 const targets=room.room.game.players[1].field.slice(0,2).map(m=>m.uid);
 await send(0,{type:'pick',uid:targets[0]});assert.equal(room.room.game.players[1].field[0].dmg,3);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 assert.equal(room.room.game.pending.reason,'COLOSSEUM_REST');await send(1,{type:'pick',uid:'missing'});assert(room.room.game.pending);
 await send(1,{type:'pick',uid:targets[0]});assert.equal(room.room.game.players[1].field[0].dmg,0);assert.equal(room.room.game.pending.reason,'COLOSSEUM_REST');
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 await send(1,{type:'pick',uid:targets[1]});assert.equal(room.room.game.pending,null);assert.equal(room.room.game.players[1].field[1].dmg,0);
 const hp=room.room.game.players[1].hp;assert.equal(hp,45); // Dew 1 + two Rest heals of 2.
 await send(1,{type:'pick',uid:targets[1]});assert.equal(room.room.game.players[1].hp,hp);
 for(const socket of sockets){const view=socket.messages.filter(m=>m.state).at(-1).state;assert.equal(view.players[1].hp,hp);assert.equal(view.players[1].field[0].dmg,0);assert.equal(view.players[1].field[1].dmg,0);}
 console.log('PASS authoritative Dew transfer, Hexer start triggers, Rest owner authorization, two queued choices, hibernation between choices, duplicate/invalid requests and both client views');
}finally{await rm(dir,{recursive:true,force:true});}
