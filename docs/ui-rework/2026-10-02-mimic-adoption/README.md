# Approved mimic summon adoption

User selection, 2026-10-02: Mimic King royal revision 2 / **02 王冠の落印**, Mimic King II royal revision 2 / **01 奪冠の大舌**. Push, merge and staging were explicitly authorized; production was not.

| Card | Adopted reference | Scope |
| --- | --- | --- |
| MIMIC | motion 3, cavity 2 濡れた頬奥, ivory atlas 01 | Approved normal mouth |
| MIMIC2 | master revision 2 | Two independently deforming mesh tongues |
| MIMIC_LORD | family 3 | Approved motion, keys removed |
| AWAKENED_MIMIC | family 1 | Approved tongue and four claws |
| MIMIC_KING | royal revision 2 / 02 | Rotating crown drop, body compression, giant fangs |
| MIMIC_KING2 | royal revision 2 / 01 | Long tongue carries and throws the crown into position |
| ORIGIN_MIMIC | Deferred | Existing default summon; no rejected prototype adopted |

The runtime lives in `client/src/ui/mimic/`. It imports no preview catalog or URL-selected variants. The approved painted cavity, gum/fang atlases and engraved metal texture are reused unchanged. Preview source remains in its existing directories; unselected renderer branches are not imported into the game.

`BaseController.playEvents` consumes authoritative `summon` events, including summons caused by effects, through `ghostSummon`. `focusSummon` runs the selected material reveal before the existing `flyIntoSlot` / monster summon B landing. The public `summonFromHand` helper shares the reveal. Rift motion, game rules, costs and event ordering remain unchanged. The centered scale leaves room for the approved crown/tongue extent on desktop and narrow screens.

The optional renderer is loaded during card focus. Until its assets are ready the native card stays visible. One abort path handles fast-forward, visibility changes, resize and controller disposal; missing WebGL or failed assets fall back to the native landing. Ready waits are bounded and renderer resources are disposed after every reveal. Only the three painted mouth textures and engraved metal are requested by the selected runtime.

## Validation

- `tests/mimic-approved.mjs`: compares 180 frozen samples from the approved prototype motions, including reduced motion; checks that rejected textures and DEV imports are absent.
- `tests/mimic-adoption-browser.mjs`: actual engine `reduce` → `BaseController` → summon playback on GameView, both sides for all six cards; hand helper, cancellation, resize, hidden document, controller disposal, mobile/reduced motion and WebGL fallback.
- Browser harness: `/src/dev/mimic-runtime/index.html`, excluded from production build entries. The fixture uses public, deterministic cards and does not claim authenticated online matchmaking coverage.
- Typecheck, the production regression suite and build are required before guarded staging deployment. Release evidence is recorded separately after deployment.

Visual selection was made by the user on the prototypes. Motion equality and lifecycle tests establish faithful integration and cleanup; they do not constitute a new artistic approval or authenticated online E2E certification.
