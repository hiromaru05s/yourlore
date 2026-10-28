# Zeno speech anchoring — 2026-10-28

The tutorial greeting aligned Zeno against a wrapper containing both the heading and speech. Its short, low tail pointed toward his body across a large gap. The heading now occupies its own grid row, and Zeno and the greeting share a vertically centered conversation row. The tail reaches beside his face. Shared tutorial coach and welcome tails also use face-height offsets matched to their existing character sizes.

Only tutorial markup and speech/layout CSS changed. Existing character animation, dialogue, navigation and game logic remain unchanged. Tails are noninteractive.

Local rendered UI checked at the regular desktop size, 760px and 390px, plus the in-game opening coach. Client typecheck and tutorial curriculum check passed. Guarded deployment and production screenshot evidence are recorded with this report.

## Production

- Deployed source: `7fa0681e89137d13e189ad12fa7a1d84eb40d74b`.
- Worker version: `50ba2515-e6ab-41cd-802f-3f3e859e6fd7`.
- Served entry: `/assets/main-DMLNJvR8.js` (matches guarded build).
- Guarded release: 249/249 production tests, typechecks and build passed.
- Signed-in production: greeting and opening in-game coach visually inspected; Next advances from step 1 to 2 and Exit returns Home. No browser console errors observed.
- `production-greeting.jpg` and `production-coach.jpg` are screenshots of the deployed page.
