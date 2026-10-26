import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-rift-ores-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/bot';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const E=await import(dir+'/engine.mjs');const {DB,createGame,reduce,effectChoices,playBlockReason,greedyDecide}=E;
 let seq=0,checks=0;
 const card=id=>({...structuredClone(DB[id]),uid:'ore-'+(++seq)});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[card('FLAME'),card('FLAME'),card('FLAME')],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{}});g.turn=3;g.pending=null;return g;};
 const step=(g,a)=>reduce(g,a).state,pick=(g,uid)=>step(g,{type:'pick',uid});
 const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return step(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const trigger=(g,id='RIFT_METALIGHT')=>{g=play(g,'PURGE_TOUCH');return pick(g,g.players[0].discard.find(c=>c.id===id).uid);};
 const test=(name,fn)=>{fn();checks++;console.log('PASS',name);};

 test('ore catalog names, costs, market-only membership and play rejection',()=>{
  assert.equal(DB.RIFT_MATTER.nameJa,'リフト鉱石 - スターライト');assert.equal(DB.RIFT_MATTER.cost,5);
  assert.equal(DB.RIFT_METALIGHT.nameJa,'リフト鉱石 - メタライト');assert.equal(DB.RIFT_METALIGHT.cost,2);assert.equal(DB.RIFT_METALIGHT.t,'spell');
  for(const id of ['RIFT_MATTER','RIFT_METALIGHT']){assert(E.BUYABLE_POOL.includes(id));assert(!E.DECK_POOL.includes(id));let g=fresh();g.players[0].hand=[card(id)];assert(playBlockReason(g,0,g.players[0].hand[0]));const r=reduce(g,{type:'play',idx:0});assert.deepEqual(r.state.players[0].hand,g.players[0].hand);assert.equal(r.state.players[0].mana,30);assert.equal(r.state.players[0].spellsCastTurn??0,0);assert.equal(r.state.pending,null);}
 });
 test('Metalight offers only opponent graveyard, rejects cancel/invalid/own-zone targets and moves exactly one UID',()=>{
  let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT'),card('M1')];g.players[1].discard=[card('M2'),card('FLAME')];g.players[1].hand=[card('M1')];g=trigger(g);
  assert.equal(g.pending.reason,'RIFT_METALIGHT');assert.equal(g.pending.owner,0);assert.equal(g.pending.allowCancel,false);assert.deepEqual(effectChoices(g).map(c=>c.uid),g.players[1].discard.map(c=>c.uid));
  for(const uid of [null,'invalid',g.players[0].discard[0].uid,g.players[1].hand[0].uid])assert.deepEqual(pick(g,uid),g);
  const target=g.players[1].discard[1];g=pick(g,target.uid);assert.equal(g.pending,null);assert.deepEqual(g.players[1].discard.map(c=>c.id),['M2']);assert.equal(g.players[1].removed[0].uid,target.uid);assert.equal(g.players[0].removed[0].id,'RIFT_METALIGHT');
 });
 test('Metalight has no pending choice for an empty or Relic-only graveyard',()=>{
  for(const relic of [false,true]){let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT')];if(relic)g.players[1].discard=[{...card('M1'),passive:['relic']}];g=trigger(g);assert.equal(g.pending,null);assert.equal(g.players[1].removed.length,0);}
 });
 test('buying, drawing, discarding and existing Rift copies do not activate Metalight',()=>{
  let g=fresh();g.market[0]=card('RIFT_METALIGHT');g=step(g,{type:'buyMarket',i:0});assert.equal(g.pending,null);assert(g.players[0].discard.some(c=>c.id==='RIFT_METALIGHT'));
  g=fresh();g.players[0].deck=[card('RIFT_METALIGHT')];g=play(g,'S10');assert.equal(g.pending,null);assert(g.players[0].hand.some(c=>c.id==='RIFT_METALIGHT'));
  g=fresh();g.players[0].removed=[card('RIFT_METALIGHT')];g.players[1].discard=[card('M1')];g=play(g,'APPLE');assert.equal(g.pending,null);assert.equal(g.players[1].discard.length,1);
 });
 test('Fire Zone finishes its damage before Metalight choice; choice survives JSON serialization',()=>{
  let g=fresh();g.players[0].hand=[card('RIFT_METALIGHT')];g.players[1].discard=[card('M1')];g=play(g,'FIRE_ZONE');g=pick(g,g.players[0].hand[0].uid);assert.equal(g.players[1].hp,95);assert.equal(g.pending.reason,'RIFT_METALIGHT');g=JSON.parse(JSON.stringify(g));g=pick(g,effectChoices(g)[0].uid);assert.equal(g.pending,null);assert.equal(g.players[1].removed.length,1);
 });
 test('opponent-caused entry gives choice to ore owner during opponent turn',()=>{
  let g=fresh();g.players[1].hand=[card('RIFT_METALIGHT')];g.players[0].discard=[card('M1')];g.pending={kind:'cardChoice',owner:0,reason:'HIGH_ELF_HAND',hint:'',allowCancel:false,data:{left:1}};g=pick(g,g.players[1].hand[0].uid);assert.equal(g.cur,0);assert.equal(g.pending.owner,1);assert.equal(g.pending.reason,'RIFT_METALIGHT');g=pick(g,effectChoices(g)[0].uid);assert.equal(g.players[0].removed[0].id,'M1');assert.equal(g.pending,null);
 });
 test('Metalight can send opposing Starlight to Rift and trigger its existing two-field-card effect',()=>{
  let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT')];g.players[0].field=['M1','M2'].map(id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0}));g.players[1].discard=[card('RIFT_MATTER')];g=trigger(g);g=pick(g,effectChoices(g)[0].uid);assert.equal(g.pending.reason,'RIFT_MATTER');assert.equal(g.pending.owner,1);g=pick(g,effectChoices(g)[0].uid);g=pick(g,effectChoices(g)[0].uid);assert.equal(g.players[0].field.length,0);assert.equal(g.pending,null);
 });
 test('opposing Metalight chain resolves once per Rift entry and cannot repeat on later actions',()=>{
  let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT'),card('M1')];g.players[1].discard=[card('RIFT_METALIGHT')];g=trigger(g);g=pick(g,effectChoices(g)[0].uid);assert.equal(g.pending.reason,'RIFT_METALIGHT');assert.equal(g.pending.owner,1);g=pick(g,g.players[0].discard.find(c=>c.id==='M1').uid);assert.equal(g.pending,null);assert.equal(g.players[0].removed.length,2);assert.equal(g.players[1].removed.length,1);g=play(g,'APPLE');assert.equal(g.pending,null);
 });
 test('distinct copies each activate once, including on later actions',()=>{
  let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT'),card('RIFT_METALIGHT')];g.players[1].discard=[card('M1'),card('M2')];
  for(let i=0;i<2;i++){g=trigger(g);assert.equal(g.pending.reason,'RIFT_METALIGHT');g=pick(g,effectChoices(g)[0].uid);assert.equal(g.pending,null);}
  assert.equal(g.players[0].removed.length,2);assert.equal(g.players[1].removed.length,2);
 });
 test('bot chooses a legal Metalight target without hanging',()=>{let g=fresh();g.players[0].discard=[card('RIFT_METALIGHT')];g.players[1].discard=[card('M1'),card('M2')];g=trigger(g);const action=greedyDecide(g);assert(effectChoices(g).some(c=>c.uid===action.uid));g=step(g,action);assert.equal(g.pending,null);});
 console.log(`${checks} Rift ore checks passed`);
} finally {await rm(dir,{recursive:true,force:true});}
