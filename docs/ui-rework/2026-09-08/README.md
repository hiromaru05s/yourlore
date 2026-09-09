# Biblion UI refinement — 2026-09-08

User feedback implemented on `codex/biblion-ingame-rework`, targeting `test.yourlore.xyz` only.

## Delivered

- Seven built-in ImageGen PNG assets: portrait card frame, compact field frame, ornate Seeker frame, filled/empty mana crystals, red/blue neutral-to-blink sprite sheets. Source paths and complete prompts: `assets.json`. Alpha validation: `asset-verification.json`. Installed assets: `client/public/art/biblion/ui/`.
- Generated card borders overlay live card art, names, costs and stats. Character portraits use generated gold/ivory/navy frames, a short natural blink and a two-pixel idle movement; existing hurt expressions remain separate. Motion-reduction preferences suppress idle motion and flashes.
- The deck, standing landscape cards in the Shelf and hourglass are actual Three.js WebGL geometry. Physical lighting, beveled geometry, card textures, glass, funnel/mound sand and falling grains are rendered with perspective cameras. Counts and interactions remain accessible DOM controls. The leading Shelf card shows its public art; selecting the Shelf still opens the card list.
- A single transparent WebGL context renders the five object views. It is loaded only for a duel, capped at 30 fps / 1.75 DPR, pauses when hidden, releases obsolete textures and disposes on leaving the screen. Without WebGL, flat pile controls and the numerical timer remain usable.
- Timer uses the existing controller's remaining seconds and total duration, including online authoritative values and hand-cap bonus. The hourglass sand ratio and numerical readout use those same values. No timer or game-rule changes were made.
- Card play no longer spins through 360 degrees. The live 2D card rises with a restrained perspective tilt, settles front-on for reading, then travels to the field with WebGL dust particles. This is a combination of CSS perspective card presentation and WebGL scene effects, not a 3D character rig.
- Existing hand expansion, target/attack/market interactions, seven monster plus seven spell/trap positions, mana maximum 30, HP bars and profile choices are retained.

## Verification

- `npm run typecheck`: client and server passed.
- `node tests/duel-ui.mjs`: zones, hidden trap identity, market stock/index/confirmation, turn restrictions, 30 mana, HP, avatar persistence, hand states and viewport solver passed. Added timer accessibility/expiry/bonus-total checks and interrupted reveal cleanup checks.
- `npm run build`: passed; Three.js is a separate dynamic chunk (~138 KB gzip). Vite reports its normal >500 KB uncompressed chunk advisory.
- Staging Wrangler dry run: passed, staging worker/D1 binding verified.
- Browser checks: 1440×900 and 1280×720 desktop, 390×844 fully occupied board (30 crystals, 23 filled; no horizontal document overflow), hand tap expansion, card drag/reveal, Shelf browsing, no captured console errors. A real LocalController BOT game verified decrementing time and transition to the opponent's fresh 90-second clock.
- `desktop.png` and `mobile-dense.png` are actual browser captures of the development fixture. The fixture is not included in the production build.
- Online two-account match/reconnect was not exercised in the browser; the authoritative clock calculation and game server were left intact. Production was not deployed.

## Rollback

The preceding staging build was `f98cee2a-4458-4812-ae21-1f9d7471cfc1`. Run `wrangler rollback f98cee2a-4458-4812-ae21-1f9d7471cfc1 -c server/wrangler.toml --env staging` if this refinement needs to be reverted. Deployment and asset hashes are recorded separately in this directory.

## References used

- Three.js physical materials: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- Wrangler deployment commands: https://developers.cloudflare.com/workers/wrangler/commands/
