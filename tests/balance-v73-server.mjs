import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-v73-server-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export {GameRoom} from './server/src/gameRoom';export {DB,STARTERS,BALANCE_VERSION} from './client/src/shared/cards';export {createGame} from './client/src/shared/engine';export {OPENING_VERSION} from './client/src/shared/opening';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/room.mjs'});
 const {GameRoom,DB,STARTERS,createGame,OPENING_VERSION}=await import(dir+'/room.mjs');let saved,seq=0;
 class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return{side:this.side,gen:0};}send(s){this.messages.push(JSON.parse(s));}close(){}}
 const sockets=[new Socket(0),new Socket(1)];
 const state={id:{toString:()=> 'v73-server'},storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 const env=rewardTestEnv();let room=new GameRoom(journalState(state),env);
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready',openingVersion:OPENING_VERSION}));
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'server-v73-'+(++seq)});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,maxMana:20,mana:20,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[]});return g;};
 const send=(owner,action)=>room.webSocketMessage(sockets[owner],JSON.stringify({type:'action',action}));
 const setup=g=>{room.room.game=g;room.room.opening=undefined;room.room.readied=[true,true];room.room.turnStartAt=Date.now()-1;};

 let g=fresh();g.players[0].field=[mon('WINE_COLLECTOR')];g.players[0].hand=[card('GRAPE')];setup(g);
 await send(1,{type:'play',idx:0});assert.equal(room.room.game.players[0].discard.length,0,'opponent cannot submit owner play');
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].discard.filter(c=>c.id==='GRAPE2').length,1);
 room=new GameRoom(journalState(state),env);await room.restore();assert.equal(room.room.game.players[0].discard.filter(c=>c.id==='GRAPE2').length,1);
 await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].discard.filter(c=>c.id==='GRAPE2').length,1,'repeating a spent hand slot does not grant again');
 room.room.game.players[1].hand=[card('GRAPE')];await send(0,{type:'endTurn'});
 const idx=room.room.game.players[1].hand.findIndex(c=>c.id==='GRAPE');await send(1,{type:'play',idx});
 assert.equal(room.room.game.players[1].discard.filter(c=>c.id==='GRAPE2').length,1);
 for(const socket of sockets){const view=socket.messages.filter(m=>m.state).at(-1).state;assert.equal(view.players[1].discard.filter(c=>c.id==='GRAPE2').length,1);}

 g=fresh();g.players[0].hand=[card('TSO1')];setup(g);await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].summonLockUntil,7);
 room=new GameRoom(journalState(state),env);await room.restore();assert.equal(room.room.game.players[0].summonLockUntil,7);
 g=fresh();g.players[0].hand=[card('TPO5')];g.players[1].field=[mon('M1',{cost:3,atk:3,def:10,dmg:9}),mon('M1',{cost:4,atk:3,def:5})];const wounded=g.players[1].field[0].uid;setup(g);
 await send(0,{type:'play',idx:0});assert.deepEqual(room.room.game.players[1].field.map(m=>m.uid),[wounded]);
 g=fresh();g.players[0].hand=[card('ELITE')];setup(g);await send(0,{type:'play',idx:0});assert.equal(room.room.game.players[0].field.filter(c=>c.id==='SOLDIER2').length,1);
 console.log('PASS v73 server: both players, authorization, restore, repeat handling, client views, four-turn lock, current-HP targeting and one Soldier');
}finally{await rm(dir,{recursive:true,force:true});}
