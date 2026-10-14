import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/creation-test-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {createGame,reduce,DB,STARTERS,redactFor}=await import(dir+'/engine.mjs');let n=0;
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'creation-test-'+n++});
 for(const player of [0,1])for(const before of [8,9,10])for(const copiedId of ['ELF','CREATION']){
  const g=createGame({mode:'online',seed:17,starting:player,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:28,maxHp:30,mana:20,maxMana:20,uses:{},usesTurn:{},openingDrawReady:false});g.cur=player;g.phase='main';g.pending=null;g.turn=3;
  const source=card('CREATION'),drawn=card('STARTER_CHEST'),original=card(copiedId),other=card('VAMP2');
  g.players[player].hand=[source];g.players[player].deck=[drawn];g.players[player].removed=Array.from({length:before},()=>card('CREATION'));g.players[1-player].deck=[original,other];
  const res=reduce(g,{type:'play',idx:0}),after=res.state,p=after.players[player],born=res.events.filter(e=>e.type==='creationBorn');
  assert.equal(born.length,1);assert.deepEqual(born[0],{type:'creationBorn',player,id:'CREATION',uid:p.discard[0].uid,sourceUid:source.uid,copy:false});
  assert.notEqual(born[0].uid,source.uid);assert(p.removed.some(c=>c.uid===source.uid));assert.equal(p.removed.length,before+1);assert.equal(p.hand[0].uid,drawn.uid);assert.equal(p.hp,29);assert.equal(after.pending?.reason==='CREATION',before>=9);
  for(const you of [0,1]){const visible=redactFor(after,you);assert(visible.players[player].discard.some(c=>c.uid===born[0].uid));}
  if(before>=9){
   const pick=reduce(after,{type:'pick',uid:original.uid}),copy=pick.events.filter(e=>e.type==='creationBorn');assert.equal(copy.length,1);assert.equal(copy[0].copy,true);assert.equal(copy[0].id,copiedId);assert.notEqual(copy[0].uid,original.uid);assert.notEqual(copy[0].uid,born[0].uid);assert(!('sourceUid' in copy[0]),'never leak the selected hidden physical UID');
   assert.deepEqual(pick.state.players[1-player].deck,after.players[1-player].deck);assert.equal(pick.state.players[player].discard.length,2);
   const again=reduce(pick.state,{type:'pick',uid:original.uid});assert(!again.events.some(e=>e.type==='creationBorn'),'a stale repeated pick cannot generate twice');
  }
 }
 console.log('PASS creation: 12 real reducer cases, threshold 8/9/10, both owners, same-name copy, original UID retained, single birth, draw/heal, redacted public copy and stale-pick rejection');
}finally{await rm(dir,{recursive:true,force:true});}
