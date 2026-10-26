import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const tmp=await mkdtemp(tmpdir()+'/lore-culls-');
try{
 await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs'});
 const {createGame,reduce,DB,STARTERS,redactFor}=await import(tmp+'/engine.mjs');
 for(const owner of [0,1])for(const count of [0,1,3,7]){
  const g=createGame({mode:'bot',seed:71,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.opening=undefined;g.turn=4;g.pending=null;
  for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],removed:[],enchants:[],quests:[],traps:[],mana:20,maxMana:20});
  const p=g.players[owner];p.hand=[{...DB.SORTER,uid:'sorter'}];
  for(let i=0;i<count;i++)p[['discard','deck','hand'][i%3]].push({...STARTERS.STARTER_TRASH,uid:'cull'+i});
  const r=reduce(g,{type:'play',idx:0}),events=r.events,exits=events.filter(e=>e.type==='cullExile');
  assert.equal(exits.length,count?1:0);assert.equal(exits.flatMap(e=>e.cards).length,Math.min(count,1));
  assert.equal(r.state.players[owner].removed.length,1+Math.min(count,1));
  assert.deepEqual(new Set(exits.flatMap(e=>e.cards.map(c=>c.card.uid))),new Set(r.state.players[owner].removed.filter(c=>c.uid.startsWith("cull")).map(c=>c.uid)));
  for(const e of exits){assert.equal(e.player,owner);assert.equal(e.sourceUid,'sorter');assert.equal(events.slice(0,events.indexOf(e)).findLast(e=>e.type!=='log').type,'monsterActivate');for(const {card,from}of e.cards){assert(p[from].some(c=>c.uid===card.uid));assert(redactFor(r.state,1-owner).players[owner].removed.some(c=>c.uid===card.uid),'only newly public removed cards enter the event');}}
 }
 console.log('PASS Culls: new Cull generation plus passive causality, real zone origins, no double exile, both owners and public-state privacy');
}finally{await rm(tmp,{recursive:true,force:true});}
