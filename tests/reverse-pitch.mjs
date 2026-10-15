import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/reverse-pitch-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {createGame,reduce,DB}=await import(dir+'/test.mjs');let uid=0;
 const card=id=>({...structuredClone(DB[id]),uid:'reverse-test-'+ ++uid});
 const fresh=()=>{const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=0;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],hp:30,mana:30,maxMana:30,shield:0});return g;};
 const enchant=(g,owner,id)=>g.players[owner].enchants.push({card:card(id),turns:99,bornTurn:1});
 const play=(g,id)=>{g.players[g.cur].hand=[card(id)];return reduce(g,{type:'play',idx:0});};
 let checked=0;
 for(const caster of [0,1])for(const owner of [0,1])for(const copies of [1,2])for(const spell of ['S1','BLOOD1']){
  const g=fresh();g.cur=caster;for(let i=0;i<copies;i++)enchant(g,owner,'BLACK_REVERSE');const from=spell==='S1'?1-caster:caster,to=1-from;
  const r=play(g,spell),reverse=r.events.filter(e=>e.type==='reverseDamage'),damage=r.events.filter(e=>e.type==='damage');assert.equal(reverse.length,1);assert.equal(reverse[0].from,from);assert.equal(reverse[0].to,to);assert.deepEqual(reverse[0].sourceUids,g.players[owner].enchants.map(e=>e.card.uid));assert.equal(damage.length,1);assert.equal(damage[0].player,to);assert.equal(damage[0].reversed,true);assert.equal(damage[0].reverseId,reverse[0].id);assert(r.events.indexOf(reverse[0])<r.events.indexOf(damage[0]));assert.equal(r.state.players[from].hp,30);assert.equal(r.state.players[to].hp,30-damage[0].amount);checked++;
 }
 for(const side of [0,1]){const g=fresh();g.cur=side;enchant(g,1-side,'BLACK_REVERSE');const m={...card('INFKNIGHT'),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0};g.players[side].field=[m];const r=reduce(g,{type:'attack',uid:m.uid});assert(r.events.some(e=>e.type==='attack'));const rev=r.events.find(e=>e.type==='reverseDamage');assert.equal(rev.from,1-side);assert.equal(rev.to,side);assert(r.events.some(e=>e.type==='damage'&&e.player===side&&e.reversed));checked++;}
 {const g=fresh();enchant(g,0,'BLACK_REVERSE');enchant(g,1,'BLACK_REVERSE');const r=play(g,'S1');assert.equal(r.events.filter(e=>e.type==='reverseDamage').length,1);assert.equal(r.events.find(e=>e.type==='reverseDamage').sourceUids.length,2);checked++;}
 {const g=fresh();enchant(g,0,'BLACK_REVERSE');g.players[0].shield=99;const r=play(g,'S1');assert(r.events.some(e=>e.type==='reverseDamage'));assert(!r.events.some(e=>e.type==='damage'));assert.equal(r.state.players[0].hp,30);checked++;}
 {const g=fresh();enchant(g,0,'BLACK_REVERSE');enchant(g,0,'BLOOD_RITE');const r=play(g,'S1');assert(r.events.some(e=>e.type==='reverseDamage'));assert(r.events.some(e=>e.type==='heal'&&e.player===0&&e.bloodRiteSources));assert(!r.events.some(e=>e.type==='damage'));checked++;}
 {const g=fresh();enchant(g,0,'BLACK_REVERSE');g.players[0].enchants.push({card:{...card('BLACK_REVERSE'),ench:'blackInfinity'},turns:99});const r=play(g,'S1');assert(r.events.some(e=>e.type==='reverseDamage'));assert(r.events.some(e=>e.type==='infinityStored'&&e.player===0));assert(!r.events.some(e=>e.type==='damage'));checked++;}
 {const r=play(fresh(),'S1');assert(!r.events.some(e=>e.type==='reverseDamage'));assert(!r.events.find(e=>e.type==='damage').reversed);checked++;}
 console.log(`PASS reverse 02: ${checked} engine cases; spell/self/attack, both sides/owners, multiple sources, shield/recovery/infinity priority and ordinary damage.`);
}finally{await rm(dir,{recursive:true,force:true});}
