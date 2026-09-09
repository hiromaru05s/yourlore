// User-approved v44 removals/reworks, exercising the real shared reducer.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-trap-rework-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/cards';
    export { createGame, reduce, effAtk, playCost } from './client/src/shared/engine';
    export { candidates, greedyDecide } from './client/src/shared/bot';`, resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'game.mjs') });
  const { DB, STARTERS, ALL_IDS, BUYABLE_POOL, DECK_POOL, RANDOM_CARDS, PASSIVES, PASSIVE_KEYS,
    cardPassives, hasPassive, sanitizeDecks, createGame, reduce, effAtk, playCost, candidates, greedyDecide } = await import(path.join(dir, 'game.mjs'));
  const approved = JSON.parse(await readFile(new URL('../docs/card-rework/2026-09-09-trap-removal/approved-rework.json', import.meta.url), 'utf8'));
  let serial = 0;
  const inst = id => ({ ...(DB[id] || STARTERS[id]), uid: `test-${++serial}` });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 42, starting: 0, p0: { id: 'p', name: 'P' }, p1: { id: 'q', name: 'Q' } }).state;
    for (const p of g.players) {
      p.field = []; p.traps = []; p.enchants = []; p.hand = []; p.deck = []; p.discard = []; p.removed = []; p.exile = [];
      p.mana = 30; p.maxMana = 30;
    }
    return g;
  };
  const legacyTrap = (react = 'nullspell') => ({ id: 'LEGACY_TRAP', t: 'trap', cost: 1, uid: `old-${++serial}`, name: '旧罠', nameJa: '旧罠', text: '', react, val: 1 });
  const summon = (g, id) => { g.players[0].hand = [inst(id)]; return reduce(g, { type: 'play', idx: 0 }).state; };

  for (const old of approved.deleted) {
    for (const pool of [ALL_IDS, BUYABLE_POOL, DECK_POOL, [...RANDOM_CARDS]]) assert(!pool.includes(old.id), old.id);
    assert(!DB[old.id]);
    for (const type of ['buyMarket', 'buySupply']) {
      const g = fresh();
      const card = { ...old, uid: 'retired' };
      if (type === 'buyMarket') g.market[0] = card; else g.players[0].supply[0] = card;
      const r = reduce(g, { type, i: 0 });
      assert.equal(r.state.players[0].mana, 30);
      assert.equal(r.state.players[0].discard.length, 0);
      assert(!r.events.some(e => e.type === 'buy'));
    }
  }
  const presets = sanitizeDecks({ sel: 0, list: [{ cards: ['NEGOTIATE', ...Array(7).fill('STARTER_TRASH')], watch: [...approved.deleted.map(c => c.id), 'TAR3'] }] });
  assert.deepEqual(presets.list[0].cards, Array(8).fill('STARTER_TRASH'));
  assert.deepEqual(presets.list[0].watch, ['TAR3']);

  assert(!PASSIVES.trapmaster && !PASSIVE_KEYS.includes('trapmaster'));
  const legacyAbility = { passive: ['trapmaster'], aura: 'trapImmune', passivesG: ['trapmaster'] };
  assert(!cardPassives(legacyAbility).includes('trapmaster'));
  assert(!hasPassive(legacyAbility, 'trapmaster'));
  for (const c of Object.values(DB)) {
    assert(!/trapmaster|trapImmune|Trap Master|トラップマスター|트랩마스터/i.test(JSON.stringify(c)), c.id);
  }
  // Compare complete before/after definitions, allowing only the requested fields.
  for (const { id, before } of approved.reworked) {
    const expected = structuredClone(before);
    if (expected.passive) expected.passive = expected.passive.filter(k => k !== 'trapmaster');
    if (expected.aura === 'trapImmune') delete expected.aura;
    if (id === 'TAR3') { delete expected.aura; expected.passive = []; }
    if (id === 'GM6_8') delete expected.onSummon;
    if (id === 'CHOSEN_ROGUE') delete expected.attackFx;
    const current = JSON.parse(JSON.stringify(DB[id]));
    for (const field of ['text', 'textJa', 'textEn']) {
      assert(!/罠|トラップ|함정|트랩|trap/i.test(current[field] || ''), `${id} ${field}`);
      delete expected[field]; delete current[field];
    }
    assert.deepEqual(current, expected, `${id}: preserve stats, cost, names, conditions and unrelated effects`);
  }
  assert.deepEqual(cardPassives(DB.TAR3), []);
  for (const key of ['text', 'textJa', 'textEn']) assert.equal(DB.TAR3[key], '—');

  // Siege: neither trap destruction nor fallback exile; death summon still works.
  for (const trapCount of [0, 2]) {
    let g = fresh();
    const grave = inst('S1'); g.players[0].discard = [grave];
    g.players[1].traps = Array.from({ length: trapCount }, () => ({ card: legacyTrap() }));
    g = summon(g, 'GM6_8');
    assert.equal(g.players[0].discard[0].uid, grave.uid);
    assert.equal(g.players[0].removed.length, 0);
    assert.equal(g.players[1].traps.length, trapCount);
    const siege = g.players[0].field[0];
    assert.equal(siege.id, 'GM6_8');
    g.cur = 1; g.players[1].hand = [inst('S15')];
    g = reduce(g, { type: 'play', idx: 0 }).state;
    g = reduce(g, { type: 'chooseTarget', uid: siege.uid }).state;
    const soldier = g.players[0].field.find(c => c.id === 'SOLDIER2');
    assert(soldier, 'siege death still summons a soldier');
    assert.equal(soldier.atk, 2); assert.equal(soldier.def, 2);
  }

  let g = fresh();
  g.players[0].removed = Array.from({ length: 8 }, () => inst('MIMIC'));
  g.players[1].traps = [{ card: legacyTrap() }, { card: legacyTrap() }];
  g = summon(g, 'ORIGIN_MIMIC');
  assert.equal(g.players[0].field[0].atkMod, 16);
  assert.equal(g.players[0].field[0].defMod, 16);
  assert.equal(g.players[1].traps.length, 2);

  g = fresh();
  g.players[0].deck = ['ASSASSIN1', 'ASSASSIN2', 'ASSASSIN3'].map(inst);
  g.players[1].traps = [{ card: legacyTrap() }, { card: legacyTrap() }];
  g = summon(g, 'ASSASSIN4');
  assert(g.players[0].field.some(c => c.id === 'ASSASSIN4'));
  assert.equal(g.players[1].brand, 3);
  assert.equal(g.players[1].traps.length, 2);

  g = fresh();
  g.players[0].removed = Array.from({ length: 4 }, () => inst('STARTER_TRASH'));
  g.players[0].field = [inst('CHOSEN_ROGUE')];
  const oldTrap = legacyTrap(); g.players[0].discard = [oldTrap];
  const hp = g.players[1].hp;
  assert.equal(effAtk(g.players[0], g.players[0].field[0]), 4);
  g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
  assert.equal(g.players[1].hp, hp - 4);
  assert.equal(g.pending, null);
  assert.equal(g.players[0].traps.length, 0);
  assert.equal(g.players[0].discard[0].uid, oldTrap.uid);
  // A persisted old free-set prompt must not become an ordinary recall.
  g.pending = { kind: 'recall', reason: 'rogueTrap', allowCancel: true };
  g = reduce(g, { type: 'pick', uid: oldTrap.uid }).state;
  assert.equal(g.players[0].hand.length, 0);
  assert.equal(g.players[0].traps.length, 0);

  g = fresh();
  g.players[0].field = [inst('NMD6')];
  g.players[0].deck = Array.from({ length: 12 }, () => inst('S1'));
  assert.equal(playCost(inst('S13'), g.players[0]), DB.S13.play ?? DB.S13.cost);
  g.players[0].deck.push(inst('S1'));
  assert.equal(playCost(inst('S13'), g.players[0]), (DB.S13.play ?? DB.S13.cost) - 1);

  g = fresh();
  const maxHp = g.players[0].maxHp, enemyHp = g.players[1].hp;
  g = summon(g, 'VAMP5');
  assert.equal(g.players[0].maxHp, maxHp + 30);
  assert.equal(g.players[1].hp, enemyHp - 15);
  // An old saved immunity grant must no longer block destruction.
  Object.assign(g.players[0].field[0], legacyAbility);
  g.players[1].traps = [{ card: legacyTrap('devour') }];
  g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
  assert.equal(g.players[0].field.length, 0);

  for (const choice of ['ambush', 'evade']) {
    g = fresh();
    g.players[0].field = ['TAR3', 'ASSASSIN1', 'ASSASSIN2'].map(inst);
    const uid = g.players[0].field[0].uid;
    g.players[0].hand = [inst('NL_SECRET')];
    g = reduce(g, { type: 'play', idx: 0 }).state;
    assert.equal(g.pending.reason, 'nlTarget');
    g = reduce(g, { type: 'chooseTarget', uid }).state;
    assert.deepEqual(g.pending.data.ids, ['ambush', 'evade']);
    assert.deepEqual(g.pending.data.opts.map(o => o.id), ['ambush', 'evade']);
    g = reduce(g, { type: 'pick', uid: 'trapmaster' }).state;
    assert.equal(g.pending.reason, 'nlGrant', 'retired grant rejected without resolving spell');
    assert(!hasPassive(g.players[0].field[0], 'trapmaster'));
    g = reduce(g, { type: 'pick', uid: choice }).state;
    assert.equal(g.pending, null);
    assert(hasPassive(g.players[0].field[0], choice));
    assert.deepEqual(g.players[0].field.slice(1).map(m => m.atkMod), [3, 3]);
  }
  // Full-match regression: Majesty must not leave the bot retrying a rejected attack.
  g = fresh();
  g.players[0].mana = 0;
  g.players[0].field = [{ ...inst('M1'), summonedTurn: g.turn }];
  g.players[1].field = [inst('TAR5'), inst('M1')];
  assert(!candidates(g).some(a => a.type === 'attack'));
  assert.notEqual(greedyDecide(g, false).type, 'attack');
  g.players[0].field[0].summonedTurn--;
  assert(candidates(g).some(a => a.type === 'attack'));
  assert.equal(greedyDecide(g, false).type, 'attack');
  console.log('PASS: 7 retired cards, 10 constrained reworks, removed keyword/old grants, preserved summons/scaling/discount, both Nightlord choices, and bot Majesty guard');
} finally {
  await rm(dir, { recursive: true, force: true });
}
