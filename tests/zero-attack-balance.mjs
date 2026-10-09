import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';

const dir = await mkdtemp('/tmp/lore-zero-balance-');
try {
  await build({ stdin: { resolveDir: process.cwd(), contents: `
    export * from './client/src/shared/engine';
    export { DB } from './client/src/shared/cards';
    export { candidates, greedyDecide } from './client/src/shared/bot';
    export { GameRoom } from './server/src/gameRoom';
  ` }, bundle: true, platform: 'node', format: 'esm', outfile: dir + '/core.mjs' });
  const { DB, createGame, reduce, effAtk, monsterCanAttack, playBlockReason, cardPlayConditionMet, candidates, greedyDecide, GameRoom } = await import(dir + '/core.mjs');
  let seq = 0;
  const card = id => ({ ...structuredClone(DB[id]), uid: `balance-${++seq}` });
  const mon = id => ({ ...card(id), exhausted: false, dmg: 0, atkMod: 0, tempAtk: 0, defMod: 0, summonedTurn: 0 });
  const fresh = () => {
    const g = createGame({ mode: 'online', seed: 17, starting: 0, p0: { id: 'a', name: 'A' }, p1: { id: 'b', name: 'B' } }).state;
    g.turn = 3; g.pending = null;
    for (const p of g.players) Object.assign(p, { field: [], enchants: [], quests: [], traps: [], hand: [], deck: [], discard: [], removed: [], hp: 100, maxHp: 100, mana: 30, maxMana: 30, dew: 0, shield: 0 });
    return g;
  };
  const play = (g, id) => { g.players[g.cur].hand.push(card(id)); return reduce(g, { type: 'play', idx: g.players[g.cur].hand.length - 1 }); };
  const count = g => g.players.reduce((n, p) => n + p.enchants.filter(e => e.card.id === 'WEAKEN_ALL').length, 0);

  assert.equal(DB.POISON_MASTER.atk, 1);
  assert.equal(DB.WORLD_TREE.atk, 1);
  for (const id of ['POISON_MASTER', 'WORLD_TREE']) {
    let g = fresh(); g.players[0].field = [mon(id)];
    const uid = g.players[0].field[0].uid;
    assert(monsterCanAttack(g, g.players[0], g.players[0].field[0]));
    const hit = reduce(g, { type: 'attack', uid });
    assert.equal(hit.state.players[1].hp, 99, id + ': base ATK 1 directly hits');
    g.players[0].field[0].atkMod = -1;
    assert(!monsterCanAttack(g, g.players[0], g.players[0].field[0]));
  }
  let tree = fresh(); tree.players[0].field = [mon('WORLD_TREE')]; tree.players[0].dew = 2;
  tree = reduce(tree, { type: 'attack', uid: tree.players[0].field[0].uid }).state;
  assert.equal(tree.pending.reason, 'WORLD_TREE_ATTACK');
  tree = reduce(tree, { type: 'pick', uid: 'grow' }).state;
  assert.equal(tree.players[0].dew, 1);
  assert.equal(tree.players[1].hp, 93, 'World Tree attacks for 1 + 6');

  // Exercise 2+0, 1+1 and 0+2 across both fields and both acting players.
  for (const owners of [[0, 0], [0, 1], [1, 1]]) for (const side of [0, 1]) {
    let g = fresh(); g.players[0].field = [Object.assign(mon('M4'), { atk: 5 })];
    for (const owner of owners) { g.cur = owner; g = play(g, 'WEAKEN_ALL').state; }
    assert.equal(count(g), 2);
    assert.equal(effAtk(g.players[0], g.players[0].field[0], g), 1, 'two copies stack to -4 ATK');
    g.cur = side; g.players[side].hand = [card('WEAKEN_ALL')];
    const p = g.players[side], c = p.hand[0];
    assert(playBlockReason(g, side, c));
    assert.equal(cardPlayConditionMet(g, side, c), false);
    assert(!candidates(g).some(a => a.type === 'play' && a.idx === 0));
    assert.notDeepEqual(greedyDecide(g), { type: 'play', idx: 0 });
    const rejected = reduce(g, { type: 'play', idx: 0 });
    assert.equal(count(rejected.state), 2);
    for (const key of ['mana', 'playsTurn', 'spellsCastTurn', 'usesTurn', 'hand']) assert.deepEqual(rejected.state.players[side][key], p[key], key + ' unchanged');
    assert(!rejected.events.some(e => e.type === 'playSpell'));
    assert.equal(effAtk(rejected.state.players[0], rejected.state.players[0].field[0], rejected.state), 1);

    // Destroy a real opposing copy; its debuff is undone and a new copy is legal.
    const owner = owners[0]; g.cur = 1 - owner;
    g = play(g, 'DISARM1').state;
    assert.equal(g.pending.reason, 'destroyEnch');
    g = reduce(g, { type: 'chooseTarget', uid: g.players[owner].enchants[0].card.uid }).state;
    assert.equal(count(g), 1);
    assert.equal(effAtk(g.players[0], g.players[0].field[0], g), 3);
    assert(g.players[owner].removed.some(c => c.id === 'WEAKEN_ALL'));
    g.cur = side; const freshCopy = card('WEAKEN_ALL');
    assert.equal(playBlockReason(g, side, freshCopy), null);
    assert.equal(cardPlayConditionMet(g, side, freshCopy), true);
    g = play(g, 'WEAKEN_ALL').state;
    assert.equal(count(g), 2);
    assert.equal(effAtk(g.players[0], g.players[0].field[0], g), 1);
  }
  // Reserve checks depend only on the field, not copies in hand/deck/graveyard.
  let g = fresh(); g.players[0].deck = Array.from({ length: 4 }, () => card('WEAKEN_ALL'));
  g.players[1].discard = Array.from({ length: 4 }, () => card('WEAKEN_ALL'));
  assert.equal(cardPlayConditionMet(g, 0, card('WEAKEN_ALL')), true);
  assert(DB.WEAKEN_ALL.text.includes('양 필드 합계 최대 2장'), 'final Korean definition discloses the global cap');
  assert(DB.WEAKEN_ALL.textJa.includes('両方の場を合わせて最大2枚'), 'final Japanese definition discloses the global cap');
  assert(DB.WEAKEN_ALL.textEn.includes('At most 2 copies across both fields'), 'final English definition discloses the global cap');

  // The real authoritative WebSocket path and persisted room enforce the same cap.
  let saved;
  const sockets = [0, 1].map(side => ({ deserializeAttachment: () => ({ side, gen: 0 }), send() {}, close() {} }));
  const storage = { get: async () => structuredClone(saved), put: async (_k, v) => { saved = structuredClone(v); }, setAlarm: async () => {}, deleteAlarm: async () => {} };
  const state = { storage, getWebSockets: tag => sockets.filter(s => String(s.deserializeAttachment().side) === tag) };
  const room = new GameRoom(state, {});
  await room.fetch(new Request('https://local/setup', { method: 'POST', body: JSON.stringify({ seed: 17, ranked: false, players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }) }));
  for (const socket of sockets) await room.webSocketMessage(socket, JSON.stringify({ type: 'ready' }));
  g = fresh(); g = play(g, 'WEAKEN_ALL').state; g.cur = 1; g = play(g, 'WEAKEN_ALL').state;
  g.players[1].hand = [card('WEAKEN_ALL')]; room.room.game = g;
  const before = g.players[1].mana;
  await room.webSocketMessage(sockets[1], JSON.stringify({ type: 'action', action: { type: 'play', idx: 0 } }));
  assert.equal(count(room.room.game), 2);
  assert.equal(room.room.game.players[1].mana, before);
  assert.equal(room.room.game.players[1].hand.length, 1);
  const restored = new GameRoom(state, {});
  await restored.webSocketMessage(sockets[1], JSON.stringify({ type: 'ready' }));
  assert.equal(count(restored.room.game), 2);
  console.log('PASS: ATK 1 buffs, World Tree growth, global two-copy cap, refunds, UI/BOT eligibility, removal/recast, localization and authoritative room persistence');
} finally { await rm(dir, { recursive: true, force: true }); }
