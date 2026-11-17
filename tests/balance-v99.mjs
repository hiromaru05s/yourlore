import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-balance99-');
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
 for(const side of [0,1]){
  const foe=1-side;
  test('Only the two spell sources remove printed Mimic Counter, including redirected summons: '+side,()=>{
   for(const id of ['QUICK_MIMIC','GREED_PRICE','AWAKENED_MIMIC'])for(const redirected of [false,true]){
    let g=fresh();g.cur=side;if(redirected)g.players[side].enchants=[ench('COUP')];
    if(id==='QUICK_MIMIC'){g.market[0]=card(id);g.marketStock[0]=1;g=step(g,{type:'buyMarket',i:0});}
    else g=play(g,id);
    const spawned=g.players.flatMap(p=>p.field).filter(m=>m.id==='MIMIC');
    assert.equal(spawned.length,id==='QUICK_MIMIC'?1:2);
    assert(spawned.every(m=>hasPassive(m,'counter')===(id==='AWAKENED_MIMIC')));
    if(id!=='AWAKENED_MIMIC'){
     const rift=g.players[side].removed.filter(c=>c.id==='MIMIC');
     assert.equal(rift.length,id==='QUICK_MIMIC'?2:5);assert(rift.every(c=>hasPassive(c,'counter')));
    }
   }
  });
  test('Berserker grows only at owner end and fallen Knight cannot attack until next turn: '+side,()=>{
   let g=fresh();g.cur=side;g=play(g,'GM5_0');assert.equal(effAtk(g.players[side],g.players[side].field[0],g),6);
   g=end(g);assert.equal(g.players[side].field[0].atkMod,1);g=end(g);assert.equal(g.players[side].field[0].atkMod,1);
   g=fresh();g.cur=side;const fallen=mon('TAR3'),target=mon('M3');assert(!hasPassive(fallen,'counter'));
   g.players[side].field=[fallen];g.players[foe].field=[target];g=pick(step(g,{type:'attack',uid:fallen.uid}),target.uid);
   const knight=g.players[side].field[0];assert.equal(knight.id,'INFKNIGHT');assert(hasPassive(knight,'counter'));
   assert(!E.monsterCanAttack(g,g.players[side],knight));g=end(end(g));assert(E.monsterCanAttack(g,g.players[side],g.players[side].field[0]));
  });
  test('Hexer scales once per three Curses and Scout repays sixteen total turns later: '+side,()=>{
   for(const n of [0,2,3,5,6]){
    const g=fresh();g.cur=side;const ally=mon('M3');g.players[side].field=[mon('HEXER3'),ally];g.players[foe].discard=Array.from({length:n},()=>card('CURSE'));E.refreshFieldPassives(g);
    assert.equal(effAtk(g.players[side],ally,g),ally.atk+Math.floor(n/3));
   }
   let g=fresh();g.cur=side;g=play(g,'TDE1');assert.deepEqual(g.players[side].manaRegain,[{at:g.turn+16,amt:1}]);g.players[side].field=[];g.players[side].maxMana=10;
   for(let i=0;i<15;i++)g=end(g);assert.equal(g.players[side].maxMana,10);g=end(g);assert.equal(g.players[side].maxMana,11);
  });
 }
 test('Migration preserves acquired passives, identity and swaps, and postpones outstanding Scout debt only once',()=>{
  const g=fresh();delete g.balance99Applied;const p=g.players[0];p.manaRegain=[{at:12,amt:1}];
  const knight={...mon('TAR3'),passive:['counter'],passivesG:['taunt']},master={...mon('MERC_MASTER'),trickSwapped:true,atk:3,def:5};
  const muted={...mon('GM5_0'),turnFx:undefined,mutedEffects:{turnFx:'growAtk'}};p.field=[knight,master,muted];p.enchants=[ench('ESSENCE_OF_LIFE')];
  E.restoreReworkedCards(g);assert(g.balance99Applied);assert.deepEqual(knight.passive,[]);assert.deepEqual(knight.passivesG,['taunt']);assert.equal(master.atk,2);assert.equal(master.def,5);assert.equal(p.manaRegain[0].at,18);assert.equal(muted.mutedEffects.turnFx,'endGrowAtk');
  const once=JSON.stringify(g);E.restoreReworkedCards(g);assert.equal(JSON.stringify(g),once);
 });
 console.log(checks,'v99 integration cases passed');
} finally {await fs.rm(dir,{recursive:true,force:true});}
