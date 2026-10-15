import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'status-extinction-'));
try{
 await build({stdin:{contents:"export {GameRoom} from './server/src/gameRoom';export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/statusExtinction/catalog';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs',plugins:[{name:'status-boundary',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},async({path})=>({contents:await fs.readFile(path,'utf8')+'\nexport {makeCtx,loseStatus,gainShield,breakShield};',loader:'ts'}));}}]});
 const E=await import(dir+'/engine.mjs'),checks=[];
 const fresh=(cur=0)=>{const g=E.createGame({mode:'online',seed:73,starting:cur,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=4;g.cur=cur;g.phase='main';g.pending=null;for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],enchants:[],traps:[],quests:[],shield:0,brand:0,dew:0,hp:100,mana:30,maxMana:30,openingDrawReady:false});return g;};
 const extinct=ev=>ev.filter(e=>e.type==='statusExtinction');
 const mon=id=>({...E.DB[id],uid:id,atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false});
 for(const player of [0,1])for(const resource of ['shield','dew','brand']){
  const g=fresh(),p=g.players[player],ev=[],ctx=E.makeCtx(g,ev);p[resource]=8;
  E.loseStatus(ctx,p,resource,3);assert.equal(p[resource],5);assert.equal(extinct(ev).length,0);
  E.loseStatus(ctx,p,resource);E.loseStatus(ctx,p,resource);
  assert.deepEqual(extinct(ev),[{type:'statusExtinction',player,resource,before:5,after:0}]);checks.push('zero-edge-'+player+'-'+resource);
 }
 for(const owner of [0,1])for(const [id,resource,target] of [['ARMOR_BREAK','shield',1-owner],['DESERTIFICATION','dew',1-owner],['UNBRAND','brand',owner],['UNBRANDER','brand',owner],['PURGE_TOUCH','brand',owner]]){
  const g=fresh(owner);g.players[target][resource]=id==='UNBRANDER'?1:8;g.players[owner].hand=[{...E.DB[id],uid:'play'}];if(id==='PURGE_TOUCH')g.players[owner].discard=[{...E.DB.M1,uid:'purge-target'}];const r=E.reduce(g,{type:'play',idx:0});
  assert.equal(r.state.players[target][resource],0,id);assert.equal(g.players[target][resource],id==='UNBRANDER'?1:8,'input immutable');assert.deepEqual(extinct(r.events).map(e=>[e.player,e.resource]),[[target,resource]]);checks.push('card-'+owner+'-'+id);
 }
 {const g=fresh();g.players[0].brand=3;g.players[1].brand=4;g.players[0].hand=[{...E.DB.UNBRAND,uid:'clear'}];const r=E.reduce(g,{type:'play',idx:0});assert.deepEqual(extinct(r.events).map(e=>[e.player,e.before]),[[0,3],[1,4]]);checks.push('clear-both');}
 {const g=fresh(),p=g.players[1],ev=[],ctx=E.makeCtx(g,ev);p.shield=8;ctx.dealDamage(p,8,'test');assert.equal(p.hp,100);assert.equal(extinct(ev).length,1);ctx.dealDamage(p,2,'test');assert.equal(p.hp,98);assert.equal(extinct(ev).length,1);checks.push('shield-damage-no-double');}
 {const g=fresh(),p=g.players[1];p.shield=8;p.shieldExpiresTurn=4;const r=E.reduce(g,{type:'endTurn'});assert.equal(r.state.players[1].shield,0);assert.equal(extinct(r.events).filter(e=>e.resource==='shield').length,1);checks.push('shield-expiry');}
 {const g=fresh(),p=g.players[0],ev=[],ctx=E.makeCtx(g,ev);E.gainShield(g,ctx,p,8);E.breakShield(ctx,p);E.gainShield(g,ctx,p,2);assert.deepEqual(ev.filter(e=>e.type.startsWith('status')).map(e=>[e.type,e.before,e.after]),[['statusGrant',0,8],['statusExtinction',8,0],['statusGrant',0,2]]);checks.push('gain-clear-regain-order');}
 {const g=fresh();g.players[0].dew=4;g.players[0].hand=[{...E.DB.DARK_ELF,uid:'dark'}];const r=E.reduce(g,{type:'play',idx:0});assert.equal(extinct(r.events)[0].resource,'dew');assert.equal(r.state.players[0].dew,0);checks.push('dark-elf-payment');}
 {const g=fresh(),ev=[],p=g.players[1];p.dew=15;p.field=[mon('ELDER_ELF_KING')];E.makeCtx(g,ev).destroyMonster(p,p.field[0]);assert.equal(p.dew,0);assert.equal(extinct(ev).length,1);checks.push('elder-death-payment');}
 for(const reason of ['WORLD_TREE_ATTACK','WORLD_TREE_DEFEND']){
  const g=fresh(),owner=reason==='WORLD_TREE_ATTACK'?0:1;g.players[owner].dew=1;g.players[0].field=[mon('M1')];g.players[1].field=[mon('M2')];g.players[owner].field.push(mon('WORLD_TREE'));g.pending={kind:'cardChoice',reason,owner,allowCancel:false,data:{attackerUid:'M1',targetUid:'M2'}};
  const r=E.reduce(g,{type:'pick',uid:'grow'});assert.equal(r.state.players[owner].dew,0);assert(extinct(r.events).some(e=>e.resource==='dew'&&e.player===owner));checks.push(reason);
 }
 // The production Durable Object broadcasts each public zero edge to both viewers.
 class Socket{messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(message){this.messages.push(JSON.parse(message));}close(){}}
 const sockets=[new Socket(0),new Socket(1)];let saved;
 const storage={get:async()=>structuredClone(saved),put:async(_k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}};
 const state={storage,getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)},room=new E.GameRoom(state,rewardTestEnv());
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:73,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
 for(const owner of [0,1])for(const [id,resource,target] of [['ARMOR_BREAK','shield',1-owner],['DESERTIFICATION','dew',1-owner],['UNBRAND','brand',owner]]){
  const g=fresh(owner);g.players[target][resource]=8;g.players[owner].hand=[{...E.DB[id],uid:'network-source'}];room.room.game=g;
  await room.webSocketMessage(sockets[owner],JSON.stringify({type:'action',action:{type:'play',idx:0}}));
  for(const socket of sockets){const update=socket.messages.at(-1);assert.deepEqual(extinct(update.events),[{type:'statusExtinction',player:target,resource,before:8,after:0}]);assert.equal(update.state.players[target][resource],0);}
  checks.push('both-sockets-'+owner+'-'+resource);
 }
 const restored=new E.GameRoom(state,rewardTestEnv());await restored.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));assert.equal(extinct(sockets[0].messages.at(-1).events).length,0);checks.push('reconnect-does-not-replay');
 for(const [a,b,yes] of [[8,0,true],[8,5,false],[0,0,false],[0,8,false],[NaN,0,false]])assert.equal(E.isExtinction(a,b),yes);
 assert.deepEqual(['shield','dew','brand'].map(f=>E.approvedExtinction(f).id),['S1','D2','B2']);
 console.log(JSON.stringify({passed:true,checks},null,2));
}finally{await fs.rm(dir,{recursive:true,force:true});}
