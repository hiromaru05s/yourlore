import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const tmp=await mkdtemp(tmpdir()+'/lore-supply-');
try{
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';export {observationSample} from './client/src/shared/botObservation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs'});
 const {createGame,reduce,DB,redactFor,observationSample}=await import(tmp+'/engine.mjs');
 const ids=g=>g.players.map(p=>p.supply.map(c=>c?.uid??null));
 const wire=g=>JSON.parse(JSON.stringify(g));
 const shared=g=>assert.deepEqual(g.players[0].supply,g.players[1].supply,'one shared public row');
 for(const mode of ['bot','online'])for(const side of [0,1]){
  let g=createGame({mode,seed:71,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  shared(g);g.opening=undefined;g.turn=5;g.pending=null;
  for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],openingDrawReady:false});
  const original=ids(g),history=structuredClone(g.players.map(p=>p.supplyHist));
  for(let turn=0;turn<6;turn++){g=reduce(wire(g),{type:'endTurn'}).state;shared(g);assert.deepEqual(ids(g),original,'unsold cards persist across either turn');assert.deepEqual(g.players.map(p=>p.supplyHist),history);}
  for(const viewer of [0,1]){const publicState=redactFor(g,viewer);shared(publicState);assert.deepEqual(publicState.players[viewer].supply,g.players[side].supply);shared(observationSample(g,viewer,17));}
  // Purchase a real, affordable normal card; the other two exact instances survive.
  for(const p of g.players){p.supply[1]={...DB.M1,uid:'purchase-offer'};p.mana=20;}
  const before=ids(g)[side];const bought=reduce(wire(g),{type:'buySupply',i:1}).state;
  shared(bought);assert.deepEqual(ids(bought)[side],[before[0],null,before[2]]);
  assert(bought.players[side].discard.some(c=>c.id==='M1'));
  const repeat=reduce(wire(bought),{type:'buySupply',i:1}).state;
  assert.equal(repeat.players[side].boughtCount,bought.players[side].boughtCount,'cannot buy an empty shared slot');
  const next=reduce(wire(bought),{type:'endTurn'}).state;shared(next);assert.equal(next.cur,1-side);
  assert.equal(ids(next)[side][0],before[0]);assert.equal(ids(next)[side][2],before[2]);assert(ids(next)[side][1]);assert.notEqual(ids(next)[side][1],before[1]);
  const row=next.players[next.cur].supply;assert.equal(new Set(row.map(c=>c.id)).size,3);assert(row.every(c=>!next.market.some(m=>m.id===c.id)));
  const nextBuy=reduce(wire(next),{type:'buySupply',i:1}).state;shared(nextBuy);assert.equal(nextBuy.players[side].supply[1],null,'opponent purchases the same replenished offer');
  g.players[side].mana=5;let r=reduce(wire(g),{type:'refresh'}).state;shared(r);assert.notDeepEqual(ids(r)[side],before);assert.equal(r.players[side].mana,4);
  g.players[side].mana=0;g.players[side].refreshTokens=1;r=reduce(wire(g),{type:'refresh'}).state;shared(r);assert.equal(r.players[side].refreshTokens,0);assert.equal(r.players[side].mana,0);
  g.players[side].hand=[{...DB.S5,uid:'crash'}];g.players[side].mana=20;
  const cast=reduce(wire(g),{type:'play',idx:0}).state;shared(cast);assert.deepEqual(ids(cast)[side],before);
  const crash=reduce(wire(cast),{type:'endTurn'}).state;shared(crash);assert.deepEqual(ids(crash)[side],[...before.slice(0,2),null]);
  assert.deepEqual(ids(reduce(wire(crash),{type:'refresh'}).state),ids(crash));
  const recovered=reduce(wire(crash),{type:'endTurn'}).state;shared(recovered);assert.equal(recovered.players[side].supply.filter(Boolean).length,3);assert.deepEqual(ids(recovered)[side].slice(0,2),before.slice(0,2));
  // An existing room with private rows adopts only the currently visible row.
  const legacy=wire(g);legacy.players[1-side].supply=[{...DB.M2,uid:'old-private'},null,null];
  for(const viewer of [0,1]){const publicState=redactFor(legacy,viewer);shared(publicState);assert.deepEqual(ids(publicState)[viewer],before);}
  const migrated=reduce(legacy,{type:'endTurn'}).state;shared(migrated);assert.deepEqual(ids(migrated)[side],before);
 }
 console.log('PASS shared offers: both sides, bot/online, JSON reload, persistence, purchase/refill, public redaction, bot observations, paid/token refresh, delayed Crash/recovery, legacy rooms');
}finally{await rm(tmp,{recursive:true,force:true});}
