import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/creation-test-');
try {
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
 const {createGame,reduce,DB,STARTERS,DECK_POOL,BUYABLE_POOL,redactFor,playCost,buyCost,playBlockReason,hasPassive}=await import(dir+'/engine.mjs');let n=0;
 const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'creation-test-'+n++});
 const fresh=(side=0,seed=17)=>{
  const g=createGame({mode:'online',seed:17,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:28,maxHp:30,mana:20,maxMana:20,uses:{},usesTurn:{},openingDrawReady:false});
  Object.assign(g,{cur:side,phase:'main',pending:null,turn:3,rng:seed});return g;
 };
 const play=g=>{g.players[g.cur].hand.push(card('CREATION'));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const pool=BUYABLE_POOL.filter(id=>DB[id].t==='spell'&&!DB[id].quick);
 assert(pool.length>100);assert(pool.every(id=>!DECK_POOL.includes(id)));
 assert.equal(DB.EMPTY_MIND.cost,2);assert.equal(playCost(card('EMPTY_MIND')),2);assert.equal(buyCost(fresh().players[0],card('EMPTY_MIND')),2);
 assert.equal(DB.CREATION.cost,0);assert.equal(DB.CREATION.maxUsesPerTurn,undefined);assert(hasPassive(DB.CREATION,'void'));
 const seen=new Set();let appleSeed;
 for(let seed=1;seed<=2000;seed++) {
  const side=seed%2,g=fresh(side,seed),source=card('CREATION');g.players[side].hand=[source];
  const untouched=card('STARTER_CHEST');g.players[side].deck=[untouched];g.players[1-side].deck=[card('M6')];
  g.players[side].removed=Array.from({length:10},()=>card('CREATION'));
  const before=JSON.stringify(g),r=reduce(g,{type:'play',idx:0}),p=r.state.players[side],born=p.hand[0];
  assert.equal(JSON.stringify(g),before,'input state immutable');assert.equal(p.hand.length,1);assert(pool.includes(born.id),born.id);seen.add(born.id);if(born.id==='APPLE')appleSeed=seed;
  assert.equal(p.hp,28);assert.equal(p.mana,20);assert.deepEqual(p.deck,[untouched]);assert.equal(p.discard.length,0);assert(p.removed.some(c=>c.uid===source.uid));assert.equal(r.state.pending,null);
  assert(!r.events.some(e=>['draw','heal','creationBorn'].includes(e.type)));
  assert.deepEqual(r.events.filter(e=>e.type==='creationGranted'),[{type:'creationGranted',player:side,sourceUid:source.uid,handIndex:0}]);
  assert(!JSON.stringify(r.events).includes(born.uid),'no generated UID in public events');
  assert.equal(redactFor(r.state,side).players[side].hand[0].id,born.id);
  assert.equal(redactFor(r.state,1-side).players[side].hand[0].id,'HIDDEN');
  assert(redactFor(r.state,side).players[1-side].deck.every(c=>c.id==='HIDDEN'),'no old enemy-deck reveal');
  assert.deepEqual(reduce(JSON.parse(before),{type:'play',idx:0}),r,'seeded replay deterministic');
 }
 assert.equal(seen.size,pool.length,'all eligible spells reachable');assert(appleSeed);
 {const g=fresh(0,appleSeed);g.players[0].enchants=[{card:card('FARMER_PRAYER'),turns:99}];const r=play(g);assert.equal(r.state.players[0].hand[0].id,'GOLDEN_APPLE','existing acquisition replacement still applies');}
 {let g=fresh();for(let i=0;i<6;i++){g=play(g).state;assert.equal(g.players[0].hand.length,i+1);}assert.equal(g.players[0].removed.length,6);assert(!playBlockReason(g,0,card('CREATION')));}
 {const g=fresh(),echo=Object.values(DB).find(c=>c.ench==='runeEcho');g.players[0].enchants=[{card:card(echo.id),turns:99}];const r=play(g);assert.equal(r.state.players[0].hand.length,2);assert.equal(r.state.players[0].removed.length,1);assert.deepEqual(r.events.filter(e=>e.type==='creationGranted').map(e=>e.handIndex),[0,1]);}
 {const g=fresh();g.players[1].traps=[{card:{id:'legacy-null',uid:'null',t:'trap',cost:0,react:'nullspell',name:'Null'}}];const r=play(g);assert.equal(r.state.players[0].hand.length,0);assert(!r.events.some(e=>e.type==='creationGranted'));}
 console.log(`PASS Creation: cost 0, Void, no cap; ${pool.length} eligible spells across 2000 seeded casts, both owners, deterministic replay, hidden identity, no old effects, Prayer, echo, nullification`);
} finally {await rm(dir,{recursive:true,force:true});}
