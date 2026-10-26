# Deck layout production integration — 2026-10-26

User approved the local deck-layout-study preview and explicitly requested production release. Integration started from gh/main `6608ff44`, retaining the current lounge, home background assets, defaultUI/defaultButtons, real DeckStore/save API, ownership limits, active-deck selection, localized card text, watch pagination, card effects, sleeves, furniture and leave/save-failure guards.

## Changes

- Left deck rail and left search/type rail share a column; independent top actions and compact floating hand reserve the collection area.
- Existing shared azure-cut frame is applied to each rail and translucent collection; the outer layout container does not paint another panel.
- Only add/remove/confirm use the approved deck-specific button faces. Controls remain mounted during edits. Dirty valid decks gently highlight confirmation; saved/incomplete decks do not.
- Monster → spell, ascending cost, then stable ID sorting keeps duplicate cards together. Fixed Attune remains first.
- Mouse/pen drag adds or replaces, respects ownership/copy limits, rejects fixed Attune and cancels outside/Escape. Touch keeps native scrolling and + controls. All drag listeners/animation frames are disposed when leaving.
- Hand/list dimensions stay 112×175 / 88×137.5 on desktop; mobile keeps its own layout.
- 34 original PNGs were verified against the current released art and encoded as pixel-identical lossless WebP, without resizing. Provenance and raw-pixel equality are in art-manifest.json. Newer cards use their current full-resolution assets. Frames/stat seals are matted at native resolution before display, while names/numbers remain DOM text.

## Validation

- Client and server typecheck passed.
- Deck hand test: fixed Attune, replacement/add/remove, sorted duplicates, stable button nodes, confirmation state, scoped undo, all-slot validity, active-deck persistence, failed save recovery.
- Drag test: add/replace, fixed target rejection, outside/Escape cancellation, ownership/saving gate, touch scrolling and cleanup.
- Production regression suite: 222/222 passed before adding the separately passed drag regression to the suite. Production build passed. The guarded release repeats typecheck, the updated production suite and build from the final committed snapshot.
- Actual application browser checks passed: add/remove, drag addition, duplicate sorting, confirmation highlight and clearing after save, appearance categories, watch pagination, desktop and 390px/320px viewports. Saved screenshots accompany this record.
- Deployment version and served-asset checks are recorded separately after release.
- Browser integration uses the actual application with a local-only guest profile. It is distinct from authenticated production account verification.

Local integration checkout: `/Users/hiromaru05s/.codex/worktrees/deck-layout-release/LORE_TCG`, development server `http://127.0.0.1:5573/`.
