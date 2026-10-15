import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anesthesia-'));
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/anesthesia/state';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {createGame,reduce,DB,AnesthesiaState}=await import(dir+'/module.mjs');let checks=0;
 for(const side of [0,1])for(const count of [0,1,3,4]){
  const g=createGame({mode:'bot',seed:913,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=5;g.cur=side;g.phase='main';g.pending=null;
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],traps:[],enchants:[],quests:[],mana:20,maxMana:20,openingDrawReady:false});
  const p=g.players[side];p.field=Array.from({length:count},(_,i)=>({...DB.M1,uid:'m-'+i,dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0}));p.hand=[{...DB.ANESTHESIA,uid:'spell'}];
  const active=reduce(structuredClone(g),{type:'play',idx:0}).state;assert.equal(active.players[side].hand.length,0);
  const track=new AnesthesiaState();track.sync(g,0);assert.equal(track.entries.size,0);track.sync(active,10);assert.equal(track.entries.size,count);
  track.sync(structuredClone(active),400);assert([...track.entries.values()].every(e=>e.start===10),'ordinary rerender must not restart');
  const laterInput=structuredClone(active);laterInput.players[side].hand=[{...DB.M1,uid:'late-same-name'}];
  const later=reduce(laterInput,{type:'play',idx:0}).state;assert(later.players[side].field.some(m=>m.uid==='late-same-name'));track.sync(later,450);assert.equal(track.entries.size,count);assert(!track.entries.has('late-same-name'));
  const reconnect=new AnesthesiaState();reconnect.sync(later,500);assert.equal(reconnect.entries.size,count);
  const removed=structuredClone(later);removed.players[side].field=removed.players[side].field.filter(m=>m.uid!=='m-0');reconnect.sync(removed,510);assert(!reconnect.entries.has('m-0'));
  const end=reduce(structuredClone(later),{type:'endTurn'}).state;track.advance(end.turn,600);assert([...track.entries.values()].every(e=>e.end===600));track.sync(active,650);assert([...track.entries.values()].every(e=>e.end===600),'stale playback may not reactivate');
  track.sync(end,680);track.prune(1019);assert.equal(track.entries.size,count);track.prune(1020);assert.equal(track.entries.size,0);
  reconnect.clear();assert.equal(reconnect.entries.size,0);checks++;
 }
 console.log(JSON.stringify({passed:true,checks,coverage:'both owners x 0/1/3/4; cast snapshot; same-name late summon; rerender; reconnect; departure; turn expiry; stale playback; dispose'}));
}finally{await fs.rm(dir,{recursive:true,force:true});}
