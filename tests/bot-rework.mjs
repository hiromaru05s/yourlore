import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-bot-rework-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botSearch';export * from './client/src/shared/botEconomy';export * from './client/src/shared/botMatchup';export * from './client/src/shared/botActions';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0,passed=0;
 const card=id=>({...C.DB[id]??C.STARTERS[id],uid:'rework-'+serial++});
 const mon=id=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,guts:C.hasPassive(C.DB[id],'guts')?1:0});
 const fresh=(ids=[])=>{const g=C.createGame({mode:'bot',seed:471,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=11;g.pending=null;g.market=ids.map(card);g.marketStock=ids.map(()=>3);for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],removed:[],exile:[],revealedCards:[],hp:40,mana:3,maxMana:8});return g;};
 const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
 const value=(g,id)=>C.purchaseEvaluator(g,g.players[0])(card(id));
 const turn=(g,tier)=>{let st=g;for(let i=0;i<60&&!st.over&&st.cur===g.cur;i++){const a=C.botDecide(st,tier),next=C.reduce(st,a).state;assert(C.actionChangesState(st,next));st=next;}assert(st.over||st.cur!==g.cur);return st;};
 test('available Guardian changes investment before it is played; sold-out cards do not',()=>{
  const plain=fresh(),wall=fresh(['NWL3']);plain.players[0].deck=wall.players[0].deck=Array.from({length:5},()=>card('RUST_SHROOM'));
  assert(value(wall,'WALLBREAK1').margin>value(plain,'WALLBREAK1').margin);
  assert(value(wall,'M2').margin<value(plain,'M2').margin);
  wall.marketStock=[0];assert.equal(value(wall,'WALLBREAK1').margin,value(plain,'WALLBREAK1').margin);
 });
 test('actual Hard/Hell reserve a suppression answer instead of filling seven blocked slots',()=>{
  for(const tier of ['hard','hell']) for(let variant=0;variant<3;variant++) {
   const g=fresh(['DISARM1']);g.players[1].enchants=[{card:card('WEAKEN_ALL'),turns:99}];g.players[1].maxMana=9;
   g.players[0].field=[mon('RUST_SHROOM'),mon('RUST_SHROOM')].map(m=>({...m,atkMod:-2}));
   g.players[0].hand=Array.from({length:4},()=>card('RUST_SHROOM'));g.players[0].deck=[card('COUNTERCALC')];
   const after=turn(g,tier);assert(after.players[0].discard.some(c=>c.id==='DISARM1'),tier+' acquires working removal after Countercalc expired');
   assert(after.players[0].field.length<6,tier+' leaves room for useful development');
  }
 });
 test('Guardian is removable with a first answer despite a high printed deck average',()=>{
  const g=fresh(['S15']);g.players[1].field=[mon('NWL3')];g.players[0].deck=Array.from({length:5},()=>card('POISON_MASTER'));
  assert(value(g,'S15').margin>0);
  for(const tier of ['hard','hell']) assert(turn(g,tier).players[0].discard.some(c=>c.id==='S15'));
 });
 test('existing removal coverage reduces duplicate purchases',()=>{
  const g=fresh();g.players[1].field=[mon('NWL3')];const first=value(g,'S15').margin;g.players[0].deck=[card('S15'),card('WALLBREAK1')];assert(value(g,'S15').margin<first);
 });
 test('persistent buff restores attacks under suppression and is executed before more blocked bodies',()=>{
  for(const tier of ['hard','hell']) {
   const g=fresh();g.players[1].enchants=[{card:card('WEAKEN_ALL'),turns:99}];g.players[1].hp=12;
   g.players[0].field=Array.from({length:3},()=>({...mon('RUST_SHROOM'),atkMod:-2}));g.players[0].hand=[card('RUST_SHROOM'),card('ADVANCE')];
   const a=C.botDecide(g,tier);assert.equal(a.type,'play');assert.equal(g.players[0].hand[a.idx].id,'ADVANCE');
   const after=turn(g,tier);assert(after.players[0].field.some(m=>C.effAtk(after.players[0],m,after)>0));
  }
 });
 test('finite Guts and Decay progress change position value',()=>{
  const g=fresh();g.players[0].field=[mon('NWL3')];g.players[1].field=[mon('M2')];const base=C.positionValue(g,0);
  g.players[0].field[0].guts=4;assert(C.positionValue(g,0)>base);
  g.players[1].field=[mon('RUST_SHROOM'),mon('RUST_SHROOM')];const clean=C.positionValue(g,0);g.players[0].field[0].decayCnt=2;assert(C.positionValue(g,0)<clean);
 });
 test('public matchup cannot peek at private cards or live random state',()=>{
  const g=fresh(['NWL3','DISARM1']);g.players[1].hand=[card('RUST_SHROOM')];g.players[1].deck=[card('RUST_SHROOM')];const before=value(g,'S15');const twin=structuredClone(g);twin.players[1].hand=[card('WEAKEN_ALL')];twin.players[1].deck=[card('NWL3')];twin.rng=123456;
  assert.deepEqual(value(twin,'S15'),before);
  for(const tier of ['hard','hell']) {const a=C.botDecide(g,tier);assert.deepEqual(C.botDecide(twin,tier),a);}
 });
 test('targeted removal is saved against Aura and automatic removal never kills our larger wall',()=>{
  const g=fresh();g.players[0].hand=[card('S15')];g.players[1].field=[mon('GOBLIN_KING')];
  assert.notEqual(C.safeGreedy(g).type,'play');
  for(const tier of ['hard','hell'])assert.notEqual(C.botDecide(g,tier).type,'play');
  g.players[0].hand=[card('WALLBREAK1')];g.players[0].field=[{...mon('NWL3'),def:20}];g.players[1].field=[mon('NWL3')];
  assert.equal(C.removalHits(g,g.players[1],g.players[0].hand[0],g.players[1].field[0]),false);
  assert.notEqual(C.safeGreedy(g).type,'play');
 });
 test('Apple is usable and Farm support is valued only with its prerequisites and time',()=>{
  const g=fresh();g.players[0].hand=[card('APPLE')];g.players[0].hp=8;assert.equal(C.safeGreedy(g).type,'play');
  const farmer=value(g,'FARMER');g.players[0].deck=[card('FARM')];assert(value(g,'FARMER').synergy>farmer.synergy);
  g.players[0].deck=[card('FARMER')];const early=value(g,'FARM');g.turn=58;assert(value(g,'FARM').readiness<early.readiness);
 });
 test('suppression is not played merely to disable our own decay board',()=>{
  const g=fresh();g.players[0].hand=[card('WEAKEN_ALL')];g.players[0].field=[mon('RUST_SHROOM'),mon('RUST_SHROOM')];
  assert.notEqual(C.safeGreedy(g).type,'play');
 });
 test('maintenance removal does not indefinitely starve mana growth',()=>{
  const g=fresh();g.players[0].maxMana=3;g.players[0].field=[mon('RUST_SHROOM'),mon('RUST_SHROOM')];g.players[1].field=[mon('NWL3')];
  g.players[0].hand=[card('S15'),card('STARTER_MANA')];const a=C.safeGreedy(g);assert.equal(a.type,'play');assert.equal(g.players[0].hand[a.idx].id,'STARTER_MANA');
 });
 test('entering Goblin Raider includes its own aura in suppression calculations',()=>{
  const g=fresh();g.players[1].enchants=[{card:card('WEAKEN_ALL'),turns:99}];assert.equal(C.enteringAttack(g,g.players[0],card('GOBLIN_RAIDER')),1);
 });
 test('new Goblin King needs support; training engine benefits from Castle',()=>{
  const g=fresh();const unsupported=value(g,'GOBLIN_KING');g.players[0].deck=[card('GOBLIN'),card('GOBLIN_RAIDER')];assert(value(g,'GOBLIN_KING').readiness>unsupported.readiness);
  const training=value(g,'TRAINING_GROUND');g.players[0].deck=[card('CASTLE')];assert(value(g,'TRAINING_GROUND').synergy>training.synergy);
 });
 console.log(`PASS ${passed} rework scenario groups`);
} finally {await rm(dir,{recursive:true,force:true});}
