import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-starter-rift-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './client/src/shared/protocol'; export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs'); const {DB,STARTERS,createGame,reduce,effAtk,curHp,playBlockReason,effectChoices,hasPassive,redactFor,greedyDecide,effMaxMana,playCost}=E;
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

 test('catalog: Goblin 1/1, Fire rename, market-only unplayable Rift Matter',()=>{
   assert.equal(DB.GOBLIN.atk,1);assert.equal(DB.GOBLIN.def,1);assert.equal(DB.FLAME.nameJa,'ファイアー');assert.equal(DB.FLAME.nameEn,'Fire');
   assert.equal(DB.RIFT_MATTER.cost,5);assert.equal(DB.RIFT_MATTER.t,'spell');assert(E.BUYABLE_POOL.includes('RIFT_MATTER'));assert(!E.DECK_POOL.includes('RIFT_MATTER'));
   let g=fresh();g.players[0].hand=[card('RIFT_MATTER')];const before=structuredClone(g);g=step(g,{type:'play',idx:0});assert.deepEqual(g.players[0].hand,before.players[0].hand);assert.equal(g.players[0].mana,30);assert.equal(g.players[0].spellsCastTurn??0,0);assert.equal(g.pending,null);
 });
 test('Goblin direct attack adds separate damage, including shield absorption',()=>{for(const shield of [0,1,2]){let g=fresh();const m=mon('GOBLIN');g.players[0].field=[m];g.players[1].shield=shield;const r=reduce(g,{type:'attack',uid:m.uid,targetUid:null});assert.equal(r.state.players[1].hp,100-Math.max(0,2-shield));assert.equal(r.state.players[1].shield??0,0);assert(r.events.some(e=>e.type==='monsterActivate'));}});
 test('Goblin attacks on monsters never add direct-attack damage, including overflow',()=>{let g=fresh();const m=mon('GOBLIN'),v=mon('M1');m.atkMod=3;v.def=1;g.players[0].field=[m];g.players[1].field=[v];g=step(g,{type:'attack',uid:m.uid});g=pick(g,v.uid);assert.equal(g.players[1].hp,97);});
 test('Ghost heals buff each copy without self damage',()=>{let g=fresh();g.players[1].field=[mon('GHOST'),mon('GHOST')];g=play(g,'APPLE');assert.deepEqual(g.players[1].field.map(m=>m.atkMod),[1,1]);assert.equal(g.players[1].hp,100);g=play(g,'APPLE');assert.deepEqual(g.players[1].field.map(m=>m.atkMod),[2,2]);assert.equal(g.players[1].hp,100);});
 test('Ghost mana trigger counts events rather than mana points and survives serialization',()=>{let g=fresh();g.players[0].maxMana=5;g.players[1].field=[mon('GHOST'),mon('GHOST')];const grow=Object.values(DB).find(c=>c.act==='manaUp'&&c.val>=2);assert(grow);g=play(g,grow.id);assert.equal(g.players[1].hp,96);g=JSON.parse(JSON.stringify(g));g=play(g,grow.id);assert.equal(g.players[1].hp,92);});
 test('Ghost does not trigger when mana growth is blocked or capped',()=>{for(const blocked of [true,false]){let g=fresh();g.players[0].maxMana=blocked?5:30;g.players[1].field=[mon('GHOST')];if(blocked)g.players[0].field=[mon('TDE4')];const grow=Object.values(DB).find(c=>c.act==='manaUp');g=play(g,grow.id);assert.equal(g.players[1].hp,100);}});
 test('Ghost counts multiple growth effects in one action',()=>{let g=fresh();g.players[1].maxMana=5;g.players[0].field=[mon('GHOST')];const bless=Object.values(DB).find(c=>c.ench==='worldBless');assert(bless);g.players[0].enchants=[ench(bless.id),ench(bless.id)];g=end(g);assert.equal(g.players[0].hp,96);});
 test('Fire participates in discounts, Meteor condition, Zone bonus and retrieval',()=>{
   let g=fresh();g.players[0].field=[mon('FIRE_MASTER')];assert.equal(playCost(DB.FLAME,g.players[0]),0);g.players[0].field=[];g=play(g,'FIRE_ART');assert.equal(playCost(DB.FLAME,g.players[0]),0);
   g=play(g,'FLAME');assert(g.players[0].expansion.firePlayed.includes('FLAME'));assert.equal(playCost(DB.FIRE_METEOR,g.players[0]),0);
   g.players[0].expansion.fireDiscount=0;assert.equal(playCost(DB.FIRE_METEOR,g.players[0]),1);g.players[0].hand=[card('M1')];g=play(g,'FIRE_ZONE');g=pick(g,g.players[0].hand[0].uid);assert.equal(g.players[1].hp,89);
   g=fresh();g.players[0].discard=[card('FLAME')];g.pending={kind:'cardChoice',owner:0,reason:'FIRE_MASTER',hint:'',hintJa:'',allowCancel:false,data:{left:2}};assert.equal(effectChoices(g)[0].id,'FLAME');g=pick(g,g.players[0].discard[0].uid);assert.equal(g.players[0].hand[0].id,'FLAME');
 });
 const banish=Object.values(DB).find(c=>c.act==='exilePick');assert(banish);
 const trigger=g=>{g=play(g,banish.id);return pick(g,g.players[0].discard.find(c=>c.id==='RIFT_MATTER').uid);};
 test('Rift Matter exiles two selected field cards, skips destruction effects and prevents invalid picks',()=>{
   let g=fresh();g.players[0].discard=[card('RIFT_MATTER')];g.players[1].field=[mon('M1'),mon('M2')];g.players[1].enchants=[ench('GOBLIN_SETTLEMENT')];g=trigger(g);assert.equal(g.pending.reason,'RIFT_MATTER');assert.equal(g.pending.owner,0);assert.equal(g.pending.allowCancel,false);
   const invalid=pick(g,'unknown');assert.deepEqual(invalid.pending,g.pending);assert.equal(pick(g,null).pending.reason,'RIFT_MATTER');
   const m=g.players[1].field[0].uid,e=g.players[1].enchants[0].card.uid;g=pick(g,m);assert.equal(g.pending.data.left,1);g=JSON.parse(JSON.stringify(g));g=pick(g,e);assert.equal(g.pending,null);assert.equal(g.players[1].field.length,1);assert.equal(g.players[1].removed.length,2);assert.equal(g.players[0].hp,100);g=step(g,{type:'reorderField',from:0,to:0});assert.equal(g.pending,null);
 });
 test('Rift Matter handles zero or one legal target and respects Aura and Relic',()=>{for(const count of [0,1]){let g=fresh();g.players[0].discard=[card('RIFT_MATTER')];g.players[1].field=[{...mon('M1'),passive:['aura']}];g.players[1].enchants=[ench('RELIC_PROTECTION')];if(count)g.players[1].field.push(mon('M2'));g=trigger(g);if(count){assert.equal(effectChoices(g).length,1);g=pick(g,effectChoices(g)[0].uid);}assert.equal(g.pending,null);assert.equal(g.players[1].removed.length,count);assert.equal(g.players[1].field.length,1);}});
 test('Rift Matter buying, drawing, graveyard entry and an old Rift copy do not trigger',()=>{let g=fresh();g.players[1].field=[mon('M1')];g.market[0]=card('RIFT_MATTER');g=step(g,{type:'buyMarket',i:0});assert.equal(g.pending,null);assert(g.players[0].discard.some(c=>c.id==='RIFT_MATTER'));g.players[0].removed=[card('RIFT_MATTER')];g=play(g,'APPLE');assert.equal(g.pending,null);});
 test('Fire Zone exiling Rift Matter activates after the paid spell, not instead of it',()=>{let g=fresh();g.players[0].hand=[card('RIFT_MATTER')];g.players[1].field=[{...mon('M1'),def:20},{...mon('M2'),def:20}];g=play(g,'FIRE_ZONE');g=pick(g,g.players[0].hand[0].uid);assert.equal(g.players[1].hp,95);assert.equal(g.pending.reason,'RIFT_MATTER');g=pick(g,effectChoices(g)[0].uid);g=pick(g,effectChoices(g)[0].uid);assert.equal(g.pending,null);assert.equal(g.players[1].field.length,0);});
 test('Opponent-caused Rift entry gives the victim the choice and queues behind other effects',()=>{let g=fresh();g.players[1].hand=[card('RIFT_MATTER')];g.players[0].field=[mon('M1'),mon('M2')];g.pending={kind:'cardChoice',owner:0,reason:'HIGH_ELF_HAND',hint:'',hintJa:'',allowCancel:false,data:{left:1}};g=pick(g,g.players[1].hand[0].uid);assert.equal(g.pending.reason,'RIFT_MATTER');assert.equal(g.pending.owner,1);g=pick(g,effectChoices(g)[0].uid);g=pick(g,effectChoices(g)[0].uid);assert.equal(g.players[0].field.length,0);assert.equal(g.pending,null);});
 console.log(`${checks} starter/Rift rework checks passed`);
} finally {await fs.rm(dir,{recursive:true,force:true});}
