// Exercise the public reducer and the serialized view used by remote players.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result = await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';export {restoreReworkedCards} from './server/src/reworkedCardSnapshot';`},bundle:true,platform:'node',format:'esm',write:false});
const E=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
let serial=0;
const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'army-'+(++serial)});
const mon=id=>({...card(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false});
const fresh=(side=0)=>{
  const g=E.createGame({mode:'online',seed:41,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.turn=3;g.cur=side;
  for (const pl of g.players) Object.assign(pl,{hp:100,mana:24,maxMana:24,deck:[],discard:[],field:[],hand:[],traps:[],enchants:[],quests:[],removed:[],dew:0,shield:0,uses:{},usesTurn:{},playsTurn:0,openingDrawReady:false});
  return g;
};
const step=(g,a)=>E.reduce(g,a).state;
function cast(g,id){const p=g.players[g.cur];p.hand.push(card(id));return step(g,{type:'play',idx:p.hand.length-1});}
function quick(g,id){g.market[0]=card(id);return step(g,{type:'buyMarket',i:0});}
const pick=(g,uid)=>step(g,{type:'pick',uid});
const end=g=>step(g,{type:'endTurn'});
function enchant(g,id,owner=g.cur){g.players[owner].enchants.push({card:card(id),turns:99,bornTurn:0});}
function check(name,f){f();console.log('PASS',name);}
check('Dragon Killer tracks both fusion names and both bonuses independently',()=>{
  for(const fused of ['DRAGON_RIDER','ANTIQUE_DK']){
    let g=fresh();g.players[1].field=[mon('GM6_0'),mon(fused)];
    g=cast(g,'DRAGON_KILLER');let p=g.players[0],m=p.field[0];
    assert.equal(p.hand[0].id,'MANA_HEART');assert.equal(E.effAtk(p,m,g),41);assert(E.hasPassive(m,'dual'));
    g.players[1].field.pop();g=end(g);p=g.players[0];m=p.field[0];
    assert.equal(E.effAtk(p,m,g),21);assert(!E.hasPassive(m,'dual'));assert.equal(p.shield,2);
  }
});
check('Captain shots and every allied Soldier generate separate packets without Captain recursion',()=>{
  let g=fresh();g.players[0].field=['CAPTAIN','GUNNER','SOLDIER2','SOLDIER2','CANNON_COMMANDER'].map(mon);
  g=end(g);
  assert.equal(g.players[1].hp,100-8-6*(1+3));
});
check('Rebellion moves a hand summon and resolves its summons on the receiving side',()=>{
  let g=fresh();enchant(g,'COUP');g=cast(g,'CANNON_COMMANDER');
  assert.deepEqual(g.players[0].field.map(m=>m.id),[]);assert.deepEqual(g.players[1].field.map(m=>m.id),['CANNON_COMMANDER','GUNNER','HEAVY_GUNNER']);
});
check('Strength improves both fields, expires with a conditional buff, and does not amplify debuffs',()=>{
  let g=fresh();enchant(g,'SECRET_OF_STRENGTH');g.players[0].field=['M1','CASTLE','SOLDIER2'].map(mon);g=cast(g,'FORTIFY_CASTLE');
  assert.deepEqual(g.players[0].field.map(m=>[m.atkMod,m.defMod]),[[-1,5],[-1,5],[2,5]]);
  g.players[1].field=[mon('D_RED')];g=cast(g,'DRAGON_KILLER');
  assert(!g.players[0].field.some(m=>m.id==='DRAGON_KILLER')); // Castle blocks the high-cost summon.
  g.players[0].field=[];g=cast(g,'DRAGON_KILLER');let m=g.players[0].field[0];assert.equal(E.effAtk(g.players[0],m,g),22);
  g.players[1].field=[];assert.equal(E.effAtk(g.players[0],m,g),6);
});
check('Market Fever resolves even with zero, one or two opposing cards and consumes stock',()=>{
  for(const n of [0,1,2]){
    let g=fresh();g.market[1]=card('M1');g.players[1].hand=Array.from({length:n},()=>card('S10'));
    g=quick(g,'MARKET_FEVER');g=pick(g,g.market[1].uid);assert.equal(g.players[0].hand[0].id,'M1');
    for(let i=0;i<n;i++){assert.equal(E.actingSide(g),1);g=pick(g,g.players[1].hand[0].uid);}
    assert.equal(E.actingSide(g),1);g=pick(g,g.market[1].uid);assert.equal(g.players[1].hand[0].id,'M1');assert.equal(g.players[1].discard.length,n);assert.equal(g.marketStock[1],1);
  }
});
check('Wanted exposes distinct eligible names without exposing hand order, then really prevents play',()=>{
  let g=fresh();g.players[1].hand=[card('S10'),card('S10')];g.players[1].deck=[card('S10'),card('M1')];g=cast(g,'WANTED');
  const view=E.redactFor(g,0);assert(view.players[1].hand.every(x=>x.id==='HIDDEN'));
  assert.deepEqual(E.effectChoices(view).map(x=>x.uid),['M1','S10']);g=pick(g,'S10');g=end(g);
  assert(E.playBlockReason(g,1,g.players[1].hand[0]));
});
check('Fate Wraith establishes the six-crystal floor before resetting crystals',()=>{
  let g=fresh();g.players[0].deck=[card('MINI_SPIRIT')];g.players[1].hand=[card('M1')];g=cast(g,'FATE_WRAITH');
  assert.deepEqual(g.players.map(p=>p.maxMana),[6,3]);assert.equal(g.players[1].discard[0].id,'M1');
  g=end(g);g=cast(g,'STARTER_MANA');assert(g.players[1].discard.some(c=>c.id==='CURSE'));
});
check('Boundary suppresses only opposing passives, offers face through monsters, and reverses on leaving',()=>{
  let g=fresh();g.players[1].field=[mon('TIME_WRAITH')];g=cast(g,'SWORD_GRAVE_WRAITH');const m=g.players[0].field[0],enemy=g.players[1].field[0];
  assert(E.hasPassive(m,'boundary'));assert(!E.hasPassive(m,'dual'));assert(E.hasPassive(enemy,'void'));assert(!E.hasPassive(enemy,'evade'));
  g=step(g,{type:'attack',uid:m.uid});assert(E.effectChoices(g).some(c=>c.uid==='opposing-player'));g=pick(g,'opposing-player');assert.equal(g.players[1].hp,65);
  g.players[0].field=[];g=end(g);assert(E.hasPassive(g.players[1].field[0],'evade'));
});
check('Attune upgrades stack, dual replays the base only, and printed costs do not mutate',()=>{
  let g=fresh();g.players[0].maxMana=28;g.players[0].mana=28;enchant(g,'DUAL_ATTUNE');g.players[0].field=[mon('MINI_SPIRIT')];
  g=cast(g,'ATTUNE_SECRET');assert.equal(g.players[0].maxMana,28);g=cast(g,'AMA');g=cast(g,'STARTER_MANA');
  assert.equal(g.players[0].field[0].defMod,6);assert.equal(g.players[0].maxMana,30);assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,6);assert.equal(E.DB.AMA.play,5);
});
check('Mana Heart shared first-use delay and twenty Curse Seals survive room serialization',()=>{
  let g=fresh();g.players[0].maxMana=15;g=cast(g,'MANA_HEART');assert.equal(g.players[0].heartDue,25);assert.equal(g.players[0].maxMana,18);
  g=end(g);g=cast(g,'MANA_HEART');assert.deepEqual(g.players.map(p=>p.hp),[109,109]);
  g.turn=24;enchant(g,'SHARED_MARKET',0);g=end(JSON.parse(JSON.stringify(g)));assert.equal(g.players[0].hp,1);assert.equal(g.players[0].maxMana,12);assert.equal(g.players[0].enchants.length,0);
  g=fresh();g.players[1].curseSeals=19;g=cast(g,'CURSE');g=end(g);assert.equal(g.players[1].curseSeals,20);g=end(g);assert.equal(g.players[1].hp,1);assert.equal(g.players[1].curseSeals,0);
});
check('Silence suspends monster triggers and auras, retains printed keywords, then restores the old field',()=>{
  let g=fresh();const guard=mon('M5');g.players[0].field=[guard,mon('CAPTAIN')];g=cast(g,'ESSENCE_OF_LIFE');
  g=cast(g,'CANNON_COMMANDER');assert.equal(g.players[0].field.length,3);
  g=end(g);assert.equal(g.players[1].hp,100);
  g.players[1].field=[mon('M1')];g=cast(g,'SWORD_GRAVE_WRAITH');const spirit=g.players[1].field.at(-1);assert(E.hasPassive(spirit,'boundary'));
  g.players[0].enchants=[];g=end(g);assert.equal(g.players[0].field[0].onSummon,guard.onSummon);assert.equal(g.players[0].field[0].mutedEffects,undefined);
});
check('Attune Scholarship counts subsequent related plays and grants the selected reward to the graveyard',()=>{
  let g=fresh();g=cast(g,'QUEST_ATTUNE_STUDY');assert.equal(g.players[0].quests[0].progress,0);
  g=cast(g,'MINI_SPIRIT');assert.equal(g.players[0].quests[0].progress,1);
  g.players[0].quests[0].progress=7;g=cast(g,'STARTER_MANA');
  assert.deepEqual(E.effectChoices(g).map(c=>c.uid).sort(),['ATTUNE_RESEARCH','ATTUNE_SHINE','DUAL_ATTUNE']);g=pick(g,'ATTUNE_SHINE');
  assert(g.players[0].discard.some(c=>c.id==='ATTUNE_SHINE'));
});
check('Attune Lock gives the opponent crystals and expires after six opposing turns',()=>{
  let g=fresh();g.players[1].maxMana=10;g=cast(g,'ATTUNE_LOCK');assert.equal(g.players[1].maxMana,12);
  for(let i=0;i<6;i++){g=end(g);assert(E.playBlockReason(g,1,card('STARTER_MANA')));g=end(g);}
  g=end(g);assert.equal(E.playBlockReason(g,1,card('STARTER_MANA')),null);
});
check('Wanted preserves an older ban when a second name is chosen',()=>{
  let g=fresh();g.players[1].hand=[card('M1'),card('M2')];g=pick(cast(g,'WANTED'),'M1');g=cast(g,'WANTED');
  assert.deepEqual(E.effectChoices(g).map(c=>c.uid),['M2']);g=pick(g,'M2');g=end(g);
  for(const id of ['M1','M2'])assert(E.playBlockReason(g,1,card(id)));
});
check('Market discount is shared and only the side with its own merchant gets its increased rate',()=>{
  let g=fresh();g.players[0].field=[mon('MERCH1')];g=cast(g,'SHARED_MARKET');
  assert.equal(E.buyCost(g.players[0],card('CANNON_COMMANDER')),4);assert.equal(E.buyCost(g.players[1],card('CANNON_COMMANDER')),5);
  g=cast(g,'MERCH2');assert.equal(g.pending.reason,'MERCH2');const old=g.market[0];g=pick(g,old.uid);assert.notEqual(g.market[0].id,old.id);assert.equal(g.marketStock[0],E.MARKET_STOCK);
});
check('Mimic owner receives a new Curse and Black Dragon grants Void before damaging an enemy',()=>{
  let g=fresh();const mimic=mon('MIMIC');g.players[1].field=[mimic];g=cast(g,'D_BLACK');
  assert.equal(g.players[1].hp,95);assert(g.players[1].removed.some(m=>m.uid===mimic.uid));assert(g.players[1].discard.some(c=>c.id==='CURSE'));
});
check('Time Wraith moves enemy Rift and chosen enchantments, and an opponent killing it reserves their next skipped turn',()=>{
  let g=fresh();const r=card('CURSE');g.players[1].removed=[r];enchant(g,'E2',1);g=cast(g,'TIME_WRAITH');assert(g.players[1].discard.some(c=>c.uid===r.uid));
  const e=g.players[1].enchants[0].card;g=pick(g,e.uid);assert(g.players[1].removed.some(c=>c.uid===e.uid));
  g=end(g);const w=g.players[0].field[0];g=pick(cast(g,'SOUL_HARVEST'),w.uid);assert(g.players[0].discard.some(c=>c.id==='TIMEWARP'));assert.equal(g.players[1].skipTurns,1);
});
