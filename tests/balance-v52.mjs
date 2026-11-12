import {readFileSync} from 'node:fs';
const retiredGrowth=JSON.parse(readFileSync(new URL('./fixtures/retired-growth.json',import.meta.url),'utf8'));
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-v52-'));
try {
 await build({stdin:{contents:`export {restoreReworkedCards} from './server/src/reworkedCardSnapshot'; export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export {candidates,greedyDecide} from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'game.mjs')});
 const {DB,STARTERS,createGame,reduce,effAtk,restoreReworkedCards,playBlockReason,playCost,buyCost,hasPassive,candidates,greedyDecide,maxManaGrowthBlocked,BALANCE_VERSION}=await import(path.join(dir,'game.mjs'));
 let seq=0,passed=0;
 const card=id=>({...structuredClone((id==='GROWTH'?retiredGrowth:DB[id])??STARTERS[id]),uid:`v52-${++seq}`});
 const mon=id=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'online',seed:17,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:40,maxHp:100,mana:20,maxMana:20,uses:{},usesTurn:{}});g.phase='main';g.turn=3;g.pending=null;return g;};
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1}).state;};
 const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
 test('v52 catalog and purchase/play costs',()=>{assert(Number(BALANCE_VERSION.slice(1))>=58);assert.equal(buyCost(fresh().players[0],card('AJIN')),4);assert.equal(playCost(card('AJIN'),fresh().players[0]),2);assert.equal(playCost(card('ELF_HAVEN'),fresh().players[0]),4);assert.deepEqual([DB.M11.atk,DB.M11.def],[4,3]);assert.deepEqual([DB.MIMIC2.atk,DB.MIMIC2.def],[12,6]);});
 for(const id of ['DISCOVERY_SMALL','DISCOVERY','DISCOVERY_LARGE'])test(id+' same copy recycling, different copy, persistence, next turn reset',()=>{
  let g=fresh();g.players[0].mana=0;g=play(g,id);assert.equal(g.players[0].usesTurn[id],1);assert(g.players[0].hand.some(c=>c.id===id));
  g.players[0].hand.push(card(id));g=JSON.parse(JSON.stringify(g));
  for(let idx=0;idx<g.players[0].hand.length;idx++){assert(playBlockReason(g,0,g.players[0].hand[idx]));const out=reduce(g,{type:'play',idx});assert.deepEqual(out.state.players,g.players);assert(!candidates(g).some(a=>a.type==='play'&&a.idx===idx));}
  assert.notEqual(greedyDecide(g,false).type,'play');
  g=reduce(g,{type:'endTurn'}).state;g=reduce(g,{type:'endTurn'}).state;assert.equal(g.players[0].usesTurn[id],undefined);assert.equal(playBlockReason(g,0,card(id)),null);
 });
 test('Discovery limits independent and chain bonus preserved',()=>{let g=fresh();g.players[0].deck=Array.from({length:30},()=>card('STARTER_TRASH'));for(const id of ['DISCOVERY_SMALL','DISCOVERY','DISCOVERY_LARGE'])g=play(g,id);assert.equal(g.players[0].hand.length,12);});
 test('Creation has no per-turn cap, stays Void and no longer draws or heals',()=>{let g=fresh();g.players[0].mana=0;g.players[0].enchants=[{card:card('GROWTH'),turns:99}];for(let i=0;i<5;i++)g=play(g,'CREATION');assert.equal(g.players[0].hp,40);assert.equal(g.players[0].removed.length,5);assert.equal(g.players[0].hand.length,5);assert(!playBlockReason(g,0,card('CREATION')));});
 test('negated cast still consumes same-name use',()=>{const boss=Object.values(DB).find(c=>c.aura==='hexBoss');assert(boss);let negated=0;for(let seed=1;seed<20;seed++){let g=fresh();g.rng=seed;g.players[1].field=[mon(boss.id)];g=play(g,'DISCOVERY_SMALL');assert.equal(g.players[0].usesTurn.DISCOVERY_SMALL,1);assert(playBlockReason(g,0,card('DISCOVERY_SMALL')));if(!g.players[0].uses.DISCOVERY_SMALL)negated++;}assert(negated>0);});
 test('Warlord requires three OTHER allies',()=>{for(const n of [0,1,2,3]){let g=fresh();g.players[0].field=Array.from({length:n},()=>mon('SOLDIER2'));g=play(g,'M11');assert.equal(g.players[0].field.filter(m=>m.id==='INFKNIGHT').length,n===3?1:0);}});
 test('Soul Harvest leaves players unharmed',()=>{let g=fresh();g.players[1].hp=100;for(const zone of ['hand','deck','discard'])g.players[1][zone]=[card('CURSE')];g.players[1].removed=[card('CURSE')];g=play(g,'SOUL_HARVEST');assert.equal(g.players[1].hp,100);});
 test('AJIN costs 2 and still increases mana crystals',()=>{let g=fresh();g.players[0].mana=2;g=play(g,'AJIN');assert.equal(g.players[0].mana,0);assert.equal(g.players[0].maxMana,21);});
 test('Lucky Chest dud outcomes 4 and 5 summon only ordinary Mimic',()=>{const sums=new Set();for(let seed=1;seed<120;seed++){let g=fresh();g.rng=seed;g.players[0].hand=[card('LUCKY_CHEST')];const out=reduce(g,{type:'play',idx:0});const sum=out.events.find(e=>e.type==='dice')?.rolls.reduce((a,b)=>a+b,0);if(sum===4||sum===5){sums.add(sum);assert.equal(out.state.players[1].field[0]?.id,'MIMIC');assert(!out.state.players[1].field.some(m=>m.aura==='chestLock'));}}assert.equal(sums.size,2);});
 test('Realm suppresses base/granted keywords on entry and both existing fields',()=>{for(const existing of [false,true]){let g=fresh();g.players[0].deck=[card('TDE1')];g.players[1].field=[mon('TDE4')];if(existing){const m=mon('TDE4');m.passivesG=['counter','guts'];m.guts=1;m.mult=2;m.directOnly=true;m.exileOnDestroy=true;g.players[0].field=[m,mon('TDE3'),mon('M11')];g=play(g,'DEMON_REALM');}else{g=play(g,'DEMON_REALM');g=play(g,'TDE4');g=play(g,'TDE3');}for(const m of g.players[0].field.filter(m=>m.tribe==='마족')){for(const k of ['majesty','aura','counter','guts','dual','ambush','void'])assert(!hasPassive(m,k));assert(!m.aura&&!m.onSummon&&!m.turnFx);}assert(!maxManaGrowthBlocked(g.players[0]));assert(!hasPassive(g.players[1].field[0],'majesty'));if(existing)assert(hasPassive(g.players[0].field.find(m=>m.id==='M11'),'counter'));}assert(hasPassive(DB.TDE4,'majesty'));assert(hasPassive(DB.TDE3,'counter'));});
 test('Demonkin brand on direct contact through Shield only',()=>{
  for (const owner of [0,1]) for (const [id,amount] of [['TDE1',1],['TDE2',1],['TDE3',1],['TDE4',3]]) {
   const g=fresh();g.cur=owner;
   const unit=mon(id);g.players[owner].field=[unit];g.players[1-owner].shield=30;
   const result=reduce(g,{type:'attack',uid:unit.uid});
   assert.equal(result.state.players[1-owner].hp,40);
   assert.equal(result.state.players[1-owner].brand,amount);
   g.players[1-owner].field=[{...mon('M1'),def:30}];
   let battle=reduce(g,{type:'attack',uid:unit.uid});
   if (battle.state.pending) battle=reduce(battle.state,{type:'chooseTarget',uid:g.players[1-owner].field[0].uid});
   assert(battle.state.players[1-owner].field[0].dmg > 0);
   assert.equal(battle.state.players[1-owner].brand??0,0);
  }
 });
 test('Demon Realm stacks on both fields and ends when the last copy leaves',()=>{
  let g=fresh();
  const king=mon('TDE4'), warrior=mon('TDE2');
  warrior.passivesG=['evade'];
  g.players[0].field=[king];g.players[1].field=[warrior,mon('M1')];
  g=play(g,'DEMON_REALM');g.cur=1;g=play(g,'DEMON_REALM');
  const attack=(side,index)=>effAtk(g.players[side],g.players[side].field[index],g);
  assert.deepEqual([attack(0,0),attack(1,0),attack(1,1)],[16,6,DB.M1.atk+2]);
  assert(!hasPassive(g.players[1].field[0],'evade'));
  assert(!maxManaGrowthBlocked(g.players[0]));
  g=play(JSON.parse(JSON.stringify(g)),'TDE1');
  assert.equal(g.players[1].maxMana,20,'summon effect is muted');
  g.players[0].field=[]; // Give the Warrior a direct target.
  const hit=reduce(g,{type:'attack',uid:warrior.uid});
  assert.equal(hit.state.players[0].brand??0,0);
  g=play(g,'DISARM3'); // Destroys opposing persistent spells.
  assert.equal(attack(1,0),5);
  assert(!hasPassive(g.players[1].field[0],'evade'));
  g.cur=0;g=play(g,'DISARM3');
  assert.equal(attack(1,0),4);
  assert(hasPassive(g.players[1].field[0],'evade'));
  assert.equal(g.players[1].field[0].aura,'demonTax2');
  assert.equal(g.players[1].field[2].onSummon,'manaDebt5');
  assert.equal(g.players[1].maxMana,20,'restoration never replays past summons');
 });
 test('Realm rolls once per copy per destroyed monster for its own side',()=>{
  const faces=new Set();
  for(let seed=1;seed<=150 && faces.size<6;seed++){
   let g=fresh();g=play(g,'DEMON_REALM');g.cur=1;g=play(g,'DEMON_REALM');
   for(const p of g.players)p.field=[{...mon('M1'),def:1},{...mon('M1'),def:1}];
   g.rng=seed;g.players[1].hand=[card('EARTHQUAKE')];
   const r=reduce(g,{type:'play',idx:0});
   for(const side of [0,1]){
    const rolls=r.events.filter(e=>e.type==='dice' && e.source.id==='DEMON_REALM' && e.player===side);
    assert.equal(rolls.length,4);assert.equal(r.state.players[side].field.length,0);
    assert.deepEqual(rolls.map(e=>e.source.player),[0,1,0,1]);
    for(const roll of rolls)faces.add(roll.rolls[0]);
    assert.equal(r.state.players[side].brand??0,rolls.filter(e=>e.rolls[0]>=4).length);
   }
  }
  assert.equal(faces.size,6);
 });
 test('old room restores swapped print stats, printed demon effects and current field modifiers once',()=>{
  const g=fresh();
  delete g.demonRealmReworkApplied;
  g.players[1].field=[{...mon('TDE4'),atk:10,def:12,trickSwapped:true,dmg:3,atkMod:2,onSummon:undefined,aura:undefined,passive:[],passivesG:['evade'],guts:0}];
  g.players[0].enchants=[{card:{...card('DEMON_REALM'),cost:3},turns:99}];
  restoreReworkedCards(g);
  const d=g.players[1].field[0];
  assert.deepEqual([d.atk,d.def,d.dmg,d.atkMod,effAtk(g.players[1],d,g)],[14,14,3,2,17]);
  assert.equal(g.players[0].enchants[0].card.cost,2);
  assert(!hasPassive(d,'evade'));assert(!d.aura);
  const restored=JSON.parse(JSON.stringify(g));restoreReworkedCards(restored);
  assert.deepEqual(JSON.parse(JSON.stringify(g)),restored);
  restored.cur=1;
  const king=play(restored,'DISARM3').players[1].field[0];
  assert.equal(king.aura,'manaGrowthLock');assert(hasPassive(king,'majesty'));assert(hasPassive(king,'evade'));
 });
 test('v54 Haven grants Dew from either market',()=>{for(const [id,type,gain] of [['WORLD_HEART','buySupply',1],['M2','buySupply',0],['WORLD_HEART','buyMarket',1]]){let g=fresh();g.players[0].enchants=[{card:card('ELF_HAVEN'),turns:99}];g.players[0].supply[0]=card(id);g.market[0]=card(id);g.marketStock[0]=3;const out=reduce(g,{type,i:0});assert(out.events.some(e=>e.type==='buy'));assert.equal(out.state.players[0].hp,40);assert.equal(out.state.players[0].dew??0,gain);}});
 test('all three language descriptions agree',()=>{for(const id of ['DISCOVERY_SMALL','DISCOVERY','DISCOVERY_LARGE'])for(const key of ['text','textJa','textEn'])assert((id==='GROWTH'?retiredGrowth:DB[id])[key].includes(String((id==='GROWTH'?retiredGrowth:DB[id]).maxUsesPerTurn)));for(const key of ['text','textJa','textEn']){assert(!DB.SOUL_HARVEST[key].includes('4'));assert(DB.ELF_HAVEN[key].includes('1'));assert(!DB.LUCKY_CHEST[key].includes('12/6'));}});
 console.log(`PASS ${passed} v52 rework suites`);
}finally{await rm(dir,{recursive:true,force:true});}
