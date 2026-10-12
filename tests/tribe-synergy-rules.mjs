import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-tribe-'));
try{
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {synergyFixture} from './client/src/dev/series-vfx-b/revision3/synergy-fixtures';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 const {createGame,reduce,DB,synergyFixture}=await import(dir+'/rules.mjs');
 let checks=0;
 for(const owner of [0,1])for(const pool of [['TSO1','TSO2'],['TPO2','TPO3'],['TAR1','TAR2'],['TDE1','TDE2'],['TGE1','TGE3']])for(const duplicate of [false,true]){
  const g=createGame({mode:'bot',seed:71,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.pending=null;g.turn=3;g.cur=owner;
  for(const p of g.players){p.mana=30;p.maxMana=30;p.field=[];p.enchants=[];p.traps=[];p.quests=[];p.hand=[];}
  const mon=(id,uid)=>({...DB[id],uid,cost:0,onSummon:undefined,summonReq:undefined,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
  g.players[owner].field=[mon(pool[0],'existing')];g.players[owner].hand=[mon(pool[duplicate?0:1],'arrival')];
  const r=reduce(g,{type:'play',idx:0}),events=r.events.filter(e=>e.type==='tribeSynergy');assert.equal(events.length,duplicate?0:1);
  if(!duplicate){assert.deepEqual(events[0],{type:'tribeSynergy',player:owner,tribe:DB[pool[0]].tribe,threshold:2,uids:['existing','arrival']});assert(r.events.findIndex(e=>e.type==='summon')<r.events.indexOf(events[0]));r.state.players[owner].hand=[mon(pool[1],'another')];assert.equal(reduce(r.state,{type:'play',idx:0}).events.filter(e=>e.type==='tribeSynergy').length,0);}
  checks++;
 }
 for(const owner of [0,1])for(const [cue,n] of [['A170',2],['A171',3],['A172',4],['A173',6]]){
  const f=synergyFixture(cue,'TGE6',owner),e=f.events.find(e=>e.type==='tribeSynergy'&&e.threshold===n);assert(e);assert.equal(e.player,owner);assert.equal(e.uids.length,n);assert.equal(f.events.some(e=>e.type==='win'&&e.winner===owner),n===6);if(n===6)assert(f.events.indexOf(e)<f.events.findIndex(e=>e.type==='win'));checks++;
 }
 console.log(`Tribe synergy: ${checks} engine fixtures passed (public participants, ordering, both owners, distinct cards, once per threshold, actual origin victory).`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
