import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-infinity-');
try{
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {createGame,reduce,DB,STARTERS,redactFor}=await import(dir+'/engine.mjs');
 const fresh=side=>{const g=createGame({mode:'online',seed:34,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;Object.assign(g,{pending:null,turn:5,cur:side,phase:'main',opening:undefined});for(const p of g.players)Object.assign(p,{openingDrawReady:false,hp:28,maxHp:28,mana:20,maxMana:20,enchants:[],traps:[],quests:[],field:[],removed:[],hand:[],deck:[],discard:[],brand:0});g.players[1-side].enchants=[{card:{...DB.BLACK_INFINITY,uid:'infinity'},turns:6}];return g;};
 const hit=(g,amount)=>{g.players[g.cur].hand=[{...DB.FIRE_BALL,id:'INFINITY_TEST_DAMAGE',act:'dmg',uid:'hit-'+g.seq,val:amount,cost:0}];return reduce(g,{type:'play',idx:0});};
 for(const side of [0,1])for(const amount of [0,1,3,5,8,12,50]){
  const r=hit(fresh(side),amount),owner=1-side,p=r.state.players[owner];assert.equal(p.hp,28);assert.equal(p.removed.length,amount);assert(p.removed.every(c=>c.id==='STARTER_TRASH'));assert.equal(new Set(p.removed.map(c=>c.uid)).size,amount);
  assert.equal(r.events.filter(e=>e.type==='infinityStored').length,amount?1:0);assert(!r.events.some(e=>e.type==='infinityRelease'));
  assert.deepEqual(r.events.find(e=>e.type==='infinityStored')?.cardUids??[],p.removed.map(c=>c.uid));
  for(const viewer of [0,1])assert.deepEqual(redactFor(r.state,viewer).players[owner].infinityPresentation,p.infinityPresentation);
  const end=reduce(JSON.parse(JSON.stringify(r.state)),{type:'endTurn'}),release=end.events.filter(e=>e.type==='infinityRelease');assert.equal(release.length,amount?1:0);if(amount){assert.equal(release[0].amount,amount);assert.equal(release[0].player,owner);assert.equal(release[0].sourceUid,'infinity');assert(end.events.indexOf(release[0])<end.events.findIndex(e=>e.type==='turnHeader'));}
  assert.equal(end.state.players[owner].removed.length,amount);assert.equal(end.state.players[owner].infinityPresentation,undefined);
  assert(!reduce(end.state,{type:'endTurn'}).events.some(e=>e.type==='infinityRelease'));
 }
 let g=hit(fresh(0),3).state;g=hit(g,5).state;assert.equal(g.players[1].infinityPresentation[0].amount,8);
 // Source expiry/removal must not lose an already-earned resource or duplicate it.
 g.players[1].enchants=[];g.players[0].hand=Array.from({length:9},(_,i)=>({...STARTERS.STARTER_MANA,uid:'overflow-'+i}));const blocked=reduce(g,{type:'endTurn'});assert.equal(blocked.state.pending?.reason,'handCap');assert(!blocked.events.some(e=>e.type==='infinityRelease'));assert.equal(blocked.state.players[1].infinityPresentation[0].amount,8);
 const forced=reduce(blocked.state,{type:'endTurn'});assert.equal(forced.events.find(e=>e.type==='infinityRelease').amount,8);assert.equal(forced.state.players[1].removed.length,8);
 // No Infinity or damage zero: no presentation metadata.
 const normal=fresh(0);normal.players[1].enchants=[];assert(!hit(normal,3).events.some(e=>e.type==='infinityStored'));
 console.log('PASS Infinity: 14 damage/side cases, immediate resources, deferred exact batches, JSON/redaction, hand-cap delay, removed source, no replay');
}finally{await rm(dir,{recursive:true,force:true});}
