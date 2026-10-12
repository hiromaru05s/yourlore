import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'lore-bot-tests-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/engine'; export * from './client/src/shared/cards'; export * from './client/src/shared/bot'; export * from './client/src/shared/botActions'; export * from './client/src/shared/botObservation'; export * from './client/src/shared/botSearch';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'core.mjs') });
  const C = await import(path.join(dir, 'core.mjs'));
  await build({ stdin: { contents: `export * from './client/src/shared/engine';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'native.mjs'), plugins: [{ name: 'native-state-copy', setup(b) { b.onLoad({filter: /cloneGameState\.ts$/}, () => ({contents: 'export const cloneGameState = structuredClone;', loader: 'ts'})); } }] });
  const native = await import(path.join(dir, 'native.mjs'));

  let uid=0, passed=0;
  const card = id => ({...structuredClone(C.DB[id] ?? C.STARTERS[id]),uid:`test-${++uid}`});
  const mon = (id,atk,hp) => ({...card(id),atk,def:hp,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
  const fresh = () => {const g=C.createGame({mode:'bot',seed:17,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:0,maxMana:5});g.market=[];g.turn=4;g.pending=null;return g;};
  const test = (name,fn) => { fn();passed++;console.log('PASS',name); };
  test('chip attacks accumulate and are not skipped',()=>{const g=fresh();g.players[0].field=[mon('SOLDIER2',3,5),mon('SOLDIER2',3,5)];g.players[1].field=[mon('SOLDIER2',2,5)];let a=C.safeGreedy(g);assert.equal(a.type,'attack');let next=C.reduce(g,a).state;next=C.reduce(next,C.safeGreedy(next)).state;assert.equal(C.curHp(next.players[1],next.players[1].field[0]),2);next=C.reduce(next,C.safeGreedy(next)).state;next=C.reduce(next,C.safeGreedy(next)).state;assert.equal(next.players[1].field.length,0);});
  test('mandatory target no-op is detected after reducer cloning',()=>{const g=fresh();g.players[0].field=[mon('SOLDIER2',3,3)];g.pending={kind:'myMon',reason:'buffPerm',hint:'',hintJa:'',allowCancel:false,data:{val:3}};const next=C.reduce(g,{type:'chooseTarget',uid:null}).state;assert.equal(C.actionChangesState(g,next),false);assert.equal(C.safeGreedy(g).uid,g.players[0].field[0].uid);});
  test('attack candidates obey current damaged-HP and high-cost restrictions',()=>{const g=fresh();g.players[0].field=[mon('SOLDIER2',3,5)];g.players[0].field[0].cost=4;g.players[0].noHighAtkTurn=true;assert(!C.botActions(g).some(a=>a.type==='attack'));});
  test('recall does not select the casting recall card',()=>{const g=fresh();const c=card('S8');g.players[0].discard=[c,card('STARTER_TRASH')];g.pending={kind:'recall',reason:'recall',hint:'',hintJa:'',allowCancel:true,data:{exclude:c.uid}};assert(!C.botActions(g).some(a=>a.uid===c.uid));assert.notEqual(C.safeGreedy(g).uid,c.uid);});
  test('hidden order/location and actual RNG do not affect sampled observation',()=>{const g=fresh();g.players[0].deck=[card('SOLDIER2'),card('S1')];g.players[1].hand=[card('SOLDIER2')];g.players[1].deck=[card('S1'),card('S3')];const twin=structuredClone(g);twin.rng=123456789;twin.players[0].deck.reverse();[twin.players[1].hand[0],twin.players[1].deck[0]]=[twin.players[1].deck[0],twin.players[1].hand[0]];assert.deepEqual(C.observationSample(g,0,17),C.observationSample(twin,0,17));});
  test('public inspection choices retain the revealed hand/deck membership',()=>{
    for(const reason of ['Q_CHEAT','CREATION','HIGH_ELF_HAND']) {
      const g=fresh();g.players[1].deck=[card('M2'),card('S1')];g.players[1].hand=[card('S3')];
      g.pending={kind:'cardChoice',owner:0,reason,hint:'',hintJa:'',allowCancel:false};
      const ids=C.effectChoices(g).map(c=>c.uid).sort();
      for(let seed=0;seed<4;seed++)assert.deepEqual(C.effectChoices(C.observationSample(g,0,seed)).map(c=>c.uid).sort(),ids);
      for(const diff of ['hard','hell']){const a=C.botDecide(g,diff);assert(ids.includes(a.uid));assert(C.actionChangesState(g,C.reduce(g,a).state));}
    }
  });
  test('attack target search commits instead of entering an attack/cancel cycle',()=>{
    const g=fresh();g.players[0].field=[mon('M2',2,3)];g.players[1].field=[mon('M2',8,10)];
    const pending=C.reduce(g,{type:'attack',uid:g.players[0].field[0].uid}).state;
    assert(!C.botActions(pending).some(a=>a.uid===null));
    for(const diff of ['hard','hell']){const a=C.botDecide(pending,diff);assert.notEqual(a.uid,null);const next=C.reduce(pending,a).state;assert(!next.pending || next.pending.reason!=='attack');}
  });
  test('unknown card identities and private offered markets cannot influence hypotheses',()=>{
    const g=fresh();g.players[1].hand=[card('M2')];g.players[1].deck=[card('S1')];g.players[1].supply=[card('M2')];
    const twin=structuredClone(g);twin.players[1].hand=[card('WORLD_TREE')];twin.players[1].deck=[card('S8')];twin.players[1].supply=[card('S3')];
    assert.deepEqual(C.observationSample(g,0,17),C.observationSample(twin,0,17));
  });
  const inferredTarget=JSON.parse(await readFile('tests/fixtures/bot-inferred-target.json','utf8'));
  test('an inferred Inquisition target cannot create a refused-action loop',()=>{
    const {g}=inferredTarget;
    assert(!C.actionChangesState(g,C.reduce(g,{type:'play',idx:0}).state));
    for(const diff of ['easy','normal','hard','hell']) for(let i=0;i<3;i++) {
      const a=C.botDecide(g,diff);assert(C.actionChangesState(g,C.reduce(g,a).state));
    }
  });
  test('unrevealed collection and trap identity/counter remain private',()=>{
    const g=fresh();g.players[1].collection=['M2'];
    const traps=Object.values(C.DB).filter(c=>c.t==='trap'&&c.react!=='infoDealer');
    g.players[1].traps=[{card:{...traps[0],uid:'trap-slot'},cnt:3}];
    const twin=structuredClone(g);twin.players[1].collection=['WORLD_TREE'];
    twin.players[1].traps=[{card:{...traps.at(-1),uid:'trap-slot'},cnt:1}];
    assert.deepEqual(C.observationSample(g,0,3),C.observationSample(twin,0,3));
  });
  test('different samples produce different unknown outcomes',()=>{const g=fresh();g.players[0].deck=[card('SOLDIER2'),card('S1')];assert.notEqual(C.observationSample(g,0,17).rng,C.observationSample(g,0,18).rng);});
  test('search is pure and takes a visible immediate lethal',()=>{for(const diff of ['hard','hell']){const g=fresh();g.players[0].field=[mon('SOLDIER2',6,5)];g.players[1].hp=5;const before=structuredClone(g);const a=C.botDecide(g,diff);assert.equal(a.type,'attack');assert.equal(C.reduce(g,a).state.winner,0);assert.deepEqual(g,before);}});
  test('defender-owned choices use defender perspective',()=>{const g=fresh();g.players[1].field=[mon('WORLD_TREE',4,4)];g.players[1].dew=3;g.pending={kind:'cardChoice',owner:1,reason:'WORLD_TREE_DEFEND',hint:'',hintJa:'',allowCancel:false,data:{targetUid:g.players[1].field[0].uid}};assert.equal(C.actingSide(g),1);assert.equal(C.greedyDecide(g,false).uid,'grow');});
  const drawLoop=JSON.parse(await readFile('tests/fixtures/bot-draw-loop.json','utf8'));
  test('free self-redraw telemetry loop is not counted as useful progress',()=>{
    const {g,a}=drawLoop;assert.equal(g.players[g.cur].hand[a.idx].id,'S10');
    assert.equal(C.actionChangesState(g,C.reduce(g,a).state),false);
    for(const diff of ['hard','hell'])assert.notDeepEqual(C.botDecide(g,diff),a);
  });
  const drawOrderLoop=JSON.parse(await readFile('tests/fixtures/bot-draw-order-loop.json','utf8'));
  test('hand reorder during free self-redraw is not strategic progress',()=>{
    const {g,a}=drawOrderLoop;assert.equal(C.actionChangesState(g,C.reduce(g,a).state),false);
    for(const diff of ['hard','hell'])assert.notDeepEqual(C.botDecide(g,diff),a);
  });
  test('elite rosters are legal ordinary starter decks for both upper tiers',()=>{
    for(const difficulty of ['hard','hell'])for(const roll of [0,0.5,0.999,1,NaN]) {
      const d=C.pickBotDeck(roll,difficulty);assert.deepEqual(C.sanitizeDeck(d.cards),d.cards);assert.equal(d.cards.length,8);assert(C.BOT_ELITE_DECKS.includes(d));if(difficulty==='hell')assert(C.BOT_HELL_DECKS.includes(d));
      const g=C.createGame({mode:'bot',seed:3,p0:{id:'a',name:'A',deck:d.cards},p1:{id:'b',name:'B'}}).state;
      const reference=C.createGame({mode:'bot',seed:3,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;assert.equal(g.players[0].hp,reference.players[0].hp);assert.equal(g.players[0].maxMana,reference.players[0].maxMana);
    }
  });
  test('profitable draw recycling still has a finite per-turn bot budget',()=>{
    const {g,a}=structuredClone(drawLoop);g.players[g.cur].usesTurn.S10=12;
    assert(!C.botActions(g).some(x=>x.type==='play'&&x.idx===a.idx));assert.notDeepEqual(C.safeGreedy(g),a);
  });
  test('native reducer parity across 1000 decisions and nested clone isolation',()=>{
    let g = fresh();
    for(let i=0;i<1000;i++) {
      const a=C.safeGreedy(g), actual=C.reduce(g,a), expected=native.reduce(g,a);
      assert.deepEqual(actual,expected,`decision ${i}`);
      g=actual.state;
      if(g.over) g=C.createGame({mode:'bot',seed:4000+i,starting:i%2,p0:{id:'a',name:'A',deck:C.BOT_DECKS[i%5].cards},p1:{id:'b',name:'B',deck:C.BOT_DECKS[(i+2)%5].cards}}).state;
    }
  });
  console.log(`PASS ${passed} bot strength suites`);
} finally { await rm(dir,{recursive:true,force:true}); }
