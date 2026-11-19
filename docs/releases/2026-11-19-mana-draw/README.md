# Approved mana draw — production integration

Approved study: `ba304b2983d206654fa348dc604056948c0f1326` (1.15× speed). Integration starts from adopted main `4f20db7a55ae2cb59b5fe48e92e3c7e23b5f50df`.

The actual `animateDraw` path now uses `ui/manaDraw.ts` and `manaDrawPresentation.ts` through the existing `paperDraw.ts` API. Native hand nodes remain in their original parents throughout flight and settlement. Flight is 1.2 s/card; stagger is 0.208696 s. The blue wake excludes the card surface. Opponent cards remain backs; equipped sleeves are retained. Existing caller speed controls and reduced-motion behavior remain supported.

Validation: client typecheck, solid-draw, motion-v2, and `node tests/mana-draw-browser.mjs`. Browser evidence in `qa/browser-report.json`: desktop/mobile × both players × 2/4 cards; actual turn-start draw event (2), simultaneous opening draws, custom sleeve, 6 cards, reduced motion, abort/resize/skip/detach cleanup. Native child identity, original styles/classes, private-face absence and overlay cleanup asserted.

These browser checks use the actual controller and board with a local game fixture. They do not constitute authenticated live PvP verification. Summon study changes are excluded from this release.

## Production verification

Published 2026-11-19 through `npm run deploy`. Source: `33c8700c989c254565151ba051f0141a886e0de8`, containing the draw integration `daf41132aa04d86984280bbd768c2c5217926db4`. Worker version `0310b14e-4f0f-45c2-ba17-16a3b5d8cdfa`, 100% traffic.

Both workspace typechecks, 301/301 production tests and the guarded build passed. 138 served HTML/JS/CSS/manifest files match SHA-256 hashes captured from the exact guard snapshot. The unmodified deployed controller, CSS and art passed 8 browser cases: 1100px/390px × both players × 2/4 cards. Two-card cases execute the reducer's actual end-turn action; four-card cases use controller draw events on the shipped isolated board fixture. Opponent faces remained hidden and no draw layer remained after completion. See `qa/production-browser-report.json`, `qa/production-assets.json`, `qa/deployment.json` and `qa/validation.json`.

This verifies the production client on an isolated board, not an authenticated live PvP session. No account or real match was modified. A concurrent story-page release started after this deployment; the verification records are preserved on the draw release branch so that adding documentation does not invalidate its active guard.
