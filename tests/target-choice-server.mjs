import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-target-room-');
try{
 await build({stdin:{contents:`export {GameRoom} from './server/src/gameRoom';export {createGame} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/e.mjs'});
 const {GameRoom,createGame,DB,STARTERS}=await import(dir+'/e.mjs');let saved,seq=0;
 class Socket{messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
 const sockets=[new Socket(0),new Socket(1)];const state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
 const room=new GameRoom(state,{});await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:22,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'room-'+(++seq)});const mon=id=>({...card(id),tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
 const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;
 for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[]});
 const sword=card('SELECTED_SWORD'),target=mon('M1');g.players[0].hand=[sword];g.players[0].removed=Array.from({length:4},()=>card('STARTER_TRASH'));g.players[1].field=[target];g.players[1].hand=[card('M2')];room.room.game=g;
 const send=(r,side,action)=>r.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
 const action={type:'play',idx:0,sourceUid:sword.uid,targets:[target.uid]};
 await send(room,1,action);assert.equal(room.room.game.players[0].mana,30,'opponent cannot commit owner cast');
 await send(room,0,{...action,sourceUid:'old-card'});assert.equal(room.room.game.players[0].mana,30);
 await send(room,0,{...action,targets:['bad']});assert.equal(room.room.game.players[0].mana,30);
 await send(room,0,action);assert.equal(room.room.game.players[0].mana,29);assert.equal(room.room.game.players[1].field[0].tempAtk,4);assert.equal(room.room.game.pending,null);assert.equal(sockets[0].messages.at(-1).state.players[1].hand[0].id,'HIDDEN');
 const restored=new GameRoom(state,{});await restored.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));assert.equal(restored.room.game.players[1].field[0].tempAtk,4);
 await send(restored,0,{type:'endTurn'});assert.equal(restored.room.game.players[1].field[0].tempAtk,0);
 console.log('PASS authoritative sockets: wrong owner / stale card / invalid target rejection, atomic sword cast, private hand redaction, hibernation and exact buff expiry');
}finally{await rm(dir,{recursive:true,force:true});}
