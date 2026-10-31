import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-spell-v74-');
try {
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/playIntent';export * from './client/src/shared/pendingText';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const E=await import(dir+'/core.mjs');let seq=0,checks=0;
 const card=(id,extra={})=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'v74-'+(++seq),...extra});
 const mon=(id='M1',extra={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=(side=0,seed=41)=>{const g=E.createGame({mode:'online',seed,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.cur=side;g.pending=null;g.phase='main';for(const p of g.players)Object.assign(p,{hp:100,maxMana:30,mana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0,shield:0,dew:0,brand:0,openingDrawReady:false});return g;};
 const step=(g,a)=>E.reduce(g,a).state;
 const cast=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const play=(g,id)=>cast(g,id).state;
 const pick=(g,uid)=>step(g,{type:'pick',uid});
 const end=g=>step(g,{type:'endTurn'});
 const ench=(g,id,side=g.cur,turns=E.DB[id].val??99)=>{const e={card:card(id),turns,bornTurn:0};g.players[side].enchants.push(e);return e;};
 const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};
 test('approved costs, values, Growth absent from every active catalog',()=>{
  for(const [id,cost,playCost] of [['ANCIENT_CIV',3,3],['FORBIDDEN',2,2],['GS8_0',7,6],['TIMEWARP',12,7]])assert.deepEqual([E.DB[id].cost,E.playCost(card(id))],[cost,playCost],id);
  assert.equal(E.DB.GRAPE2.val,5);assert.equal(E.DB.FARM.val,4);assert.equal(E.DB.DESERTIFICATION.ench,'desertification');assert.equal(E.DB.BLACK_REVERSE.maxUsesPerGame,2);
  assert(!E.DB.GROWTH);for(const pool of [E.ALL_IDS,E.BUYABLE_POOL,E.DECK_POOL])assert(!pool.includes('GROWTH'));
  for(const id of E.ALL_IDS)assert(!E.relatedCardIds(id).includes('GROWTH'));
 });
 for(const n of [3,4,5,6])test(`Rich Habit restored at hand boundary ${n}, both players`,()=>{
  for(const side of [0,1]){let g=fresh(side);ench(g,'RICH_HABIT');g.players[side].deck=Array.from({length:20},()=>card('M1'));g.players[side].hand=Array.from({length:n-3},()=>card('M1'));g.players[side].maxMana=10;
   g=end(end(g));assert.equal(g.players[side].hand.length,n);assert.equal(g.players[side].hp,n>=4?106:100);assert.equal(g.players[side].maxMana,n>=6?11:10);
  }
 });
 test('Rich Habit still punished only by opposing destruction, not direct Rift transfer',()=>{
  let g=fresh();const rich=ench(g,'RICH_HABIT',1);g.players[1].maxMana=15;g=play(g,'DISARM1');g=pick(g,rich.card.uid);assert.equal(g.players[1].maxMana,3);
  g=fresh();const own=ench(g,'RICH_HABIT');ench(g,'E1',1);g=play(g,'DISARM1');g=pick(g,own.card.uid);assert.equal(g.players[0].maxMana,30);
 });
 test('Pleasure pays exactly 7; Fine Grape restores 5; lethal payment stops reward',()=>{
  let g=fresh();g.players[0].maxMana=10;g=play(g,'BLOOD_PLEASURE');assert.equal(g.players[0].hp,93);assert.equal(g.players[0].maxMana,11);
  g=play(g,'GRAPE2');assert.equal(g.players[0].hp,98);
  g=fresh();g.players[0].hp=7;g.players[0].maxMana=10;g=play(g,'BLOOD_PLEASURE');assert(g.over);assert.equal(g.players[0].maxMana,10);
 });
 for(const zone of ['deck','discard','hand','field','enchants','quests'])test(`Sorrow pays 7 and chooses exactly one own ${zone} card`,()=>{
  let g=fresh();const target=zone==='field'?mon():card(zone==='enchants'?'RICH_HABIT':zone==='quests'?'Q_TOWN':'M1');
  g.players[0][zone].push(zone==='enchants'?{card:target,turns:99}:zone==='quests'?{card:target,progress:0}:target);
  const foreign=mon();g.players[1].field=[foreign];g=play(g,'BLOOD_SORROW');assert.equal(g.players[0].hp,93);assert.equal(g.pending.reason,'bloodSorrow');
  assert(E.purgeChoices(g.players[0],g.pending).some(c=>c.uid===target.uid));
  g=pick(g,foreign.uid);assert(g.pending);g=pick(g,null);assert(g.pending);g=pick(g,target.uid);
  assert.equal(g.pending,null);assert(g.players[0].removed.some(c=>c.uid===target.uid));assert.equal(g.players[0].removed.filter(c=>c.uid===target.uid).length,1);
  if(zone==='enchants')assert.equal(g.players[0].maxMana,30);
 });
 test('Sorrow can send itself after resolving, excludes Relic and respects lethal self-damage',()=>{
  let g=fresh();const relic=card('M1',{passive:['relic']});g.players[0].hand=[relic];g=play(g,'BLOOD_SORROW');assert(!E.purgeChoices(g.players[0],g.pending).some(c=>c.uid===relic.uid));
  const self=E.purgeChoices(g.players[0],g.pending).find(c=>c.id==='BLOOD_SORROW');assert(self);g=pick(g,self.uid);assert(g.players[0].removed.some(c=>c.uid===self.uid));
  g=fresh();g.players[0].hp=7;g=play(g,'BLOOD_SORROW');assert(g.over);assert.equal(g.pending,null);
 });
 test('Trumpet buffs four distinct monsters, cannot repeat one, permits early finish',()=>{
  let g=fresh();g.players[0].field=Array.from({length:5},()=>mon());const ids=g.players[0].field.map(c=>c.uid);g=play(g,'TRUMPET');
  g=pick(g,ids[0]);g=pick(g,ids[0]);assert.equal(g.players[0].field[0].tempAtk,1);
  for(const uid of ids.slice(1,4))g=pick(g,uid);assert.equal(g.pending,null);assert.deepEqual(g.players[0].field.map(m=>m.tempAtk),[1,1,1,1,0]);
  g=fresh();g.players[0].field=[mon(),mon()];g=play(g,'TRUMPET');g=pick(g,null);assert.equal(g.pending,null);
 });
 test('Ambush allows only 4/5, previous own turn blocks every copy, skipped opposing turns still count own turns',()=>{
  for(const maxMana of [3,4,5,6]){let g=fresh();g.players[1].maxMana=maxMana;assert.equal(!!E.playBlockReason(g,0,card('AMBUSH')),![4,5].includes(maxMana));}
  let g=fresh();g.players[1].maxMana=5;g=play(g,'AMBUSH');assert.equal(g.players[1].hp,87);assert.equal(g.players[0].hp,92);
  g=end(end(g));assert(E.playBlockReason(g,0,card('AMBUSH')));const old=g.players[0].mana;g=play(g,'AMBUSH');assert.equal(g.players[0].mana,old);
  g=end(end(g));assert.equal(E.playBlockReason(g,0,card('AMBUSH')),null);
  g=play(g,'AMBUSH');g.players[1].skipTurns=1;g.players[1].skipTurnSources=[null];g=end(g);assert.equal(g.cur,0);assert(E.playBlockReason(g,0,card('AMBUSH')));
 });
 test('negated Ambush still blocks the following own turn; own skipped turns do not clear restriction',()=>{
  let g=fresh();g.players[1].maxMana=4;g.players[1].traps=[{card:card('S1',{react:'nullspell',val:0,val2:0})}];g=play(g,'AMBUSH');assert.equal(g.players[1].hp,100);assert.equal(g.players[0].usesTurn.AMBUSH,1);
  g=end(g);g.players[0].skipTurns=1;g.players[0].skipTurnSources=[null];g=end(g);assert.equal(g.cur,1);g=end(g);assert.equal(g.cur,0);assert(E.playBlockReason(g,0,card('AMBUSH')));
 });
 test('Silvermoon samples combined deck/graveyard without replacement and burns printed cost sum',()=>{
  for(const side of [0,1])for(const count of [0,1,2,5]){let g=fresh(side);const o=g.players[1-side];const cards=Array.from({length:count},(_,i)=>card('M1',{cost:i+1}));o.deck=cards.slice(0,2);o.discard=cards.slice(2);const hand=card('M1',{cost:20});o.hand=[hand];const relic=card('M1',{cost:15,passive:['relic']});o.deck.push(relic);
   g=play(g,'GS8_0');const result=g.players[1-side];assert.equal(result.removed.length,Math.min(2,count));assert.equal(new Set(result.removed.map(c=>c.uid)).size,result.removed.length);assert.equal(result.hp,100-result.removed.reduce((n,c)=>n+c.cost,0));assert(result.deck.some(c=>c.uid===relic.uid));assert.equal(result.hand[0].uid,hand.uid);assert.equal(g.players[side].mana,24);
  }
 });
 test('Spear and Shield checks strict break boundary independently of defensive gain',()=>{
  for(const [mine,theirs,shield,broken,gain] of [[1,3,2,true,12],[1,3,3,false,12],[0,3,50,false,12],[1,2,1,true,0],[2,3,50,false,0]]){
   let g=fresh();g.players[0].field=Array.from({length:mine},()=>mon('M1',{atk:3}));g.players[1].field=Array.from({length:theirs},()=>mon());g.players[1].shield=shield;g=play(g,'SPEAR_AND_SHIELD');assert.equal(g.players[1].shield,broken?0:shield);assert.equal(g.players[0].shield,gain);
  }
 });
 test('Desertification removes opposing Dew only; halves both recovery and Shield with floor and stacking',()=>{
  let g=fresh();g.players[0].dew=8;g.players[1].dew=9;g.players[0].shield=7;g=play(g,'DESERTIFICATION');assert.equal(g.players[0].dew,8);assert.equal(g.players[1].dew,0);assert.equal(g.players[0].shield,7);assert(g.players[0].enchants.some(e=>e.card.id==='DESERTIFICATION'));
  for(const side of [0,1]){g.cur=side;g.players[side].mana=30;const hp=g.players[side].hp;g=play(g,'GRAPE2');assert.equal(g.players[side].hp,hp+2);const shield=g.players[side].shield;g=play(g,'DEFENSIVE_STANCE');assert.equal(g.players[side].shield,shield+1);}
  g.cur=0;g.players[0].mana=30;g=play(g,'DESERTIFICATION');const hp=g.players[0].hp;g=play(g,'GRAPE2');assert.equal(g.players[0].hp,hp+1);
  g.players[0].enchants=g.players[0].enchants.filter(e=>e.card.id!=='DESERTIFICATION');const recovered=g.players[0].hp;g=play(g,'GRAPE2');assert.equal(g.players[0].hp,recovered+5);
 });
 test('Desertification composes multipliers before flooring and Furnace applies its gain cap afterward',()=>{
  let g=fresh();ench(g,'DESERTIFICATION',1);g.players[0].field=[mon('ELF')];g=play(g,'GRAPE2');assert.equal(g.players[0].hp,105);
  ench(g,'BLACKSMITH');g.players[0].field=[];g=play(g,'DEFENSIVE_STANCE');assert.equal(g.players[0].shield,3);
  ench(g,'FURNACE',1);g=play(g,'IRON_WALL');assert.equal(g.players[0].shield,7);
 });
 test('Forbidden gives 30 Shield before the die on every face; original summon result stays',()=>{
  const seen=new Set();for(let seed=1;seed<100 && seen.size<6;seed++){let g=fresh(0,seed);g.players[0].field=[mon('TSO2')];const r=cast(g,'FORBIDDEN');const die=r.events.find(e=>e.type==='dice'&&e.source.id==='FORBIDDEN');seen.add(die.rolls[0]);assert.equal(r.state.players[0].shield,30);assert.equal(r.state.players[0].mana,28);assert(r.events.findIndex(e=>e.type==='statusGrant'&&e.resource==='shield')<r.events.indexOf(die));if(die.rolls[0]<5)assert.equal(r.state.players[0].hp,1);else assert(r.state.players[0].field.length>1);}
  assert.equal(seen.size,6);
 });
 test('Timewarp chooses a Rift return after either result, supports decline, invalid targets and empty Rift',()=>{
  const outcomes=new Set();for(let seed=1;seed<100 && outcomes.size<2;seed++){let g=fresh(0,seed);const a=card('M1'),b=card('M2');g.players[0].removed=[a,b];const r=cast(g,'TIMEWARP');g=r.state;const die=r.events.find(e=>e.type==='dice'&&e.source.id==='TIMEWARP');outcomes.add(die.rolls[0]>=4);assert.equal(g.pending.reason,'TIMEWARP');assert(r.events.indexOf(die)<r.events.findIndex(e=>e.type==='needTarget'));assert.equal(g.players[0].mana,23);
   g=pick(g,'forged');assert(g.pending);g=pick(g,b.uid);assert.equal(g.pending,null);assert(g.players[0].discard.some(c=>c.uid===b.uid));assert.deepEqual(g.players[0].removed.map(c=>c.uid),[a.uid]);assert.equal(g.players[1].skipTurns,die.rolls[0]>=4?1:0);
  }assert.equal(outcomes.size,2);
  let g=fresh();g.players[0].removed=[card('M1')];g=play(g,'TIMEWARP');g=pick(g,null);assert.equal(g.pending,null);assert.equal(g.players[0].removed.length,1);
  g=play(fresh(),'TIMEWARP');assert.equal(g.pending,null);
 });
 test('Timewarp Rift choice waits for Wheel of Fate keep or reroll and resolves once',()=>{
  for(const decision of [null,'re'])for(const side of [0,1]){let g=fresh(side);ench(g,'FATE_WHEEL');const target=card('M1');g.players[side].removed=[target];g=play(g,'TIMEWARP');assert.equal(g.pending.kind,'reroll');assert.equal(g.players[side].removed.length,1);g=pick(g,decision);assert.equal(g.pending.reason,'TIMEWARP');g=pick(g,target.uid);assert.equal(g.pending,null);assert.equal(g.players[side].discard.filter(c=>c.uid===target.uid).length,1);assert.equal(g.players[side].removed.length,0);assert.equal(g.players[side].mana,23);}
 });
 test('Reverse cannot be cast a third time, across turns, negations, saves or missing legacy counters',()=>{
  for(const side of [0,1]){let g=fresh(side);g=play(g,'BLACK_REVERSE');g=end(end(g));g.players[side].mana=30;g=play(g,'BLACK_REVERSE');g=JSON.parse(JSON.stringify(g));delete g.players[side].expansion.reversePlays;assert(E.playBlockReason(g,side,card('BLACK_REVERSE')));const mana=g.players[side].mana;g=play(g,'BLACK_REVERSE');assert.equal(g.players[side].mana,mana);assert.equal(g.players[side].uses.BLACK_REVERSE,2);}
  let g=fresh();for(let n=0;n<2;n++){g.players[1].traps=[{card:card('S1',{react:'nullspell',val:0,val2:0})}];g=play(g,'BLACK_REVERSE');}assert.equal(g.players[0].enchants.length,0);assert.equal(g.players[0].uses.BLACK_REVERSE,2);assert(E.playBlockReason(g,0,card('BLACK_REVERSE')));
  g=fresh();g.players[0].expansion={turn:3,extraDraw:0,firePlayed:[],fireDiscount:0,dominion:0,reversePlays:2};assert(E.playBlockReason(g,0,card('BLACK_REVERSE')));
 });
 test('new pending instructions are present in all languages',()=>{
  for(const reason of ['TIMEWARP','bloodSorrow'])for(const locale of ['ja','ko','en']){const text=E.pendingText({kind:'cardChoice',reason,allowCancel:true,hint:'',hintJa:''},locale);assert(text);if(locale!=='ko')assert(!/[가-힣]/.test(text));if(locale==='en')assert(!/[ぁ-んァ-ヶ一-龯]/.test(text));}
 });
 console.log(`PASS ${checks} spell-rework cases`);
} finally {await rm(dir,{recursive:true,force:true});}
