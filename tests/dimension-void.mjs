import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/dimension-void-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {createGame,reduce,DB,hasPassive}=await import(dir+'/engine.mjs');
 const mon=(id,uid,extra={})=>({...structuredClone(DB[id]),uid,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0,...extra});
 for(const player of [0,1])for(const count of [0,2,7]){
  let g=createGame({mode:'bot',seed:42,starting:player,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;Object.assign(g,{turn:3,cur:player,phase:'main',pending:null});
  for(const [side,p]of g.players.entries())Object.assign(p,{field:Array.from({length:count},(_,i)=>mon(i===1?'DRAGON_EGG':i===2?'VAMP2':'M1',`${side}-${i}`,i===1?{hatch:3,dur:5}:i===3?{passivesG:['void']}:{token:false})),hand:[],deck:[],discard:[],removed:[],enchants:[],quests:[],traps:[],hp:28,mana:20,maxMana:20,openingDrawReady:false});
  g.players[player].hand=[{...DB.VOID_RITE,uid:'rite'},{...DB.VOID_RITE,uid:'again'}];
  const targets=g.players.flatMap(p=>p.field.filter(m=>m.hatch==null&&!hasPassive(m,'void')).map(m=>m.uid));
  const result=reduce(g,{type:'play',idx:0}),grant=result.events.filter(e=>e.type==='voidGrant');
  assert.equal(grant.length,targets.length?1:0);if(targets.length){assert.deepEqual(grant[0],{type:'voidGrant',player,uids:targets});assert(result.events.findIndex(e=>e.type==='playSpell')<result.events.findIndex(e=>e.type==='voidGrant'));}
  for(const p of result.state.players)for(const m of p.field)assert.equal(hasPassive(m,'void'),m.hatch==null);
  const repeat=reduce(result.state,{type:'play',idx:0});assert.equal(repeat.events.filter(e=>e.type==='voidGrant').length,0);
  // A later lethal attack uses existing owner Rift semantics; the grant itself removes nothing.
  assert.deepEqual(result.state.players.map(p=>p.field.length),[count,count]);assert(result.state.players.every(p=>p.removed.length===0));
  if(targets.length){
   g=structuredClone(result.state);g.cur=player;g.pending=null;
   const attacker=mon('ELF','attacker',{atk:100,def:100,passive:[],passivesG:[],exhausted:false});const defender=g.players[1-player].field.find(m=>targets.includes(m.uid));
   g.players[player].field=[attacker];g.players[1-player].field=[defender];
   let hit=reduce(g,{type:'attack',uid:attacker.uid});if(hit.state.pending)hit=reduce(hit.state,{type:'chooseTarget',uid:defender.uid});
   assert(hit.state.players[1-player].removed.some(m=>m.uid===defender.uid),'granted monster goes to its owner Rift');assert(!hit.state.players[1-player].discard.some(m=>m.uid===defender.uid));
  }
 }
 console.log('PASS dimension void: both casters, empty/mixed/full fields, egg/native/granted exclusion, one ordered batch, no repeat, later owner Rift exit');
}finally{await rm(dir,{recursive:true,force:true});}
