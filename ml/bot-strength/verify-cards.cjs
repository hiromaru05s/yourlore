const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(process.env.BOT_LAB || '.bot-strength');
const old = require(process.env.BOT_BASELINE || path.join(root, 'baseline.cjs'));
const current = require(path.join(root, 'candidate.cjs'));
const copyKeys = new Set(['name', 'nameJa', 'nameEn', 'text', 'textJa', 'textEn']);
const snapshot = C => Object.fromEntries(Object.entries({ ...C.DB, ...C.STARTERS })
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, card]) => [id, Object.fromEntries(Object.entries(card)
    .filter(([key]) => !copyKeys.has(key)).sort(([a], [b]) => a.localeCompare(b)))]));
const expected = snapshot(old), actual = snapshot(current);
assert.deepEqual(actual, expected);
assert.deepEqual(current.DECK_POOL, old.DECK_POOL);
assert.deepEqual(current.BUYABLE_POOL, old.BUYABLE_POOL);
const result = { cards: Object.keys(actual).length, cardSemanticsEqual: true,
  sha256: createHash('sha256').update(JSON.stringify(actual)).digest('hex') };
fs.mkdirSync(path.join(root, 'results'), { recursive: true });
fs.writeFileSync(path.join(root, 'results/card-integrity.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
