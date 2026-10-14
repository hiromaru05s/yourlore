import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-bot-adaptive-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botEconomy';export * from './client/src/shared/botStrategy';export * from './client/src/shared/botActions';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0,passed=0;
 const card=id=>{const def=C.DB[id]??C.STARTERS[id];assert(def,'current card: '+id);return {...def,uid:'adaptive-'+serial++};};
 const mon=id=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0});
 const fresh=(ids=[])=>{const g=C.createGame({mode:'bot',seed:972,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=9;g.pending=null;g.market=ids.map(card);g.marketStock=ids.map(()=>3);for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],removed:[],exile:[],revealedCards:[],hp:40,mana:4,maxMana:6});return g;};
 const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
 const value=(g,id,i)=>C.purchaseEvaluator(g,g.players[0])(card(id),i);
 test('Elf purchase changes with real Dew support, without changing the card',()=>{
  const g=fresh(['ELF']);g.players[0].deck=['RUST_SHROOM','RUST_SHROOM','GHOST'].map(card);
  assert(value(g,'ELF').margin<0);assert.notEqual(C.safeGreedy(g).type,'buyMarket');
  const ready=structuredClone(g);ready.players[0].dew=4;
  assert(value(ready,'ELF').margin>0);assert.equal(C.safeGreedy(ready).type,'buyMarket');
  for(const tier of ['hard','hell']) {const a=C.botDecide(g,tier);assert.notEqual(a.type,'buyMarket',tier+' cannot buy an unsupported Elf as a generic bomb');}
 });
 test('decay engine becomes a buy for a decay build',()=>{
  const plain=fresh(['STRONG_ACID']),decay=structuredClone(plain);decay.players[0].deck=['RUST_SHROOM','RUST_SHROOM','RUST_SHROOM'].map(card);
  assert.notEqual(C.safeGreedy(plain).type,'buyMarket');assert.equal(C.safeGreedy(decay).type,'buyMarket');
 });
 test('visible enchantments justify a first answer, not redundant answer flooding',()=>{
  const g=fresh(['DISARM1']);assert.notEqual(C.safeGreedy(g).type,'buyMarket');
  g.players[1].enchants=['STRONG_ACID','BLACK_INFINITY'].map(id=>({card:card(id),turns:99}));
  assert.equal(C.safeGreedy(g).type,'buyMarket');const first=value(g,'DISARM1');
  g.players[0].deck=[card('DISARM1'),card('DISARM2')];assert(value(g,'DISARM1').margin<first.margin);
 });
 test('an expensive strong deck can still buy its missing engine answer',()=>{
  const g=fresh(['DISARM1']);g.players[0].deck=Array.from({length:5},()=>card('POISON_MASTER'));g.players[1].enchants=['STRONG_ACID','BLACK_INFINITY'].map(id=>({card:card(id),turns:99}));
  assert(value(g,'DISARM1').margin>0);assert.equal(C.safeGreedy(g).type,'buyMarket');
 });
 test('expired Countercalculation does not count as a usable answer or attract another buy',()=>{
  const g=fresh(['DISARM1']);g.players[0].deck=[...Array.from({length:5},()=>card('POISON_MASTER')),card('COUNTERCALC')];g.players[1].maxMana=8;g.players[1].enchants=['STRONG_ACID','BLACK_INFINITY'].map(id=>({card:card(id),turns:99}));
  assert(value(g,'DISARM1').margin>0);assert(value(g,'COUNTERCALC').margin<0);assert.equal(C.safeGreedy(g).type,'buyMarket');
 });
 test('acquired enchantment removal is actually played and resolves legally',()=>{
  let g=fresh();g.players[0].hand=[card('DISARM1')];g.players[1].enchants=[{card:card('STRONG_ACID'),turns:99}];
  const a=C.safeGreedy(g);assert.equal(a.type,'play');g=C.reduce(g,a).state;g=C.reduce(g,C.safeGreedy(g)).state;assert.equal(g.players[1].enchants.length,0);
 });
 test('actual Hard and Hell acquire the missing answer within their purchase turn',()=>{
  for(const tier of ['hard','hell']) {
   let g=fresh(['DISARM1']);g.players[0].deck=Array.from({length:3},()=>card('POISON_MASTER'));g.players[1].enchants=['STRONG_ACID','BLACK_INFINITY'].map(id=>({card:card(id),turns:99}));
   for(let i=0;i<16&&!g.over&&g.cur===0;i++)g=C.reduce(g,C.botDecide(g,tier)).state;
   assert(g.players[0].discard.some(c=>c.id==='DISARM1'),tier+' must preserve resources for the missing answer');
  }
 });
 test('Soul Harvest needs a public curse plan',()=>{
  const g=fresh();assert(value(g,'SOUL_HARVEST').margin<0);
  g.players[1].discard=Array.from({length:5},()=>card('CURSE'));assert(value(g,'SOUL_HARVEST').margin>0);
 });
 test('public build, hidden inventory and removed physical cards have separate roles',()=>{
  const g=fresh(['ELF','DISARM1']);const before=value(g,'DISARM1');
  const twin=structuredClone(g);twin.players[1].hand=[card('STRONG_ACID')];twin.players[1].deck=[card('BLACK_INFINITY')];twin.players[1].collection=['BLACK_INFINITY'];twin.players[1].supply=[card('ELF')];twin.rng=987654;
  assert.deepEqual(value(twin,'DISARM1'),before);
  const revealed=card('STRONG_ACID');g.players[1].revealedCards=[{id:revealed.id,uid:revealed.uid}];
  assert(value(g,'DISARM1').matchup>before.matchup);g.players[1].removed=[revealed];assert.deepEqual(value(g,'DISARM1'),before);
 });
 test('temporary exile remains a future public threat, permanent removal does not',()=>{
  const g=fresh();const c=card('STRONG_ACID');const before=value(g,'DISARM1').matchup;g.players[1].exile=[{card:c,turns:1}];
  assert(value(g,'DISARM1').matchup>before);g.players[1].exile=[];g.players[1].removed=[c];assert.equal(value(g,'DISARM1').matchup,before);
 });
 test('last-copy denial uses public evidence and available stock',()=>{
  const g=fresh(['STRONG_ACID']);g.players[1].discard=[card('RUST_SHROOM')];
  assert.equal(value(g,'STRONG_ACID',0).denial,0);g.marketStock[0]=1;assert(value(g,'STRONG_ACID',0).denial>0);
  g.marketStock[0]=0;assert.equal(value(g,'STRONG_ACID',0).denial,0);
 });
 test('late slow buys lose value while immediate Quick cards keep their horizon',()=>{
  const g=fresh();const early=value(g,'POISON_MASTER');g.turn=60;assert(value(g,'POISON_MASTER').delay<early.delay);
  assert.equal(value(g,'QUICK_AID').delay,0);
 });
 test('World Care projects one Dew per turn, not two',()=>{
  const g=fresh();g.players[0].dew=6;g.players[0].enchants=[{card:card('WORLD_CARE'),turns:99}];const short=value(g,'HIGH_ELF').readiness;
  g.players[0].dew=8;assert(value(g,'HIGH_ELF').readiness>short);
 });
 test('unmet special conditions and active Castle discount unusable bombs',()=>{
  const g=fresh();assert(value(g,'HIGH_ELF').readiness<0);const base=value(g,'POISON_MASTER');g.players[0].field=[mon('CASTLE')];assert(value(g,'POISON_MASTER').readiness<base.readiness);
 });
 test('attack-dependent buys lose value under global suppression and recover under Trick Room',()=>{
  const g=fresh(['POISON_MASTER']);const clear=value(g,'POISON_MASTER');g.players[1].enchants=[{card:card('WEAKEN_ALL'),turns:99}];
  const blocked=value(g,'POISON_MASTER');assert(blocked.margin<clear.margin);assert(blocked.margin<0);
  g.trickLeft=4;assert(value(g,'POISON_MASTER').margin>blocked.margin);
 });
 test('Blood Rite prevents false burn lethal and harmful opponent healing',()=>{
  const g=fresh();g.players[0].hand=[card('S13')];g.players[0].mana=4;g.players[1].hp=1;assert.equal(C.safeGreedy(g).type,'play');
  g.players[1].enchants=[{card:card('BLOOD_RITE'),turns:99,bornTurn:8}];assert.notEqual(C.safeGreedy(g).type,'play');
  for(const tier of ['hard','hell'])assert.notEqual(C.botDecide(g,tier).type,'play');
 });
 test('random Spark retains its disruption branches under Blood Rite',()=>{
  const g=fresh();g.players[0].hand=[card('S1')];g.players[1].enchants=[{card:card('BLOOD_RITE'),turns:99,bornTurn:8}];
  for(let seed=1;seed<=12;seed++){g.rng=seed;const a={type:'play',idx:0},next=C.reduce(g,a).state;assert.equal(C.unproductiveOpponentHeal(g,a,next),false);}
 });
 test('reflection plus Blood Rite can turn a burn spell into useful self-healing',()=>{
  let g=fresh();g.players[0].hand=[card('S13')];g.players[0].mana=4;g.players[1].enchants=['BLOOD_RITE','BLACK_REVERSE'].map(id=>({card:card(id),turns:99,bornTurn:8}));
  assert.equal(C.safeGreedy(g).type,'play');g=C.reduce(g,C.safeGreedy(g)).state;assert.equal(g.players[0].hp,51);assert.equal(g.players[1].hp,40);
 });
 test('reflected face attacks and lethal reflected overflow are avoided',()=>{
  let g=fresh();g.players[0].mana=0;g.players[0].hp=4;g.players[0].field=[{...mon('M2'),atk:8,def:10}];g.players[1].enchants=[{card:card('BLACK_REVERSE'),turns:99}];
  assert.notEqual(C.safeGreedy(g).type,'attack');for(const tier of ['hard','hell'])assert.notEqual(C.botDecide(g,tier).type,'attack');
  g.players[1].field=[{...mon('M2'),atk:9,def:1},{...mon('M2'),atk:3,def:12}];const safe=g.players[1].field[1].uid;
  g=C.reduce(g,C.safeGreedy(g)).state;assert.equal(C.safeGreedy(g).uid,safe);g=C.reduce(g,C.safeGreedy(g)).state;assert(g.players[0].hp>0);
 });
 test('public damage conversion changes purchase value and Fireball targeting',()=>{
  const g=fresh();const plain=value(g,'S13').readiness;g.players[1].enchants=[{card:card('BLOOD_RITE'),turns:99,bornTurn:8}];assert(value(g,'S13').readiness<plain);
  g.players[1].enchants.push({card:card('BLACK_REVERSE'),turns:99});assert.equal(value(g,'S13').readiness,plain);
  for(const ids of [[],['BLOOD_RITE'],['BLACK_REVERSE'],['BLOOD_RITE','BLACK_REVERSE']]){
   g.players[1].enchants=ids.map(id=>({card:card(id),turns:99,bornTurn:8}));g.pending={kind:'cardChoice',owner:0,reason:'FIRE_BALL',hint:'',hintJa:'',allowCancel:false};
   assert.equal(C.safeGreedy(g).uid,ids.length===1?'player-0':'player-1');
  }
 });
 test('self-damage respects shields and spell amplification instead of a fixed HP cutoff',()=>{
  const g=fresh();g.players[0].hand=[card('FLAME')];g.players[0].mana=1;g.players[0].hp=1;g.players[0].shield=3;
  assert.equal(C.safeGreedy(g).type,'play');assert(C.reduce(g,C.safeGreedy(g)).state.players[0].hp>0);
  g.players[0].shield=0;g.players[0].hp=2;const double=Object.values(C.DB).find(c=>c.ench==='doubleUp');assert(double);g.players[1].enchants=[{card:card(double.id),turns:99}];
  assert.notEqual(C.safeGreedy(g).type,'play');
 });
 test('low-HP Catalyst remains usable when Blood Rite converts its self-damage',()=>{
  let g=fresh();g.players[0].hp=1;g.players[0].hand=[card('CATALYST')];g.players[0].enchants=[{card:card('BLOOD_RITE'),turns:99,bornTurn:8}];g.players[1].enchants=[{card:card('STRONG_ACID'),turns:99}];
  assert.equal(C.safeGreedy(g).type,'play');g=C.reduce(g,C.safeGreedy(g)).state;assert(g.players[0].hp>1);assert(!g.over);
 });
 test('Void Apostle is not summoned when its actual self-damage would lose the game',()=>{
  const g=fresh();g.players[0].hp=1;g.players[0].mana=20;g.players[0].maxMana=20;g.players[0].hand=[card('VOID_APOSTLE')];
  assert(C.reduce(g,{type:'play',idx:0}).state.over);assert.notEqual(C.safeGreedy(g).type,'play');
 });
 test('Poison Master removes the large threat instead of wasting decay on the weakest body',()=>{
  const g=fresh();g.players[0].field=[mon('POISON_MASTER')];g.players[1].field=[{...mon('M2'),atk:1,def:2},{...mon('M2'),atk:12,def:25}];
  const target=g.players[1].field[1].uid;const attack=C.reduce(g,{type:'attack',uid:g.players[0].field[0].uid}).state;
  assert.equal(C.safeGreedy(attack).uid,target);const next=C.reduce(attack,C.safeGreedy(attack)).state;assert(!next.players[1].field.some(m=>m.uid===target));
 });
 test('suppression reserves mana before developing another small body',()=>{
  const g=fresh();g.players[0].hp=20;g.players[0].mana=2;g.players[0].hand=[card('WEAKEN_ALL'),card('RUST_SHROOM')];g.players[1].field=Array.from({length:3},()=>mon('GHOST'));
  const a=C.safeGreedy(g);assert.equal(a.type,'play');assert.equal(g.players[0].hand[a.idx].id,'WEAKEN_ALL');
 });
 test('Rift is established before spending its mana on a small summon',()=>{
  const g=fresh();g.players[0].hand=['RIFT','RUST_SHROOM','STARTER_TRASH','STARTER_TRASH'].map(card);
  const a=C.safeGreedy(g);assert.equal(a.type,'play');assert.equal(g.players[0].hand[a.idx].id,'RIFT');
 });
 test('offer refresh expectation ignores hidden RNG and respects affordability/blocking',()=>{
  const g=fresh();g.players[0].mana=6;g.players[0].maxMana=6;
  const expected=C.refreshValue(g,g.players[0]);assert(Number.isFinite(expected));
  const twin=structuredClone(g);twin.rng=9829;twin.players[1].hand=[card('HIGH_ELF')];twin.players[1].deck=[card('PRIEST')];assert.equal(C.refreshValue(twin,twin.players[0]),expected);
  g.players[0].mana=1;assert.equal(C.refreshValue(g,g.players[0]),-Infinity);
  g.players[0].mana=6;g.players[0].refreshBlockTurn=true;assert.equal(C.refreshValue(g,g.players[0]),-Infinity);
 });
 test('multiple World Trees do not compound the current-rule recovery multiplier',()=>{
  const g=fresh();g.players[0].dew=3;g.players[0].field=[mon('WORLD_TREE')];assert.equal(C.recoveryPerTurn(g,g.players[0]),6);g.players[0].field.push(mon('WORLD_TREE'));assert.equal(C.recoveryPerTurn(g,g.players[0]),6);
 });
 console.log(`PASS ${passed} adaptive strategy suites`);
}finally{await rm(dir,{recursive:true,force:true});}
