import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-trigger-chains-'));
try {
await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'game.mjs')});
const {DB,createGame,reduce}=await import(path.join(dir,'game.mjs'));
let uid=0;const card=id=>{assert(DB[id],id);return {...structuredClone(DB[id]),uid:'probe-'+ ++uid};};
const fresh=()=>{const g=createGame({mode:'online',seed:2,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.phase='main';g.pending=null;g.turn=3;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,mana:30,maxMana:30});return g;};
const play=(g,id)=>{g.players[g.cur].hand.push(card(id));const r=reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});return r.state;};
const report=[];
{let g=fresh();for(const p of g.players)p.enchants=['BLOOD_RITE','LUCKY_ECHO',...Array(7).fill('LIFE_CYCLE')].map(id=>({card:card(id),turns:99,bornTurn:1}));g.rng=2;g.players[0].hand=[card('GRAPE')];const before=structuredClone(g);const r=reduce(g,{type:'play',idx:0});assert.deepEqual(g,before);assert(r.events.length<1000);assert(r.events.some(e=>e.type==='heal'&&e.player===1));assert(r.state.players.every(p=>Number.isFinite(p.hp)));const repeat=reduce(g,{type:'play',idx:0});assert.deepEqual(repeat,r,'chain guard resets between independent resolutions');report.push({id:'C01',events:r.events.length});}
{let g=fresh();for(const p of g.players)p.enchants=['BLOOD_RITE','LUCKY_ECHO','WORLD_HEART',...Array(7).fill('LIFE_CYCLE')].map(id=>({card:card(id),turns:99,bornTurn:1}));g.rng=2;const r=reduce(g,{type:'endTurn'});assert.equal(r.state.turn,4);assert(r.events.length<1000);assert(r.state.players.every(p=>Number.isFinite(p.hp)));report.push({id:'C01-turn-boundary',events:r.events.length});}
{let g=fresh();g=play(g,'TSO1');assert(g.players[0].summonLockUntil>g.turn);const before=g.players[0].field.map(c=>c.id);g=play(g,'VAMP_PACT');assert(!g.players[0].field.some(c=>c.id==='VAMP1'));report.push({id:'C02-hermit',lockUntil:g.players[0].summonLockUntil,turn:g.turn,before,after:g.players[0].field.map(c=>c.id)});}
{let g=fresh();g=play(g,'GOLEM1');g=play(g,'GOLEM2');g.cur=1;g=play(g,'TSO2');g=play(g,'TSO1');assert.equal(g.players[0].summonCap,2);g.cur=0;const before=g.players[0].field.length;g=play(g,'VAMP_PACT');assert.equal(g.players[0].field.length,2);report.push({id:'C02-solitude',cap:2,before,after:g.players[0].field.map(c=>c.id)});}
// Unblocked pact and one-use evolution still work.
{let g=play(fresh(),'VAMP_PACT');assert(g.players[0].field.some(c=>c.id==='VAMP1'));report.push({id:'pact-normal'});}
{let g=play(fresh(),'VAMP_PACT');const vampire=g.players[0].field.find(c=>c.id==='VAMP1');g=play(g,'TSO1');g=play(g,'BLOOD_JOY');assert(!g.players[0].field.find(c=>c.uid===vampire.uid).evolvedUsed);g.players[0].summonLockUntil=g.turn;g=play(g,'BLOOD_JOY');assert(g.players[0].field.some(c=>c.id==='VAMP2'));assert(g.players[0].field.find(c=>c.uid===vampire.uid).evolvedUsed);report.push({id:'blocked-evolution-keeps-allowance'});}
// Token summons from an existing monster must respect the same cap.
{let g=play(fresh(),'MERC_MASTER');g.players[0].field=g.players[0].field.filter(c=>c.id==='MERC_MASTER');g.players[0].summonCap=1;g.cur=1;g=reduce(g,{type:'endTurn'}).state;assert.equal(g.players[0].field.length,1);report.push({id:'upkeep-token-cap'});}
// A rejected legacy resurrection keeps its physical graveyard card.
{let g=fresh();const c=card('GOLEM1');g.players[0].discard=[c];g.players[0].summonLockUntil=9;g.pending={kind:'giantShop',reason:'samsaraPick',allowCancel:false,data:{ids:['GOLEM1']}};g=reduce(g,{type:'pick',uid:'GOLEM1'}).state;assert.equal(g.players[0].discard[0].uid,c.uid);assert.equal(g.players[0].field.length,0);report.push({id:'blocked-resurrection-keeps-card'});}
// Full-board fusion replaces two slots and must not lose materials when blocked.
for(const locked of [false,true]){let g=fresh();const mon=id=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0});const dragon=mon('GM6_0'),soldier=mon('SOLDIER2');g.players[0].field=[dragon,soldier,...Array.from({length:5},()=>mon('GOLEM1'))];if(locked)g.players[0].summonLockUntil=9;g.pending={kind:'giantShop',reason:'dragonFuse',allowCancel:false,data:{ids:['DRAGON_RIDER'],dragonUid:dragon.uid,soldierUid:soldier.uid}};g=reduce(g,{type:'pick',uid:'DRAGON_RIDER'}).state;if(locked){assert.equal(g.players[0].field.length,7);assert(g.players[0].field.some(m=>m.uid===dragon.uid));assert(g.players[0].field.some(m=>m.uid===soldier.uid));}else{assert.equal(g.players[0].field.length,6);assert(g.players[0].field.some(m=>m.id==='DRAGON_RIDER'));}report.push({id:'fusion-materials',locked});}
// A blocked legacy fill-the-field trigger terminates without busy-looping.
{let g=fresh();const castle={...card('CASTLE'),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0};g.players[1].field=[castle];g.players[1].summonLockUntil=9;g.players[1].traps=[{card:{id:'LEGACY_RALLY',uid:'legacy-rally',t:'trap',cost:0,name:'fixture',text:'',react:'rallyKnights'}}];g=play(g,'GOLEM1');g=reduce(g,{type:'attack',uid:g.players[0].field[0].uid}).state;if(g.pending?.reason==='attack')g=reduce(g,{type:'chooseTarget',uid:castle.uid}).state;assert.equal(g.players[1].field.length,1);assert.equal(g.players[1].traps.length,0);report.push({id:'blocked-fill-loop-terminates'});}
console.log(JSON.stringify({passed:report.length,checks:report},null,2));

} finally {await rm(dir,{recursive:true,force:true});}
