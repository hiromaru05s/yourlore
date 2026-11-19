# Approved mana draw — production integration

Approved study: `ba304b2983d206654fa348dc604056948c0f1326` (1.15× speed). Integration starts from adopted main `4f20db7a55ae2cb59b5fe48e92e3c7e23b5f50df`.

The actual `animateDraw` path now uses `ui/manaDraw.ts` and `manaDrawPresentation.ts` through the existing `paperDraw.ts` API. Native hand nodes remain in their original parents throughout flight and settlement. Flight is 1.2 s/card; stagger is 0.208696 s. The blue wake excludes the card surface. Opponent cards remain backs; equipped sleeves are retained. Existing caller speed controls and reduced-motion behavior remain supported.

Validation: client typecheck, solid-draw, motion-v2, and `node tests/mana-draw-browser.mjs`. Browser evidence in `qa/browser-report.json`: desktop/mobile × both players × 2/4 cards; actual turn-start draw event (2), simultaneous opening draws, custom sleeve, 6 cards, reduced motion, abort/resize/skip/detach cleanup. Native child identity, original styles/classes, private-face absence and overlay cleanup asserted.

These browser checks use the actual controller and board with a local game fixture. They do not constitute authenticated live PvP verification. Summon study changes are excluded from this release.
