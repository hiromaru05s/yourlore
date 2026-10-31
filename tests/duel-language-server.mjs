import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-language-room-');
try{
 await build({stdin:{contents:'export {GameRoom} from "./server/src/gameRoom";export * from "./client/src/shared/engine";export {DB} from "./client/src/shared/cards";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs',logLevel:'silent'});
 const {GameRoom,createGame,DB}=await import(dir+'/room.mjs');let saved;
 class Socket{messages=[];constructor(side){this.side=side;}deserializeAttachment(){return{side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 const sockets=[new Socket(0),new Socket(1)],storage={get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}};
 const state={storage,getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 let room=new GameRoom(journalState(state),rewardTestEnv());await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
 for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
 let seq=0;const card=id=>({...DB[id],uid:'room-lang-'+(++seq)});
 const fresh=()=>{const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hand:[],deck:[],field:[],enchants:[],traps:[],quests:[],dew:5,shield:0,hp:100,mana:12,maxMana:12});return g;};
 let g=fresh();g.players[0].hand=[card('APPRENTICE_ARMORER')];room.room.game=g;await send(0,{type:'play',idx:0});assert.equal(room.room.game.pending.reason,'ARMORER_MODE');
 room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));assert.equal(room.room.game.pending.reason,'ARMORER_MODE');await send(1,{type:'pick',uid:'shield'});assert(room.room.game.pending);await send(0,{type:'pick',uid:'shield'});assert.equal(room.room.game.players[0].shield,4);
 for(const owner of [0,1]){g=fresh();g.cur=1-owner;const rich=card('RICH_HABIT');g.players[owner].enchants=[{card:rich,turns:99,bornTurn:0}];g.players[1-owner].hand=[card('DISARM1')];room.room.game=g;
  await send(1-owner,{type:'play',idx:0});await send(owner,{type:'pick',uid:rich.uid});assert(room.room.game.pending,'opponent cannot resolve someone else’s choice');
  await send(1-owner,{type:'pick',uid:rich.uid});assert.equal(room.room.game.players[owner].maxMana,3);
  for(const socket of sockets){const message=socket.messages.at(-1);assert.equal(message.state.players[owner].maxMana,3);assert(message.events.some(e=>e.type==='log'&&e.htmlEn?.includes('set your max mana to 3')),'authored English survives server broadcast');}
  room=new GameRoom(journalState(state),rewardTestEnv());await room.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));assert.equal(room.room.game.players[owner].maxMana,3,'mana persists through hibernation');
 }
 console.log('PASS GameRoom: authoritative choices, Armorer reconnect, Rich Habit both owners, 3-language logs, persisted mana');
}finally{await rm(dir,{recursive:true,force:true});}
