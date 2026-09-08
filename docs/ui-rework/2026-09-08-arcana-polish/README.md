# Arcana UI polish — staging

## Interaction fix

Hand cards carry inline `z-index: 0..N`. Cloning that style for the drag ghost overrode the drag layer and hid earlier cards behind the board. The browser regression reproduces the old occlusion by restoring index zero, then proves the fixed ghost is above the market using hit testing at its surface. The ghost now has a dedicated visible layer, including fitted text at its reduced size.

A compact-hand press previously stopped propagation and only expanded the hand. Card presses now capture the pointer immediately and continue through expansion into a drag. Empty hand-padding presses still expand. Dropping back cancels; pointer cancellation, loss of capture and view re-render/teardown clean up the ghost. Mouse/pen use a 6px movement threshold; touch uses 10px.

## Presentation

- The market at 1280×800 is approximately 145px tall, versus roughly 172px before, retaining the 4 offered and 8 fixed slots, stock counts and reroll control.
- HP and mana use matching two-row bands and identical value baselines. Up to 30 mana crystals fit onscreen, including mobile and short landscape layouts.
- Deck: beveled folio-like receiver, recessed draw well, visible paper layers and existing sleeve. Shelf: sculpted curved bookends, brass inlay, staggered landscape cards; its public front is captured from the real card renderer, including frame and live text. No hidden deck order or opponent hand face is read.
- End turn: a beveled enamel/brass control with distinct hover, pressed, disabled and focus states. Timer: a numeric circular progress dial beside the real hourglass; the authoritative countdown and accessible timer label remain.
- Dice: real rounded cube geometry with metallic bevels, generated lapis-enamel face texture and geometric pips. All six outcomes have verified front-facing final orientations, exact pip counts and opposite faces summing to seven. The roll result is provided by the engine, never the image or animation.

## Design references

Public game screens were used as visual references for readable object silhouettes, material depth and clear active controls. All new geometry and the dice artwork are original; no reference assets were copied into LORE.

- [Hearthstone official game page](https://us.battle.net/hearthstone/en/) and its [published board screenshot](https://hearthstone-a.akamaihd.net/images/media/screenshots/ss1-med-975cbaf0ad0d112e7665728d494a62a8764679fa76546c390afb8970d7ce261269fa6d31dc46b0f3c3942024ed8897f4cdcdce7efdf4f463247a342228b15319.jpg)
- [MTG Arena getting started and card sleeve presentation](https://magic.wizards.com/en/mtgarena/getting-started)

The recessed folio and curved shelf are LORE-specific design choices, not claims about those games' implementations.

## Generated asset

Built-in ImageGen was used. [Exact prompt](imagegen-prompt.md). Source: `dice-enamel-source.png`. Runtime texture: `client/public/art/biblion/arcana/dice-enamel.webp` (relative to repository root). `imagegen-manifest.json` records dimensions and hashes. WebP encoding uses quality 90; no compositional edits or resizing. Pips and values are not part of the generated texture.

## Verification

- `npm run typecheck` — client and server.
- `npm run build` — design guard passes; existing large-bundle advisory remains.
- `node tests/duel-ui.mjs`, `node tests/paper-card.mjs`, `node tests/dice-model.mjs`.
- `tests/arcana-polish-browser.mjs` — first/index-zero spell drag visibly above market; original occlusion reproduced; compact one-gesture drag; drop-back and pointer cancellation; exact resource alignment; all 30 crystals onscreen; 390×844 and 844×390 viewport bounds; WebGL dice success/failure, skip, reduced motion and context loss.
- `tests/library-piles-browser.mjs` — 3D pile rendering, hand sizing, engine refill events, actual controller shuffle then draw, GPU fallback. Results in `pile-regression/`.
- `tests/paper-card-browser.mjs` — existing real draw path, batches, privacy, cancellation, texture loading, mobile and controller opening draw. Results in `draw-regression/`.

Browser checks use desktop Chrome with responsive viewport sizes, not physical mobile hardware. Published bundle/texture hashes and the unauthenticated staging boot are verified in `remote-verification.json`; account-bound gameplay was verified locally using the real view/controller and shared engine. No running user match was modified.
