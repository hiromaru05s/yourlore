# Attack effects incorrectly targeting the viewport origin

Baseline source: `f981d482` (latest shared main when this worktree was created).

The combat paths used a document-wide `.card[data-uid]` lookup. Rendering copies
and the authoritative field card can have the same UID; the first match can have
no layout box. Both normal attacks and elemental projectiles accepted the zero
rectangle as a real target at (0, 0).

A controlled real-board reproduction prepends a hidden copy with the defender's
UID while leaving the real defender on the field. The original normal-attack
renderer sends the attacker to the top-left (`attack-before.png`). Bundling the
original elemental runtime and recording its renderer inputs also confirms that
FIRE_ARROW receives a target at exactly (0, 0), as recorded in `reproduction.log`.
The exact preceding gameplay actions from the user report are not known; this is
a deterministic reproduction of the invalid-anchor failure, not a recorded
natural online match.

Combat now looks up field cards and public summon ghosts, checks connected,
finite, nonempty geometry, and uses the visible portrait frame when its inner
avatar has no box. The lower-level monster renderer rejects invalid targets too.
Random attacks preserve every authoritative impact index and time; unavailable
visual targets are omitted individually without redirecting them to a player or
suppressing valid subsequent hits. Rules, random choices, damage, artwork and
normal animation clocks are unchanged.

Regression commands:

- `node tests/combat-anchor.mjs` (included in `npm run test:production`)
- `PLAYWRIGHT_MODULE=<playwright/index.mjs> LORE_TEST_ORIGIN=http://127.0.0.1:5198 node tests/attack-origin-browser.mjs`

The browser regression uses production renderers on the real cosmetic runtime
board and covers both sides, desktop/mobile, hidden duplicate UIDs, missing
targets, reduced motion and skip cleanup. It records actual renderer target
coordinates and continuous video. Visual review and functional checks are
reported separately in the release evidence; no authenticated online match is
claimed.

Local results: combat-anchor regression passed; 12 browser cases passed with no
page errors or remaining transient effects; client/server typecheck passed;
clean-install build passed after integration with shared main. `playback.mp4`
contains the continuous recording. Renderer input coordinates confirm that the
same invalid-copy setup reaches the intended card on both sides and screen
sizes. The normal artwork and VFX drawing routines were not edited; this is a
routing repair, not approval of a new visual design.

Staging release: `cfa33bbf9f3a950a8f230303b71b362ef0404127`, Worker version
`c337371c-6fbf-4aa1-9421-8ed2eac848df`, https://test.yourlore.xyz.
The shared guarded release includes this fix plus concurrent accepted changes.
All 80 production suites passed. All 45 served HTML/JS/CSS files match the local
build of that exact source by SHA-256. The unmodified deployed controller passed
8/8 attack/FIRE_ARROW cases across both sides at 1280 and 390px, with zero reads
of hidden duplicate anchors, correct damage and no remaining transient effects.
Run `tests/attack-origin-staging.mjs` to repeat the deployed regression. See
`staging/deployment.json`, `staging/browser-report.json` and
`staging/asset-parity.json` for the evidence.
