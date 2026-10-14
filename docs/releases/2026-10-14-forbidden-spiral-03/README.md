# Forbidden ritual — approved 03 adoption

User selected revision 3 / 03 螺旋の血契 for staging on 2026-10-14.

The normal BaseController now holds the public spell face, displays the HP payment, plays the existing authoritative dice, then runs one shared crimson-card / three-seal summon on successful marked summons. The renderer is the selected proposal only. Each destination is a real reserved native field slot; individual summon effects do not fire again. Failure and success with no legal summons do not run the ritual. The source follows the existing discard path when no ritual consumes its face.

Engine changes attach presentation-only batch identity to direct Forbidden summons. Reaction summons stay outside the batch; rules and card balance are unchanged. Public surfaces are captured at runtime, including localized card text. Code is prefetched before the roll; textures, GPU context, and temporary DOM are released on completion and interruption. Reduced motion uses native faces immediately.

## Validation

- `tests/forbidden-ritual.mjs`: both players, all six dice outcomes, existing tribe members, zero/one/three summons, field capacity, reaction-summon separation, payment order, completion, reduced motion, abort, resize, tab visibility, disconnect, GPU failure and cancellation during capture.
- `browser-qa.json`: real reducer -> BaseController -> GameView -> production ritual, desktop 1280x900 and mobile 390x844; self roll 6, opponent roll 5, failure roll 4, skip during ritual and reduced motion. All five passed: HP 1 during dice, no overlapping dice/ritual, exact final native card identities, no overlay residue or browser errors.
- `side-0-1280.png` and `side-1-390.png`: visual review of the selected seals and continuous crimson silhouette on the real board. This visual review is separate from automated assertions.
- Local fixture `forbidden-runtime.html` is DEV-only and omitted from the production entrypoints.

The browser fixture uses production gameplay code with deterministic public states. It is not evidence of an authenticated network match. Staging source/version and asset parity are recorded separately after guarded publication.
