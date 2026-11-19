import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export {createGame,reduce,playBlockReason,ST_MAX} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {tutorialRuleSections} from './client/src/shared/tutorialNotes';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {createGame,reduce,playBlockReason,ST_MAX,DB,tutorialRuleSections}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let serial=0;
const card=id=>({...structuredClone(DB[id]),uid:`seven-${++serial}`});
function fresh(side=0,seed=42){
 const g=createGame({mode:'online',seed,starting:side,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
 g.pending=null;g.phase='main';g.turn=5;
 for(const p of g.players)Object.assign(p,{mana:30,maxMana:30,hp:100,field:[],hand:[],enchants:[],quests:[],traps:[]});
 return g;
}
const size=p=>p.enchants.length+p.quests.length+p.traps.length;
assert.equal(ST_MAX,7);
for(const side of [0,1])for(const [spells,quests] of [[6,0],[3,3],[0,6]])for(const id of ['NHEAL','Q_RIFT']){
 let g=fresh(side),p=g.players[side];
 p.enchants=Array.from({length:spells},()=>({card:card('NHEAL'),turns:99}));
 p.quests=Array.from({length:quests},()=>({card:card('Q_WINTER'),progress:0,startedTurn:1}));
 const seventh=card(id),eighth=card(id);p.hand=[seventh,eighth];
 assert.equal(playBlockReason(g,side,seventh),null);
 g=reduce(g,{type:'play',idx:0,player:side}).state;p=g.players[side];
 assert.equal(size(p),7,`${id}: seventh deploys with ${spells} spells + ${quests} quests`);
 assert(p.enchants.some(e=>e.card.uid===seventh.uid)||p.quests.some(q=>q.card.uid===seventh.uid));
 assert(playBlockReason(g,side,eighth));
 const before=structuredClone(p);
 g=reduce(g,{type:'play',idx:0,player:side}).state;p=g.players[side];
 assert.equal(size(p),7);assert.deepEqual(p.hand,before.hand);assert.equal(p.mana,before.mana);
 // A normal spell uses no shared slot and must still be playable at capacity.
 p.hand=[card('GRAPE')];assert.equal(playBlockReason(g,side,p.hand[0]),null);
 g=reduce(g,{type:'play',idx:0,player:side}).state;assert.equal(size(g.players[side]),7);assert(g.players[side].hp>p.hp);
}
// Generated enchantments must count quests too (Guild Chest result 8).
let generatedRolls=0;
for(let seed=1;seed<=120&&generatedRolls<2;seed++){
 let g=fresh(0,seed);const p=g.players[0];p.quests=Array.from({length:7},()=>({card:card('Q_WINTER'),progress:0,startedTurn:1}));p.hand=[card('GUILD_CHEST')];
 const result=reduce(g,{type:'play',idx:0});assert.equal(size(result.state.players[0]),7);
 // Compare the same seeded roll with space available, to exercise the generated-card path.
 g=fresh(0,seed);g.players[0].hand=[card('GUILD_CHEST')];const open=reduce(g,{type:'play',idx:0}).state;
 if(open.players[0].enchants.some(e=>e.card.id==='GUILD_EYE'))generatedRolls++;
}
assert.equal(generatedRolls,2);
for(const lang of ['ja','en','ko']){
 const rules=tutorialRuleSections(lang).flatMap(s=>s.body).join('\n');
 assert(!/14枚|14枠|14장|14칸|fourteen/.test(rules));
 assert(/7枠|seven shared persistent\/quest slots|7칸/.test(rules));
}
console.log('PASS: shared seven-slot capacity, rejected eighth preserves hand/mana, normal spells, generated cards with quests, and three-language rules');
