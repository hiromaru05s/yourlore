# Rift, mana and utility controls — 2026-09-27

## Delivered

- Both Rifts fill the full silver rail interior. A meter-space Three.js surface
  follows the actual rail centerlines, at 0.014 m, above the old inset wooden
  crescent and below the sculpted silver. The same camera/depth test preserves
  the crossing ribs. No GLB, card rule, timer or board placement was changed.
  The small shared optical texture updates at 12 fps; reduced motion freezes it.
- A single 1,500 ms mana presentation clock coordinates gathering light,
  resource readout, physical crystal count, birth/settling, gain label and sound.
  At 520 ms the numbers change and new jewels begin appearing with a short
  stagger. Replaced the independent 1,100 ms automatic jewel animation and the
  delayed after-apply sound. Game-state values remain authoritative throughout.
  Fast-forward/navigation restore final presentation and remove transient FX.
- Generated four complete raster button plaques for log, sound, controls and
  surrender. Navy wood and restrained ivory/brass match the table. Native
  buttons retain their handlers, focus, accessible labels and localized text;
  volume/mute and log expanded states remain visible. Old button backgrounds
  are excluded from these plaques.

## Art delivery

Built-in `image_gen` generated four separate transparent 1254×1254 PNGs.
Originals: `generated/{log,sound,help,surrender}.png`.
Runtime: `client/public/ui/duel-controls/v1/{log,sound,help,surrender}.png`,
256×256 with original transparency retained (sips packaging resize).
The four runtime files total about 412 KiB rather than the 9 MiB originals.
`imagegen-prompts.json` contains the complete prompts and generation paths;
`assets.json` contains source/runtime SHA-256, sizes and dimensions.

## Validation

- Client/server typecheck and production build.
- `tests/quick-playback.mjs`: render the new crystal target before starting its
  clock; quick card source remains until the effect resolves.
- Duel UI, existing sound/aim/ceremony and opening server regression suites.
- `tests/rift-mana-controls-browser.mjs`: real Three.js crystal counts and DOM
  readouts during gather and bloom, both players, 8→10 and 10→12 rows, four
  desktop/mobile viewports, art/button bounds, log/help/volume, reduced motion,
  and fast-forward cleanup. See `browser-report.json`.
- Visual inspection of both rail interiors, desktop and mobile screenshots.
- Staging verification checks deployed bundle/audio/4 PNG hashes, anonymous
  live login, and built BOT opening using an explicit login/API fixture.
  This is not an authenticated two-player online match test.

Preview: `http://127.0.0.1:5211/duel-lab.html?polish`; use マナ増加,
相手マナ増加 and 演出スキップ. Generated files are committed; screenshots/logs
are kept locally. Production deployment is outside this release.
