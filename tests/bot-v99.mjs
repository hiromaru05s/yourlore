import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-bot-v99-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botEconomy';export * from './client/src/shared/botTactics';export * from './client/src/shared/botActions';export * from './client/src/shared/botBudget';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0;
 const card=id=>{const def=C.DB[id]??C.STARTERS[id];assert(def,id);return {...def,uid:'v99-'+serial++};};
 const mon=(id,extra={})=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0,...extra});
 const fresh=()=>{const g=C.createGame({mode:'bot',seed:81,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=10;g.pending=null;g.market=[];g.marketStock=[];for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],removed:[],exile:[],hp:40,mana:5,maxMana:5});return g;};
 {
  const g=fresh(),p=g.players[0];p.hand=[card('STARTER_MANA'),card('MINI_SPIRIT')];
  const action=C.safeGreedy(g);assert.deepEqual(action,{type:'play',idx:1},'summon growth body before Attune');
  let next=C.reduce(g,action).state;next=C.reduce(next,C.safeGreedy(next)).state;
  assert.equal(C.curHp(next.players[0],next.players[0].field[0]),3,'Attune growth is actually received');
 }
 {
  const g=fresh(),p=g.players[0];g.market=[card('MERC_LEADER')];g.marketStock=[3];
  p.mana=3;const low=C.purchaseEvaluator(g,p)(g.market[0]);
  p.mana=5;const ready=C.purchaseEvaluator(g,p)(g.market[0]);assert(ready.margin>low.margin+5);
  assert.equal(ready.floor,0);assert.equal(C.immediateHireMana(p,g.market[0]),2);
  p.field=[mon('MERCENARY')];assert.equal(C.immediateHireMana(p,g.market[0]),0);
  p.field=[mon('TSO1')];p.summonLockUntil=g.turn+2;
  assert.equal(C.purchaseEvaluator(g,p)(g.market[0]).tempo,0,'blocked effect summon gets no immediate-board bonus');
 }
 {
  const g=fresh(),p=g.players[0];p.field=[mon('NWL3',{guts:1})];p.mana=20;
  g.pending={kind:'cardChoice',owner:0,reason:'GOLEM_UPKEEP',allowCancel:true,hint:'',hintJa:'',data:{sourceUid:p.field[0].uid,mana:3}};
  assert.deepEqual(C.safeGreedy(g),{type:'pick',uid:null},'do not spend the last counter on a useless Mind Burst');
  p.field[0].guts=4;assert.equal(C.safeGreedy(g).uid,'MIND_BURST');
  let next=C.reduce(g,C.safeGreedy(g)).state;assert(next.players[0].hand.some(c=>c.id==='MIND_BURST'));
  const action=C.safeGreedy(next);assert.equal(action.type,'play');assert.equal(next.players[0].hand[action.idx].id,'MIND_BURST');
  next=C.reduce(next,action).state;assert(next.players[1].hp<40,'generated spell is used');
 }
 {
  const g=fresh(),p=g.players[0];p.mana=20;p.field=[mon('NWL3',{guts:1})];p.hand=[card('MIND_BURST')];g.players[1].hp=5;
  const a=C.botDecide(g,'hard');const after=C.reduce(g,a).state;assert.equal(after.winner,0,'cash last counter when it wins');
 }
 {
  const g=fresh();g.players[0].mana=20;g.market=[card('QUICK_ASSAULT')];g.marketStock=[3];g.players[0].field=[mon('M2',{atk:1}),mon('M2',{atk:1})];g.players[1].hp=5;
  const plan=C.forcedWinPlan(g,900);assert(plan?.some(a=>a.type==='buyMarket'),'proof includes deterministic immediate quick purchases');
  let end=g;for(const a of plan)end=C.reduce(end,a).state;assert.equal(end.winner,0);
 }
 {
  const g=fresh();g.players[0].field=[mon('M2')];const random=Math.random;
  try{Math.random=()=>0;const a=C.botDecide(g,'easy');assert(!['endTurn','refresh'].includes(a.type),'an injected mistake does not arbitrarily throw away the turn');
  }finally{Math.random=random;}
 }
 {
  const g=fresh();g.market=[card('MERCENARY')];g.marketStock=[3];
  g.pending={kind:'cardChoice',owner:0,reason:'MERCH2',allowCancel:false,hint:'',hintJa:''};
  g.expansionChoices=[{owner:0,reason:'MERCH2',hint:''}];
  const next=C.reduce(g,{type:'pick',uid:g.market[0].uid}).state;
  assert.notEqual(next.market[0].uid,g.market[0].uid);
  assert(C.actionChangesState(g,next),'market-only replacement/choice-queue progress is a successful move');
 }
 {
  const g=fresh();g.players[0].hand=[card('MINI_SPIRIT'),card('STARTER_MANA')];
  const budget=C.THINKING_NODES.hard;
  try {
   C.THINKING_NODES.hard=1;
   const progress=[];const a=C.botDecide(g,'hard',x=>progress.push(x));
   assert.deepEqual(a,progress.at(-1),'exhaustion uses the last complete recommendation');
   assert.deepEqual(a,C.botDecide(g,'hard'),'progress callbacks do not change the search budget');
   assert(C.actionChangesState(g,C.reduce(g,a).state));
  } finally {C.THINKING_NODES.hard=budget;}
  assert.doesNotThrow(()=>C.reduce(g,C.safeGreedy(g)),'budget is restored after early exit');
 }
 console.log('PASS v99 sequencing, hire budget and restrictions, Golem conversion, purchase lethal, bounded Easy mistakes');
} finally {await rm(dir,{recursive:true,force:true});}
