import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/rebirth-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {createGame,reduce,DB}=await import(dir+'/engine.mjs');let count=0;
 for(const side of [0,1])for(const cost of [2,7,8])for(const blocked of [false,true])for(const alreadyVoid of [false,true]){
  const g=createGame({mode:'bot',seed:89,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  Object.assign(g,{phase:'main',cur:side,turn:3,pending:null});
  const p=g.players[side];Object.assign(p,{openingDrawReady:false,mana:7,maxMana:12,field:[],enchants:[],hand:[],removed:[],summonLockUntil:blocked?10:undefined,discard:[{...DB.M4,cost,uid:'selected',passive:alreadyVoid?['void']:[]}],supply:[{...DB.QUICK_REBIRTH,uid:'purchase'}]});
  const bought=reduce(g,{type:'buySupply',i:0});assert.equal(bought.state.pending?.reason,'QUICK_REBIRTH');assert.equal(bought.state.players[side].mana,4);assert.equal(bought.state.players[side].hand.length,0);assert.equal(bought.state.players[side].removed[0].id,'QUICK_REBIRTH');
  const invalid=reduce(bought.state,{type:'pick',uid:'wrong'});assert.equal(invalid.state.pending?.reason,'QUICK_REBIRTH');assert.equal(invalid.events.filter(e=>e.type==='summon').length,0);
  const r=reduce(bought.state,{type:'pick',uid:'selected'}),next=r.state.players[side],success=cost<=7&&!blocked,arrivals=r.events.filter(e=>e.type==='summon');
  assert.equal(next.field.some(m=>m.uid==='selected'),success);assert.equal(next.discard.some(m=>m.uid==='selected'),!success);assert.equal(arrivals.length,success?1:0);
  if(success){assert.equal(next.field[0].passive.filter(x=>x==='void').length,1);assert.equal(arrivals[0].rebirth.card.uid,'selected');assert.equal(arrivals[0].rebirth.card.id,'M4');assert.equal(arrivals[0].rebirth.card.passive.includes('void'),alreadyVoid);assert.equal(r.events.filter(e=>e.type==='voidGrant').length,0);}
  count++;
 }
 console.log(`PASS rebirth: ${count} purchase/choice cases, both owners, original UID, cost boundaries, summon lock, invalid choice, exactly one arrival, no duplicate Void grant`);
}finally{await rm(dir,{recursive:true,force:true});}
