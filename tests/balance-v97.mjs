import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-goblin-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './client/src/shared/protocol'; export * from './server/src/reworkedCardSnapshot'; export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs'); const {DB,STARTERS,DECK_POOL,createGame,reduce,effAtk,curHp,playBlockReason,effectChoices,hasPassive,redactFor,greedyDecide,effMaxMana,ARIES_OPPONENTS}=E;
 let seq=0,checks=0;
 const card=id=>{assert(DB[id]||STARTERS[id],id);return {...structuredClone(DB[id]||STARTERS[id]),uid:'test-'+(++seq)};};
 const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});g.turn=3;g.pending=null;return g;};
 const step=(g,a)=>reduce(g,a).state;
 const play=(g,id)=>{g.players[g.cur].mana=30;g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const pick=(g,uid)=>step(g,{type:'pick',uid});
 const end=g=>step(g,{type:'endTurn'});
 const ench=id=>({card:card(id),turns:99,bornTurn:0});
 function test(name,fn){fn();checks++;console.log('PASS',name);}
 test('saved rooms preserve elapsed owner starts, market slots and purchased card identity',()=>{
   const g=fresh(); delete g.balance97Applied;
   const device=ench('MANA_BACKFLOW');device.turns=7;device.card.val=15;
   const retired={...card('M1'),id:'LAWLESS',cost:3};
   const legacy=card('MEDITATE');delete legacy.quick;
   g.players[0].hand=[legacy];g.players[0].deck=[retired];
   g.market[0]=retired;g.players[0].enchants=[device];
   E.restoreReworkedCards(g);
   assert.equal(device.turns,17);assert.equal(device.card.val,25);
   assert.equal(g.players[0].deck.length,0);assert.equal(g.players[0].hand.length,0);
   assert.equal(g.players[0].removed[0].uid,legacy.uid);assert.equal(g.players[0].removed[0].quick,true);
   assert(E.BUYABLE_POOL.includes(g.market[0].id));assert.equal(g.market[0].cost,3);
   const saved=structuredClone(g);E.restoreReworkedCards(g);assert.deepEqual(g,saved);
 });
 test('retired cards are unavailable in both catalogs and both pools',()=>{
   for(const id of ['LAWLESS','MAGIC_TRAIN','ND5']){
     assert(!DB[id]&&!STARTERS[id]);assert(!DECK_POOL.includes(id)&&!E.BUYABLE_POOL.includes(id));
   }
 });
 test('another friendly card destroys the Device and charges the opponent',()=>{
   let g=fresh();g.players[0].enchants=[ench('MANA_BACKFLOW')];g.players[0].heartDue=g.turn+1;
   g=end(g);assert.equal(g.players[0].enchants.length,0);
   assert.equal(g.players[0].maxMana,24);assert.equal(g.players[1].maxMana,28);
 });
 test('Meditation heals only missing HP up to the opponent, including Elf doubling',()=>{
   for(const hp of [20,100,120]){
     const g=fresh();g.players[0].hp=hp;g.players[0].field=[mon('ELF')];g.market[0]=card('MEDITATE');
     const p=step(g,{type:'buyMarket',i:0}).players[0];assert.equal(p.hp,Math.max(hp,100));assert.equal(p.maxMana,29);
     assert(![...p.hand,...p.discard].some(c=>c.id==='MEDITATE'));
   }
 });
 test('Volley and Siege Collapse bypass charged Guts on both sides',()=>{
   for(const id of ['SNIPE2','WALLBREAK2']){
     let g=fresh();for(const p of g.players)p.field=[{...mon('M2'),atk:2,def:2,guts:5,passive:['guts']}];
     g=play(g,id);for(const p of g.players){assert.equal(p.field.length,0);assert(p.discard.some(c=>c.id==='M2'));}
   }
 });
 test('Shatter destroys wounded monsters across both fields and only actual enemy grave entries heal',()=>{
   let g=fresh();g.players[0].enchants=[ench('VAMP_WARD')];
   g.players[0].field=[{...mon('M2'),dmg:1,def:5}];
   g.players[1].field=[{...mon('M2'),dmg:1,def:4},{...mon('M2'),dmg:1,def:4,passive:['void']},mon('M2')];
   g=play(g,'SHATTER');assert.equal(g.players[0].hp,100);
   assert.equal(g.players[0].field.length,0);assert.equal(g.players[1].field.length,1);assert.equal(g.players[1].removed.length,1);
 });
 test('Essence ends only on the next owner start',()=>{
   let g=play(fresh(),'ESSENCE_OF_LIFE');g=end(g);assert.equal(g.players[0].enchants.length,1);
   g=end(g);assert.equal(g.players[0].enchants.length,0);
 });
 console.log(checks,'v97 integration cases passed');
} finally {await fs.rm(dir,{recursive:true,force:true});}
