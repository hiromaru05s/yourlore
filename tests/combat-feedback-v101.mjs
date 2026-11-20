import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-feedback-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botEconomy';export * from './client/src/shared/playIntent';export {restoreReworkedCards} from './server/src/reworkedCardSnapshot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0;
 const card=id=>({...C.DB[id],uid:'feedback-'+serial++});
 const mon=(id,extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=C.createGame({mode:'bot',seed:97,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=8;g.pending=null;g.market=[];g.marketStock=[];for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],supply:[],hp:40,mana:8,maxMana:8});return g;};
 for(const [id,cost] of [['ICARUS_WINGS',1],['ICARUS_SHOES',1],['GOBLIN_PARTY',2],['GOBLIN_ORIGIN',3]])assert.equal(C.DB[id].cost,cost);
 {const g=fresh();g.players[0].field=[mon('GOBLIN'),mon('GOBLIN'),mon('ELITE_GOBLIN')];g.players[0].hand=[card('GOBLIN_PARTY')];const r=C.reduce(g,{type:'play',idx:0});assert.equal(r.state.players[0].maxMana,9);assert.equal(r.state.players[1].maxMana,8);assert.equal(r.state.players[1].mana,8);}
 {const g=fresh();g.players[0].field=[mon('M1')];g.players[0].hand=[card('FORGE')];assert(C.playBlockReason(g,0,g.players[0].hand[0]));g.players[0].field.push(mon('GOBLIN'));assert.deepEqual(C.playIntent(g,0,g.players[0].hand[0]).pool.map(x=>x.id),['GOBLIN']);let r=C.reduce(g,{type:'play',idx:0});assert.equal(r.state.players[0].hp,32);const wrong=C.reduce(r.state,{type:'chooseTarget',uid:g.players[0].field[0].uid});assert(wrong.state.pending);r=C.reduce(wrong.state,{type:'chooseTarget',uid:g.players[0].field[1].uid});assert.equal(r.state.players[0].field[1].atkMod,4);assert.equal(r.state.players[0].field[1].defMod,0);}
 for(const owner of [0,1]){
  for(const count of [2,3]){
   let g=fresh();g.cur=1-owner;g.players[owner].field=Array.from({length:count},()=>mon('MINI_SPIRIT'));g.players[owner].dew=3;
   const r=C.reduce(g,{type:'endTurn'});assert.equal(r.state.players[owner].hp,43);assert(r.state.players[owner].field.every(m=>m.atkMod===1));
   assert.deepEqual(new Set(r.events.filter(e=>e.type==='monsterActivate').map(e=>e.uid)),new Set(g.players[owner].field.map(m=>m.uid)));
  }
 }
 // Individually muted copies must not gain stats, while their live siblings still do.
 {let g=fresh();g.cur=1;g.players[0].dew=1;g.players[0].enchants=[{card:card('DEMON_REALM'),turns:99,bornTurn:0}];g.players[0].field=[mon('MINI_SPIRIT',{tribe:'마족'}),mon('MINI_SPIRIT')];const r=C.reduce(g,{type:'endTurn'});assert.deepEqual(r.state.players[0].field.map(m=>m.atkMod),[0,1]);}
 // Shield, Dew, Attune and repeated HP gains each reach every copy.
 for(const [id,key,minimum] of [['IRON_WALL','defMod',1],['WATERDROP','atkMod',1],['STARTER_MANA','defMod',2]]){
  if(!C.DB[id])continue;const g=fresh();g.players[0].field=[mon('MINI_SPIRIT'),mon('MINI_SPIRIT')];g.players[0].hand=[card(id)];const r=C.reduce(g,{type:'play',idx:0});assert(r.state.players[0].field.every(m=>m[key]>=minimum),id);
 }
 // Rune targets the blocking Castle and then strips Taunt, not an arbitrary keyword.
 {let g=fresh();g.players[0].field=[mon('M2',{atk:12})];g.players[1].field=[mon('GOBLIN',{passivesG:['dual']}),mon('CASTLE')];g.players[0].hand=[card('RUNE1')];g=C.reduce(g,{type:'play',idx:0}).state;assert.equal(g.pending.reason,'RUNE_STRIP');let a=C.safeGreedy(g);assert.equal(a.uid,g.players[1].field[1].uid);g=C.reduce(g,a).state;a=C.safeGreedy(g);assert.equal(a.uid,'taunt');assert.equal(C.botDecide(g,'normal').uid,'taunt');g=C.reduce(g,a).state;assert(!C.hasPassive(g.players[1].field[1],'taunt'));}
 // A public Brand emergency makes cleansing a purchase, then a legal cast with an empty graveyard.
 {let g=fresh();g.players[0].hp=15;g.players[0].brand=5;g.players[0].mana=3;g.players[0].supply=[card('PURGE_TOUCH')];const v=C.purchaseEvaluator(g,g.players[0])(g.players[0].supply[0]);assert(v.margin>0);assert.deepEqual(C.safeGreedy(g),{type:'buySupply',i:0});assert.deepEqual(C.botDecide(g,'normal'),{type:'buySupply',i:0});g.players[0].hand=[card('M2')];assert.deepEqual(C.safeGreedy(g),{type:'buySupply',i:0});g.players[0].hand=[card('PURGE_TOUCH')];g.players[0].supply=[];assert.equal(C.playBlockReason(g,0,g.players[0].hand[0]),null);g=C.reduce(g,{type:'play',idx:0}).state;assert.equal(g.players[0].brand,4);}
 // Updating a persisted room changes only revised prints, retaining identity and counters.
 {const g=fresh();C.restoreReworkedCards(g);delete g.balance101Applied;g.players[0].hand=[{...card('FORGE'),val2:2,textJa:'old'}];g.players[0].enchants=[{card:{...card('GOBLIN_ORIGIN'),cost:2},turns:77,bornTurn:2}];C.restoreReworkedCards(g);assert.equal(g.players[0].hand[0].val2,0);assert.equal(g.players[0].enchants[0].card.cost,3);assert.equal(g.players[0].enchants[0].turns,77);const once=JSON.stringify(g);C.restoreReworkedCards(g);assert.equal(JSON.stringify(g),once);}
 console.log('PASS v101 card balance, Forge targets, duplicate spirits, Rune Taunt, Brand purchase/cleanse and room migration');
} finally {await rm(dir,{recursive:true,force:true});}
