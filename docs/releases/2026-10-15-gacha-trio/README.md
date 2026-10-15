# Selected gacha cosmetic trio — 2026-10-15

User approved all three sets from the 5519 comparison and requested joint merge,
push and staging release with the card-effect / gacha changes.

| Theme | Sleeve reward | Furniture reward |
|---|---|---|
| 蒼潮の硝子 | sleeve:gacha-tidal | furniture:gacha-tidal |
| 象牙の翼綴 | sleeve:gacha-ivory | furniture:gacha-ivory |
| 黒紅の開花 | sleeve:gacha-rose | furniture:gacha-rose |

Each furniture reward contains the deck holder and graveyard. The matching sleeve
is a separate reward. `GACHA_COSMETICS` is the shared pool of six, marked
`gachaOnly`. The catalog's positive price is compatibility metadata, not a direct
sale offer; the coordinated server/UI changes reject direct purchase and show
ガチャで入手. The agreed pool rate is 7%, evenly divided across these six items;
starter 92.5% and the three separately approved card effects 0.5% remain unchanged.
The common gacha/API implementation belongs to `codex/crystal-gacha-deck`.

## Rendering

The authored material and furniture shapes were ported from
`docs/cosmetics/2026-10-15-gacha-trio/` in the source workspace. A fixed metal rim,
dark groove and inner binding preserve each card's outline. Only the illustration
moves. A scoped hand rule removes the old 3% clipping for these sleeves.

Ordinary `createEquippedCosmetics` mounts this adapter. Each player's sleeve and
furniture resolve independently from their deck loadout. Hand and native draw
backs use the same shader as the deck top; 3D moving stock uses `sleeveMaterial`.
The graveyard continues to display public card faces. Empty zones keep their
furniture and idle material motion. Catalog tiles render the real two objects.

Textures are shared with reference-counted asynchronous leases. One lazy offscreen
renderer per board paints DOM sleeves. Updates are bounded to 30 frames/s, respect
reduced motion, and run inside the existing board loop, which pauses in hidden
tabs. Disposal releases textures, GPU geometry/materials, canvases and listeners.

## Checks

- `node tests/gacha-cosmetics.mjs`: six unique gacha-only rewards, asset/localization
  completeness, ownership, wrong-kind rejection, and all nine cross-theme deck
  loadouts.
- `npm --workspace client run typecheck`
- `npm run build`
- `node_modules/.bin/vite --config docs/releases/2026-10-15-gacha-trio/vite.config.mjs`
- `node docs/releases/2026-10-15-gacha-trio/check-runtime.mjs`

The fixture uses ordinary GameView and animateDraw, with no cosmetic preview
adapter. It is not an authenticated multiplayer or staging proof. Runtime evidence
and the combined release identifiers are recorded after validation.

## Validation result

Code commit: `63ae1f70`. Client typecheck, fixture typecheck, catalog/ownership/deck
contract tests and production build passed. The build retains the existing large
chunk warning. The normal-runtime browser assertions passed with no JavaScript
errors and no failed HTTP responses; see [report](qa/report.json).

The test verified all three variants across empty zones, one/ten hand cards,
last-card/three-card draws, interruption cleanup, fixed rim pixels while the
illustration changes, reduced motion, different sleeve/furniture choices on both
sides, responsive controls (844/390/320), return to default and disposal.
Screenshots are encoded as WebP below; the locally retained continuous recording
captures the full test sequence. Picture timing alone is not evidence of a
particular draw phase because screenshot capture may lag the measured state.

- [Tidal set](qa/set-1.webp)
- [Ivory set](qa/set-2.webp)
- [Rose set](qa/set-3.webp)
- [Ten separate card outlines](qa/hand-ten-2.webp)
- [Different equipment on both sides](qa/mixed-both-sides.webp)

Combined API/gacha tests and staging source/version evidence are owned by the
coordinating `codex/crystal-gacha-deck` release.
