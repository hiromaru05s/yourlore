# Biblion refined duel UI — 2026-09-08

Staging refinement requested by the user. Ivory, navy and restrained pale gold replace the heavier decorative materials. The self and opponent portrait frames differ; the opponent frame extends beyond the top edge while the face remains visible.

## Implemented

- 25 generated PNG assets: card and field frames, two portraits, filled/empty mana, three numeric badges, three button states, reroll and trap symbols, shelf case, panel, turn flare, five deck thicknesses, and three 16-frame Rift atlases. Original outputs are preserved; `assets.json` records prompts and sources.
- Live card type labels distinguish monsters, spells and traps. All numeric values and translated text remain DOM content.
- Seven monsters and fourteen **combined** spell/trap slots. Shared engine, board and BOT use the same capacity. Spell/trap tiles show artwork and duration/counters; hidden traps use the dedicated seal without exposing their identity.
- A permanent spell dissolves into light, then perspective WebGL particles converge on its buff slot. Turn announcements expand from the center. Existing idle blink, breathing and damage expressions remain.
- Rift idle/hover/absorb states animate the internal image across sixteen frames; an increase in removed-card count triggers absorb.
- Deck count buckets: 0 empty; 1–2, 3–4, 5–9, 10–14, 15+. Generated stack body and equipped sleeve are independent layers. Shelf is a shallow case with its public top card.
- Market is one outer enclosure; only the rerollable four occupy an inner enclosure. Reroll PNG and hover emphasis reinforce that boundary.
- Improved physical hourglass and live second plate immediately right of the market. Turn label and end-turn button share that reserved column. Rift stays with each player's piles.
- Card selection dialogs use generated materials and a sticky timer driven by the same authoritative countdown, including discard extensions. Selection cards are enlarged on phones. The compact hand and 30-crystal mana display occupy separate areas.

## Validation

- `npm run typecheck`, `node tests/duel-ui.mjs`, `npm run build`, staging Wrangler dry run.
- Reducer boundary: fourteenth trap allowed, fifteenth rejected, eighth monster rejected. UI tests cover all fourteen tiles, hidden identity, market original indices and purchase confirmation, clock mirroring, max mana, HP, equipped avatars and hand expansion.
- In-app browser: desktop, 390×844, 320×568 and 844×390. Verified card selection and confirmation while countdown advances, permanent spell placement and overlay cleanup, turn banner, WebGL hourglass, and no Rift/end-turn/timer overlap.
- Generated assets are PNG originals. `asset-verification.json` records dimensions, alpha ranges and byte sizes. Button skins are opaque rectangular skins; other assets retain alpha.

## Deployment and rollback

Only `lore-server-staging` / `test.yourlore.xyz` is targeted. Production is not deployed by this change.
Previous staging version: `13fb1ebe-552f-47c0-a45c-d6bd9fa08a4d`.
Final version and content-hash verification are recorded in `deployment.json` and `remote-verification.json`.

WebGL effects gracefully omit rendering when a GPU context is unavailable; all input, counters, PNG piles and Rift remain usable. Reduced-motion preference disables nonessential animation. Existing Vite warnings about chunks above 500 kB remain.
