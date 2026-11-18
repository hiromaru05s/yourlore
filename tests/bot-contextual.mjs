import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
const tmp=await mkdtemp('/tmp/lore-contextual-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botSearch';export * from './client/src/shared/botActions';export * from './client/src/shared/botAcquisition';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/core.mjs'});
 const C=await import(tmp+'/core.mjs');let serial=0;const evidence=[];
 const card=id=>{const c=C.DB[id]??C.STARTERS[id];assert(c,id);return {...c,uid:'context-'+serial++};};
 const mon=(id,overrides={})=>({...card(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,...overrides});
 const fresh=(ids=[])=>{
  const g=C.createGame({mode:'bot',seed:81,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
  g.turn=13;g.pending=null;g.market=ids.map(card);g.marketStock=ids.map(()=>3);
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],exile:[],removed:[],revealedCards:[],supply:[],hp:40,mana:8,maxMana:8});
  return g;
 };
 const assess=g=>[...C.assessAcquisitions(g,C.positionMerit).values()];
 const score=(g,id)=>{const v=assess(g).find(x=>x.id===id);assert(v,id);return v;};
 const record=(name,g)=>{const rows=assess(g);evidence.push({name,rows});console.log(name,rows.map(x=>({id:x.id,impact:+x.impact.toFixed(2),margin:+x.margin.toFixed(2)})));return rows;};
 {
  const bad=fresh(['MEDITATE','MERCENARY']);bad.players[0].hp=50;bad.players[1].hp=20;
  const good=structuredClone(bad);good.players[0].hp=5;good.players[1].hp=50;
  record('meditation-ahead',bad);record('meditation-behind',good);
  assert(score(good,'MEDITATE').margin>score(bad,'MEDITATE').margin+20,'same quick offer changes tier with the actual HP gap');
  assert(score(bad,'MEDITATE').margin<0,'paying a crystal to heal zero is not an upgrade');
 }
 {
  const good=fresh(['SHATTER','M4']);good.players[1].field=[mon('M12',{dmg:2}),mon('M7',{dmg:1})];
  const bad=structuredClone(good);[bad.players[0].field,bad.players[1].field]=[bad.players[1].field,[]];
  record('shatter-enemy-damaged',good);record('shatter-own-damaged',bad);
  assert(score(good,'SHATTER').margin>score(bad,'SHATTER').margin+15,'symmetric wipe accounts for actual friendly casualties');
 }
 {
  const g=fresh(['S13','M4']);const clear=score(g,'S13');
  g.players[1].enchants=[{card:card('BLOOD_RITE'),turns:99,bornTurn:1}];const heal=score(g,'S13');
  record('burn-heals-opponent',g);assert(heal.margin<clear.margin-10);
 }
 {
  const g=fresh(['S13','M4']);const fast=score(g,'S13');
  g.players[0].deck=Array.from({length:20},()=>card('STARTER_TRASH'));g.turn=56;
  const late=score(g,'S13');record('cannot-draw-before-end',g);
  assert(late.arrival>fast.arrival);assert(late.margin<0,'do not buy a card that will miss the match horizon');
 }
 {
  const g=fresh(['SHATTER','MEDITATE','DISARM1']);g.players[0].hp=12;
  const before=JSON.stringify(g),a=assess(g);assert.equal(JSON.stringify(g),before,'trials do not mutate live state');
  const twin=structuredClone(g);twin.rng=98345;twin.players[1].hand=[card('S13')];twin.players[1].deck=[card('WORLD_TREE')];
  // Keep the same public zone lengths; identities/order/RNG must not affect tiers.
  g.players[1].hand=[card('STARTER_TRASH')];g.players[1].deck=[card('STARTER_TRASH')];
  assert.deepEqual(assess(g),assess(twin),'private identities and live RNG cannot leak into card assessment');
  assert(a.every(x=>Number.isFinite(x.margin)));
 }
 {
  for(const tier of ['easy','normal','hard']) {
   const g=fresh(['MEDITATE','MERCENARY']);g.players[0].hp=5;g.players[1].hp=50;
   const a=C.botDecide(g,tier);console.log('recover',tier,a);
   assert.equal(a.type,'buyMarket');assert.equal(g.market[a.i].id,'MEDITATE',tier+' prioritizes immediate recovery from the actual gap');
   const safe=structuredClone(g);safe.players[0].hp=60;
   const b=C.botDecide(safe,tier);assert(!(b.type==='buyMarket'&&safe.market[b.i].id==='MEDITATE'),tier+' declines the same zero-heal quick purchase');
  }
 }
 {
  const g=fresh();g.players[0].hand=[card('SHATTER'),card('M4')];g.players[0].hp=8;g.players[0].mana=2;
  g.players[1].field=[mon('M12',{atk:15,def:20,dmg:2}),mon('M7',{atk:15,def:20,dmg:1})];
  for(const tier of ['easy','normal','hard']) {
   const a=C.botDecide(g,tier);console.log('wipe',tier,a);
   assert.equal(a.type,'play');assert.equal(g.players[0].hand[a.idx].id,'SHATTER',tier+' removes the damaged enemy board instead of another small body');
  }
 }
 {
  const g=fresh(['NGA4','M4']);const neutral=score(g,'NGA4');
  const crowd=structuredClone(g);crowd.players[1].field=Array.from({length:5},()=>mon('M2'));
  const allies=structuredClone(g);allies.players[0].field=Array.from({length:5},()=>mon('MINI_SPIRIT',{atkMod:4,defMod:4}));
  record('berserk-empty-board',g);record('berserk-enemy-crowd',crowd);record('berserk-own-crowd',allies);
  assert(neutral.margin<0,'a random double attack is not controlled face damage');
  assert(score(crowd,'NGA4').margin>score(allies,'NGA4').margin+15);
  for(const tier of ['easy','normal','hard']){const a=C.botDecide(g,tier);assert(!(a.type==='buyMarket'&&g.market[a.i].id==='NGA4'));}
 }
 {
  const g=fresh(['NOURISHING_RAIN']);g.players[0].hand=[card('MINI_SPIRIT')];
  const paired=score(g,'NOURISHING_RAIN');
  const plain=structuredClone(g);plain.players[0].hand=[];
  assert(paired.cooperation>0,'owned setup and payoff are tried in both orders');
  assert(paired.impact>score(plain,'NOURISHING_RAIN').impact);
 }
 console.log('PASS contextual acquisition: actual effect, collateral, recovery conversion, draw horizon and privacy');
 if(process.env.BOT_CONTEXT_REPORT){await mkdir(new URL('.', 'file://'+process.env.BOT_CONTEXT_REPORT).pathname,{recursive:true});await writeFile(process.env.BOT_CONTEXT_REPORT,JSON.stringify(evidence,null,2));}
}finally{await rm(tmp,{recursive:true,force:true});}
