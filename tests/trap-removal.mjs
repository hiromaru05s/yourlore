// v43–v44 catalog retirement: real startup, saved decks, markets and bot matches.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-trap-removal-'));
try {
  await build({
    stdin: { contents: `export * from './client/src/shared/cards';
      export { createGame, reduce, MARKET_STOCK } from './client/src/shared/engine';
      export { BOT_DECKS, greedyDecide } from './client/src/shared/bot';`, resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'game.mjs'),
  });
  const { DB, STARTERS, ALL_IDS, BUYABLE_POOL, DECK_POOL, RANDOM_CARDS, relatedCardIds,
    sanitizeDeck, sanitizeDecks, createGame, reduce, MARKET_STOCK, BOT_DECKS, greedyDecide } = await import(path.join(dir, 'game.mjs'));
  const retired = JSON.parse(await readFile(new URL('../docs/card-rework/2026-09-09-trap-removal/removed-traps.json', import.meta.url), 'utf8')).cards;
  assert.equal(retired.length, 32);
  assert(!Object.values(DB).some(c => c.t === 'trap'));
  // Scan the final evaluated catalog, including generated cards and starters.
  // Historical source patches may mention traps; live text/effects must not.
  const trapTerms = /trap|罠|トラップ|함정|트랩/i;
  const retiredEffects = new Set(['discardBreak', 'wipeTraps', 'burnBreak2', 'breaktrapDraw',
    'breaktrap', 'trapsmithBuff', 'destroyTrap', 'trapDiscount', 'trapBan', 'trapImmune',
    'trapmaster', 'siegeBreak2', 'rogueTrap', 'wipeBack']);
  for (const c of [...Object.values(DB), ...Object.values(STARTERS)]) {
    assert.equal(c.react, undefined, `${c.id}: trap reaction in live catalog`);
    for (const key of ['name', 'nameJa', 'nameEn', 'text', 'textJa', 'textEn']) {
      assert(!trapTerms.test(c[key] || ''), `${c.id}.${key}: stale trap wording`);
    }
    for (const key of ['onSummon', 'act', 'aura', 'attackFx', 'turnFx', 'ench', 'condAtk', 'condDef', 'summonReq']) {
      assert(!retiredEffects.has(c[key]), `${c.id}.${key}: retired trap effect`);
    }
    assert(!c.passive?.some(k => retiredEffects.has(k)), `${c.id}: retired trap passive`);
  }
  for (const { id } of retired) {
    assert(!DB[id], `${id} is retired, not merely hidden from the shop`);
    for (const pool of [ALL_IDS, BUYABLE_POOL, DECK_POOL, [...RANDOM_CARDS]]) assert(!pool.includes(id), `${id} escaped a derived pool`);
  }
  for (const id of ALL_IDS) for (const related of relatedCardIds(id)) assert(DB[related], `${id} links to missing ${related}`);
  for (const id of DECK_POOL) assert(DB[id] || STARTERS[id], `invalid deck option ${id}`);

  const saved = ['MIMIC_PARTY', 'COLLUSION', 'FLAME', 'FLAME', 'STARTER_CHEST', 'STARTER_TRASH', 'STARTER_TRASH', 'STARTER_TRASH'];
  const clean = ['FLAME', 'FLAME', 'STARTER_CHEST', ...Array(5).fill('STARTER_TRASH')];
  assert.deepEqual(sanitizeDeck(saved), clean, 'retired starting traps become ordinary padding, surviving cards keep their order');
  const presets = sanitizeDecks({ sel: 1, list: [{ cards: saved, watch: ['T1', 'NT_SNARE', 'M1', 'S1'] }, { cards: saved }] });
  assert.equal(presets.sel, 1);
  assert.deepEqual(presets.list[0].cards, clean);
  assert.deepEqual(presets.list[0].watch, ['M1', 'S1']);

  // A resumed old game may still offer retired traps. Reject purchases before
  // charging mana or building a uid-only instance from missing DB[id].
  for (const trap of retired.filter(c => !c.noShop)) {
    for (const type of ['buyMarket', 'buySupply']) {
      const g = createGame({ mode: 'online', seed: 9, starting: 0, p0: { id: 'p', name: 'P' }, p1: { id: 'q', name: 'Q' } }).state;
      const oldCard = { ...trap, uid: 'persisted-trap' };
      if (type === 'buyMarket') g.market[0] = oldCard;
      else g.players[0].supply[0] = oldCard;
      g.players[0].maxMana = 30;
      g.players[0].mana = 30;
      const { state, events } = reduce(g, { type, i: 0 });
      assert.equal(state.players[0].mana, 30);
      assert.equal(state.players[0].discard.length, g.players[0].discard.length);
      assert.equal(state.players[0].boughtCount, 0);
      assert.deepEqual(state.marketStock, g.marketStock);
      assert(!events.some(e => e.type === 'buy'));
    }
  }

  function assertNoTraps(g) {
    const cards = [...g.market];
    for (const p of g.players) {
      assert.equal(p.traps.length, 0, 'no traps are created or set in new games');
      cards.push(...p.deck, ...p.hand, ...p.discard, ...p.field, ...p.enchants.map(e => e.card), ...(p.quests ?? []).map(q => q.card),
        ...p.supply.filter(Boolean), ...(p.removed || []), ...p.exile.map(e => e.card));
    }
    for (const c of cards) {
      assert(c.id && c.t, 'no malformed instance from a deleted definition');
      assert.notEqual(c.t, 'trap', `trap leaked into game: ${c.id}`);
    }
  }

  // Exercise fixed stock replacement, supply refresh and purchases over many RNG seeds.
  for (let seed = 1; seed <= 40; seed++) {
    let g = createGame({ mode: 'online', seed, starting: 0, p0: { id: 'p', name: 'P', deck: saved }, p1: { id: 'q', name: 'Q', deck: saved } }).state;
    assertNoTraps(g);
    assert.equal(g.market.length, 8);
    for (let cycle = 0; cycle < 8; cycle++) {
      // Stock mechanics use an unconditional, non-targeted fixture; quick purchase rules have their own suite.
      if (g.market[cycle].quick) g.market[cycle] = { ...DB.S1, uid: `stock-${seed}-${cycle}` };
      g.pending = null;
      for (let stock = 0; stock < MARKET_STOCK; stock++) {
        g.players[0].mana = 30;
        g = reduce(g, { type: 'buyMarket', i: cycle }).state;
        assertNoTraps(g);
      }
      assert.equal(g.marketStock[cycle], MARKET_STOCK, 'sold-out market slot replenishes');
      g.players[0].mana = 30;
      g = reduce(g, { type: 'refresh' }).state;
      assertNoTraps(g);
      assert.equal(g.players[0].supply.length, 4);
      g.players[0].mana = 30;
      g = reduce(g, { type: 'buySupply', i: 0 }).state;
      assertNoTraps(g);
    }
  }

  // Reworked monsters remain playable and must not open an empty target picker.
  for (const id of ['GM6_8', 'TAR3']) {
    let g = createGame({ mode: 'bot', seed: 42, starting: 0, p0: { id: 'p', name: 'P' }, p1: { id: 'q', name: 'Q' } }).state;
    g.players[0].mana = 30;
    g.players[0].hand = [{ ...DB[id], uid: 'related-mon' }];
    g = reduce(g, { type: 'play', idx: 0 }).state;
    assert(g.players[0].field.some(c => c.id === id), `${id} remains summonable after rework`);
    assert.equal(g.pending, null, `${id} must not wait for nonexistent traps`);
    assertNoTraps(g);
  }

  // Completed games cover deck cycling and effect-generated cards, not only shop snapshots.
  let actions = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const a = BOT_DECKS[(seed - 1) % BOT_DECKS.length], b = BOT_DECKS[seed % BOT_DECKS.length];
    let g = createGame({ mode: 'bot', seed, p0: { id: 'p', name: 'P', deck: a.cards }, p1: { id: 'q', name: 'Q', deck: b.cards } }).state;
    g.players[0].botTune = a.tune; g.players[1].botTune = b.tune;
    for (let n = 0; n < 1500 && !g.over; n++) {
      g = reduce(g, greedyDecide(g, false)).state;
      actions++;
      assertNoTraps(g);
    }
    assert(g.over, `seed ${seed} failed to finish: ${JSON.stringify({turn:g.turn, cur:g.cur, pending:g.pending, action:greedyDecide(g,false)})}`);
  }
  console.log(`PASS: 32 retired traps, catalog text/effects/reactions, saved decks/watchlists/markets, related links, 40 market seeds, 2 reworked monsters, 10 completed bot games (${actions} actions)`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
