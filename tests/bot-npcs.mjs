import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'lore-npcs-'));
try {
  await build({ stdin: { contents: `export * from './client/src/shared/botNpcs'; export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export {botDecide} from './client/src/shared/bot';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'npc.mjs') });
  const { BOT_NPCS, botNpc, npcPortrait, pickNpcDeck, sanitizeDeck, createGame, reduce, botDecide } = await import(path.join(dir, 'npc.mjs'));
  assert.deepEqual(BOT_NPCS.map(n => n.difficulty), ['easy', 'normal', 'hard', 'hell']);
  const signatures = new Set();
  for (const npc of BOT_NPCS) {
    assert.equal(botNpc(npc.difficulty), npc);
    assert.equal(npcPortrait(npc.avatar), npc.portrait);
    await access('client/public' + npc.portrait);
    assert.equal(npc.decks.length, 3);
    for (const lang of ['ja', 'en', 'ko']) assert(npc.name[lang] && npc.title[lang] && npc.style[lang]);
    assert.deepEqual([0, .34, .67].map(r => pickNpcDeck(npc, undefined, r).index), [0, 1, 2]);
    for (let previous = 0; previous < 3; previous++) {
      const choices = new Set([0, .25, .5, .75, 1].map(r => pickNpcDeck(npc, previous, r).index));
      assert.equal(choices.size, 2);
      assert(!choices.has(previous), 'A rematch must not repeat the last deck');
    }
    const copy = pickNpcDeck(npc, undefined, 0).deck;
    copy.cards[0] = 'MISSING';
    copy.tune.minBuy = -1;
    assert.notEqual(npc.decks[0].cards[0], 'MISSING');
    assert(npc.decks[0].tune.minBuy > 0);
    for (const deck of npc.decks) {
      assert.equal(deck.cards.length, 8);
      assert.deepEqual(sanitizeDeck(deck.cards), deck.cards, deck.name + ' must survive engine sanitization');
      const signature = [...deck.cards].sort().join(',');
      assert(!signatures.has(signature), deck.name + ' must have a distinct composition');
      signatures.add(signature);
      for (const starting of [0, 1]) {
        let g = createGame({ mode: 'bot', seed: 71, starting, p0: { id: 'me', name: 'YOU' }, p1: { id: 'bot', name: npc.name.ja, isBot: true, deck: deck.cards } }).state;
        g.players[1].botTune = { ...deck.tune };
        const p = g.players[1];
        assert.deepEqual([...p.hand, ...p.deck].map(c => c.id).sort(), ['STARTER_MANA', ...deck.cards].sort());
        let steps = 0;
        while (!g.over && g.turn < 5 && steps++ < 250) {
          const next = reduce(g, botDecide(g, g.cur === 1 ? npc.difficulty : 'normal')).state;
          assert.equal(next.players[1].name, npc.name.ja);
          assert.deepEqual(next.players[1].botTune, deck.tune);
          g = next;
        }
        assert(g.over || g.turn >= 5, deck.name + ' must progress through opening turns');
      }
    }
  }
  assert.equal(npcPortrait('SEEKER_RED'), undefined);
  assert.equal(npcPortrait('NPC_UNKNOWN'), undefined);
  console.log('PASS: 4 NPCs, 12 legal distinct decks, non-repeating selection, copied tuning, 24 opening simulations');
} finally { await rm(dir, { recursive: true, force: true }); }
