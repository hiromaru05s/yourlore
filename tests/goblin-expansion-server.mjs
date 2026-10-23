import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-goblin-room-');
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
 g.players[0].enchants=[{card:card('RELIC_BOUNTY'),turns:99,bornTurn:1}];g.players[0].field=[mon('GOBLIN')];
 g.players[0].hand=[card('GOBLIN_LEADER'),card('RELIC_PROTECTION')];room.room.game=g;
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[1].hp,98);
 for(const s of sockets)assert.equal(s.messages.at(-1).state.players[1].hp,98);
 assert.equal(sockets[1].messages.at(-1).state.players[0].hand[0].id,'HIDDEN');
 await send(0,{type:'play',idx:0});
 for(const s of sockets){const ev=s.messages.at(-1).events.find(e=>e.type==='statusGrant'&&e.resource==='shield');assert.equal(ev.after,1);}
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
 assert.equal(room.room.game.players[0].shieldRetainTurn,4);
 await send(0,{type:'endTurn'});await send(1,{type:'endTurn'});assert.equal(room.room.game.players[0].shield,1);assert.equal(room.room.game.players[0].shieldRetainTurn,undefined);
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready'}));
 await send(0,{type:'endTurn'});await send(1,{type:'endTurn'});assert.equal(room.room.game.players[0].shield,0);
 console.log('PASS authoritative room: both sockets, private hand, summon damage, Shield grant, hibernation, one-expiry retention');
} finally {await rm(dir,{recursive:true,force:true});}
