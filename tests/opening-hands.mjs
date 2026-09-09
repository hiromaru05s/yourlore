import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-opening-'));
try{
await build({stdin:{contents:"export * from './client/src/shared/engine'; export * from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
const {createGame,reduce,redactFor}=await import(path.join(dir,'engine.mjs'));
for(const starting of [0,1]){
 const initial=createGame({mode:'online',starting,seed:71,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}});
 assert.deepEqual(initial.state.players.map(p=>p.hand.length),[3,3]);
 assert.deepEqual(initial.events.filter(e=>e.type==='draw').map(e=>e.player).sort(),[0,1]);
 for(const you of [0,1]){const redacted=redactFor(initial.state,you);assert(redacted.players[1-you].hand.every(c=>c.id==='HIDDEN'));assert.equal(redacted.players[you].hand.length,3);}
 const g=reduce(initial.state,{type:'endTurn'}).state;assert.equal(g.cur,1-starting);assert.equal(g.players[g.cur].hand.length,3,'no duplicate opening draw');
 // Both now receive the usual three per later turn, with carry cap choices untouched.
 g.players.forEach(p=>{p.hand=[];});const next=reduce(g,{type:'endTurn'}).state;assert.equal(next.players[starting].hand.length,3);
 const back=reduce(next,{type:'endTurn'}).state;assert.equal(back.players[1-starting].hand.length,3);
 // Legacy snapshots without the marker keep the old turn-start draw behavior.
 const legacy=structuredClone(initial.state);delete legacy.players[1-starting].openingDrawReady;legacy.players[1-starting].hand=[];
 assert.equal(reduce(legacy,{type:'endTurn'}).state.players[1-starting].hand.length,3);
}
console.log('PASS: simultaneous initial hands, both starting sides, hidden identities, no duplicate draw, later turns and legacy snapshots');
}finally{await rm(dir,{recursive:true,force:true});}
