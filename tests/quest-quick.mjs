import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'lore-quest-quick-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/cards'; export { QUEST_QUICK_CARDS } from './client/src/shared/questQuickCards'; export * from './client/src/shared/engine'; export * from './client/src/shared/protocol'; export { GameRoom } from './server/src/gameRoom'; export {candidates, greedyDecide} from './client/src/shared/bot';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'game.mjs') });
  const { DB, STARTERS, QUEST_QUICK_CARDS, GameRoom, createGame, reduce, effectChoices, actingSide, playCost, effAtk, hasPassive, purchaseAllowed, candidates, greedyDecide, redactFor, frameFor } = await import(path.join(dir, 'game.mjs'));
  let seq = 0;
  const card = id => ({ ...structuredClone(DB[id] ?? STARTERS[id] ?? QUEST_QUICK_CARDS.find(c=>c.id===id)), uid: `fixture-${++seq}` });
  const mon = id => ({ ...card(id), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0 });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 42, starting: 0, p0: {id:'p',name:'P'}, p1:{id:'o',name:'O'} }).state;
    for (const p of g.players) Object.assign(p, { field:[], enchants:[], quests:[], traps:[], hand:[], deck:[], discard:[], removed:[], exile:[], mana:20, maxMana:20, hp:100, maxHp:100 });
    return g;
  };
  const step = (g,a) => reduce(g,a).state;
  const activate = (g,id,s=0) => { g.cur=s; g.players[s].hand.push(card(id)); return step(g,{type:'play',idx:g.players[s].hand.length-1}); };
  const buy = (g,id,from='buyMarket') => { if(from==='buyMarket')g.market[0]=card(id);else g.players[g.cur].supply[0]=card(id); return step(g,{type:from,i:0}); };
  const pick = (g,uid) => step(g,{type:'pick',uid});
  assert.equal(Object.values(DB).filter(c=>c.t==='quest').length,8);
  assert.equal(Object.values(DB).filter(c=>c.quick).length,10);
  assert(Object.values(DB).filter(c=>c.quick).every(c=>c.t==='spell'));
  assert.equal(frameFor('quest'),'/art/biblion/modular/base-quest.png');

  for (const from of ['buyMarket','buySupply']) {
    let g=fresh();g=activate(g,'Q_WINTER');g=activate(g,'Q_MANA');const p=g.players[0];const mana=p.mana, hp=p.maxHp, mm=p.maxMana;
    g=buy(g,'QUICK_ATTUNE',from);
    assert.equal(g.players[0].mana,mana-4);assert.equal(g.players[0].maxMana,mm+1);assert.equal(g.players[0].maxHp,hp+2);
    assert.equal(g.players[0].quests.find(q=>q.card.id==='Q_WINTER').progress,2);
    assert.equal(g.players[0].quests.find(q=>q.card.id==='Q_MANA').progress,1);
    assert.equal(g.players[0].removed.filter(c=>c.id==='QUICK_ATTUNE').length,1);
    assert(![...g.players[0].hand,...g.players[0].deck,...g.players[0].discard].some(c=>c.quick));
    const after=step(g,{type:'pick',uid:null});assert.equal(after.players[0].maxMana,mm+1);
  }
  // Conditional purchases are rejected atomically in both markets and bot candidate lists.
  for(const [id,allow] of [ ['QUICK_SURVIVAL',p=>p.hp=15], ['QUICK_WORLD',p=>p.field.push(mon('ELF'))], ['QUICK_MUSTER',p=>p.field.push(mon('CASTLE'))], ['QUICK_SORT',p=>p.removed=Array.from({length:10},()=>card('STARTER_TRASH'))], ['QUICK_REBIRTH',p=>p.discard.push(card('MIMIC'))] ]) {
    for(const from of ['buyMarket','buySupply']) {
      let g=fresh();const p=g.players[0];const cost=p.mana;
      g=buy(g,id,from);assert.equal(g.players[0].mana,cost,id);assert.equal(g.players[0].buys[id]??0,0,id);
      assert(!purchaseAllowed(g,g.players[0],card(id)));
      allow(g.players[0]);assert(purchaseAllowed(g,g.players[0],card(id)),id);
      g=buy(g,id,from);assert.equal(g.players[0].mana,cost-DB[id].cost,id);
    }
  }
  {let g=buy(fresh(),'QUICK_MIMIC');assert.equal(g.players[0].field.filter(c=>c.id==='MIMIC').length,1);assert.equal(g.players[0].removed.filter(c=>c.id==='MIMIC').length,2);}
  {let g=fresh();g.players[0].hp=15;g=buy(g,'QUICK_SURVIVAL');assert.equal(g.players[0].field[0].id,'DUNGEON');assert.equal(g.players[0].field[0].aura,'dungeon');}
  {let g=fresh();g.players[0].field=[mon('ELF')];g=buy(g,'QUICK_WORLD');assert.equal(g.players[0].enchants[0].card.id,'WORLD_HEART');}
  {let g=fresh();g.players[0].field=[mon('CASTLE')];g=buy(g,'QUICK_MUSTER');assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,3);}
  {let g=fresh();g.players[0].field=[mon('MIMIC'),mon('MIMIC')];g=buy(g,'QUICK_ASSAULT');const [a,b]=g.players[0].field.map(c=>c.uid);g=pick(g,a);assert.equal(g.players[0].field[0].tempAtk,2);const invalid=pick(g,a);assert.equal(invalid.players[0].field[0].tempAtk,2);assert(invalid.pending);g=pick(g,b);assert(!g.pending);assert(g.players[0].field.every(c=>c.tempAtk===2));g=step(g,{type:'endTurn'});assert(g.players[0].field.every(c=>c.tempAtk===0));}
  {let g=buy(fresh(),'QUICK_GRIMOIRE');assert.equal(playCost(card('S1'),g.players[0]),Math.max(0,DB.S1.cost-1));g=step(g,{type:'endTurn'});assert.equal(g.players[0].spellDiscountTurn,0);}
  {let g=fresh();const dead=card('TAR3');g.players[0].discard=[dead];g=buy(g,'QUICK_REBIRTH');g=pick(g,dead.uid);assert(!g.players[0].discard.some(c=>c.uid===dead.uid));assert(hasPassive(g.players[0].field.find(c=>c.uid===dead.uid),'void'));}
  // Declared upper-cost check: buying with only cost-8+ monsters is allowed, selected card stays in grave.
  {let g=fresh();const id=Object.keys(DB).find(id=>DB[id].t==='mon'&&DB[id].cost>7);const dead=card(id);g.players[0].discard=[dead];g=buy(g,'QUICK_REBIRTH');g=pick(g,dead.uid);assert.equal(g.players[0].field.length,0);assert.equal(g.players[0].discard[0].uid,dead.uid);assert(!g.pending);}
  {let g=fresh();g.players[0].removed=Array.from({length:10},()=>card('STARTER_TRASH'));g.players[1].enchants=[{card:card('WORLD_HEART'),turns:99}];g=buy(g,'QUICK_SORT');g=pick(g,g.players[1].enchants[0].card.uid);assert.equal(g.players[1].enchants.length,0);}
  // Quests start after activation, survive turn changes and JSON persistence, and remain public.
  {let g=fresh();g.players[0].removed=Array.from({length:20},()=>card('MIMIC'));g=activate(g,'Q_RIFT');assert.equal(g.players[0].quests[0].progress,0);const wire=redactFor(JSON.parse(JSON.stringify(g)),1);assert.equal(wire.players[0].quests[0].card.id,'Q_RIFT');assert.equal(wire.players[0].quests[0].progress,0);}
  // Cumulative exile including quick consumption, and only owned cards as reward (awaiting specification).
  {let g=activate(fresh(),'Q_RIFT');g.players[0].quests[0].progress=9;g.players[0].deck=Array.from({length:7},()=>card('STARTER_TRASH'));g=buy(g,'QUICK_GRIMOIRE');assert.equal(g.players[0].quests.length,0);assert.equal(g.players[0].removed.filter(c=>c.star==='trash').length,7);}
  {let g=activate(fresh(),'Q_TORI');g=activate(g,'Q_WINTER');g.players[0].quests.find(q=>q.card.id==='Q_TORI').progress=4;const hp=g.players[0].maxHp,mm=g.players[0].maxMana;g=step(g,{type:'endTurn'});assert.equal(g.players[0].maxHp,hp+30);assert.equal(g.players[0].maxMana,mm+2);assert.equal(g.players[0].quests.length,0);}
  {let g=activate(fresh(),'Q_TORI');g.players[0].hand=Array.from({length:7},()=>card('STARTER_TRASH'));g=step(g,{type:'endTurn'});assert.equal(g.players[0].quests[0].progress,0);assert.equal(g.pending.reason,'handCap');g=step(g,{type:'endTurn'});assert.equal(g.players[0].quests[0].progress,1);}
  {let g=activate(fresh(),'Q_CASTLE');const castle=mon('CASTLE');g.players[0].field=[castle];for(let i=0;i<8;i++){g=step(g,{type:'endTurn'});assert.equal(g.players[0].quests[0].progress,i+1);}g=step(g,{type:'endTurn'});assert.equal(g.players[0].quests.length,0);assert.equal(g.players[0].field.filter(c=>c.id==='INFKNIGHT').length,3);}
  {let g=activate(fresh(),'Q_CASTLE');g.players[0].field=[mon('CASTLE')];g=step(g,{type:'endTurn'});g.players[0].field=[];g=step(g,{type:'endTurn'});assert.equal(g.players[0].quests[0].progress,0);}
  {let g=activate(fresh(),'Q_DECAY');g.players[0].quests[0].progress=3;const enemy=mon('MIMIC');enemy.decayCnt=1;g.players[1].field=[enemy];g=buy(g,'QUICK_POISON');assert.equal(g.players[1].hp,100);g=pick(g,'invalid');assert(g.pending);g=pick(g,enemy.uid);assert.equal(g.players[0].quests.length,0);assert.equal(g.players[1].field.length,0);assert.equal(g.players[1].hp,67);}
  {let g=activate(fresh(),'Q_DECAY');g.players[0].quests[0].progress=3;const protectedMon=mon('VAMP1');protectedMon.decayCnt=1;g.players[1].field=[protectedMon];const ward=Object.values(DB).find(c=>c.ench==='vampWard');g.players[1].enchants=[{card:card(ward.id),turns:99}];g=buy(g,'QUICK_POISON');g=pick(g,protectedMon.uid);assert.equal(g.players[0].quests[0].progress,3);}
  {let g=activate(fresh(),'Q_MANA');g.players[0].quests[0].progress=24;const mm=g.players[0].maxMana;g=buy(g,'QUICK_ATTUNE');assert.equal(g.players[0].maxMana,mm+5);assert.equal(g.players[0].quests.length,0);}
  {let g=activate(fresh(),'Q_ASSASSIN');g.players[0].quests[0].progress=5;const assassin=mon('ASSASSIN1');g.players[0].field=[assassin];g.players[1].enchants=[{card:card('WORLD_HEART'),turns:99}];g=step(g,{type:'attack',uid:assassin.uid});assert.equal(g.pending.reason,'Q_ASSASSIN');const uid=g.players[1].enchants[0].card.uid;g=pick(g,uid);assert(g.players[1].removed.some(c=>c.uid===uid));assert(!g.pending);}
  {let g=activate(fresh(),'Q_TRIBE');g.players[0].quests[0].progress=5;g.players[0].hand=[card('TAR3')];g=step(g,{type:'play',idx:0});assert.equal(g.pending.reason,'Q_TRIBE');assert(effectChoices(g).every(c=>c.tribe===DB.TAR3.tribe&&c.id!=='TAR3'));g=pick(g,effectChoices(g)[0].uid);assert(!g.pending);assert.equal(g.players[0].field.length,2);}
  // Damage count must not treat self damage as enemy damage; numerical brand reward uses a fixture until specified.
  {let g=activate(fresh(),'Q_BRAND');g.players[0].quests[0].card.val=2;g.cur=1;const enemy=mon('MIMIC');enemy.atk=39;g.players[1].field=[enemy];g=step(g,{type:'attack',uid:enemy.uid});assert.equal(g.players[0].quests[0].progress,39);g.players[1].field[0].exhausted=false;g.players[1].field[0].atk=1;g=step(g,{type:'attack',uid:enemy.uid});assert.equal(g.players[1].brand,2);assert.equal(g.players[0].quests.length,0);}
  // Out-of-turn reward decisions are made by the quest owner, never the active opponent.
  {let g=activate(fresh(),'Q_TRIBE');g.players[0].quests[0].progress=6;g.players[0].field=[mon('TAR3')];g.cur=1;g=step(g,{type:'pick',uid:null});assert.equal(actingSide(g),0);assert.equal(g.cur,1);const a=greedyDecide(g,false);assert(effectChoices(g).some(c=>c.uid===a.uid));g=step(g,a);assert.equal(g.cur,1);assert.equal(g.players[0].field.length,2);}
  // Quick cards in imported hands cannot be replayed, even by a bot.
  {let g=fresh();g.players[0].hand=[card('QUICK_ATTUNE')];const before=structuredClone(g.players[0]);g=step(g,{type:'play',idx:0});assert.deepEqual(g.players[0].hand,before.hand);assert.equal(g.players[0].maxMana,before.maxMana);assert(!candidates(g).some(a=>a.type==='play'));}
  // Real authoritative action handler broadcasts quest activation and authorizes the pending owner.
  {
    const server = new GameRoom({}, {}); const sent=[];
    server.persist=()=>{}; server.syncAlarm=()=>{}; server.broadcast=events=>sent.push(events); server.sockFor=()=>null;
    const g=fresh();g.players[0].hand=[card('Q_TRIBE')];
    server.room={game:g,turnStartAt:Date.now(),turnBonusMs:0};
    await server.handleAction(0,{type:'play',idx:0});
    assert(sent[0].some(e=>e.type==='playSpell'&&e.id==='Q_TRIBE'));
    server.room.game.players[0].quests[0].progress=6;server.room.game.players[0].field=[mon('TAR3')];server.room.game.cur=1;
    server.room.game=step(server.room.game,{type:'pick',uid:null});
    const chosen=effectChoices(server.room.game)[0].uid;
    await server.handleAction(1,{type:'pick',uid:chosen});assert(server.room.game.pending);
    await server.handleAction(0,{type:'pick',uid:chosen});assert(!server.room.game.pending);assert.equal(server.room.game.cur,1);
  }
  console.log('PASS: quest lifecycle, progression, rewards, public persistence, all 10 quick spells, both markets, mandatory choices, bot choices and rejection boundaries');
} finally { await rm(dir,{recursive:true,force:true}); }
