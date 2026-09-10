import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-half-elf-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export { candidates } from './client/src/shared/bot'; export { features } from './client/src/shared/botFeatures';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'core.mjs') });
  const { DB, createGame, reduce, effAtk, candidates, features, BALANCE_VERSION } = await import(path.join(dir, 'core.mjs'));
  let seq = 0;
  const card = id => ({ ...structuredClone(DB[id]), uid: `half-${++seq}` });
  const mon = id => ({ ...card(id), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, dmg: 0, summonedTurn: 0, attacksUsed: 0 });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 42, starting: 0, p0: { id: 'a', name: 'A' }, p1: { id: 'b', name: 'B' } }).state;
    for (const p of g.players) Object.assign(p, { field: [], enchants: [], quests: [], traps: [], hand: [], deck: [], discard: [], removed: [], mana: 20, maxMana: 20, hp: 40, maxHp: 100 });
    g.players[0].field.push(mon('HALF_ELF'));
    return g;
  };
  assert.equal(BALANCE_VERSION, 'v48');
  assert.equal(DB.HALF_ELF.atk, 0);
  assert.equal(DB.HALF_ELF.def, 1);
  assert.equal(DB.HALF_ELF.onSummon, 'halfElf');
  for (const side of [0, 1]) {
    for (const zone of ['field', 'enchants']) {
      const g = fresh(), p = g.players[0], m = p.field[0], source = g.players[side][zone];
      assert.equal(effAtk(p, m, g), 0);
      const tree = () => zone === 'field' ? mon('VITAL3') : { card: card('WORLD_CARE'), turns: 99 };
      source.push(tree());
      assert.equal(effAtk(p, m, g), 3, `${side}/${zone}`);
      source.push(tree());
      assert.equal(effAtk(p, m, g), 3, 'bonus does not stack');
      m.atkMod = 2; m.tempAtk = 1;
      assert.equal(effAtk(p, m, g), 6, 'other attack buffs remain additive');
      source.splice(side === 0 && zone === 'field' ? 1 : 0);
      assert.equal(effAtk(p, m, g), 3, 'bonus disappears immediately');
    }
    for (const zone of ['hand', 'deck', 'discard', 'removed']) {
      const g = fresh();
      g.players[side][zone].push(card('WORLD_TREE'));
      assert.equal(effAtk(g.players[0], g.players[0].field[0], g), 0, zone);
    }
    // Real attacks and bot evaluation use the same cross-field condition.
    const g = fresh(), uid = g.players[0].field[0].uid;
    assert.equal(features(g, 0)[10], 0);
    assert.equal(reduce(g, { type: 'attack', uid }).state.players[1].hp, 40);
    g.players[side].enchants.push({ card: card('WORLD_CARE'), turns: 99 });
    assert(candidates(g).some(a => a.type === 'attack' && a.uid === uid));
    assert.equal(features(g, 0)[10], 3 / 40);
    const after = reduce(g, { type: 'attack', uid }).state;
    assert.equal(after.players[1].hp, 37);
    assert.equal(g.players[1].hp, 40, 'reducer keeps input immutable');
    const restored = JSON.parse(JSON.stringify(after));
    restored.players[side].enchants = [];
    assert.equal(effAtk(restored.players[0], restored.players[0].field[0], restored), 0);
    // The original summon effect still requires a World Tree on your own field.
    const summon = fresh(); summon.players[0].field = [];
    summon.players[side].enchants.push({ card: card('WORLD_HEART'), turns: 99 });
    summon.players[0].hand.push(card('HALF_ELF'));
    const summoned = reduce(summon, { type: 'play', idx: 0 }).state;
    assert.equal(summoned.players[0].enchants.filter(e => e.card.id === 'WORLD_CARE').length, side === 0 ? 1 : 0);
    assert.equal(effAtk(summoned.players[0], summoned.players[0].field[0], summoned), 3);
  }
  console.log('PASS: Half Elf base stats, both fields, removal, non-stacking, modifiers, zones, combat, bot features and existing summon effect');
} finally {
  await rm(dir, { recursive: true, force: true });
}
