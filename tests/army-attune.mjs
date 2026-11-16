// Exercise the public reducer and the serialized view used by remote players.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result = await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';export {greedyDecide} from './client/src/shared/bot';export {restoreReworkedCards} from './server/src/reworkedCardSnapshot';`},bundle:true,platform:'node',format:'esm',write:false});
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
check('Supply Line is a permanent starter and costs three with or without allied monsters',()=>{
  const id = 'SUPPLY_LINE';
  assert(E.DECK_POOL.includes(id)); assert(!E.BUYABLE_POOL.includes(id));
  assert.equal(E.sanitizeDeck([id,...Array(7).fill('STARTER_TRASH')])[0],id);
  assert.equal(E.enchantHasTurnCountdown(E.DB[id]),false);
  for (const occupied of [false,true]) for (const mana of [1,2,3]) {
    let g=fresh(1); const p=g.players[1]; p.mana=mana;
    g.players[0].field=[mon('M1')];
    if (occupied) p.field=[mon('M1')];
    const cost=3;
    assert.equal(E.playCost(card(id),p),cost);
    g=cast(g,id);
    assert.equal(g.players[1].enchants.length,Number(mana>=cost));
    assert.equal(g.players[1].mana,mana>=cost?mana-cost:mana);
  }
});
check('Conscription resolves all six faces and transfers existing military units before Rebellion',()=>{
  for (const side of [0,1]) {
    const seen = new Set();
    for (let seed=1; seed<=500 && seen.size<6; seed++) {
      const g=fresh(side), p=g.players[side], foe=g.players[1-side];
      g.rng=seed;
      const soldier=mon('SOLDIER2'), castle=mon('CASTLE'), gunner=mon('GUNNER');
      soldier.defMod=2; soldier.dmg=1; soldier.atkMod=4;
      p.field=[soldier,castle,gunner];p.hand=[card('MUSTER_DIE')];
      const {state,events}=E.reduce(g,{type:'play',idx:0});
      const n=events.find(e=>e.type==='dice').rolls[0]; seen.add(n);
      const own=state.players[side], other=state.players[1-side];
      assert.equal(own.mana,20);
      if(n===1) {
        assert.deepEqual(own.field.map(m=>m.uid),[castle.uid]);
        assert.deepEqual(other.field.map(m=>m.uid),[soldier.uid,gunner.uid]);
        assert.equal(other.field[0].dmg,1); assert.equal(other.field[0].atkMod,4);
        assert.equal(own.enchants[0].card.id,'COUP');
        for (const slots of [0,1]) {
          foe.field=Array.from({length:E.FIELD_MAX-slots},()=>mon('M1'));
          const next=E.reduce(g,{type:'play',idx:0}).state;
          assert.equal(next.players[1-side].field.length,E.FIELD_MAX);
          assert.equal(next.players[side].field.length,3-slots);
          assert(next.players[side].enchants.some(e=>e.card.id==='COUP'));
        }
        const family=['SOLDIER2','INFKNIGHT','CAVALRY','GUNNER','HEAVY_GUNNER','CAPTAIN','CANNON_COMMANDER'];
        p.field=family.map(mon);foe.field=[];
        enchant(g,'SUPPLY_LINE',1-side);
        foe.deck=[card('STARTER_TRASH')];
        const transferred=E.reduce(g,{type:'play',idx:0}).state;
        assert.deepEqual(transferred.players[1-side].field.map(m=>m.uid),p.field.map(m=>m.uid));
        assert.equal(transferred.players[1-side].hand.length,0,'a change of control does not trigger a summon draw');
        assert.equal(transferred.players[side].field.length,0);
        p.enchants=Array.from({length:14},()=>({card:card('SUPPLY_LINE'),turns:99,bornTurn:0}));
        const full=E.reduce(g,{type:'play',idx:0}).state;
        assert.deepEqual(full.players[1-side].field.map(m=>m.id),family);
        assert(!full.players[side].enchants.some(e=>e.card.id==='COUP'));
      } else {
        const tokens=own.field.slice(3).map(m=>m.id);
        assert.deepEqual(tokens,Array(n<=4?n-1:n-4).fill(n<=4?'SOLDIER2':'GUNNER'));
        assert.equal(other.field.length,0);
      }
    }
    assert.equal(seen.size,6);
  }
});
check('v92 saved rooms refresh the nine new prints just once and preserve live identities',()=>{
  const g=fresh();g.novemberBalanceApplied=2;delete g.balance94Applied;
  const p=g.players[0], leader=mon('MERC_LEADER'), master=mon('MERC_MASTER');
  Object.assign(leader,{trickSwapped:true,def:4,defMod:2,dmg:1});
  Object.assign(master,{def:5,dmg:4});p.field=[leader,master];
  p.hand=['MUSTER_DIE','SUPPLY_LINE','MINI_SPIRIT','FORBIDDEN'].map(id=>({...card(id),textJa:'old'}));
  g.market=[{...card('QUICK_ESCORT'),cost:4}];p.supply=[{...card('QUICK_MUSTER'),cost:3}];
  p.discard=[{...card('GOLEM_TEST'),atk:1}];p.hand[3].cost=2;
  E.restoreReworkedCards(g);
  assert.equal(p.field[0].uid,leader.uid);assert.equal(leader.def,3);assert.equal(leader.defMod,2);assert.equal(leader.dmg,1);
  assert.equal(master.def,3);assert.equal(master.dmg,2);assert.equal(p.discard[0].atk,0);
  assert.equal(g.market[0].cost,6);assert.equal(p.supply[0].cost,4);assert.equal(p.hand[3].cost,5);
  for(const c of p.hand) assert.equal(c.textJa,E.DB[c.id].textJa);
  const saved=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),saved);
});
check('Supply Lines draw per successful summon, including tokens, and stop when removed',()=>{
  let g=fresh();
  g=cast(cast(g,'SUPPLY_LINE'),'SUPPLY_LINE');
  g.players[0].deck=Array.from({length:12},()=>card('STARTER_TRASH'));
  g=cast(g,'M1'); assert.equal(g.players[0].hand.length,2);
  g=cast(g,'SCARECROW'); assert.equal(g.players[0].hand.length,8);
  g.players[0].summonCap=5; g=cast(g,'SCARECROW');
  assert.equal(g.players[0].field.length,5);assert.equal(g.players[0].hand.length,10);
  g.cur=1;g=cast(g,'M1');assert.equal(g.players[0].hand.length,10);
  g.cur=0;g.players[0].enchants=[];g.players[0].summonCap=7;
  g=cast(g,'M1');assert.equal(g.players[0].hand.length,10);
});
check('Supply Line credits the summoner when Rebellion sends a Soldier to the other field',()=>{
  let g=fresh();for(const side of [0,1]) {
    enchant(g,'SUPPLY_LINE',side);g.players[side].deck=[card('STARTER_TRASH')];
  }
  enchant(g,'COUP');g=cast(g,'SOLDIER2');
  assert.equal(g.players[1].field[0].id,'SOLDIER2');
  assert.equal(g.players[0].hand.length,1);assert.equal(g.players[1].hand.length,0);
  assert.equal(g.players[0].expansion.extraDraw,1);
});
check('Rally King grants one Guts to every military rank on either summon order',()=>{
  assert.deepEqual([E.DB.VITAL4.atk,E.DB.VITAL4.def],[2,5]);
  for(const id of ['SOLDIER2','INFKNIGHT','CAVALRY','GUNNER','HEAVY_GUNNER','CAPTAIN','CANNON_COMMANDER']){
    let g=fresh();g.players[0].field=[mon(id),mon('M1')];g.players[1].field=[mon(id)];
    g=cast(g,'VITAL4');assert.equal(g.players[0].field[0].guts,1,id);
    assert(!E.hasPassive(g.players[0].field[1],'guts'));assert(!E.hasPassive(g.players[1].field[0],'guts'));
    g=cast(g,id);assert(g.players[0].field.filter(m=>m.id===id).length>=2);
    assert(g.players[0].field.filter(m=>m.id===id).every(m=>m.guts===1));
  }
});
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
  g=step(g,{type:'attack',uid:m.uid});assert(E.effectChoices(g).some(c=>c.uid==='opposing-player'));g=pick(g,'opposing-player');assert.equal(g.players[1].hp,75);
  g.players[0].field=[];g=end(g);assert(E.hasPassive(g.players[1].field[0],'evade'));
});
check('Attune upgrades stack, dual replays the base only, and printed costs do not mutate',()=>{
  let g=fresh();g.players[0].maxMana=28;g.players[0].mana=28;enchant(g,'DUAL_ATTUNE');g.players[0].field=[mon('MINI_SPIRIT')];
  g=cast(g,'ATTUNE_SECRET');assert.equal(g.players[0].maxMana,28);g=cast(g,'AMA');g=cast(g,'STARTER_MANA');
  assert.equal(g.players[0].field[0].defMod,4);assert.equal(g.players[0].maxMana,30);assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,6);assert.equal(E.DB.AMA.play,5);
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
// v94 regressions exercise public actions with both players in each role.
for (const side of [0,1]) {
  const other = 1-side;
  check('Muster restricts only its summons, including Rebellion ('+side+')',()=>{
    for (const castle of [false,true]) for (const redirected of [false,true]) {
      let g=fresh(side);
      if (castle) g.players[side].field.push(mon('CASTLE'));
      if (redirected) enchant(g,'COUP',side);
      const id=castle?'INFKNIGHT':'SOLDIER2', dest=redirected?other:side, existing=mon(id);
      g.players[dest].field.push(existing);
      g=quick(g,'QUICK_MUSTER');
      const summoned=g.players[dest].field.filter(m=>m.id===id && m.uid!==existing.uid);
      assert.equal(summoned.length,castle?2:3);
      for (const m of summoned) {
        assert.equal(m.noAttackTurn,g.turn);
        assert(!E.monsterCanAttack(g,g.players[dest],m));
        assert.equal(step(g,{type:'attack',uid:m.uid}).pending,null);
      }
      assert.equal(g.players[dest].field.find(m=>m.uid===existing.uid).noAttackTurn,undefined);
      g=end(g);
      assert(summoned.every(m=>m.noAttackTurn!==g.turn));
    }
    let g=quick(fresh(side),'QUICK_ESCORT');
    for (const m of g.players[side].field) {
      assert(E.hasPassive(m,'taunt')); assert(!E.hasPassive(m,'counter')); assert(m.escortLocked);
    }
    assert(E.hasPassive(E.DB.INFKNIGHT,'counter'));
  });
  check('Battlefield recovers the same card on 5–6 only from the grave ('+side+')',()=>{
    const faces=new Set();
    for(let seed=1;seed<=150 && faces.size<6;seed++) {
      let g=fresh(side);enchant(g,'BATTLEFIELD',other);
      const victim=mon('M2');g.players[other].field=[victim];g=cast(g,'S15');g.rng=seed*7919;
      const result=E.reduce(g,{type:'pick',uid:victim.uid});
      const face=result.events.find(e=>e.type==='dice' && e.source.id==='BATTLEFIELD').rolls[0];
      faces.add(face);
      const p=result.state.players[other];
      assert.equal(p.hand.some(c=>c.uid===victim.uid),face>=5);
      assert.equal(p.discard.some(c=>c.uid===victim.uid),face<=4);
    }
    assert.equal(faces.size,6);
    for (const victim of [mon('MERC_MASTER'),{...mon('M2'),token:true}]) {
      let g=fresh(side);enchant(g,'BATTLEFIELD',other);g.players[other].field=[victim];
      g=cast(g,'S15');const r=E.reduce(g,{type:'pick',uid:victim.uid});
      assert(!r.events.some(e=>e.type==='dice' && e.source.id==='BATTLEFIELD'));
    }
  });
  check('Assassin death requires its owner to discard up to two cards ('+side+')',()=>{
    for(const n of [0,1,2,3]) {
      let g=fresh(side);
      const victim=mon('SLUM_ASSASSIN');
      g.players[other].field=[victim];g.players[other].hand=Array.from({length:n},()=>card('M2'));
      const selected=g.players[other].hand.slice(-2).map(c=>c.uid);
      g=pick(cast(g,'S15'),victim.uid);
      for(const uid of selected){
        assert.equal(E.actingSide(g),other);assert.equal(g.pending.reason,'SLUM_ASSASSIN');
        assert(pick(g,null).pending);g=pick(JSON.parse(JSON.stringify(g)),uid);
      }
      assert.equal(g.pending,null);assert.equal(g.players[other].hand.length,Math.max(0,n-2));
      assert(selected.every(uid=>g.players[other].discard.some(c=>c.uid===uid)));
      assert(g.players[other].removed.some(c=>c.uid===victim.uid));
    }
  });
  check('Single Brewing, free once-per-turn Relic, Supply Line threshold ('+side+')',()=>{
    let g=cast(fresh(side),'BREWING');const p=g.players[side];assert.equal(p.mana,22);assert.equal(p.enchants[0].turns,4);
    assert(E.playBlockReason(g,side,card('BREWING')));g=cast(g,'BREWING');
    assert.equal(g.players[side].mana,22);assert.equal(g.players[side].enchants.length,1);
    for(let n=1;n<=4;n++){g=end(g);g=end(g);assert.equal(g.players[side].enchants[0]?.turns,n===4?undefined:4-n);}
    g=cast(fresh(side),'RELIC_PROTECTION');assert.equal(g.players[side].mana,24);
    assert(E.playBlockReason(g,side,card('RELIC_PROTECTION')));g=end(end(g));assert.equal(E.playBlockReason(g,side,card('RELIC_PROTECTION')),null);
    g=fresh(side);enchant(g,'SUPPLY_LINE',side);g.players[side].deck=[card('STARTER_TRASH'),card('STARTER_TRASH')];
    g=cast(g,'M2');assert.equal(g.players[side].enchants.length,1);
    const summon=mon('M2');summon.cost=6;g.players[side].hand.push(summon);
    g=step(g,{type:'play',idx:g.players[side].hand.length-1});
    assert.equal(g.players[side].hand.length,2);assert.equal(g.players[side].enchants.length,0);
    assert(g.players[side].removed.some(c=>c.id==='SUPPLY_LINE'));
  });
  check('Attune Return heals only from deck, Rain needs both cards ('+side+')',()=>{
    for(const zone of ['deck','discard']){
      let g=fresh(side);const a=card('STARTER_MANA'),discard=card('M2');
      g.players[side][zone]=[a];g.players[side].hand=[discard];
      g=pick(pick(cast(g,'ATTUNE_RETURN'),discard.uid),a.uid);
      assert.equal(g.players[side].hp,zone==='deck'?101:100);
      assert(g.players[side].hand.some(c=>c.uid===a.uid));
    }
    for(const tree of [false,true]) for(const elf of [false,true]) {
      let g=fresh(side);if(tree) g.players[side].field.push(mon('WORLD_TREE'));
      if(elf) enchant(g,'ELF_HAVEN',side);
      g=cast(g,'NOURISHING_RAIN');assert.equal(g.players[side].hp,tree&&elf?102:100);
    }
  });
  check('Trick Room includes both boards, effective ATK, wounds and zero-ATK entrants ('+side+')',()=>{
    let g=fresh(side);const wall={...mon('M2'),atk:3,def:10,tempAtk:4,dmg:5};
    const zero={...mon('M2'),atk:0};g.players[side].field=[wall];g.players[other].field=[zero];
    g=cast(g,'TRICKROOM');let p=g.players[side],m=p.field[0];
    assert.equal(E.effAtk(p,m,g),5);assert.equal(E.curHp(p,m),7);
    assert(g.players[other].discard.some(c=>c.uid===zero.uid));
    g=cast(g,'GOLEM_TEST');assert(!g.players[side].field.some(m=>m.id==='GOLEM_TEST'));
    g=end(g);p=g.players[side];m=p.field[0];assert.equal(E.effAtk(p,m,g),3);
    assert.equal(E.curHp(p,m),5);assert.equal(m.dmg,5);assert.equal(g.trickLeft,0);
  });
}
for (const seals of [14,15]) {
  const g=fresh();g.players[0].field=[mon('HEXER3')];g.players[0].curseSeals=seals;
  g.players[1].field=[mon('M2')];g.players[1].hand=[card('CURSE'),card('CURSE'),card('CURSE')];
  const view=E.redactFor(g,0);assert.equal(view.players[0].field[0].visibleCurseAttack,2);
  assert.equal(E.effAtk(view.players[0],view.players[0].field[0],view),4);
  assert.equal(end(g).pending?.reason,seals===15?'HEXER3':undefined);
}

{
  const g=fresh();const valuable=card('MERC_MASTER'),discard=card('CURSE');
  g.players[1].hand=[valuable,discard];
  g.pending={kind:'cardChoice',reason:'SLUM_ASSASSIN',owner:1,data:{left:2}};
  assert.equal(E.greedyDecide(g).uid,discard.uid);
}

check('v94 rooms gain both Battlefield rules without advancing ongoing countdowns twice',()=>{
  const g=fresh();
  g.balance94Applied=true;
  enchant(g,'BATTLEFIELD');enchant(g,'BREWING');
  const [battlefield,brewing]=g.players[0].enchants;
  const oldCard={...battlefield.card,text:'v94 ko',textJa:'v94 ja',textEn:'v94 en'};
  battlefield.card=oldCard;
  brewing.turns=3;
  const copy={...oldCard,uid:'deck-copy'};
  g.players[1].deck=[copy];
  for (let i=0;i<2;i++) {
    E.restoreReworkedCards(g);
    assert.equal(g.balance94Applied,3);
    for (const c of [oldCard,copy]) for (const key of ['text','textJa','textEn']) {
      assert.equal(c[key],E.DB.BATTLEFIELD[key]);
      assert.equal(c[key].split('\n\n').length,2);
    }
    assert.equal(battlefield.card.uid,oldCard.uid);
    assert.equal(brewing.turns,3);
  }
});

for (const side of [0,1]) {
  check('Forbidden Ritual needs an empty monster field before consuming an offer or mana ('+side+')',()=>{
    for (const action of ['buyMarket','buySupply']) {
      let g=fresh(side);
      const p=g.players[side], offer=card('FORBIDDEN');
      p.field=[mon('GOLEM_TEST')];
      const offers=action==='buyMarket'?g.market:p.supply;
      offers[0]=offer;
      const stock=E.marketStockOf(g,0);
      assert(!E.purchaseAllowed(g,p,offer));
      const blocked=E.reduce(g,{type:action,i:0});
      assert(!blocked.events.some(e=>e.type==='buy'));
      assert.equal(blocked.state.players[side].mana,24);
      assert.equal(E.marketStockOf(blocked.state,0),stock);
      assert.equal((action==='buyMarket'?blocked.state.market:blocked.state.players[side].supply)[0].uid,offer.uid);
      p.field=[];enchant(g,'BATTLEFIELD');g.players[1-side].field=[mon('M2')];
      assert(E.purchaseAllowed(g,p,offer));g=step(g,{type:action,i:0});
      assert.equal(g.players[side].hp,1);assert.equal(g.players[side].mana,19);
      assert.equal(g.players[side].field.length,3);
      assert(g.players[side].field.every(m=>m.id==='DEVIL_TOKEN' && m.noAttackTurn===g.turn));
    }
  });
  check('Escort Knights alone remain unable to attack after damage and a new turn ('+side+')',()=>{
    let g=fresh(side);g.players[side].field=[mon('INFKNIGHT'),mon('CASTLE')];
    g=quick(g,'QUICK_ESCORT');
    assert.equal(g.players[side].mana,18);
    g=cast(g,'FLAME');assert(g.players[side].hp<100);
    g=end(end(g));
    const p=g.players[side],guards=p.field.slice(2);
    assert.equal(guards.length,3);
    assert(E.monsterCanAttack(g,p,p.field[0]));
    for (const m of guards) {
      assert(E.hasPassive(m,'taunt'));assert(!E.monsterCanAttack(g,p,m));
      assert(!E.reduce(g,{type:'attack',uid:m.uid}).events.some(e=>e.type==='attack'));
    }
  });
  check('Mini Spirit grows on the correct axis once per resource gain ('+side+')',()=>{
    let g=fresh(side);g.players[side].field=[mon('MINI_SPIRIT')];
    for (const [id,atk,hp] of [['STARTER_MANA',0,2],['IRON_WALL',0,3],['NOURISHING_RAIN',1,3],['GRAPE',2,3]]) {
      g=cast(g,id);const m=g.players[side].field[0];assert.deepEqual([m.atkMod,m.defMod],[atk,hp],id);
    }
  });
}
check('v95 rooms gain the new prints, preserve granted abilities and recover unlocked escort provenance',()=>{
  const g=fresh(),p=g.players[0];g.balance94Applied=2;
  const unlocked={...mon('INFKNIGHT'),passive:['taunt'],token:true};
  const ordinary={...mon('INFKNIGHT'),passivesG:['taunt'],token:true};
  const mimic={...mon('AWAKENED_MIMIC'),atk:2,passive:['counter'],passivesG:['counter']};
  p.field=[unlocked,ordinary,mimic];p.hand=[{...card('MERC_LEADER'),def:2}];
  E.restoreReworkedCards(g);assert(unlocked.escortLocked);assert(!ordinary.escortLocked);
  assert.deepEqual([mimic.atk,mimic.def,mimic.passive,mimic.passivesG,mimic.guts],[1,2,['aura'],['counter'],undefined]);
  assert.equal(p.hand[0].def,1);const saved=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),saved);
});
