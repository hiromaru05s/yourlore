import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/blood-rite-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/bloodRite/visual';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {createGame,reduce,DB,bloodRiteActivation,BLOOD_RITE_HEAL,BLOOD_RITE_DURATION}=await import(dir+'/test.mjs');
 let uid=0;const card=id=>({...structuredClone(DB[id]),uid:'blood-test-'+ ++uid});
 const fresh=()=>{const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=0;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],hp:30,mana:30,maxMana:30});return g;};
 const play=(g,id)=>{g.players[g.cur].hand=[card(id)];return reduce(g,{type:'play',idx:0});};
 for(const caster of [0,1])for(const owner of [0,1])for(const copies of [1,2])for(const spell of ['S1','BLOOD1']){
  const g=fresh();g.cur=caster;g.players[owner].enchants=Array.from({length:copies},()=>({card:card('BLOOD_RITE'),turns:99,bornTurn:1}));
  const expected=g.players[owner].enchants.map(e=>e.card.uid),target=spell==='S1'?1-caster:caster;
  const r=play(g,spell),heals=r.events.filter(e=>e.type==='heal'&&e.bloodRiteSources);
  assert.equal(heals.length,1,spell);assert.equal(heals[0].player,target);assert.deepEqual(heals[0].bloodRiteSources,expected);
  assert.equal(r.state.players[target].hp,30+heals[0].amount);assert(!r.events.some(e=>e.type==='damage'));
  assert(!r.events.some(e=>e.type==='enchantActivate'&&expected.includes(e.uid)),'no duplicate generic enchant animation');
 }
 {const g=fresh();g.players.forEach(p=>p.enchants=[{card:card('BLOOD_RITE'),turns:99}]);const r=play(g,'S1');assert.equal(r.events.find(e=>e.bloodRiteSources).bloodRiteSources.length,2);}
 {const g=fresh();g.players[0].enchants=[{card:card('BLOOD_RITE'),turns:99}];const r=play(g,'GRAPE');assert(r.events.some(e=>e.type==='heal'));assert(!r.events.some(e=>e.bloodRiteSources),'ordinary recovery is unchanged');}
 {const g=fresh(),r=play(g,'S1');assert(r.events.some(e=>e.type==='damage'));assert(!r.events.some(e=>e.bloodRiteSources));}
 {const g=fresh();g.players[0].enchants=[{card:card('BLOOD_RITE'),turns:99}];g.players[1].enchants=[{card:{...card('BLOOD_RITE'),ench:'blackInfinity'},turns:99}];const r=play(g,'S1');assert(!r.events.some(e=>e.bloodRiteSources),'infinity priority preserved');assert.equal(r.state.players[1].hp,30);}
 {const g=fresh();g.players[0].enchants=[{card:card('BLOOD_RITE'),turns:99}];g.players[0].field=Array.from({length:3},()=>({...card('HIGH_ELF'),dmg:0,exhausted:true,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0}));const r=play(g,'S1');const e=r.events.find(e=>e.bloodRiteSources);assert.equal(e.amount,0);assert.equal(r.state.players[1].hp,30,'rounded zero conversion must still animate');}
 assert.equal(bloodRiteActivation(0),0);assert.equal(bloodRiteActivation(BLOOD_RITE_HEAL),1);assert.equal(bloodRiteActivation(BLOOD_RITE_DURATION),0);
 console.log('PASS blood rite: 16 caster/owner/copy/spell cases, both owners, ordinary recovery, no rite, immunity priority, zero recovery, selected timing');
}finally{await rm(dir,{recursive:true,force:true});}
