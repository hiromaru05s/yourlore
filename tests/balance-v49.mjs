import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-v49-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export { ENCH_TURN_LIMITS } from './client/src/shared/cardText'; export { candidates } from './client/src/shared/bot';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'core.mjs') });
  const { DB, createGame, reduce, candidates, playBlockReason, ENCH_TURN_LIMITS, BALANCE_VERSION } = await import(path.join(dir, 'core.mjs'));
  let seq = 0;
  const card = id => ({ ...structuredClone(DB[id]), uid: `v49-${++seq}` });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 42, starting: 0, p0: { id: 'a', name: 'A' }, p1: { id: 'b', name: 'B' } }).state;
    for (const p of g.players) Object.assign(p, { field: [], enchants: [], quests: [], traps: [], hand: [], deck: [], discard: [], removed: [], mana: 20, maxMana: 20, hp: 40, maxHp: 100 });
    return g;
  };
  const play = (g, id) => {
    g.players[g.cur].hand.push(card(id));
    return reduce(g, { type: 'play', idx: g.players[g.cur].hand.length - 1 }).state;
  };
  assert.equal(BALANCE_VERSION, 'v49');
  for (const [id, atk, def] of [['TDE3', 6, 10], ['GAMBLER', 0, 2], ['EGG_MASTER', 2, 6]]) assert.deepEqual([DB[id].atk, DB[id].def], [atk, def], id);
  // The new instance never counts itself; another copy does. Exiled cards do not count.
  for (const zone of ['deck', 'hand', 'discard', 'field', 'removed']) {
    for (const id of ['TGE1', 'TGE4']) {
      const g = fresh(); g.players[0][zone].push(card(id));
      const after = play(g, 'TGE4');
      assert.equal(after.players[1].brand ?? 0, zone === 'removed' ? 0 : 1, `${zone}/${id}`);
    }
  }
  { let g = play(fresh(), 'TGE4'); assert.equal(g.players[1].brand ?? 0, 0);
    g.players[0].deck.push(card('TGE1')); g = play(g, 'TGE4');
    assert.equal(g.players[1].brand ?? 0, 0, 'the first summon still consumes the once/game effect'); }
  { const g = fresh(); g.players[0].deck = Array.from({ length: 8 }, () => card('TGE1'));
    let after = play(g, 'TGE4'); assert.equal(after.players[1].brand, 1);
    after = play(after, 'TGE4'); assert.equal(after.players[1].brand, 1, 'once per game'); }
  // Repeated Half Elf summons cannot accumulate Care, but removal permits replacement.
  { let g = fresh(); g.players[0].enchants.push({ card: card('WORLD_HEART'), turns: 99 });
    for (let i = 0; i < 3; i++) g = play(g, 'HALF_ELF');
    assert.equal(g.players[0].enchants.filter(e => e.card.id === 'WORLD_CARE').length, 1);
    g.players[0].enchants = g.players[0].enchants.filter(e => e.card.id !== 'WORLD_CARE');
    g = play(g, 'HALF_ELF'); assert.equal(g.players[0].enchants.filter(e => e.card.id === 'WORLD_CARE').length, 1); }
  // The singleton rule is per owner and also blocks a direct cast before paying.
  { let g = fresh(); g.players[1].enchants.push({ card: card('WORLD_CARE'), turns: 99 });
    g = play(g, 'WORLD_CARE'); assert.equal(g.players[0].enchants.length, 1);
    const p = g.players[0]; p.hand.push(card('WORLD_CARE'));
    assert(playBlockReason(g, 0, p.hand[0]));
    assert(!candidates(g).some(a => a.type === 'play' && a.idx === 0));
    const after = reduce(g, { type: 'play', idx: 0 }).state;
    assert.equal(after.players[0].mana, p.mana); assert.equal(after.players[0].hand.length, 1);
    assert.equal(after.players[0].enchants.length, 1); }
  { let g = fresh(); g.players[0].enchants.push({ card: card('WORLD_CARE'), turns: 99 });
    g = reduce(g, { type: 'endTurn' }).state; assert.equal(g.players[0].maxHp, 100);
    const out = reduce(g, { type: 'endTurn' });
    assert.equal(out.state.players[0].maxHp, 103); assert.equal(out.state.players[0].hp, 43);
    assert.equal(out.events.filter(e => e.type === 'heal' && e.player === 0).length, 1); }
  assert.equal(ENCH_TURN_LIMITS.ancientCiv, 9, 'display countdown agrees with engine');
  // Global-turn delay is preserved; only its owner can receive the reward.
  for (const [turn, cur, ready] of [[7, 1, false], [8, 1, true], [8, 0, false], [9, 1, true]]) {
    const g = fresh(); g.turn = turn; g.cur = cur;
    g.players[0].enchants.push({ card: card('ANCIENT_CIV'), turns: 99, bornTurn: 0 });
    let after = reduce(g, { type: 'endTurn' }).state;
    assert.equal(after.pending?.reason === 'civChoice', ready, `${turn}/${cur}`);
    assert.equal(after.players[0].enchants.length, ready ? 0 : 1);
    assert.equal(after.players[0].maxMana, ready ? 19 : 20);
    if (ready) {
      after = reduce(after, { type: 'pick', uid: 'DRAGON_EGG' }).state;
      assert(after.players[0].hand.some(c => c.id === 'DRAGON_EGG'));
      assert.equal(after.pending, null);
    }
  }
  for (const key of ['text', 'textJa', 'textEn']) {
    assert(!/13/.test(DB.ANCIENT_CIV[key]), key);
    assert(/9/.test(DB.ANCIENT_CIV[key]), key);
    assert(/\+3/.test(DB.WORLD_CARE[key]), key);
  }
  console.log('PASS: v49 stats, Arbiter instance/cap/once, Care singleton/healing, Ancient timing/reward and translations');
} finally { await rm(dir, { recursive: true, force: true }); }
