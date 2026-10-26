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
  let decksChecked = 0;
  for (const npc of BOT_NPCS) {
    assert.equal(botNpc(npc.difficulty), npc);
    assert.equal(npcPortrait(npc.avatar), npc.portrait);
    await access('client/public' + npc.portrait);
    const count = {easy:1,normal:4,hard:7,hell:7}[npc.difficulty];
    const signatures = new Set();
    assert.equal(npc.decks.length, count);
    for (const lang of ['ja', 'en', 'ko']) assert(npc.name[lang] && npc.title[lang] && npc.style[lang]);
    assert.deepEqual(Array.from({length:count},(_,i)=>pickNpcDeck(npc,undefined,(i+.5)/count).index),Array.from({length:count},(_,i)=>i));
    for (let previous = 0; previous < count; previous++) {
      if(count===1){assert.equal(pickNpcDeck(npc,previous,0).index,0);continue;}
      const choices = new Set(Array.from({length:count-1},(_,i)=>pickNpcDeck(npc,previous,(i+.5)/(count-1)).index));
      assert.equal(choices.size, count-1);
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
      signatures.add(signature);decksChecked++;
      for (const starting of [0, 1]) {
        let g = createGame({ mode: 'bot', seed: 71, starting, challenge: {difficulty:npc.difficulty,side:1}, p0: { id: 'me', name: 'YOU' }, p1: { id: 'bot', name: npc.name.ja, isBot: true, deck: deck.cards } }).state;
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
  console.log(`PASS: 4 NPCs, ${decksChecked} legal decks (distinct within each roster), non-repeating selection, copied tuning, ${decksChecked*2} opening simulations`);
} finally { await rm(dir, { recursive: true, force: true }); }
