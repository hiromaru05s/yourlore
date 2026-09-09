# Duel continuity — 2026-09-10

Target: **https://test.yourlore.xyz**. This release does not deploy production or merge `main`.

## Delivered

- Seven separate transparent PNG rift concepts, with full generation provenance in [the manifest](../../ui-concepts/2026-09-10-rift-seven/manifest.json). Compare them at **https://test.yourlore.xyz/rift-concepts**. These are selection candidates; the existing in-game 16-frame rift artwork remains until a design is selected.
- Opponent hand uses the hand-card sizing system, capped at 30 px width. Both avatars now have the same square mask and ornament proportions. The opponent ornament sits higher while its character remains inside the viewport. Mana is larger, with a separate mobile position.
- Spell and purchase arrivals use the same Three.js scene, camera, stock mesh and cached complete card surface as the resting shelf. The resting surface is installed before the transient mesh is removed. Full frames and protruding cost seals are retained.
- Shelf refills lift, split into two packets, interleave, square and land in the exact resting deck pose. They use the existing scene rather than another canvas. Draw landing callbacks execute once per card.
- Discard selection retains room above raised cards and their seals. Market hit testing preserves the projected card plane and prevents the coplanar parent from intercepting pointer input. First click selects, second click or the purchase button buys; right click / hold inspects. Help text matches this behavior.
- Attacks travel in screen space toward the avatar, then return to the original projected card pose. Void deaths and other public exile events accelerate into the rift with narrowing, bending, light and directed particles.
- Opening sequence lands the markets together, then both sets of deck/shelf furniture, then accelerating individual deck cards. Soft dust marks contact. The coin falls and rebounds against the board before the two hands draw simultaneously.
- The authoritative engine deals three opening cards to both players. The second player's first turn consumes an explicit opening-draw flag instead of dealing another three; later turns and legacy saved states retain their normal draw behavior. Quick cards and public quests remain supported.

## Verification

Passed:

- Client/server typecheck, production build, design guards and `git diff --check`.
- `tests/opening-hands.mjs`: both starting sides, simultaneous initial 3/3, no duplicate first-turn draw, later turns, old saved-state behavior and opponent-hand redaction.
- `tests/quest-quick.mjs`, `tests/trap-removal.mjs` and `tests/duel-ui.mjs`. Trap-removal regression covers 32 retired IDs, 40 market seeds and 10 bot games / 987 actions.
- `tests/board-perspective-browser.mjs`, `tests/library-piles-browser.mjs` and `tests/duel-continuity-browser.mjs`: projected layout, actual pointer purchase, spell/purchase surface handoff, shuffle phases, frame bounds, attack targeting, rift absorption, opening sequence, cancellation, reduced motion, GPU fallback and hidden-card privacy. Desktop 1280×720 / 1920×1080 and mobile 390 px screenshots are retained here.
- Live staging: two temporary authenticated users completed a friendly match, **113 actions / 18 turns**, including reconnect. Both redacted client states began at **3/3**. No protocol errors. See [staging-online.json](staging-online.json). Temporary users and their related records were deleted and a remote query confirmed zero remaining users; temporary credential files were removed.
- Native browser smoke: live staging BOT game displayed both opening hands, six Blender furniture models and the new opening; the comparison gallery loaded all seven PNGs. The online match and first native smoke ran on the first deployment; subsequent changes only further reduced opponent hand size and corrected help text. Final local browser checks include the final hand size.
- Final deployed static assets are compared to the built output by SHA-256; see [staging-assets.json](staging-assets.json) and [deployment.json](deployment.json).

The checks cover the exercised flows, not every possible match or device. Vite still reports the existing large main/Three.js chunks; this change does not claim a comprehensive performance audit or a new card-art refresh. Production and its database are unchanged.
