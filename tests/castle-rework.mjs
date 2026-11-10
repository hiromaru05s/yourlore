import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-castle-rework-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/playIntent';export * from './server/src/reworkedCardSnapshot';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const E=await import(dir+'/core.mjs');let seq=0,checks=0;
 const card=(id,extra={})=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'rework-'+(++seq),...extra});
 const mon=(id='M1',extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=(side=0,seed=41)=>{const g=E.createGame({mode:'online',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=side;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{hp:100,maxMana:30,mana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0,shield:0,dew:0,brand:0,openingDrawReady:false});return g;};
 const step=(g,a)=>E.reduce(g,a).state;
 const cast=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const play=(g,id)=>cast(g,id).state;
 const pick=(g,uid)=>step(g,{type:'pick',uid});
 const end=g=>step(g,{type:'endTurn'});
 const ench=(g,id,side=g.cur,turns=E.DB[id].val??99)=>{const e={card:card(id),turns,bornTurn:0};g.players[side].enchants.push(e);return e;};

 const check=(title,fn)=>{fn();checks++;console.log('PASS',title);};
 check('Castle augments the base summon and shields even without a Castle',()=>{
  for(const castle of [false,true]){
   let g=fresh();if(castle)g.players[0].field=[mon('CASTLE',{gcount:0})];
   g=play(g,'EXPANSION');
   assert.equal(g.players[0].shield,3);const soldier=g.players[0].field.at(-1);
   assert.deepEqual([soldier.id,soldier.atk,soldier.def],['SOLDIER2',2,1]);
   if(castle)assert.equal(g.players[0].field[0].gcount,3);
  }
 });
 check('Land Grant selects the newly summoned Noble or an existing Noble on a full board',()=>{
  for(const full of [false,true]){
   let g=fresh();g.players[0].field=[mon('CASTLE'),...(full?[mon('TAR2'),...Array.from({length:5},()=>mon('M1'))]:[])];
   g=play(g,'LAND_GRANT');if(!full)g=pick(g,'TAR2');
   assert.equal(g.pending.reason,'LAND_GRANT');const target=E.effectChoices(g)[0];
   g=pick(g,target.uid);const m=g.players[0].field.find(c=>c.uid===target.uid);
   assert.deepEqual([m.atkMod,m.defMod],[2,4]);
  }
  let g=play(fresh(),'LAND_GRANT');g=pick(g,'TAR2');assert(!g.pending);
 });
 check('Origin Song buffs both fields before summoning two real deck/grave records',()=>{
  let g=fresh();const a=mon('TAR1'),b=mon('TDE1'),plain=mon('M1');
  g.players[0].field=[a];g.players[1].field=[b,plain];
  const d=card('TGE2'),e=card('TGE3');g.players[0].deck=[d];g.players[0].discard=[e];
  g=play(g,'GENESIS_SONG');
  assert.deepEqual(g.players[0].field.map(m=>m.atkMod),[3,0,0]);
  assert.deepEqual(g.players[1].field.map(m=>m.atkMod),[3,0]);
  assert(g.players[0].field.some(m=>m.uid===d.uid));assert(g.players[0].field.some(m=>m.uid===e.uid));
 });
 check('Origin Magic discounts present Attunes, persists over reshuffles and forces every refresh this turn',()=>{
  let g=fresh();const attune=card('STARTER_MANA');
  g.players[0].deck=[attune,...Object.values(E.DB).filter(c=>c.tribe==='시초'&&c.id!=='TGE7').map(c=>card(c.id))];
  g=play(g,'GENESIS_MAGIC');assert(g.players[0].removed.some(c=>c.id==='GENESIS_MAGIC'));
  assert.equal(E.playCost(g.players[0].deck[0],g.players[0]),2);assert.equal(E.playCost(card('STARTER_MANA')),3);
  g.players[0].maxMana=3;g.players[0].refreshTokens=5;
  for(let i=0;i<5;i++){g=step(JSON.parse(JSON.stringify(g)),{type:'refresh'});assert(g.players[0].supply.some(c=>c?.id==='TGE7'));}
  g=end(g);assert.notEqual(g.turn,g.players[0].originOfferTurn);
  // Time Rewind returns a reset instance from the Rift. Its game-long discount survives.
  g.cur=0;const owner=g.players[0];
  const discounted=[...owner.deck,...owner.hand,...owner.discard].find(c=>c.uid===attune.uid);
  for(const zone of [owner.deck,owner.hand,owner.discard]){const index=zone.indexOf(discounted);if(index>=0)zone.splice(index,1);}
  owner.removed.push(discounted);owner.mana=30;owner.maxMana=30;
  g.pending={kind:'cardChoice',owner:0,reason:'TIMEWARP',allowCancel:true,hint:'',hintJa:''};
  g=pick(g,attune.uid);assert.equal(g.players[0].discard.find(c=>c.uid===attune.uid).play,2);
 });
 check('Golem branches count distinct names and affect all allies',()=>{
  for(const [ids,amount,voided] of [[[],4,true],[['GOLEM1'],4,false],[['GOLEM1','GOLEM1'],4,false],[['GOLEM1','GOLEM2'],8,false]]){
   let g=fresh();g.players[0].field=[mon('M1'),...ids.map(id=>mon(id))];g=play(g,'AEM');
   assert(g.players[0].field.every(m=>m.atkMod===amount));
   assert.equal(E.hasPassive(g.players[0].field[0],'void'),voided);
  }
 });
 check('Blood Secret sends a non-Vampire directly to the Rift and rolls one die per cost',()=>{
  for(let seed=1;seed<=10;seed++){
   let g=fresh(0,seed);g.players[0].maxMana=10;
   const target=mon('M2',{cost:2});g.players[0].field=[mon('M1'),target];
   g=play(g,'BLOOD_SECRET');const r=E.reduce(g,{type:'pick',uid:target.uid});
   const die=r.events.find(e=>e.type==='dice'&&e.source.id==='BLOOD_SECRET');assert.equal(die.rolls.length,2);
   assert.equal(r.state.players[0].maxMana,die.rolls[0]+die.rolls[1]>=6?13:10);
   assert(r.state.players[0].removed.some(c=>c.uid===target.uid));assert(!r.state.players[0].discard.some(c=>c.uid===target.uid));
  }
  const g=play(fresh(),'BLOOD_SECRET');assert.equal(g.players[0].hp,90);assert(!g.pending);
 });
 check('Festival shields self-damage from a played card, and only resolved Blood Magic pays out',()=>{
  let g=fresh();ench(g,'BLOOD_FEST');g.players[0].maxMana=10;g=play(g,'FLAME');
  assert.equal(g.players[0].hp,100);assert.equal(g.players[1].hp,98);
  g=play(g,'BLOOD_SECRET');assert.equal(g.players[0].hp,100);assert.equal(g.players[0].maxMana,11);
  g.players[1].traps=[{card:{...card('T1'),react:'nullspell',cap:30},setTurn:0}];
  g=play(g,'BLOOD_SECRET');assert.equal(g.players[0].maxMana,11);
 });
 check('Mercenary Arts grants both players a lasting summon buff',()=>{
  let g=fresh();ench(g,'MERC_ART');g=play(g,'SOLDIER2');g=end(g);g=play(g,'SOLDIER2');
  for(const p of g.players){assert.equal(p.field[0].atkMod,1);assert(E.hasPassive(p.field[0],'counter'));}
 });
 check('Harvest Festival adds exactly two HP to the fruit cast, including double-heal Apple',()=>{
  for(const [fruit,base] of [['APPLE',14],['GRAPE',2],['GRAPE2',5]]){
   let g=fresh();ench(g,'HARVEST');g.players[0].field=[mon('HALF_ELF')];
   g=play(g,fruit);assert.equal(g.players[0].hp,100+base+2);
  }
 });
 check('Colosseum resolves both abilities at eight and one ability on either side',()=>{
  for(const culls of [7,8,9]){
   let g=fresh(1);ench(g,'COLOSSEUM',0);g.players[0].removed=Array.from({length:culls},()=>card('STARTER_TRASH'));
   g=end(g);
   if(culls>=8){assert.equal(g.pending.reason,'colosseumPick');g=pick(g,'CHOSEN_MAGE');}
   assert.equal(g.players[0].field.filter(m=>['SOLDIER2','INFKNIGHT'].includes(m.id)).length,culls<=8?1:0);
  }
 });
 check('Curse counts newly generated Curses once, excludes the Rift and preserves the original cards',()=>{
  let g=fresh();const o=g.players[1];o.removed=[card('CURSE'),card('CURSE')];o.hand=[card('CURSE')];
  g.market[0]=card('QUICK_CURSE');g.marketStock[0]=1;g=step(g,{type:'buyMarket',i:0});
  assert.equal(g.players[1].discard.length,2);assert.equal(g.players[1].hp,97);
  g=play(g,'BLACK_CURSE');assert.equal(g.players[1].discard.length,4);
  g.players[1].field=[mon('TDE1')];g.players[1].hand.push(card('TDE1'));
  g=play(g,'GS5_3');assert.equal(g.players[1].hp,81);assert.equal(g.players[1].discard.length,6);
 });
 check('Restoring an older room updates the printed rules once and preserves live modifiers',()=>{
  const g=fresh();delete g.castleReworkApplied;
  const soldier=mon('SOLDIER2',{def:2,atkMod:4,dmg:0});
  g.players[0].field=[soldier];g.players[0].hand=[card('GENESIS_MAGIC',{play:0,passive:[]})];
  g.players[0].quests=[{card:card('Q_CASTLE',{quest:{...E.DB.Q_CASTLE.quest,target:9}}),progress:3,anchorUid:'castle'}];
  E.restoreReworkedCards(g);assert.deepEqual([soldier.def,soldier.atkMod],[1,4]);
  assert.equal(g.players[0].hand[0].play,5);assert(E.hasPassive(g.players[0].hand[0],'void'));
  assert.equal(g.players[0].quests[0].card.quest.target,5);assert.equal(g.players[0].quests[0].progress,3);
  const snapshot=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),snapshot);
 });
 console.log(checks,'castle rework scenarios passed');
} finally {await rm(dir,{recursive:true,force:true});}
