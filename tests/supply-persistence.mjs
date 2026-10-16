import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const tmp=await mkdtemp(tmpdir()+'/lore-supply-');
try{
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs'});
 const {createGame,reduce,DB,redactFor}=await import(tmp+'/engine.mjs');
 const ids=g=>g.players.map(p=>p.supply.map(c=>c?.uid??null));
 for(const side of [0,1]){
  let g=createGame({mode:'bot',seed:71,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.opening=undefined;g.turn=5;g.pending=null;
  for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],openingDrawReady:false});
  g.players[side].supply[1]=null;
  const original=ids(g),history=g.players.map(p=>structuredClone(p.supplyHist));
  for(let turn=0;turn<6;turn++){g=reduce(g,{type:'endTurn'}).state;assert.deepEqual(ids(g),original,'both supplies and empty purchases survive each turn');assert.deepEqual(g.players.map(p=>p.supplyHist),history,'turn boundary is not a new offer history entry');}
  for(const viewer of [0,1])assert.deepEqual(ids(redactFor(g,viewer)),original,'server redaction preserves offer UIDs');
  g.players[side].mana=5;
  let r=reduce(g,{type:'refresh'}).state;assert.notDeepEqual(ids(r)[side],original[side]);assert.deepEqual(ids(r)[1-side],original[1-side]);assert.equal(r.players[side].mana,4);assert.equal(r.players[side].supply.filter(Boolean).length,3);
  g.players[side].mana=0;g.players[side].refreshTokens=1;r=reduce(g,{type:'refresh'}).state;assert.notDeepEqual(ids(r)[side],original[side]);assert.equal(r.players[side].refreshTokens,0);
  g.players[side].hand=[{...DB.S5,uid:'crash'}];g.players[side].mana=20;
  const cast=reduce(g,{type:'play',idx:0}).state;assert.deepEqual(ids(cast),original);
  const crash=reduce(cast,{type:'endTurn'}).state;assert.deepEqual(ids(crash)[1-side],[...original[1-side].slice(0,2),null],'Crash reduces slots without replacing surviving offers');assert.deepEqual(ids(reduce(crash,{type:'refresh'}).state),ids(crash),'refresh stays blocked');
 }
 console.log('PASS persistent offers: both sides, six turn boundaries, empty slots, history, redaction, paid/token refresh, delayed Crash with retained identities');
}finally{await rm(tmp,{recursive:true,force:true});}
