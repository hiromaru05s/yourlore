import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-sage-goblin-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {DB,STARTERS,createGame,reduce,playCost,playBlockReason,botActions}=await import(dir+'/engine.mjs');
 let seq=0,checks=0;
 const card=id=>({...structuredClone(DB[id]||STARTERS[id]),uid:'sg-'+(++seq)});
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=(seed=41)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:40,mana:6,maxMana:6,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},dew:0,shield:0});return g;};
 const step=(g,a)=>reduce(g,a).state;
 const duel=(side=0)=>{const g=fresh();g.cur=side;g.players[side].field=[mon('GOBLIN')];g.players[1-side].field=[{...mon('GOBLIN'),def:20}];return g;};
 const attack=g=>step(g,{type:'attack',uid:g.players[g.cur].field[0].uid});
 const target=g=>step(g,{type:'chooseTarget',uid:g.players[1-g.cur].field[0].uid});
 const sage=()=>{const g=fresh();g.players[0].field=[mon('NMD6')];g.players[0].deck=Array.from({length:13},()=>card('S10'));return g;};
 const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};
 test('Sage: 12/13 spell threshold, positive floor, original zero, monsters and no stacking',()=>{
  const g=sage(),p=g.players[0];p.deck.pop();assert.equal(playCost(card('S15'),p),DB.S15.play??DB.S15.cost);p.deck.push(card('S10'));
  for(const cost of [0,1,2,3,6])assert.equal(playCost({...card('S10'),play:cost},p),cost===0?0:Math.max(1,cost-1));
  assert.equal(playCost(card('GOBLIN'),p),1);p.field.push(mon('NMD6'));assert.equal(playCost({...card('S10'),play:3},p),2);
  p.manaCostMult=3;assert.equal(playCost(card('S10'),p),3);
 });
 test('Sage no longer allows zero-mana Archive/Foresight; BOT legal actions agree after JSON restore',()=>{
  const g=JSON.parse(JSON.stringify(sage()));g.players[0].mana=0;g.players[0].hand=[card('S10'),card('ND2')];
  for(const c of g.players[0].hand)assert(playBlockReason(g,0,c));assert(!botActions(g).some(a=>a.type==='play'));
  for(let idx=0;idx<2;idx++){const r=reduce(g,{type:'play',idx});for(const key of ['hand','deck','discard','field','mana','hp','spellDiscountCharges'])assert.deepEqual(r.state.players[0][key],g.players[0][key]);}
 });
 test('Sage plus Grimoire: only five free casts, then a real mana payment',()=>{
  let g=sage();g.players[0].hand=[card('S10')];g.players[0].spellDiscountCharges=[5];g.players[0].spellDiscountTurn=1;
  for(let i=0;i<5;i++){assert.equal(playCost(g.players[0].hand[0],g.players[0]),0);g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,6);}
  assert.equal(playCost(g.players[0].hand[0],g.players[0]),1);g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,5);
 });
 test('Sage + Erosion + draw has a finite mana bound without Grimoire',()=>{
  for(const draw of ['S10','ND2']){let g=sage();const p=g.players[0];p.hand=[card(draw)];p.deck=Array.from({length:12},()=>card(draw));p.enchants=[{card:card('EROSION'),turns:99,bornTurn:0}];
   for(let i=0;i<6;i++)g=step(g,{type:'play',idx:0});assert.equal(g.players[0].mana,0);assert.equal(g.players[1].hp,40-6*(DB[draw].val??1));assert(playBlockReason(g,0,g.players[0].hand[0]));
  }
 });
 test('Goblin target selection, cancellation and invalid targets do not damage the player',()=>{
  let g=attack(duel());assert.equal(g.players[0].hp,40);const bad=step(g,{type:'chooseTarget',uid:'missing'});assert.equal(bad.players[0].hp,40);assert(bad.pending);
  g=step(g,{type:'chooseTarget',uid:null});assert.equal(g.players[0].hp,40);assert(!g.players[0].field[0].exhausted);
  g.players[0].field[0].tempAtk=-100;g=attack(g);assert.equal(g.players[0].hp,40);assert.equal(g.pending,null);
 });
 test('Goblin pays one player damage per committed monster attack, on either side',()=>{
  for(const side of [0,1]){const g=target(attack(duel(side)));assert.equal(g.players[side].hp,39);assert.equal(g.players[1-side].hp,40);assert.equal(g.players[1-side].field[0].dmg,1);assert.equal(g.players[side].field[0].attacksUsed,1);}
 });
 test('Direct attack retains bonus damage, and Raider has no Goblin penalty',()=>{
  let g=duel();g.players[1].field=[];g=attack(g);assert.equal(g.players[0].hp,40);assert.equal(g.players[1].hp,38);
  g=duel();g.players[0].field=[mon('GOBLIN_RAIDER')];g=target(attack(g));assert.equal(g.players[0].hp,40);
 });
 test('Self damage uses Shield and lethal self damage ends before combat damage',()=>{
  let g=duel();g.players[0].shield=1;g=target(attack(g));assert.equal(g.players[0].hp,40);assert.equal(g.players[0].shield,0);
  g=duel();g.players[0].hp=1;const targetUid=g.players[1].field[0].uid;g=attack(g);const r=reduce(g,{type:'chooseTarget',uid:targetUid});assert.equal(r.state.winner,1);assert(r.state.over);assert.equal(r.state.players[1].field[0].dmg,0);assert(!r.events.some(e=>e.type==='hit'&&e.uid===targetUid));
 });
 test('World Tree attack/defence continuations charge once, including restored state',()=>{
  let g=duel();for(const p of g.players){p.field.push(mon('WORLD_TREE'));p.dew=2;}
  g=target(attack(g));assert.equal(g.pending.reason,'WORLD_TREE_ATTACK');assert.equal(g.players[0].hp,40);
  g=step(g,{type:'pick',uid:'grow'});assert.equal(g.pending.reason,'WORLD_TREE_DEFEND');assert.equal(g.players[0].hp,40);
  g=step(JSON.parse(JSON.stringify(g)),{type:'pick',uid:'grow'});assert.equal(g.players[0].hp,39);assert.equal(g.players[0].field[0].attacksUsed,1);assert.equal(g.players[1].field[0].dmg,4);
 });
 test('Evasion and trap cancellation still pay the committed attack penalty',()=>{
  let evaded=false;for(let seed=1;seed<100&&!evaded;seed++){let g=duel();g.rng=seed;g.players[1].field[0].passivesG=['evade'];g=target(attack(g));assert.equal(g.players[0].hp,39);if(!g.players[1].field[0].dmg)evaded=true;}assert(evaded);
  let g=duel();g.players[1].traps=[{card:{...card('COUNTERCALC'),react:'devour'}}];g=target(attack(g));assert.equal(g.players[0].hp,39);assert.equal(g.players[0].field.length,0);
 });
 test('Multiple attacks pay each time; repeated exhausted attack does not',()=>{
  let g=duel();g.players[0].field[0].mult=2;g=target(attack(g));g=target(attack(g));assert.equal(g.players[0].hp,38);assert(g.players[0].field[0].exhausted);g=attack(g);assert.equal(g.players[0].hp,38);
 });
 console.log(`PASS ${checks} Sage/Goblin scenario groups`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
