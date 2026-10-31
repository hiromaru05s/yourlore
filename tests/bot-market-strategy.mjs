import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-bot-market-test-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botStrategy';export * from './client/src/shared/botSearch';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');let serial=0;
 const card=id=>({...C.DB[id],uid:'market-test-'+serial++});
 const mon=id=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0});
 function fresh(ids=['PRIEST','S15']) {
  const g=C.createGame({mode:'bot',seed:97,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
  g.turn=7;g.pending=null;g.market=ids.map(card);g.marketStock=ids.map(()=>3);
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:4,maxMana:6});
  g.players[0].deck=C.BOT_HELL_DECKS[0].cards.map(card);return g;
 }
 // Isolate the public signal: removal is a worthwhile first purchase only
 // when the visible market offers a recurring recovery engine.
 const open=fresh(['S15']);const exposed=structuredClone(open);exposed.market.push(card('PRIEST'));exposed.marketStock.push(3);
 assert.deepEqual(C.greedyStep(open).action,{type:'endTurn'});
 assert.equal(C.greedyStep(exposed).action.type,'buyMarket');
 const threatened=C.recoveryThreat(exposed,exposed.players[0]);assert(threatened>0);
 const privateChange=structuredClone(exposed);privateChange.players[1].hand=[card('HIGH_PRIEST')];privateChange.players[1].deck=[card('WORLD_HEART')];
 assert.equal(C.recoveryThreat(privateChange,privateChange.players[0]),threatened,'hidden opponent cards do not drive market planning');
 const depleted=fresh(['PRIEST']);depleted.marketStock[0]=0;assert.equal(C.recoveryThreat(depleted,depleted.players[0]),0);
 for(const id of ['PRIEST','HIGH_PRIEST','WORLD_HEART']){const g=fresh([id]);assert(C.recoveryThreat(g,g.players[0])>0,id+' is an accessible recovery threat');}
 // Cheap snipes and the cost-5 rune cannot remove a healthy cost-4 Priest.
 const g=fresh();g.players[1].field=[mon('PRIEST')];
 assert(C.strategicAdjustment(g,g.players[0],C.DB.S15)>C.strategicAdjustment(g,g.players[0],C.DB.SNIPE1));
 assert(C.strategicAdjustment(g,g.players[0],C.DB.S15)>C.strategicAdjustment(g,g.players[0],C.DB.RUNE1));
 const enchant=fresh(['WORLD_HEART']);assert.equal(C.strategicAdjustment(enchant,enchant.players[0],C.DB.S15),0,'monster removal cannot answer a recovery enchantment');
 const shieldEngine=fresh([]);const unsupported=C.strategicAdjustment(shieldEngine,shieldEngine.players[0],C.DB.IRON_WALL);
 shieldEngine.players[0].field=[mon('PRIEST')];assert(C.strategicAdjustment(shieldEngine,shieldEngine.players[0],C.DB.IRON_WALL)>unsupported,'value repeatable shield purchases after acquiring Priest');
 // Target selection actually removes the zero-attack engine ahead of a body.
 const target=fresh([]);target.players[0].hand=[card('S15')];target.players[1].field=[{...mon('M2'),atk:3,def:4},mon('PRIEST')];
 const pending=C.reduce(target,{type:'play',idx:0}).state;
 const picked=C.greedyStep(pending);assert(!picked.state.players[1].field.some(c=>c.id==='PRIEST'));
 assert(picked.state.players[1].field.some(c=>c.id==='M2'));
 for(const difficulty of ['hard','hell']) {
  let market=fresh();let a=C.botDecide(market,difficulty);
  assert.equal(a.type,'buyMarket',difficulty+' develops into the public recovery matchup');
  assert(['PRIEST','S15'].includes(market.market[a.i].id));
  let dew=fresh([]);dew.players[1].dew=8;dew.players[0].hand=[card('FLAME'),card('DESERTIFICATION')];
  a=C.botDecide(dew,difficulty);assert.equal(a.type,'play');assert.equal(dew.players[0].hand[a.idx].id,'DESERTIFICATION');
  assert.equal(C.reduce(dew,a).state.players[1].dew,0);
  const lethal=fresh();lethal.players[0].field=[mon('GHOST')];lethal.players[1].hp=1;
  a=C.botDecide(lethal,difficulty);assert.equal(C.reduce(lethal,a).state.winner,0,'take the win instead of a slow counter plan');
 }
 const dry=fresh([]);dry.players[0].dew=7;
 dry.players[1].enchants=[{card:card('DESERTIFICATION'),turns:99,bornTurn:0}];
 assert.equal(C.recoveryPerTurn(dry,dry.players[0]),3,'public recovery estimate floors the persistent half');
 dry.players[0].enchants=[{card:card('DESERTIFICATION'),turns:99,bornTurn:0}];
 assert.equal(C.recoveryPerTurn(dry,dry.players[0]),1,'both players’ copies stack');
 const shield=fresh([]);shield.players[1].shield=12;shield.players[0].hand=[card('FLAME'),card('ARMOR_BREAK')];
 const cracked=C.greedyStep(shield);assert.equal(cracked.state.players[1].shield,3);
 // Preserve the last 3 mana for an owned wall answer. Vary public UIDs too:
 // they seed hidden-world samples and exposed a refresh-before-removal bug.
 for(const difficulty of ['hard','hell'])for(const salt of [0,59,127,901]){
  let n=salt;const fixture=id=>({...C.DB[id],uid:'staging-market-'+n++});
  const wall=fresh([]);wall.turn=11;
  for(const p of wall.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],removed:[],exile:[],revealedCards:[],hp:40,mana:3,maxMana:8});
  const body=id=>({...fixture(id),dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,guts:C.hasPassive(C.DB[id],'guts')?1:0});
  wall.players[1].field=[body('NWL3')];wall.players[0].field=[body('RUST_SHROOM'),body('RUST_SHROOM')];wall.players[0].hand=[fixture('S15')];
  const a=C.botDecide(wall,difficulty);assert.deepEqual(a,{type:'play',idx:0},'use the owned Guardian answer before spending its casting mana');
  const choice=C.reduce(wall,a).state;const resolved=C.reduce(choice,C.botDecide(choice,difficulty)).state;
  assert(!resolved.players[1].field.some(c=>c.id==='NWL3'),'actually remove the Guardian');
  assert.equal(resolved.players[0].field.length,2,'preserve the allied attackers');
 }
 const sustain=fresh([]);sustain.players[0].hand=[card('NOURISHING_RAIN')];assert.equal(C.greedyStep(sustain).state.players[0].dew,1);
 // The engine, not the estimate, establishes that Dew persists and heals again.
 let cycle=fresh([]);cycle.players[0].deck=[];cycle.players[1].deck=[];cycle.players[0].dew=3;
 for(let i=0;i<4;i++)cycle=C.reduce(cycle,{type:'endTurn'}).state;
 assert.equal(cycle.players[0].dew,3);assert.equal(cycle.players[0].hp,46);
 console.log('PASS public market adaptation, hidden-information boundary, available stock, removal eligibility/target, hard/hell recovery counter and lethal priority, persistent Dew');
} finally {await rm(dir,{recursive:true,force:true});}
