# Introduce each market before shared ownership

The purchase section now teaches fixed market (highlight only `#fixedMarket`), changing market (highlight only `#supplyMarket`), then shared ownership (separate rings around both). The later changing-market purchase step points to the actual Pup card without calling a single-card highlight “these three slots”. Japanese, English and Korean copy updated. No game rules or actions changed.

Validation: real tutorial reducer replay passes all instructed actions and both normal draws. A sequence regression verifies both introductions precede shared ownership and purchases, and that shared ownership marks both markets separately. The full tour remains 49 checkpoints / 1528 Japanese body characters.

Local browser fixture uses the actual tutorial board and spotlight, starting at the market explanation for focused visual QA (screenshots therefore show section-relative progress and initial board state, not a full production walkthrough). Via visible Next controls, verified fixed → changing → shared → stock. Screenshots and shared-ring geometry saved. Both target rings closely follow their respective real DOM bounds.

## Production release

- Source: `2e2f85ef275e26e91b9aaf79155970a4de5c4804`
- Worker version: `728c20d3-ce7e-4618-88af-751769b0fc45`
- Entry: `/assets/main-ClxoTGbg.js`; application chunk: `/assets/main-DSqpkKgh.js`.
- Guarded release passed 249/249 tests, both typechecks and build.
- Fetched production application chunk and verified the new Japanese copy in fixed → changing → shared order, and removal of the old shared-markets sentence.
- Visual proof above is from the local real-board fixture; no authenticated post-deployment browser walkthrough was performed.
