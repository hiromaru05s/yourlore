# Summon appearance continuity

## Cause and correction

The summon print, temporary body-mounted card, and persistent field Actor used different rendering paths. `captureCardSurface` omitted native frame shadows and state filters; temporary faces were created without the final owner/game context, outside the `.game` field CSS. A card such as VOID_APOSTLE or CHOSEN_KNIGHT could consequently remain colored until the field renderer applied its blocked grayscale/brightness. Root-level field filters also flattened the full card into a compositor bitmap.

The controller now supplies state-aware faces to ordinary summons, Castle, hatch, fusion, rebirth, forbidden ritual, and dungeon-floor arrivals. `fieldVisualState` is shared with the native board. Card captures retain physical frame shadows and apply blocked tone exactly once. Pulsing readiness/aura shadows stay on the live clock instead of baking a phase into an animation texture. Native resting states filter the frame and card contents separately, keeping the art out of a filtered full-card bitmap. Flying field faces use density 2, and their final fade already settles into the blocked field silhouette. Transient combat Actors discard the resting presentation class so attack, damage, and destruction remain free to own their material.

This preserves the existing authored material motions, full-resolution masters, and DPR-aware renderer buffers. It does not apply a blanket brightness or exposure change.

## Verification

- `npm run typecheck`: client and server pass.
- `npm run test:production`: 192/192 pass before release; the deployment guard reruns this suite on the committed snapshot.
- `tests/card-resolution-browser.mjs`: all 139 monster definitions, both owners (278 cases); rule-derived blocked/readiness appearance matches immediately. Pixel regression checks grayscale and brightness against the full-color print, with no double dimming.
- Real reducer/controller board playback: RUST_SHROOM, RUST_SLUG, POISON_MASTER, CHOSEN_KNIGHT, FIRE_MASTER, HEXER1, MERCENARY, ASSASSIN1, VAMP1, VOID_APOSTLE, NT_SEAL5, SHIELD_TITAN, SALLY_WEAPONMASTER, DUNGEON, GAMBLER, GOLEM1, HALF_ELF, ELF, TAR3, SORTER. Native DPR, handoff, cleanup, skip, resize, and reduced-motion assertions pass.
- `tests/summon-appearance-special-browser.mjs`: CASINO, CASTLE, hatch, fusion, rebirth, ritual, floor for both owners (14 cases), with actual reducer events and controller playback.
- 390×844 / DPR 3: RUST_SHROOM, VOID_APOSTLE, CHOSEN_KNIGHT, SORTER, plus cleanup/reduced-motion cases.
- Visual review: continuous board recordings and end/native comparisons, including the Rust material-to-print finish and blocked card tone. The approved 2026-09-27 inscription benchmark was reviewed for material/card continuity. Screenshots obstructed by choice dialogs were recaptured after closing those dialogs in the fixture.

Browser runs use the local actual-board fixture, not authenticated multiplayer or a physical phone. Production asset parity and production-hosted board playback are separate post-deployment evidence.

## Reproduce browser checks

Start Vite on an available port. Set `PLAYWRIGHT_MODULE` to the local Playwright module and `LORE_TEST_ORIGIN` to that origin. Set `LORE_TEST_OUT` to a dedicated evidence directory, then run each browser script. For mobile, set `LORE_QA_WIDTH=390`, `LORE_QA_HEIGHT=844`, `LORE_QA_DPR=3`, and `LORE_QA_CARDS=RUST_SHROOM,VOID_APOSTLE,CHOSEN_KNIGHT,SORTER`. `LORE_RECORD_VIDEO=1` records continuous playback.
