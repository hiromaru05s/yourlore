import assert from 'node:assert/strict';
import {build} from 'esbuild';
const r=await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {createGame,reduce,DB}=await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
let serial=0;const card=id=>({...structuredClone(DB[id]),uid:'massacre-test-'+serial++});
const mon=id=>({...card(id),exhausted:false,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
function fixture(side,count){const g=createGame({mode:'online',seed:72,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=side;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],hp:30,mana:10,maxMana:10});g.players[side].hand=[card('MASSACRE')];g.players[side].field=[mon('ELF')];g.players[1-side].field=Array.from({length:count},()=>mon('M4'));return g;}
let checks=0;
for(const side of [0,1])for(const count of [1,3,5]){const g=fixture(side,count),r=reduce(g,{type:'play',idx:0});assert.equal(r.state.players[side].maxMana,9);assert.equal(r.state.players[side].mana,3);assert.equal(r.state.players[side].field.length,1);assert.equal(r.state.players[1-side].field.length,0);assert.equal(r.events.filter(e=>e.type==='destroy'&&e.cause==='massacre').length,count);assert.equal(r.events.filter(e=>e.type==='playSpell').length,1);checks++;}
{const g=fixture(0,1);g.players[0].maxMana=3;g.players[0].mana=7;const r=reduce(g,{type:'play',idx:0});assert.equal(r.state.players[0].maxMana,3);checks++;}
{const g=fixture(0,1);g.players[1].field=[mon('GM6_8')];const r=reduce(g,{type:'play',idx:0});assert(r.events.some(e=>e.type==='summon'&&e.id==='SOLDIER2'));assert(r.state.players[1].field.some(m=>m.id==='SOLDIER2'));assert.equal(r.events.filter(e=>e.type==='destroy'&&e.cause==='massacre').length,1);checks++;}
{const g=fixture(0,1);g.players[1].field[0].token=true;const uid=g.players[1].field[0].uid;const r=reduce(g,{type:'play',idx:0});assert(r.state.players[1].removed.some(c=>c.uid===uid));checks++;}
{const g=fixture(0,1);g.players[1].field=[mon('VAMP2')];g.players[1].enchants=[{card:{...card('S10'),ench:'vampWard'},turns:99}];const r=reduce(g,{type:'play',idx:0});assert.equal(r.state.players[1].field.length,1);assert(!r.events.some(e=>e.type==='destroy'));assert.equal(r.state.players[0].maxMana,9);checks++;}
console.log(`PASS Massacre ${checks} rules/ownership cases: both sides, counts 1/3/5, max floor, death summon, exile and immunity.`);
