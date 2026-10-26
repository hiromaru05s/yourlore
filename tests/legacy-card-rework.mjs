import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-legacy-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';export {greedyDecide} from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {DB,STARTERS,createGame,reduce,playCost,botActions,greedyDecide,effectChoices}=await import(dir+'/engine.mjs');
 let seq=0,checks=0;
 const card=id=>({...structuredClone(DB[id]||STARTERS[id]),uid:'legacy-'+(++seq)});
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=(seed=41)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=0;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:20,maxMana:20,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},dew:0,shield:0});return g;};
 const step=(g,a)=>reduce(g,a).state;
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const attack=(g,a,t)=>{let r=reduce(g,{type:'attack',uid:a});if(r.state.pending?.kind==='oppMon')r=reduce(r.state,{type:'chooseTarget',uid:t});return r;};
 const ench=id=>({card:card(id),turns:99,bornTurn:0});
 const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};
 test('all changed costs apply to buying and playing; unrequested stats/rain remain',()=>{
  for(const [id,buy,use] of [['NIGHT_CASTLE_GIFT',3,3],['AHEUK',4,4],['GS8_0',7,7],['TIMEWARP',12,8],['S14',3,3]]){assert.equal(DB[id].cost,buy);assert.equal(playCost(card(id)),use);}
  for(const [id,a,d] of [['M2',1,3],['M4',4,2],['M5',2,5],['M8',3,5],['M12',3,4]])assert.deepEqual([DB[id].atk,DB[id].def],[a,d]);
  assert.equal(DB.NOURISHING_RAIN.cost,4);assert.equal(DB.NOURISHING_RAIN.val,1);
 });
 test('Warden transfers one existing Dew on either side; empty opponent grants nothing',()=>{
  for(const side of [0,1])for(const dew of [0,1,7]){let g=fresh();g.cur=side;g.players[side].dew=2;g.players[1-side].dew=dew;const r=play(g,'M8');assert.equal(r.state.players[side].dew,2+(dew?1:0));assert.equal(r.state.players[1-side].dew,Math.max(0,dew-1));assert.equal(r.state.players[side].hp,100);}
 });
 test('Stone Pup recovers the actual eligible graveyard instance, never spells/cost2/enemy cards',()=>{
  const seen=new Set();for(let seed=1;seed<100;seed++){let g=fresh(seed);const a=card('M1'),b=card('GOLEM1'),spell=card('S1'),cost2=card('M4');g.players[0].discard=[a,b,spell,cost2];g.players[1].discard=[card('M2')];g=play(g,'M2').state;assert.equal(g.players[0].hand.length,1);const c=g.players[0].hand[0];assert([a.uid,b.uid].includes(c.uid));assert(!g.players[0].discard.some(x=>x.uid===c.uid));assert(g.players[0].discard.some(x=>x.uid===spell.uid));assert(g.players[0].discard.some(x=>x.uid===cost2.uid));assert.equal(g.players[1].discard.length,1);seen.add(c.id);}
  assert.equal(seen.size,2);let g=fresh();g=play(g,'M2').state;assert.equal(g.players[0].hand.length,0);
 });
 test('Iron Shell grants shield without self damage and uses existing shield multipliers/triggers',()=>{
  let g=fresh();g=play(g,'M5').state;assert.equal(g.players[0].hp,100);assert.equal(g.players[0].shield,2);
  g=fresh();g.players[0].enchants=[ench('BLACKSMITH')];g.players[0].field=[mon('PRIEST')];g=play(g,'M5').state;assert.equal(g.players[0].shield,4);assert.equal(g.players[0].dew,2);assert.equal(g.players[0].hp,100);
 });
 test('Titan permanently reduces only the selected enemy by two',()=>{
  let g=fresh();g.players[1].field=[mon('M1'),mon('M4')];const uid=g.players[1].field[1].uid;g=play(g,'M12').state;assert.equal(g.pending.reason,'atkDown');g=step(g,{type:'chooseTarget',uid});assert.equal(g.players[1].field[1].atkMod,-2);assert.equal(g.players[1].field[0].atkMod,0);assert.equal(JSON.parse(JSON.stringify(g)).players[1].field[1].atkMod,-2);
 });
 test('Blade Hare adds two only on its own successful destruction, including Egg and granted counter',()=>{
  for(const id of ['M4','TGE1']){let g=fresh();const a=mon('M4'),t=mon(id);if(id==='TGE1'){t.hatch=4;t.dur=1;}else t.def=4;g.players[0].field=[a];g.players[1].field=[t];g=attack(g,a.uid,t.uid).state;assert.equal(g.players[1].field.length,0);assert.equal(g.players[1].hp,98);}
  let g=fresh(),a=mon('M4'),t={...mon('GOLEM1'),def:4,guts:1};g.players[0].field=[a];g.players[1].field=[t];g=attack(g,a.uid,t.uid).state;assert.equal(g.players[1].hp,100);assert.equal(g.players[1].field.length,1);
  g=fresh();a=mon('M4');t={...mon('M4'),passivesG:['counter'],def:20};a.def=2;g.players[0].field=[a];g.players[1].field=[t];g=attack(g,a.uid,t.uid).state;assert.equal(g.players[0].hp,98);
  g=fresh();g.players[0].field=[mon('M4')];g.players[1].field=[mon('M2')];g=play(g,'S15').state;g=step(g,{type:'chooseTarget',uid:g.players[1].field[0].uid});assert.equal(g.players[1].hp,100);
 });
 test('Blade Hare granted Decay triggers once; normal direct attacks do not gain a kill bonus',()=>{
  let g=fresh(),a={...mon('M4'),passivesG:['decay']},t={...mon('M2'),decayCnt:2};g.players[0].field=[a];g.players[1].field=[t];g=attack(g,a.uid,t.uid).state;assert.equal(g.players[1].hp,95);
  g=fresh();a=mon('M4');g.players[0].field=[a];g=attack(g,a.uid,null).state;assert.equal(g.players[1].hp,96);
 });
 test('Unbrander keeps summon removal and replaces Curse effect without stacking or changing Void',()=>{
  let g=fresh();g.players[0].brand=3;g=play(g,'UNBRANDER').state;assert.equal(g.players[0].brand,2);g.players[0].field.push(mon('UNBRANDER'));g=play(g,'CURSE').state;assert.equal(g.players[0].hp,103);assert(g.players[0].removed.some(c=>c.id==='CURSE'));
  g.players[0].field=[];g=play(g,'CURSE').state;assert.equal(g.players[0].hp,102);
  g=fresh();g.players[1].field=[mon('UNBRANDER')];g=play(g,'CURSE').state;assert.equal(g.players[0].hp,99);
  g=fresh();g.players[0].field=[mon('UNBRANDER'),mon('ELF')];g=play(g,'CURSE').state;assert.equal(g.players[0].hp,106);
 });
 test('Budget checks all die faces with and without Castle; summons feed Castle counters',()=>{
  const seen=new Set();for(let seed=1;seed<300;seed++)for(const castle of [false,true]){let g=fresh(seed);if(castle)g.players[0].field=[{...mon('CASTLE'),gcount:2}];const r=play(g,'BUDGET');const face=r.events.find(e=>e.type==='dice'&&e.source?.id==='BUDGET')?.rolls[0];assert(face);seen.add(face);const count=(face>=3?1:0)+(castle?1:0);assert.equal(r.state.players[0].field.filter(m=>m.id==='SOLDIER2').length,count);if(castle)assert.equal(r.state.players[0].field[0].gcount,2+count);}
  assert.equal(seen.size,6);
 });
 test('Steel Brand rolls exactly five dice, threshold 19/20, and counts all five for Casino',()=>{
  const seen=new Set();for(let seed=1;seed<2000 && seen.size<2;seed++){let g=fresh(seed);g.players[0].field=[{...mon('CASINO'),gcount:0}];const r=play(g,'S12'),dice=r.events.find(e=>e.type==='dice'&&e.source?.id==='S12');assert.equal(dice.rolls.length,5);const sum=dice.rolls.reduce((a,b)=>a+b,0);assert.equal(r.state.players[1].brand??0,sum>=20?1:0);assert.equal(r.state.players[0].field[0].gcount,5);if(sum===19||sum===20)seen.add(sum);}
  assert.equal(seen.size,2);
 });
 test('Black Attune bonus needs no own monsters AND two opponent monsters; mana floor remains three',()=>{
  for(const own of [0,1])for(const enemy of [0,1,2,3]){let g=fresh();g.players[0].field=Array.from({length:own},()=>mon('M1'));g.players[1].field=Array.from({length:enemy},()=>mon('M1'));g=play(g,'AHEUK').state;assert.equal(g.players[1].maxMana,20-(own===0&&enemy>=2?2:1));assert.equal(g.players[0].mana,16);}
  let g=fresh();g.players[1].maxMana=3;g.players[1].field=[mon('M1'),mon('M1')];g=play(g,'AHEUK').state;assert.equal(g.players[1].maxMana,3);
 });
 test('Earth Blessing heals both fields, grants only Guts counters, never player HP',()=>{
  let g=fresh();for(const p of g.players)p.field=[{...mon('GOLEM1'),dmg:1,guts:0},{...mon('M2'),dmg:2},{...mon('M4'),dmg:1,passivesG:['guts'],guts:3},{...mon('TGE1'),hatch:3,dur:1}];g=play(g,'S14').state;for(const p of g.players){assert.equal(p.hp,100);assert.equal(p.field[0].dmg,0);assert.equal(p.field[0].guts,1);assert.equal(p.field[1].dmg,0);assert.equal(p.field[1].guts,undefined);assert.equal(p.field[2].guts,4);assert.equal(p.field[3].dur,1);}
 });
 test('Inferno Drake owner-turn burn is four',()=>{let g=fresh();g.players[1].field=[mon('GM5_3')];g=step(g,{type:'endTurn'});assert.equal(g.players[0].hp,96);});
 test('Hexer bonus counts other unique names, each instance, owner starts only, including Keloid',()=>{
  for(const [ids,count] of [[['NHEX'],0],[['NHEX','NHEX'],0],[['NHEX','HEXER1'],2],[['NHEX','NHEX','HEXER1'],3],[['NHEX','HEXER4'],1],[['NHEX','HEXER1','HEXER2','HEXER3','HEXER4'],16]]) {
   let g=fresh();g.players[0].field=ids.map(mon);g=step(g,{type:'endTurn'});assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,0);g=step(g,{type:'endTurn'});assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,count);
  }
  let g=fresh();g.cur=1;g.players[0].field=[mon('NHEX')];g.players[0].deck=[card('HEXER1')];g.players[1].field=[mon('HEXER2')];g=step(g,{type:'endTurn'});assert.equal(g.players[1].discard.filter(c=>c.id==='CURSE').length,0);
 });
 test('Hexer existing summon rolls, apprentice roll, and High Hexer spell response remain',()=>{
  for(const [id,spells,n] of [['HEXER1',8,3],['HEXER2',10,4],['HEXER3',13,5]]){const seen=new Set();for(let seed=1;seed<50;seed++){let g=fresh(seed);g.players[0].deck=Array.from({length:spells},()=>card('S10'));const r=play(g,id);const count=r.state.players[1].discard.filter(c=>c.id==='CURSE').length;assert([0,n].includes(count));seen.add(count);}assert.equal(seen.size,2);}
  let g=fresh();g.players[1].field=[mon('HEXER3')];g=play(g,'CURSE').state;assert.equal(g.players[0].discard.filter(c=>c.id==='CURSE').length,1);
  const seen=new Set();for(let seed=1;seed<100;seed++){let g=fresh(seed);g.cur=1;g.players[0].field=[mon('NHEX'),mon('HEXER1')];g.players[0].deck=Array.from({length:12},()=>card('S10'));g=step(g,{type:'endTurn'});const n=g.players[1].discard.filter(c=>c.id==='CURSE').length;assert([2,5].includes(n));seen.add(n);}assert.equal(seen.size,2);
 });
 test('Rest heals player by two; 9/10 Cull threshold, own starts, actual choices and restored queue',()=>{
  for(const n of [9,10]){let g=fresh();g.players[0].enchants=[ench('COLOSSEUM_REST')];g.players[0].removed=Array.from({length:n},()=>card('STARTER_TRASH'));g.players[0].field=[{...mon('M8'),dmg:3},{...mon('M12'),dmg:1}];g=step(g,{type:'endTurn'});assert.equal(g.players[0].hp,100);assert.equal(g.pending,null);g=step(g,{type:'endTurn'});assert.equal(g.players[0].hp,102);if(n===9){assert.equal(g.pending,null);assert.equal(g.players[0].field[0].dmg,3);}else{assert.equal(g.pending.reason,'COLOSSEUM_REST');assert.equal(g.pending.owner,0);assert.equal(effectChoices(g).length,2);const target=g.players[0].field[0].uid;assert.equal(greedyDecide(g).uid,target);assert(botActions(g).some(a=>a.type==='pick'&&a.uid===target));g=step(JSON.parse(JSON.stringify(g)),{type:'pick',uid:target});assert.equal(g.pending,null);assert.equal(g.players[0].field[0].dmg,0);assert.equal(g.players[0].field[1].dmg,1);}}
  let g=fresh();g.cur=1;g.players[0].enchants=[ench('COLOSSEUM_REST'),ench('COLOSSEUM_REST')];g.players[0].removed=Array.from({length:10},()=>card('STARTER_TRASH'));g.players[0].field=[{...mon('M8'),dmg:3},{...mon('M12'),dmg:2}];g=step(g,{type:'endTurn'});assert.equal(g.players[0].hp,104);g=step(g,{type:'pick',uid:g.players[0].field[0].uid});assert.equal(g.pending.reason,'COLOSSEUM_REST');g=step(g,{type:'pick',uid:g.players[0].field[1].uid});assert.equal(g.pending,null);assert(g.players[0].field.every(m=>m.dmg===0));
  g=fresh();g.cur=1;g.players[0].enchants=[ench('COLOSSEUM_REST')];g.players[0].removed=Array.from({length:10},()=>card('STARTER_TRASH'));g=step(g,{type:'endTurn'});assert.equal(g.players[0].hp,102);assert.equal(g.pending,null);
 });
 console.log(`PASS ${checks} legacy-card scenario groups`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
