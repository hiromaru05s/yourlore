import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-pact-');
try {
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {createGame,reduce,DB,redactFor}=await import(dir+'/test.mjs');let checks=0;
 const setup=(owner,turn=44,fired=false,copies=1)=>{const g=createGame({mode:'online',seed:71,starting:1-owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=turn;g.opening=undefined;g.pending=null;for(const p of g.players){p.openingDrawReady=false;p.hand=[];p.field=[];p.enchants=[];p.traps=[];p.quests=[];p.hp=32;}g.players[owner].tribesFired=fired?['origin2']:[];g.players[owner].enchants=Array.from({length:copies},(_,i)=>({card:{...DB.TRIBE_PACT,uid:'pact-'+i},turns:99,bornTurn:2}));return g;};
 for(const owner of [0,1])for(const turn of [43,44,45])for(const fired of [false,true]){
  const before=setup(owner,turn,fired),r=reduce(before,{type:'endTurn'}),shouldLose=turn>=44&&!fired;
  assert.equal(r.state.over,shouldLose);assert.equal(r.events.filter(e=>e.type==='win').length,shouldLose?1:0);
  assert.equal(Boolean(r.state.defeatCause),shouldLose);assert.equal(before.defeatCause,undefined,'input remains immutable');
  if(shouldLose){const win=r.events.find(e=>e.type==='win');assert.equal(win.winner,1-owner);assert.deepEqual(win.cause,{kind:'tribePact',player:owner,uid:'pact-0',turn:turn+1});assert.deepEqual(win.cause,r.state.defeatCause);assert.equal(r.state.players[owner].hp,32,'contract is not HP damage');for(const viewer of [0,1]){assert.deepEqual(redactFor(r.state,viewer).defeatCause,win.cause);}assert.deepEqual(JSON.parse(JSON.stringify(r.state)).defeatCause,win.cause);}
  checks++;
 }
 for(const owner of [0,1]){let r=reduce(setup(owner,44,false,2),{type:'endTurn'});assert.equal(r.events.filter(e=>e.type==='win').length,1);assert.equal(r.state.defeatCause.uid,'pact-0');r=reduce(setup(owner),{type:'surrender',player:owner});assert.equal(r.state.defeatCause,undefined);assert.equal(r.events.find(e=>e.type==='win').cause,undefined);const otherTurn=setup(owner);otherTurn.cur=owner;r=reduce(otherTurn,{type:'endTurn'});assert.equal(r.state.defeatCause,undefined);checks+=3;}
 console.log(`PASS: ${checks} pact expiry fixtures; both owners, deadline, completed synergy, duplicate pacts, non-owner turn, surrender, public protocol, persistence, HP preserved.`);
}finally{await rm(dir,{recursive:true,force:true});}
