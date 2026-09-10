import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-dice-source-'));
try{
 const shared=path.resolve('client/src/shared');
 const baseline=execFileSync('git',['show','cffc130:client/src/shared/engine.ts'],{encoding:'utf8'});
 await build({stdin:{contents:baseline+'\nexport {DB,STARTERS} from "./cards";',resolveDir:shared,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'before.mjs')});
 await build({stdin:{contents:'export * from "./engine";export {DB,STARTERS} from "./cards";',resolveDir:shared,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'after.mjs')});
 const before=await import(path.join(dir,'before.mjs')),after=await import(path.join(dir,'after.mjs'));
 const cards={...after.DB,...after.STARTERS},sources=new Set();let rolls=0,checks=0;
 const initial=(seed)=>{const g=after.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=5;g.pending=null;for(const [i,p] of g.players.entries()){p.hand=[];p.field=[];p.enchants=[];p.traps=[];p.mana=30;p.maxMana=30;p.hp=80;p.maxHp=100;p.openingDrawReady=false;p.deck=Array.from({length:12},(_,n)=>({...after.DB.ELF,uid:`deck-${i}-${n}`}));}return g;};
 const compare=(g,a)=>{const x=before.reduce(structuredClone(g),a),y=after.reduce(structuredClone(g),a);assert.deepEqual(y.state,x.state,'source metadata must not change game state or RNG');const events=y.events.map(e=>{if(e.type!=='dice')return e;rolls++;const {source,...rest}=e;assert(source);assert([0,1].includes(source.player));assert(source.id?cards[source.id]:['brand','solitude'].includes(source.status));sources.add(source.id??source.status);return rest;});assert.deepEqual(events.filter(e=>e.type==='dice'),x.events.filter(e=>e.type==='dice'),'attribution and VFX preserve authoritative rolls');checks++;return y;};
 for(const seed of [2,7,19,71])for(const c of Object.values(cards)){
  const g=initial(seed);g.players[0].hand=[{...c,uid:'played'}];g.players[1].field=[{...after.DB.ELF,uid:'target',exhausted:false}];compare(g,{type:'play',idx:0});
  if(c.t==='mon'||c.ench){
   const h=initial(seed);if(c.t==='mon')h.players[1].field=[{...c,uid:'passive'}];else h.players[1].enchants=[{card:{...c,uid:'passive'},left:5}];compare(h,{type:'endTurn'});
   h.players[0].hand=[{...after.STARTERS.STARTER_CHEST,uid:'chest'}];compare(h,{type:'play',idx:0});
   h.players[0].hand=[{...after.DB.ELF,uid:'summon'}];compare(h,{type:'play',idx:0});
  }
 }
 // One card makes both sides roll: source owner must remain the caster.
 {const g=initial(71);g.players[0].hand=[{...cards.ND3,uid:'nd3'}];const e=compare(g,{type:'play',idx:0}).events.filter(e=>e.type==='dice');assert(e.length>=2);assert(e.every(e=>e.source.id==='ND3'&&e.source.player===0));assert(e.some(e=>e.player===1));}
 // These are persistent statuses, not an invented last-played card.
 for(const status of ['brand','soloCurse']){const g=initial(7);g.players[1][status]=status==='brand'?2:true;const e=compare(g,{type:'endTurn'}).events.filter(e=>e.type==='dice');assert(e.some(e=>e.source.status===(status==='brand'?'brand':'solitude')));}
 console.log(JSON.stringify({checks,rolls,sources:[...sources].sort(),stateAndRngUnchanged:true},null,2));assert(rolls>150);for(const id of ['STARTER_CHEST','ND3','AJIN','GAMBLER','WORLD_SEED','brand','solitude'])assert(sources.has(id));
}finally{await rm(dir,{recursive:true,force:true});}
