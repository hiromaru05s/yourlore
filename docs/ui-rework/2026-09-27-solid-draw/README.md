# Solid card draw — 2026-09-27

Accepted direction: a thick, rigid card separates from the deck, rises and turns,
then seats into an opening hand fan. Blue mana is a brief edge accent. No paper
bending, extra scale pulse, large particle curtain, or rasterized card-text swap.

## Implementation

- 840 ms per card, 150 ms stagger; at most six animated arrivals per batch.
- Rounded, beveled solid stock with a laminated edge and cast shadow, rendered by
  one temporary Three.js scene shared by concurrent player/opponent batches.
- Exact native DOM art, frame, and labels over the matching perspective body.
  Opponent cards only contain the sleeve, never the private front.
- Hand matrices account for ancestor scale, including expanded hand mode.
  Existing cards open a gap from their pre-render poses; arrivals seat behind them.
- Controller selects new UIDs that actually remain in the hand after resolution.
- Fixed a reproduced missing-draw case: a freshly recreated projected deck anchor
  reports zero bounds before its scene update. Wait one frame and fall back to
  the visible pile if the projection is still unavailable.
- Image decode is bounded to 180 ms. Resize, hidden page, fast-forward, detached
  cards and navigation restore resting cards and release the temporary GPU scene.
- Unstarted/landed flights use display:none so explicitly visible native children
  cannot leak onto the top-left corner during staggered opening draws.

## Preview

Run `npm run dev -- --host 127.0.0.1 --port 5200 --strictPort` in `client`.

- `/duel-lab.html?dense&polish`: 1/3/6 draws, slow draw, opponent draw, expanded
  hand draw, and empty-hand draw. These add cards before playing the actual path.
- `/duel-lab.html?live`: real local game controller, including opening 3-card draw.

## Validation

- Production build and TypeScript check; design guard passed.
- `node tests/solid-draw.mjs`: deferred/fallback pile bounds, selected arrivals,
  resize/fast-forward restoration, edge-on volume and exact native landing math.
- `node tests/motion-v2.mjs`: continuous poses, endpoint/privacy, cancelled decode,
  unstarted-front containment and existing card-label/reformation coverage.
- `node tests/duel-ui.mjs` and `node tests/quick-playback.mjs` passed.
- Browser: 1280x720 normal and slow motion, 3/6 staggered arrivals, expanded hand,
  opponent front secrecy, real initial draws. Mid-animation resize to 960x600
  cleaned all overlays and restored cards. Six-card draw at 960x600 also cleaned
  up; viewport override reset afterward. No browser error logs.
- Existing board shadow-map deprecation warning and build chunk-size warnings
  remain. This work does not claim a general board performance audit.

## Provenance / release

Branch `codex/solid-draw-20260927` starts at main `f297070`. Prior presentation work
`dd855a4` was cleanly reapplied as `932a8ac`; current lounge and v52 changes remain.
The deleted prior staging checkout is not used. Local preview only: no staging
or production deployment was performed for this change, and online matches have
not been validated.
