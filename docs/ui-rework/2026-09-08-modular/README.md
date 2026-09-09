# Modular celestial card UI — 2026-09-08

Follow-up to the approved ivory porcelain/champagne-metal direction.

## Delivered

- Regenerated six frames (monster/spell/trap × basic/nameless). Basic name plaque now spans most of the card width and has more height. Illustration is fitted below the plaque to preserve faces.
- Removed integrated cost/attack/HP sockets. Three new standalone PNG seals sit on independent DOM layers; numbers remain variable text. No decorative seal is hand-painted in CSS.
- Removed visible per-card type words/symbols. Type colors and accessible card descriptions remain.
- Smaller PC inspector: 82vw with 1120px cap; card/panel height 65vh with 640px cap. Wider card/panel gap, surrounding margins, full scrollable effects/keywords/related cards retained.
- Monster keyword/counter UI uses text labels on generated navy/ivory plaques. Guts, decay, hatch, durability, guild/casino/castle counters no longer use emoji.
- Generated infinity PNG for indefinite enchantments. Finite effects use a matching plaque with remaining turns; birth-turn effects retain elapsed/limit plus remaining-turn details.

## Indefinite-duration bug

The reducer previously decremented every enchantment, including the legacy `val=99` no-countdown sentinel. After a turn, the UI interpreted 98 as a finite duration. The shared `enchantHasTurnCountdown()` predicate now derives duration type from the card definition. The reducer does not decrement indefinite effects; the UI does not display their old persisted 98/1 counters. Their normal non-timer removal conditions remain active. `spellHeal` / `ancientCiv` birth-turn expiry still runs. Numeric game-state schema is preserved for compatibility.

## Asset controls

`client/public/art/biblion/modular/` contains 11 PNGs: six frames, cost, attack, health, infinity and plaque. Source prompts/paths/dimensions/hashes are in `manifest.json`. Generated alpha is preserved. RGB frame exteriors are composited with the existing runtime black-matte filter; originals are copied unchanged.

Independent CSS controls in `client/src/styles/card.css`:

- `--card-cost-size`, `--card-attack-size`, `--card-health-size`
- `--field-cost-size`, `--field-combat-size`

Each numerical seal has a `.seal-face` raster and `.seal-value` text layer. They can be repositioned/resized without regenerating the card frame.

## Verification

- `npm run typecheck`: client + server pass.
- `npm run build`: design guard, TypeScript and Vite pass. Existing large-chunk advisory remains.
- `node tests/duel-ui.mjs`: pass. Added saved indefinite counter=1 survival across turns, finite owner/both-turn expiry, birth-turn expiry, infinity PNG for saved counter=98, no per-card type label, separate seal-face layers, and emoji-free state counters. Existing board/market/hand/profile/draw/turn/reveal tests pass.
- Browser QA at 1280×720 and 1920×1080: name legibility, face crop, stat centers/3 digits, inspector margins and related-card seal clipping, text-only passive labels, finite/infinite indicators, 7-monster/14-buff dense layout. Screenshots alongside this file.
- Staging served SHA-256 checks and version recorded in `remote-verification.json` / `deployment.json`.
- Staging authenticated online play is not covered by the local UI fixtures / controller tests. Mobile is outside this iteration's requested scope.

Previous staging version for rollback: `5cec6127-dbea-4334-bd93-68372a3b5663`.
