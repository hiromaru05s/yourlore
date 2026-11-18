import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-story-policy-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export {restoreReworkedCards} from './server/src/reworkedCardSnapshot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const C=await import(dir+'/test.mjs');let serial=0;
 const card=id=>({...C.DB[id],uid:'story-'+serial++});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=C.createGame({mode:'bot',seed:2,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=8;g.pending=null;g.market=[];g.marketStock=[];for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],supply:[],hp:40,mana:8,maxMana:8});return g;};
 {const g=fresh();g.players[0].field=Array.from({length:3},()=>mon('ELITE_GOBLIN',{exhausted:true}));g.players[0].hand=[card('GOBLIN_PARTY')];const a=C.safeGreedy(g);assert.deepEqual(a,{type:'play',idx:0});const after=C.reduce(g,a).state;assert.equal(after.players[0].maxMana,9);assert.equal(after.players[1].maxMana,8);}
 for(const [id,passive] of [['ICARUS_SHOES','dual'],['ICARUS_WINGS','evade']]){
  const g=fresh();g.players[0].field=[mon('ELITE_GOBLIN',{atkMod:10,passivesG:[passive]}),mon('ELITE_GOBLIN')];g.players[0].hand=[card(id)];
  let next=C.reduce(g,{type:'play',idx:0}).state;const a=C.safeGreedy(next);assert.equal(a.uid,g.players[0].field[1].uid,'avoid redundant '+passive);next=C.reduce(next,a).state;assert(C.hasPassive(next.players[0].field[1],passive));
  next.players[0].hand=[card(id)];next.players[0].field.forEach(m=>m.exhausted=true);assert.notEqual(C.safeGreedy(next).type,'play','save redundant grant');
 }
 {const g=fresh();g.players[0].field=[mon('ELITE_GOBLIN',{atkMod:8,exhausted:true}),mon('ELITE_GOBLIN',{passivesG:['dual'],mult:2})];g.players[0].hand=[card('FORGE')];const next=C.reduce(g,{type:'play',idx:0}).state;assert.equal(C.safeGreedy(next).uid,g.players[0].field[1].uid,'buff available double attacker');}
 // Every die face, including the changed boundary 3/4, is checked in real combat.
 const seen=new Set();
 for(let seed=1;seed<1000&&seen.size<6;seed++){
  const g=fresh();g.rng=seed;g.players[0].field=[mon('M2',{atk:5})];g.players[1].field=[mon('ELITE_GOBLIN')];
  const pending=C.reduce(g,{type:'attack',uid:g.players[0].field[0].uid}).state;
  const r=C.reduce(pending,{type:'chooseTarget',uid:g.players[1].field[0].uid});const die=r.events.find(e=>e.type==='dice')?.rolls[0];if(!die)continue;seen.add(die);
  assert.equal(r.state.players[1].field.length,die>=5?1:0,'die '+die);
  if(die>=5){assert.equal(r.state.players[1].hp,38);assert.equal(C.curHp(r.state.players[1],r.state.players[1].field[0]),1);}
 }
 assert.equal(seen.size,6);
 {const g=fresh();delete g.balance100Applied;const m=mon('ELITE_GOBLIN',{textJa:'旧3以上',atkMod:4,defMod:3,dmg:2,passivesG:['dual']});g.players[0].field=[m];g.players[1].hand=[{...card('ELITE_GOBLIN'),textJa:'旧3以上'}];C.restoreReworkedCards(g);assert(g.balance100Applied);assert.match(m.textJa,/5以上/);assert.match(g.players[1].hand[0].textJa,/5以上/);assert.equal(m.atkMod,4);assert.equal(m.dmg,2);assert.deepEqual(m.passivesG,['dual']);const once=JSON.stringify(g);C.restoreReworkedCards(g);assert.equal(JSON.stringify(g),once);}
 console.log('PASS story utility, nonredundant passives, dual attacker buffs, all six Elite Goblin rolls');
}finally{await rm(dir,{recursive:true,force:true});}
