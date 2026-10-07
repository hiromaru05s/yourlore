import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-golem-audit-'));
try {
await build({stdin:{contents: "export * from './client/src/shared/engine'; export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'engine.mjs')});
const {DB,STARTERS,createGame,reduce,curHp}=await import(path.join(dir,'engine.mjs'));
let seq=0;
const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:`audit-${++seq}`});
const mon=(id,mods={})=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0,...mods});
const fresh=()=>{const g=createGame({mode:'online',seed:17,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:10000,maxHp:10000,mana:30,maxMana:30,uses:{},usesTurn:{}});g.phase='main';g.pending=null;g.turn=3;return g;};
const step=(g,a)=>reduce(g,a).state;
const play=(g,id)=>{g.players[g.cur].hand=[card(id)];return step(g,{type:'play',idx:0});};
const setup=(id='NWL3')=>{let g=fresh();g.cur=1;g=play(g,id);assert.equal(g.players[1].field.at(-1).id,id);g.cur=0;return g;};
const attack=(g,atk)=>{const a=mon('GOLEM1',{atk,def:100,guts:0});g.players[0].field=[a];const uid=g.players[1].field[0].uid;g=step(g,{type:'attack',uid:a.uid});if(g.pending?.reason==='attack')g=step(g,{type:'chooseTarget',uid});assert.equal(g.players[0].field[0].exhausted,atk>0);if(atk===0){assert.equal(g.pending,null);assert.equal(g.players[0].field[0].attacksUsed??0,0);}return g;};
const report=[];
const test=(name,fn)=>{fn();report.push(name);console.log('PASS',name);};
test('Guardian spends its initial counter on a lethal hit, then dies',()=>{let g=setup();g=attack(g,9);assert.equal(g.players[1].field[0].guts,0);assert.equal(curHp(g.players[1],g.players[1].field[0]),1);g=attack(g,9);assert.equal(g.players[1].field.length,0);assert.equal(g.players[1].hp,9992);});
test('Guardian at one HP and zero guts dies without regenerating',()=>{let g=setup();Object.assign(g.players[1].field[0],{guts:0,dmg:8});g=attack(g,1);assert.equal(g.players[1].field.length,0);});
test('Zero ATK attack attempts are blocked and never grant counters',()=>{let g=setup();for(let i=0;i<100;i++)g=attack(g,0);assert.equal(g.players[1].field[0].guts,1);assert.equal(curHp(g.players[1],g.players[1].field[0]),9);});
test('Nonlethal hit gains one counter',()=>{let g=attack(setup(),1);assert.equal(g.players[1].field[0].guts,2);assert.equal(curHp(g.players[1],g.players[1].field[0]),8);});
test('Other normal golems exhaust guts then die',()=>{for(const id of ['GOLEM1','GOLEM2','M10']){let g=setup(id);g=attack(g,20);assert.equal(g.players[1].field[0].guts,0,id);g=attack(g,20);assert.equal(g.players[1].field.length,0,id);}});
test('Strike Squad gains only its one summon counter plus three with kin',()=>{for(const kin of [false,true]){let g=fresh();g.cur=1;if(kin)g=play(g,'GOLEM1');g=play(g,'NGA3');assert.equal(g.players[1].field.at(-1).guts,kin?4:1);}});
test('Leader gains one counter only when an ally is destroyed',()=>{let g=setup('GOLEM2');g.players[1].field.unshift(mon('GOLEM1',{guts:0}));g=attack(g,20);assert.equal(g.players[1].field.length,1);assert.equal(g.players[1].field[0].guts,2);g=attack(g,0);assert.equal(g.players[1].field[0].guts,2);});
test('Damage immunity does not replenish Guardian guts',()=>{let g=setup();g.players[1].field[0].immuneDamageTurn=g.turn;g=attack(g,20);assert.equal(g.players[1].field[0].guts,1);assert.equal(curHp(g.players[1],g.players[1].field[0]),9);});
test('Earned counters are finite and each lethal hit consumes one',()=>{let g=setup();g=attack(g,1);g=attack(g,1);assert.equal(g.players[1].field[0].guts,3);for(const expected of [2,1,0]){g=attack(g,20);assert.equal(g.players[1].field[0].guts,expected);}g=attack(g,20);assert.equal(g.players[1].field.length,0);});
test('Serialization does not reinitialize spent guts',()=>{let g=attack(setup(),9);g=JSON.parse(JSON.stringify(g));g=attack(g,1);assert.equal(g.players[1].field.length,0);});
test('Counter attack does not replenish attacking Guardian',()=>{let g=setup();g.cur=1;const guardian=g.players[1].field[0];Object.assign(guardian,{guts:0,dmg:8});g.players[0].field=[mon('M6',{atk:8,def:30})];g=step(g,{type:'attack',uid:guardian.uid});if(g.pending?.reason==='attack')g=step(g,{type:'chooseTarget',uid:g.players[0].field[0].uid});assert.equal(g.players[1].field.length,0);});
test('Reducer preserves the input state when awarding guts',()=>{let g=setup();const a=mon('GOLEM1',{atk:1,def:100,guts:0});g.players[0].field=[a];const before=structuredClone(g);let result=reduce(g,{type:'attack',uid:a.uid});assert.deepEqual(g,before);if(result.state.pending?.reason==='attack'){g=result.state;const pendingBefore=structuredClone(g);result=reduce(g,{type:'chooseTarget',uid:g.players[1].field[0].uid});assert.deepEqual(g,pendingBefore);}assert.equal(result.state.players[1].field[0].guts,2);});
console.log(`${report.length} golem guts regression cases passed`);

} finally { await rm(dir,{recursive:true,force:true}); }
