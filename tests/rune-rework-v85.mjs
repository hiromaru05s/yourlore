import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
 export * from './client/src/shared/engine';export * from './client/src/shared/cards';
 export * from './server/src/reworkedCardSnapshot';
`},bundle:true,platform:'node',format:'esm',write:false});
const E=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let seq=0;
const c=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'runic-'+(++seq)});
const m=(id,extra={})=>({...c(id),atkMod:0,defMod:0,tempAtk:0,dmg:0,summonedTurn:0,exhausted:false,...extra});
const step=(g,a)=>E.reduce(g,a).state;
const play=(g,id)=>{const p=g.players[g.cur];p.hand.push(c(id));return step(g,{type:'play',idx:p.hand.length-1});};
const buy=(g,id)=>{g.market[0]=c(id);return step(g,{type:'buyMarket',i:0});};
const pick=(g,id)=>step(g,{type:'pick',uid:id});
const end=g=>step(g,{type:'endTurn'});
function fresh(side=0){
 const g=E.createGame({mode:'online',seed:29,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
 g.cur=side;g.turn=5;g.pending=null;
 for(const p of g.players)Object.assign(p,{hp:100,mana:20,maxMana:20,hand:[],deck:[],discard:[],removed:[],field:[],quests:[],traps:[],enchants:[],openingDrawReady:false});
 return g;
}
for(const side of [0,1]){
 const opp=1-side;
 for(const boost of [false,true]){
  let g=fresh(side);const a=m('M2',{passive:['aura','counter','void']}),b=m('M4',{passive:['taunt']});g.players[opp].field=[a,b];
  if(boost)g.players[side].runePlays=['RUNE_SAI'];
  g=play(g,'RUNE1');
  if(!boost){g=pick(g,a.uid);g=pick(g,'counter');}
  assert(E.hasPassive(g.players[opp].field[0],'void'));assert(!E.hasPassive(g.players[opp].field[0],'counter'));
  assert.equal(E.hasPassive(g.players[opp].field[1],'taunt'),!boost);
 }
 for(const [key,cost] of Object.entries({guts:1,counter:2,evade:2,aura:3,majesty:3}))for(const boost of [false,true]){
  let g=fresh(side);g.players[side].spellsCastTurn=boost?4:3;const target=m('M2');g.players[side].field=[target];
  g=play(g,'RUNE2');g=pick(g,key);g=pick(g,target.uid);
  assert.equal(g.players[side].mana,20-(boost?0:cost));assert(E.hasPassive(g.players[side].field[0],key));
 }
 {
  let g=fresh(side);g.players[side].spellsCastTurn=4;g.players[side].field=[m('M2',{passive:['void','taunt']})];
  g.players[opp].field=[m('M2',{def:20,passive:['guts']})];g=play(g,'RUNE3');
  assert.equal(g.players[opp].hp,94);assert.equal(g.players[opp].field[0].dmg,6);
  g=fresh(side);const foe=m('M2',{passive:[]});g.players[opp].field=[foe];g=pick(play(g,'RUNE3'),foe.uid);
  assert(E.hasPassive(g.players[opp].field[0],'void'));
 }
 {
  let g=fresh(side);g=play(g,'RUNE_SAI');g=play(g,'RUNE_NIKRO');assert.equal(E.buyCost(g.players[side],c('RUNE3')),1);
  g=play(g,'ND2');const sai=g.players[side].field[0];assert.equal(sai.atkMod,2);
  g=pick(g,sai.uid);assert.equal(g.players[side].field[0].passivesG.length,2);
  assert(!g.players[side].field[0].passivesG.some(k=>['void','boundary'].includes(k)));
 }
 {
  let g=fresh(side);const a=m('M2',{passive:['aura','void']}),b=m('M2');g.players[opp].field=[a,b];g.players[side].deck=[c('RUNE2')];
  g=buy(g,'RUNE_GLYPH');g=pick(g,a.uid);g=pick(g,b.uid);g=pick(g,'RUNE_SAI');
  assert(E.hasPassive(g.players[opp].field[1],'aura'));assert(g.players[side].hand.some(c=>c.id==='RUNE_SAI'));
 }
 {
  let g=play(fresh(side),'Q_RUNE_SECRET');g.players[side].deck=Array.from({length:5},()=>c('M2'));g=play(g,'ND2');assert.equal(g.players[side].maxMana,21);
  assert(g.players[side].discard.some(c=>c.id==='Q_RUNE_SECRET'));
  g=play(fresh(side),'Q_RUNE_SECRET');g.players[side].quests[0].progress=19;g=play(g,'S13');
  assert(g.players[side].removed.some(c=>c.id==='Q_RUNE_SECRET'));
 }
 {
  let g=fresh(side);g.players[side].deck=[c('RUNE3'),...Array.from({length:6},()=>c('M2'))];
  g=play(g,'ND2');assert.equal(g.players[side].hand.length,4);
  const a=m('M2'),b=m('M2');g.players[opp].field=[a,b];
  g=play(g,'S15');g=pick(g,a.uid);g=pick(g,b.uid);assert.equal(g.players[opp].field.length,0);
 }
 {
  let g=play(fresh(side),'RUNE_BARRIER');g=end(g);const a=m('M2',{passive:['evade']}),b=m('M2',{atk:3});g.players[opp].field=[a,b];
  assert(!E.monsterCanAttack(g,g.players[opp],a));g=step(g,{type:'attack',uid:b.uid});assert(!g.players[side].enchants.length);
  g=play(fresh(side),'RUNE_BARRIER');g=end(end(g));assert(!g.players[side].enchants.length);
 }
 {
  let g=buy(fresh(side),'FORBIDDEN');const p=g.players[side];assert.equal(p.hp,1);assert.equal(p.shield,30);
  assert.equal(p.field.length,3);g=step(g,{type:'attack',uid:p.field[0].uid});assert.equal(g.players[side].field[0].atkMod,-2);assert.deepEqual(g.players[side].field.map(d=>d.defMod),[1,1,1]);
  g=play(g,'M5');assert(g.players[side].field[0].defMod>=1);
 }
 {
  let g=fresh(side);g.players[side].brand=2;g=play(g,'PENANCE');assert.equal(g.players[side].brand,1);
  assert.equal(g.players[side].maxMana,21);assert.equal(g.players[side].hp,115);
  g=play(fresh(side),'GS6_4');g=play(g,'S13');const ordinary=100-g.players[opp].hp;
  let control=play(fresh(side),'S13');const base=100-control.players[opp].hp;assert.equal(ordinary,base+4);
  g=play(fresh(side),'GS6_4');g.players[opp].brand=1;g=play(g,'S13');assert.equal(g.players[opp].hp,100-2*base);
 }
 {
  let g=play(fresh(side),'ORIGIN_QUEST');const p=g.players[side];assert.equal(E.playCost(c('TGE3'),p),0);g=play(g,'TGE3');
  assert(!g.players[side].freeOrigin);
  g=fresh(side);g.players[side].enchants=[{card:c('FREE_REWARD'),turns:99}];g.players[side].deck=[c('M2')];g.cur=opp;g=play(g,'STARTER_TRASH');
  assert.equal(g.players[side].hand.length,1);
 }
 for(const n of [2,3,4,5]){
  let g=fresh(side);const tribes=['시초','귀족','마족','포식','고독'];
  g.players[side].field=[m('M2',{tribe:tribes[0]})];g.players[opp].field=tribes.slice(1,n).map(tribe=>m('M2',{tribe}));
  g=play(g,'MULTI_CULTURE');if(n===3)while(g.pending)g=pick(g,E.effectChoices(g)[0].uid);
  assert.equal(g.players[side].maxMana,n===2?21:20);assert.equal(g.players[opp].brand??0,n===4?1:0);
  if(n===5)assert.equal(g.players[opp].removed.length,4);
 }
 {
  let g=fresh(side);g.players[opp].field=[m('MIMIC')];g=play(g,'MIMIC_LORD');assert.equal(g.players[opp].field.length,0);
  assert.equal(g.players[side].field[0].atkMod,3);
  g=fresh(side);g.players[opp].enchants=[{card:c('E1'),turns:3},{card:c('E2'),turns:4}];
  g=play(g,'CHOSEN_MAGE');while(g.pending)g=pick(g,E.effectChoices(g)[0].uid);
  assert.equal(g.players[opp].enchants.length,0);assert.equal(E.playCost(c('S15'),g.players[side]),2);
 }
 {
  let g=fresh(side);g.players[side].removed=[c('STARTER_TRASH'),c('STARTER_TRASH'),c('STARTER_TRASH')];
  g=play(g,'CHOSEN_ARCHER');const archer=g.players[side].field[0];assert.equal(E.effAtk(g.players[side],archer,g),3);
  const foe=m('M1');g.players[opp].field=[foe];
  g=step(g,{type:'attack',uid:archer.uid});g=pick(g,foe.uid);g=end(g);
  assert(E.hasPassive(g.players[side].field[0],'majesty'));assert.equal(g.players[side].brand??0,0);
  g=fresh(side);g.players[side].removed=[c('STARTER_TRASH'),c('STARTER_TRASH')];g.players[opp].field=[m('M1')];
  g=play(g,'CHOSEN_ROGUE');g=pick(g,g.players[opp].field[0].uid);assert.equal(g.players[side].brand,1);
  g.players[opp].shield=10;g=step(g,{type:'attack',uid:g.players[side].field[0].uid});assert.equal(g.players[opp].hp,98);
  assert.equal(g.players[opp].shield,10);g=end(g);assert(E.hasPassive(g.players[side].field[0],'aura'));
 }
 {
  let g=play(fresh(side),'EGG_MASTER');g.players[side].field.push(m('DRAGON_EGG',{hatch:5,dur:3}));g.cur=opp;g=end(g);
  const egg=g.players[side].field.find(m=>m.id==='DRAGON_EGG');g=pick(g,egg.uid);assert(!g.players[side].field.some(m=>m.id==='DRAGON_EGG'));
  g=fresh(side);g.players[side].field=[m('TOKEN00')];g=play(g,'FARMER');assert.equal(E.effDef(g.players[side],g.players[side].field[0]),E.DB.TOKEN00.def+6);
 }
 {
  let g=fresh(side);g.players[side].removed=[c('M2'),{...c('S13'),passive:['void']}];g.players[opp].field=[m('M2',{def:20})];g=play(g,'EXILE_NUKE2');
  assert.equal(g.players[opp].hp,96);assert.equal(g.players[opp].field[0].dmg,4);assert.deepEqual(g.players[side].removed.map(c=>c.id),['M2']);
  for(const id of ['M2','E2','DRAGON_KILLER']){
   g=fresh(side);const scrap=c(id),foe=m('M4');g.players[side].hand=[scrap];g.players[opp].field=[foe];
   g=pick(play(g,'SCRAPPER'),scrap.uid);
   if(scrap.cost>=3){g=pick(g,foe.uid);assert(g.players[opp].hand.some(c=>c.uid===foe.uid));}
   if(scrap.cost===2)assert(g.players[side].hand.some(c=>c.id==='WINE'));
   assert(g.players[side].removed.some(c=>c.uid===scrap.uid));
  }
 }
 {
  let g=fresh(side);g.players[opp].field=[m('GM5_3'),m('M7')];g=play(g,'DRAGON_KILLER');const killer=g.players[side].field[0];
  assert.equal(E.effAtk(g.players[side],killer,g),killer.atk+15);
  g=fresh(side);g.players[side].field=[m('INFKNIGHT'),m('M2')];g=play(g,'HORDE');assert.equal(g.players[side].field[0].atkMod,3);assert.equal(g.players[side].field[1].atkMod,0);
 }
}
{
  let g=fresh();const mage=m('CHOSEN_MAGE'),target=m('M2');
  g.players[0].field=[mage,target];g=play(g,'RUNE2');g=pick(g,'aura');g=pick(g,target.uid);
  assert.equal(g.players[0].mana,18,'the three-mana tier uses the Mage discount');
}
{
  let g=fresh();g.players[0].field=[m('DEVIL_TOKEN')];g.players[0].shield=0;
  g=play(g,'M5');assert.equal(g.players[0].field[0].defMod,1);
}
{
  let g=fresh();delete g.runeReworkApplied;
  const farmer=m('FARMER',{def:1,atkMod:4,dmg:1}),retired={...c('S13'),id:'INQUISITION'};
  g.players[0].field=[farmer];g.players[0].hand=[retired,{...c('MAGIC_BANK'),play:4}];
  g.players[0].enchants=[{card:{...c('RUNE3'),ench:'runeEcho',cost:7},turns:99}];
  E.restoreReworkedCards(g);assert.equal(farmer.def,2);assert.equal(farmer.dmg,1);assert.equal(farmer.atkMod,4);
  assert.equal(g.players[0].hand.length,1);assert.equal(g.players[0].hand[0].play,3);
  assert.equal(g.players[0].enchants.length,0);assert.equal(g.players[0].discard[0].cost,3);
  const saved=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),saved);
}
for (const side of [0,1]) {
  const other = 1 - side;
  // A saved pre-retirement trap destroys the attacker and changes its destination. Combat itself has not dealt damage.
  let g = fresh(side);
  const imp = m('M1'), prey = m('M2', {tribe:'포식'}), devil = m('DEVIL_TOKEN');
  g.players[side].field = [imp, devil];
  g.players[other].field = [prey];
  g.players[other].traps = [{card:{...c('S13'),id:'T10',t:'trap',react:'preyGuard'}}];
  g = pick(step(g,{type:'attack',uid:imp.uid}),prey.uid);
  assert(g.players[side].removed.some(card=>card.uid===imp.uid));
  assert.equal(g.players[other].brand,1);
  assert.equal(g.players[side].field.find(card=>card.uid===devil.uid).defMod,1);

  g = fresh(side);
  const master = m('EGG_MASTER'), egg = m('DRAGON_EGG',{dur:4,hatch:12});
  g.players[side].field = [master,egg,m('DEVIL_TOKEN')];
  g.cur = other;
  g = end(g);
  assert.equal(g.pending.reason,'EGG_ADVANCE');
  const beforeEgg = g.players[side].field[1], beforeDevil = g.players[side].field[2].defMod;
  g = pick(g,egg.uid);
  assert.equal(g.players[side].field[1].dur,beforeEgg.dur-1);
  assert.equal(g.players[side].field[1].hatch,beforeEgg.hatch-5);
  assert.equal(g.players[side].field[2].defMod,beforeDevil+1);

  g = fresh(side);
  const rotting = m('M2',{passive:['decay','void'],decayCnt:2});
  g.players[other].field = [rotting];
  g = pick(pick(play(g,'RUNE1'),rotting.uid),'decay');
  assert(!E.hasPassive(g.players[other].field[0],'decay'));
  assert(E.hasPassive(g.players[other].field[0],'void'));
  assert.equal(g.players[other].field[0].decayCnt,2);

  g = fresh(side);
  const ward = m('SWORD_GRAVE_WRAITH');
  g.players[other].field = [ward]; g.players[other].hand = [c('MINI_SPIRIT')];
  g = pick(play(g,'CHOSEN_ROGUE'),ward.uid);
  assert(g.players[other].field.some(card=>card.uid===ward.uid));

  g = fresh(side);
  const habit = c('RICH_HABIT');
  g.players[other].enchants = [{card:habit,turns:99}];
  g = pick(play(g,'CHOSEN_MAGE'),habit.uid);
  assert.equal(g.players[other].maxMana,3);

  g = fresh(other);
  g.players[side].removed = Array.from({length:9},()=>c('STARTER_TRASH'));
  g.players[side].enchants = [{card:c('COLOSSEUM'),turns:99}];
  g = end(g);
  const crystals = g.players[side].mana;
  g = pick(g,'CHOSEN_ARCHER');
  assert.equal(g.players[side].mana,crystals-3);
  assert(g.players[side].field.some(card=>card.id==='CHOSEN_ARCHER'));

  g = fresh(side);
  g.players[side].field = [m('CHOSEN_MAGE'),m('DEVIL_TOKEN')];
  g = play(g,'GS6_4');
  assert.equal(g.players[side].field[1].defMod,1);

  g = fresh(side);
  const payment = c('DRAGON_KILLER'), hidden = {...c('S13'),t:'trap',id:'T1',passive:['void']}, normal = {...c('S13'),t:'trap',id:'T2'};
  g.players[side].hand = [payment];
  g.players[other].traps = [{card:hidden},{card:normal}];
  g = pick(play(g,'SCRAPPER'),payment.uid);
  assert.deepEqual(E.effectChoices(g).map(card=>[card.uid,card.id]),[[normal.uid,'HIDDEN']]);
  g = pick(g,hidden.uid);
  assert.equal(g.pending.reason,'SCRAP_RETURN');
  g = pick(g,normal.uid);
  assert(g.players[other].hand.some(card=>card.uid===normal.uid));
}
{
  const g = fresh();
  delete g.runeZonesAudited;
  g.players[0].exile = [{card:{...c('S13'),id:'INQUISITION'},turns:1},{card:c('S13'),turns:2}];
  E.restoreReworkedCards(g);
  assert.deepEqual(g.players[0].exile.map(entry=>[entry.card.id,entry.turns]),[['S13',2]]);
}
assert(!E.DB.INQUISITION);assert(E.DECK_POOL.includes('Q_RUNE_SECRET'));assert(!E.BUYABLE_POOL.includes('DEVIL_TOKEN'));
assert.equal(E.DB.MAGIC_BANK.play,3);assert.equal(E.DB.INFERNO.cost,4);assert.equal(E.DB.INFERNO.play,1);
console.log('PASS Rune rework, quick purchase, starter reward destinations, both seats, chosen combat, farm and army rules');

{
 const g=fresh(), card=c('S1');
 card.nameJa='三撃の火種';
 g.players[0].hand.push(card);
 delete g.threeFireNamed;
 E.restoreReworkedCards(g);
 assert.equal(card.nameJa,'スリーファイアー');
 assert.equal(g.mulligan,undefined,'a resumed game does not exchange its hand again');
}
