# Game presentation — 2026-09-27

## Delivered scope

- Canonical red female / blue male Seeker: five newly generated 4×4 animation atlases each (idle, hurt, attack, mana, heal). Healing also handles maximum HP gain. 160 source frames total. 1024² WebP atlases render into two 256² canvases at 30 fps; adjacent frames interpolate, event transitions blend over 220 ms, idle reverses continuously at the endpoints. Canvas instances survive authoritative board renders. Portrait motion never holds the game clock. Reduced-motion users receive a still portrait.
- Frame aperture masks derived from the real portrait ornament alpha, with an underlap beneath the rail. Player and opponent art fill the complete irregular aperture; no rounded-rectangle gaps. The existing frame artwork remains intact.
- Generated 11 passive icons: counter, dual, ambush, aura, void, guts, decay, majesty, taunt, evade, relic. Field tags show the icons with accessible names/descriptions and token counters. Zoom retains the localized rules. Granted abilities retain an outline.
- Deck editor: all nine named starting cards alongside the candidate tray; explicit add/remove buttons; click or keyboard entry inspection; save and active-deck behavior preserved. Market watch is mounted only when selected, 24 cards per page.
- Card catalog: 24 decoded cards per page, larger card art, name/effect/passive search, reset filters, bounded DOM. Previous page stays complete while the next page loads.
- Home: corrected ranked-title alignment, composited camera drift/light/motes; original atmosphere retained. Shared secondary-page surfaces and BOT difficulty selection use the same navy/ivory game UI. Desktop/mobile/landscape layouts checked.
- Loading: page cover until background and image decode; duel gate no longer reveals incomplete assets after six seconds. Explicit image retry. Newly exposed public game cards and the player's hand warm before result playback.
- Rendering: cache board color and depth; update only the two Rift meshes between board changes. Depth still occludes behind metal rails. Dust renders after the cached scene is presented, preserving the cached depth. Render resolution capped at 2.6 million pixels, DPR at 1.5. DOM timer labels do not invalidate the entire board; the physical dial updates on segment changes.

## Asset delivery

Built-in imagegen mode, no API fallback. Original brief and every final prompt/reference/source path are in `imagegen-prompts.json`; generated originals in `generated/`; runtime dimensions, byte counts and SHA-256 in `assets.json`.

Runtime locations:

- `client/public/art/seekers/v2/`: ten 16-frame WebP atlases and two derived aperture masks.
- `client/public/ui/passives/v1/`: eleven 96² transparent WebP passive emblems.
- `client/public/art/lounge/{stage-v1/stage,v1/library}.webp`: encoded copies of existing approved backgrounds.

The 21 generated runtime assets total 2,903,754 bytes. The two background files shrink from about 4.8 MB PNG to about 670 KB WebP. Sources and existing PNGs are retained. `scripts/build-presentation-assets.mjs` records the conversion and aperture-mask derivation; it reads the stored generation sources and does not call a generation API.

## Verification

- Client/server TypeScript, production build, design guard, diff whitespace.
- `game-presentation-browser.mjs`: desktop and 390/844/320 layouts, ranked center alignment, animated home, BOT tiers, deck add/remove/save/inspect, lazy watch pages, catalog pagination/search, both characters' four reactions returning to idle, aperture bounds, reduced motion.
- `presentation-loading-browser.mjs`: an image delayed beyond 7 seconds keeps the duel covered; network failure presents retry and recovers without reload.
- `rift-mana-controls-browser.mjs`: player/opponent mana impact/readout/crystal synchronization, 10→12 row transition, generated utility controls, four sizes, reduced motion, fast-forward.
- Existing opening browser suite: four sizes, both first-player choices, abort, local/online clock fixtures, clock skew, WebGL fallback. Existing quick-playback, duel-ui and motion-v2 suites pass. The DOM-only duel-ui runner emits its existing non-browser canvas capability notice; canvas animation is covered in Chrome.
- Stable 1280×720 browser sample (`checks/performance.json`): 6 seconds, 3 full board passes, 72 portal-only passes, 94.7 ms measured rendering JS; total page task duration 0.89 seconds. This is a local synthetic sample, not a universal device FPS claim.
- Deployed-byte and live-site verification is recorded separately in `staging-verification.json`. Authenticated online matches require real participants and are not claimed by the fixture tests.

Staging only: `https://test.yourlore.xyz`. Previous Rift/mana/utility-button work is retained.
