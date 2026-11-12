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
  assert.equal(p.field.length,3);g=step(g,{type:'attack',uid:p.field[0].uid});assert.equal(g.players[side].field[0].atkMod,-3);
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
assert(!E.DB.INQUISITION);assert(E.DECK_POOL.includes('Q_RUNE_SECRET'));assert(!E.BUYABLE_POOL.includes('DEVIL_TOKEN'));
assert.equal(E.DB.MAGIC_BANK.play,3);assert.equal(E.DB.INFERNO.cost,4);assert.equal(E.DB.INFERNO.play,1);
console.log('PASS Rune rework, quick purchase, starter reward destinations, both seats, chosen combat, farm and army rules');
