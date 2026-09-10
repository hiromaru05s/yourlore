# Duel motion and layout — 2026-09-10

Staging release for the September 10 afternoon review. Deployment identity and remote checks are recorded separately in `deployment.json` and `staging-assets.json`.

## Changes

- Right-handed draw: reverse the visible card's turn-over direction; opponent cards remain back-up throughout.
- Shelf reshuffle: lift the stack together, accelerate eight split/interleave rounds while carrying it, square above the deck, then accelerate down into a single dusty impact and a small rebound. Duration: 2.8 seconds; reduced-motion and cancellation still clean up.
- Readiness: warm public models from the lobby, decode current board art, frame/seal/portrait/coin images and fonts, load effect modules, upload hidden furniture to the GPU offscreen, then reveal the actual board. The intro waits for this barrier instead of a fixed two-second polling budget. Hidden opponent identities are not inspected.
- Opening market cards: use native card DOM from the first flight through touchdown, including the same image URL, fitted text, seals and perspective. Remove the separate rasterized mesh-face representation. Correct fractional flex coordinates before handoff. Both directional streams retain their accelerating drops and front layer.
- Coin: slightly more overhead camera; a neutral gray veil and mild background desaturation hold focus until the toss finishes.
- Reveal: eliminate residual near-black noise in generated frame mattes consistently in DOM and texture captures. Rasterize enlarged cards at the final reveal size instead of scaling up a hand-sized compositing layer.
- Drag-to-play: a 28px upward gesture can release across the board for monsters and spells. Expanding the hand cannot move the cancellation area under the pointer. Window capture listeners preserve releases when a render replaces the original node. Recheck current playability by UID on release. Returning to the original grip cancels; insufficient mana/conditions remain blocked by the shared rules.
- Mana: compact square faceted stones, with an impact pulse for newly gained capacity. Thirty stones fit in three separate rows.
- Values: raise cost/attack/health text by 0.075em for optical centering.
- Opponent timer: red dial, ring and numerals; own turn remains blue.
- Own portrait: vertically flip only the frame and adjust the portrait aperture. Move the name beneath the HP bar. Opponent frame and upright characters retain their orientation.
- Supply reroll: circular control at the left, visible cost/free-token count and accessible tooltip. Reduce market vertical padding and allocate freed height to both monster lanes. Keep all card widths on one physical scale.
- Move both rifts farther right.
- Prevent timer visibility from changing market row height, which otherwise moved the shelf approximately 2px at a purchase commit.

## Validation

- `npm run typecheck`, `npm run build`, `git diff --check`.
- `tests/paper-card.mjs`, `tests/stagecraft-models.mjs`, `tests/opening-hands.mjs`, `tests/duel-ui.mjs`.
- `tests/duel-motion-layout-browser.mjs`: blocked cold model request, readiness barrier, 1280×720 / 1920×1080 / 1814×1274 / 390×844 layouts, frame orientation/name placement/circular control/square gems/red timer, eight real drag cases including mid-drag re-render and mana changes, deliberate cancellation, exact native opening handoff, shuffle phases/impact and reduced-motion cleanup.
- `tests/paper-card-browser.mjs`: visible draw, hidden opponent backs, timing, resize and fast-forward cleanup. The fixture now uses quests instead of removed trap definitions.
- `tests/duel-impact-browser.mjs`: purchase stock disappearance, consecutive purchases, eight shuffle rounds, heavy summon, opening order and label visibility.
- `tests/board-perspective-browser.mjs`: attack arrow/received attacks, both sides' summon and permanent spell handoffs, quests, notices, perspective, dice and teardown.
- `tests/duel-render-audit-browser.mjs`: purchase touchdown versus committed shelf coordinates, native shelf art resolution, three actual spell drags, gray-out and two-card end-turn discard.

Screenshots and JSON measurements in this directory are local Chrome fixture evidence. The remote startup check is unauthenticated; it does not claim a remote multiplayer duel or physical mobile-device QA. No rule-engine or card-balance changes are part of this release.
