# Tutorial Enter, companion movement, and starter/shared-pool explanation

Requested 2026-11-04; production deployment explicitly authorized in the request.

- Message steps accept Enter and show a localized shortcut hint. The welcome explains it too. The explicit Next button remains available for touch and mouse; the speech surface itself does not advance.
- Held Enter, IME composition, modified Enter, text entry and suspended dialogs do not advance messages. Required clicks, inspection and game actions retain their existing completion conditions. Focused Back/Exit retain native keyboard behavior.
- The adopted Zeno and attached speech bubble move to a nearby available position beside the highlighted target. A 680 ms cubic-bezier(0.16, 1, 0.3, 1) flight starts quickly and settles slowly. Existing Zeno floating/rig/materials are reused. Retargeting starts from the displayed position; reduced motion places immediately; disposal cancels the flight.
- A dedicated initial-deck step explains owned starters versus shared-pool cards purchased with mana during a duel, their exclusion from the initial deck, and their non-ownership after the duel. Japanese, English and Korean are included. Resume indices and the remove-card gate were updated together.

## Source and presentation

Initial baseline: remote main `b09eaef2758e3716fabcf97b1315515a3d108cc3`. Concurrent main updates are incorporated before deployment.

Owning implementation: `client/src/ui/tutorialSpotlight.ts`, `tutorialCompanionFlight.ts`, `manaSpirit.ts`, `zenoRig.ts`, `zenoToonSurface.ts`, `client/src/styles/zenoSpeech.css`, `client/src/screens/deck.ts`, `tutorialWelcome.ts`.

Preview root: `/Users/hiromaru05s/.codex/worktrees/tutorial-enter-guide/LORE_TCG`; actual board fixture at `http://127.0.0.1:5307/review`, walkthrough at `http://127.0.0.1:5299/parts-qa`. Actual menu/board components, card assets and approved UI are loaded from this checkout. No replacement character or backdrop.

The frozen silver-inscription reference was inspected as a time-sampled sequence and representative surface frame from the original workspace. Its relevant principles here are continuous movement of the existing object, readable form, and deliberate timing; no unrelated magical particles were added to the UI.

## Validation

- Typecheck and production build passed before integration.
- `tests/tutorial-enter-browser.mjs`: repeat/IME/modifier/input/dialog guards, required action, focused Back, cleanup, measured fast departure/deceleration and reduced motion; ja/en/ko at 1280/1024/390.
- `tests/onboarding-browser.mjs`: real Worker handlers against isolated SQLite; shop, new explanation, remove/add, reload mid-edit, confirmation and completion at 1280/1024.
- `tests/tutorial-parts.mjs` and `tests/onboarding.mjs` passed.
- Visual evidence includes the actual board at 1280/1024/390/320 and the deck explanation. Motion capture and sampled geometry are separate from functional results. This is an implementation review, not new user visual approval or a physical-device test.
- Production guard and post-deployment evidence are recorded below after release.
