import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-healing-');
try {
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const {createGame,reduce,DB,STARTERS,curHp}=await import(dir+'/core.mjs');let seq=0;
 const card=id=>({...DB[id]??STARTERS[id],uid:'healing-'+seq++});
 const mon=(dmg=0,extra={})=>({...card('M4'),def:20,dmg,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=(owner=0)=>{const g=createGame({mode:'online',seed:42,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=3;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],quests:[],traps:[],removed:[],hp:40,mana:20,maxMana:20,dew:0,shield:0,openingDrawReady:false});return g;};
 for(const owner of [0,1]){
  const g=fresh(owner);g.players[owner].hand=[card('S14')];
  g.players[owner].field=[mon(9),mon(0),mon(2,{hatch:2,dur:3})];g.players[1-owner].field=[mon(10)];
  const r=reduce(g,{type:'play',idx:0}),heals=r.events.filter(e=>e.type==='monsterHeal');
  assert.equal(heals.length,2);assert.deepEqual(heals.map(e=>e.amount).sort((a,b)=>a-b),[9,10]);
  for(const e of heals){const before=g.players[e.player].field.find(m=>m.uid===e.uid),after=r.state.players[e.player].field.find(m=>m.uid===e.uid);assert.equal(e.hp,curHp(r.state.players[e.player],after));assert.equal(e.amount,e.hp-curHp(g.players[e.player],before));assert.equal(after.dmg,0);}
  assert.equal(r.state.players[owner].field[2].dmg,2);assert.equal(r.state.players[owner].hp,40);
  const again=structuredClone(r.state);again.players[owner].hand=[card('S14')];assert.equal(reduce(again,{type:'play',idx:0}).events.filter(e=>e.type==='monsterHeal').length,0);
 }
 for(const owner of [0,1]){
  let g=fresh(1-owner);g.players[owner].enchants=[{card:card('COLOSSEUM_REST'),turns:99,bornTurn:0}];g.players[owner].field=[mon(8),mon(2)];g.players[owner].removed=Array.from({length:10},()=>card('STARTER_TRASH'));
  g=reduce(g,{type:'endTurn'}).state;assert.equal(g.pending.reason,'COLOSSEUM_REST');const uid=g.players[owner].field[0].uid;
  assert.equal(reduce(g,{type:'pick',uid:'missing'}).events.filter(e=>e.type==='monsterHeal').length,0);
  const r=reduce(g,{type:'pick',uid}),heals=r.events.filter(e=>e.type==='monsterHeal');assert.equal(heals.length,1);assert.deepEqual(heals[0],{type:'monsterHeal',player:owner,uid,amount:8,hp:20});assert.equal(r.state.players[owner].field[1].dmg,2);
 }
 console.log('PASS recovery events: both fields, exact restored HP, healthy/egg exclusions, repeated recovery, Colosseum choice and invalid target');
}finally{await rm(dir,{recursive:true,force:true});}
