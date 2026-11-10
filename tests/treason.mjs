import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {createGame,reduce,DB}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
let serial=0,checks=0;const card=id=>({...structuredClone(DB[id]),uid:'treason-test-'+serial++}),mon=id=>({...card(id),exhausted:false,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
function fixture(side){const g=createGame({mode:'online',seed:72,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=side;g.phase='main';g.pending=null;for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],hp:30,mana:20,maxMana:20,brand:1});g.players[side].hand=[card('TREASON')];g.players[side].field=[mon('ELF')];g.players[1-side].field=[mon('CASTLE'),mon('ELF'),mon('INFKNIGHT')];g.players[1-side].enchants=['E2','NHEAL'].map(id=>({card:card(id),turns:3,bornTurn:1}));g.players[1-side].quests=[{card:card('Q_CASTLE'),progress:2,startedTurn:1}];return g;}

for (const side of [0,1]) {
  const g=fixture(side), own=g.players[side], enemy=g.players[1-side];
  enemy.field=[mon('SOLDIER2'),mon('TAR1')];
  const [soldier,noble]=enemy.field;
  const r=reduce(g,{type:'play',idx:0,sourceUid:own.hand[0].uid,targets:[soldier.uid]});
  assert.equal(r.state.players[1-side].hp,29);
  assert.equal(r.state.pending.reason,'TREASON_DESTROY');
  const invalid=reduce(r.state,{type:'pick',uid:own.field[0].uid});
  assert.equal(invalid.state.pending.reason,'TREASON_DESTROY');
  const result=reduce(invalid.state,{type:'pick',uid:noble.uid});
  assert.equal(result.state.players[1-side].field.length,0);
  assert.equal(result.state.players[1-side].enchants.length,2);
  assert.equal(result.state.players[1-side].brand,1);
  assert.deepEqual(result.events.find(e=>e.type==='treason').targets,[{uid:noble.uid,zone:'monster',destination:'discard'}]);
  checks++;
}
for (const zone of ['quests','enchants','traps']) {
  const g=fixture(0), p=g.players[1];
  p.traps=[{card:card('T1'),setTurn:1}];
  const target=p[zone][0].card;
  const cast=reduce(g,{type:'play',idx:0,sourceUid:g.players[0].hand[0].uid,targets:['player-0']});
  assert.equal(cast.state.players[0].hp,29);
  const result=reduce(cast.state,{type:'pick',uid:target.uid});
  assert(!result.state.players[1][zone].some(e=>e.card.uid===target.uid));
  assert.equal(result.state.players[1].field.length,3);
  checks++;
}
{
  const g=fixture(0);g.players[1].field=[mon('SOLDIER2')];
  const cast=reduce(g,{type:'play',idx:0,sourceUid:g.players[0].hand[0].uid,targets:[g.players[1].field[0].uid]});
  assert.equal(cast.state.pending,null);assert.equal(cast.state.players[1].hp,29);checks++;
}
console.log('PASS Treason damage, kill bonus, public targets and individual destruction:',checks);
