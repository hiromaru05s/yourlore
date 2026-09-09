# Design + quick / quest release — 2026-09-09

## Integration

Design base `e842adb` and card-rework tip `292099c` were merged with a real merge commit (`6430057`). Both parent histories remain intact. The final nine quests / ten quick cards are retained, including Brand +1 and seven freshly generated Rift Culls. No trap cards return to the purchasable catalog.

## Visual changes

- A generated transparent 4×4 PNG replaces the portal with a narrow spatial slit. Sixteen frames over 16 seconds; hover is static and subtly highlighted. Reduced motion stays still.
- Blender-built ebony / navy velvet / brass portrait tray replaces the landscape shelf. Full 0.64-ratio cards lie inside, at the same physical scale as monsters and market cards, immediately right of each deck.
- A separate 0.08-card-unit thin Blender supply plinth sits above the main market. CSS cards use the exact same camera projection and height; no painted UI rectangle when WebGL is ready.
- Dice keep their grounded bounce/support physics while the camera rises during settling to show the authoritative upper faces clearly.
- Portrait PNGs retain their native square texture ratio; the self frame moves lower and the name is tightened. Opponent ornament may extend beyond the edge while the head remains visible.
- Dialog actions use enamel / brass styling. Treasure and mimic rewards are nonblocking 2.2-second notices with no Claim button and never replace required choices.

## Semantic merge fixes

- Quest cards now use one purple illustrated field face for both flight and resting state.
- Quest landings account for prior quests; enchantment insertions retain their position before the quest section.
- Active quests remain in owned-card collection views.
- The 19 new cards had no dedicated art files. `cardArtAliases.ts` explicitly reuses existing motif-related illustrations in full / medium / small variants. These are **reused illustrations, not newly commissioned dedicated card art**. Names, rules and frames are not aliased.

## Validation

See `browser-checks.json`, `piles/browser-checks.json`, `rift-alpha-check.json`, the model geometry checks and staging reports. Browser coverage includes 1280×720, 1920×1080 and 390×844, independent WebGL/DOM projection, attack arrows, damage visibility, exact monster / spell / quest landing, hover freeze, nonblocking notices, native frame aspect, refill, cancellation and GPU loss fallback.

Engine tests cover all quick effects, quest lifecycle / rewards / progress / capacity / targeting, public persistence, server ownership, retired-card sanitization, tutorials and 10 completed bot matches. Typechecks, design guard and production build pass. Existing Vite bundle-size warnings remain; no claim of exhaustive device or network coverage.

## Deployment

Staging and production identifiers and remote content hashes are recorded in the adjacent JSON files. Production uses the same verified build. Existing D1 / Durable Object bindings are retained; this release requires no database schema migration. The production version preceding this release was `d98ac879-17a0-467d-a7d7-f119398cc912`.
