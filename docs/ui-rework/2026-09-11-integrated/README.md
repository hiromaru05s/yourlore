# Integrated staging release — 2026-09-11

Both shelves now sit left of the centered monster fields on desktop. Decks and rifts remain on the right. The shelf face, model, and flight endpoints continue to share board projection coordinates. Portrait phones retain a separate equipment row with the shelf at its left edge.

## Merged session commits

- Grounded board and earlier staging work: c0ef291 (source 775cd9c).
- Biblion board effects and stat rises: 775fa0f, including 3e23f72.
- v47 balancing and v48 Half Elf / World Tree condition: cffc130, including 010c3c4 and 034831b.
- Latest approved card theme art and canonical spirit dogs: a28e9cc, including 3e202d1 and 1330e25.
- Historical artwork session: 52e8677. Existing current art and renderer won conflicts; previously absent historical assets were retained.
- Every local branch tip was verified as an ancestor of this integration. Historical remote-only branches without a current local session are outside this merge scope.

The shared checkout and other worktrees were left untouched. Their uncommitted source changes and draft assets were not treated as new approved commits. The integration uses an isolated worktree.

## Conflict handling

Maximum HP growth retains v47 healing semantics without the removed duplicate LIFE_CYCLE trigger. Actual effect events and dice source attribution are preserved. The newly added Ember recoil roll now carries its source. All live engine state and RNG outcomes match the approved v48 engine over 3,203 action comparisons; 732 dice events have source attribution.

Stat-rise tracking now receives full game state so an opponent World Tree activates Half Elf's blue attack gain. The stat effect tracks moving screen positions during centered formation reflow. Summon impact retains both the new Biblion effect and the previous longer dust cloud.

## Validation

- Client/server typecheck and production build passed.
- balance-v47, half-elf-v48, quest-quick, biblion-vfx, stat-rise, dice-source passed.
- Layout: 1–7 centered monsters, both sides centered, shelf left of field, equipment/timer/end button inside 1280×720, 1920×1080, 1814×1274 and 390×844 viewports.
- Browser integration: opponent World Tree activates Half Elf's actual stat-rise layer and the layer cleans up.
- Motion: actual controller triple summon, continuous native handoff, removal reflow, 14-card overhand shuffle, dust through 1.6 seconds, authoritative grounded dice outcomes and reduced motion passed.
- Render audit: cold white board, shelf image resolution, front flight layer, continuous purchase landing, synchronized affordability gray-out, transparent card capture, three spell drop positions, cancellation and animated two-card discard passed.
- Art: 296 identities and 888 image URLs decoded at 192/384/832px. All 888 live image bytes match a28e9cc exactly, including after the historical merge.
- Card text: 296 cards × 3 languages, zero violations. Art inventory: 293/293 non-starter masters present. The legacy art checker reports thumbnail mtime ordering after git checkout; byte comparison and browser decode above verify the actual approved thumbnails without recompressing them.

Remote verification and deployment version are recorded separately after upload. Browser duel fixtures use the actual local controller/renderer; remote smoke validation is anonymous startup, not an authenticated online match.
