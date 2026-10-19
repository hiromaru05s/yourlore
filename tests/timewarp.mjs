import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/timewarp-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {createGame,reduce,DB,redactFor}=await import(dir+'/test.mjs');
 const fresh=(seed=1,side=0)=>{const g=createGame({mode:'online',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=7;g.cur=side;g.phase='main';g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:99,maxMana:99,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],skipTurns:0,skipNext:false,skipTurnSources:[],openingDrawReady:false});return g;};
 const play=(g,id='TIMEWARP')=>{g.players[g.cur].hand=[{...DB[id],uid:'cast-'+id}];return reduce(g,{type:'play',idx:0});};
 const end=g=>{g.players[g.cur].hand=[];return reduce(g,{type:'endTurn'});};
 let successState;const faces=new Set();
 for(let seed=1;seed<150&&faces.size<12;seed++)for(const side of [0,1]){
  const before=fresh(seed,side),r=play(before),dice=r.events.filter(e=>e.type==='dice'&&e.source.id==='TIMEWARP');assert.equal(dice.length,1);const success=dice[0].rolls[0]>=4;faces.add(side+':'+dice[0].rolls[0]);
  assert.equal(r.state.cur,side);assert.equal(r.state.turn,7);assert.equal(r.state.players[1-side].skipTurns,success?1:0);
  const events=r.events.filter(e=>e.type==='timewarp');assert.equal(events.length,success?1:0);
  if(success){assert(r.events.indexOf(events[0])>r.events.indexOf(dice[0]));assert.equal(events[0].sourceUid,'cast-TIMEWARP');if(side===0)successState=structuredClone(r.state);}
  for(const viewer of [0,1])assert.deepEqual(redactFor(r.state,viewer).players[1-side].skipTurnSources,success?['TIMEWARP']:[]);
  const ended=end(r.state),skips=ended.events.filter(e=>e.type==='turnSkipped');assert.equal(skips.length,success?1:0);assert.equal(ended.state.cur,success?side:1-side);assert.equal(ended.state.turn,success?9:8);
  if(success){assert.deepEqual(skips[0],{type:'turnSkipped',player:1-side,source:'TIMEWARP',remaining:0});assert(ended.events.indexOf(skips[0])<ended.events.findIndex(e=>e.type==='turnHeader'&&e.turn===ended.state.turn));}
 }
 assert.equal(faces.size,12);
 // FIFO mixed sources keep Nova's reserved skip separate from the selected hourglass.
 for(const order of [['TIMEWARP','BLACK_NOVA'],['BLACK_NOVA','TIMEWARP']]){
  const g=structuredClone(successState);g.players[1].skipTurns=2;g.players[1].skipTurnSources=[...order];let r=end(g);assert.equal(r.events.find(e=>e.type==='turnSkipped').source,order[0]);assert.equal(r.state.players[1].skipTurns,1);r=end(r.state);assert.equal(r.events.find(e=>e.type==='turnSkipped').source,order[1]);assert.equal(r.state.players[1].skipTurns,0);
 }
 {const g=fresh();g.players[1].skipTurns=2;delete g.players[1].skipTurnSources;const r=play(g,'BLACK_NOVA');assert.deepEqual(r.state.players[1].skipTurnSources,[null,null,'BLACK_NOVA']);assert.equal(end(r.state).events.find(e=>e.type==='turnSkipped').source,undefined);}
 {const g=fresh();g.players[1].skipNext=true;const r=end(g);assert.equal(r.events.find(e=>e.type==='turnSkipped').source,undefined);assert.equal(r.state.players[1].skipTurns,0);}
 {const g=fresh();g.players[1].traps=[{card:{id:'legacy-null',uid:'null',t:'trap',cost:0,react:'nullspell',name:'Null'}}];const r=play(g);assert(!r.events.some(e=>e.type==='timewarp'||e.type==='dice'));assert.equal(r.state.players[1].skipTurns,0);}
 // Fate Wheel restores the reservation and provenance together, never stacking rejected rolls.
 {const g=fresh();g.players[0].enchants=[{card:{...DB.FATE_WHEEL,uid:'wheel'},turns:99,bornTurn:1}];const r=play(g);assert.equal(r.state.pending?.kind,'reroll');const again=reduce(r.state,{type:'pick',uid:'re'});const success=again.events.find(e=>e.type==='dice'&&e.source.id==='TIMEWARP').success;assert.equal(again.state.players[1].skipTurns,success?1:0);assert.deepEqual(again.state.players[1].skipTurnSources,success?['TIMEWARP']:[]);}
 console.log('PASS Timewarp: six dice faces × both sides, event order, manual end, FIFO / Nova isolation, redaction, legacy skips, nullification, reroll rollback');
}finally{await rm(dir,{recursive:true,force:true});}
