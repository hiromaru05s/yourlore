import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-zero-atk-'));
try {
  await build({ stdin: { resolveDir: process.cwd(), contents: `
    export * from './client/src/shared/engine';
    export { DB, STARTERS, BALANCE_VERSION } from './client/src/shared/cards';
    export { candidates, greedyDecide, botDecide } from './client/src/shared/bot';
    export { resolveTurnTimeout } from './server/src/gameInput';
  ` }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'core.mjs') });
  const { DB, STARTERS, BALANCE_VERSION, createGame, reduce, effAtk, monsterCanAttack, candidates, greedyDecide, botDecide, resolveTurnTimeout } = await import(path.join(dir, 'core.mjs'));
  let seq = 0, checks = 0;
  const card = id => ({ ...structuredClone(DB[id] ?? STARTERS[id]), uid: `zero-${++seq}` });
  const mon = id => ({ ...card(id), exhausted: false, dmg: 0, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0 });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 41, starting: 0, p0: { id: 'a', name: 'A' }, p1: { id: 'b', name: 'B' } }).state;
    g.turn = 3; g.pending = null;
    for (const p of g.players) Object.assign(p, { hp: 100, maxHp: 100, mana: 0, maxMana: 3, field: [], hand: [], deck: [], discard: [], removed: [], enchants: [], quests: [], traps: [], supply: [], dew: 0, shield: 0 });
    g.market = [];
    return g;
  };
  const test = (name, fn) => { fn(); checks++; console.log('PASS', name); };
  const rejected = g => {
    const p = g.players[g.cur], m = p.field[0], before = structuredClone(g);
    assert.equal(effAtk(p, m, g), 0);
    assert.equal(monsterCanAttack(g, p, m), false);
    assert(!candidates(g).some(a => a.type === 'attack' && a.uid === m.uid));
    const out = reduce(g, { type: 'attack', uid: m.uid });
    assert.equal(out.state.pending, null);
    assert(!out.events.some(e => ['attack', 'needTarget', 'monsterActivate', 'dice'].includes(e.type)));
    const gameplay = players => players.map(({ revealedCards, ...rest }) => rest);
    assert.deepEqual(gameplay(out.state.players), gameplay(g.players), 'no damage, triggers, resource use or attack consumption');
    assert.equal(out.state.rng, g.rng, 'rejected attacks never roll dice');
    assert.deepEqual(g, before, 'reducer input remains immutable');
    return out;
  };

  test('v56 and every base-zero monster: direct and targeted declaration', () => {
    assert.equal(BALANCE_VERSION, 'v57');
    for (const c of Object.values(DB).filter(c => c.t === 'mon' && c.atk === 0)) {
      for (const target of [false, true]) {
        const g = fresh(); g.players[0].field = [mon(c.id)];
        if (target) g.players[1].field = [mon('M4')];
        if (effAtk(g.players[0], g.players[0].field[0], g) === 0) rejected(g);
      }
    }
  });
  test('debuff to zero or below, direct-only and berserk are blocked on either side', () => {
    for (const side of [0, 1]) for (const delta of [-3, -8]) for (const kind of ['normal', 'direct', 'berserk']) {
      const g = fresh(); g.cur = side;
      const m = mon('M4'); Object.assign(m, { atk: 3, atkMod: delta, directOnly: kind === 'direct', attackFx: kind === 'berserk' ? 'berserk' : undefined });
      g.players[side].field = [m]; g.players[1-side].field = [mon('M4')];
      rejected(g);
    }
  });
  test('buff permits attack without consuming the failed attempt; expiry blocks it again', () => {
    let g = fresh(); g.players[0].field = [mon('TOKEN00')];
    rejected(g);
    g.players[0].field[0].tempAtk = 1;
    assert(monsterCanAttack(g, g.players[0], g.players[0].field[0]));
    const hit = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid });
    assert.equal(hit.state.players[1].hp, 99);
    assert.equal(hit.state.players[0].field[0].attacksUsed, 1);
    g = reduce(reduce(hit.state, { type: 'endTurn' }).state, { type: 'endTurn' }).state;
    rejected(g);
    g.players[0].field[0].atkMod = 2;
    assert(monsterCanAttack(g, g.players[0], g.players[0].field[0]));
  });
  test('conditional ATK follows World Tree on either field and its removal', () => {
    for (const side of [0, 1]) {
      const g = fresh(); g.players[0].field = [mon('HALF_ELF')];
      rejected(g);
      g.players[side].field.push(mon('WORLD_TREE'));
      const m = g.players[0].field[0];
      assert.equal(effAtk(g.players[0], m, g), 3);
      assert(monsterCanAttack(g, g.players[0], m));
      assert(candidates(g).some(a => a.type === 'attack' && a.uid === m.uid));
      g.players[side].field.pop(); rejected(g);
    }
  });
  test('stale target selection and server timeout cannot bypass zero ATK', () => {
    let g = fresh(); g.players[0].field = [mon('M4')]; g.players[1].field = [mon('M4')];
    g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
    assert.equal(g.pending.reason, 'attack');
    g.players[0].field[0].atkMod = -100;
    for (const out of [reduce(g, { type: 'chooseTarget', uid: g.players[1].field[0].uid }), resolveTurnTimeout(g)]) {
      assert(!out.events.some(e => e.type === 'attack'));
      assert.equal(out.state.players[0].field[0].attacksUsed, 0);
      assert.equal(out.state.players[1].field[0].dmg, 0);
    }
  });
  test('World Tree cannot initiate its own attack growth at zero; positive ally still can', () => {
    let g = fresh(); g.players[0].field = [Object.assign(mon('WORLD_TREE'), { atkMod: -1 })]; g.players[0].dew = 3;
    rejected(g);
    g.players[0].field.unshift(mon('M4'));
    g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
    assert.equal(g.pending.reason, 'WORLD_TREE_ATTACK');
    g = reduce(g, { type: 'pick', uid: 'grow' }).state;
    assert.equal(g.players[0].dew, 2);
    assert.equal(g.players[0].field[0].atkMod, 6);
    assert.equal(g.players[0].field[0].attacksUsed, 1);
  });
  test('Chosen Knight cannot bootstrap Cull exile; Chosen Archer cannot execute at zero', () => {
    for (const id of ['CHOSEN_KNIGHT', 'CHOSEN_ARCHER']) {
      const g = fresh(); g.players[0].field = [mon(id)]; g.players[0].discard = [card('STARTER_TRASH'), card('STARTER_TRASH')];
      g.players[1].field = [Object.assign(mon('M4'), { def: 20 })];
      rejected(g);
      g.players[0].removed = g.players[0].discard.splice(0);
      assert(monsterCanAttack(g, g.players[0], g.players[0].field[0]));
    }
  });
  test('multi-attack loses its second declaration when the first reduces ATK to zero', () => {
    let g = fresh(); g.players[0].field = [Object.assign(mon('M4'), { atk: 1, mult: 2, attackFx: 'atkDownOnAttack', val: 1 })];
    g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
    assert.equal(g.players[0].field[0].exhausted, false);
    assert.equal(g.players[0].field[0].attacksUsed, 1);
    rejected(g);
  });
  test('legal attacks that resolve to zero damage remain attacks', () => {
    const g = fresh(); g.players[0].field = [Object.assign(mon('DRAGON_RIDER'), { atk: 1, attacksUsed: 1 })];
    assert(monsterCanAttack(g, g.players[0], g.players[0].field[0]));
    const out = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid });
    assert(out.events.some(e => e.type === 'attack'));
    assert.equal(out.state.players[1].hp, 100);
    assert.equal(out.state.players[0].field[0].attacksUsed, 2);
  });
  test('zero ATK defenders remain attackable and retain passive effects', () => {
    let g = fresh(); g.players[0].field = [Object.assign(mon('M4'), { atk: 1 })];
    g.players[1].field = [Object.assign(mon('CASTLE'), { gcount: 2 })];
    g = reduce(g, { type: 'attack', uid: g.players[0].field[0].uid }).state;
    const out = reduce(g, { type: 'chooseTarget', uid: g.players[1].field[0].uid });
    assert(out.events.some(e => e.type === 'attack'));
    assert.equal(out.state.players[1].field[0].gcount, 1);
  });
  test('all BOT difficulties pass instead of retrying zero ATK, attack after a buff', () => {
    const g = fresh(); g.players[0].field = [mon('TOKEN00')];
    assert.equal(greedyDecide(g).type, 'endTurn');
    for (const diff of ['easy', 'normal', 'hard', 'hell']) assert.equal(botDecide(g, diff).type, 'endTurn', diff);
    g.players[0].field[0].atkMod = 1;
    assert.equal(greedyDecide(g).type, 'attack');
    assert.equal(botDecide(g, 'hell').type, 'attack');
  });
  console.log(`PASS: ${checks} zero-ATK rule groups`);
} finally { await rm(dir, { recursive: true, force: true }); }
