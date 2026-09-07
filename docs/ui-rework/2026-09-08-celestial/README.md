# Celestial card UI — 2026-09-08

PC fullscreen card redesign. Six freshly generated PNG faces use an original ivory ceramic / fine metallic constellation master. Monster garnet, spell blue, trap green. No old frame was supplied to the new master generation. Variant generations refer only to that new master.

## Implementation

- Basic face: top name and cost, monster attack/HP at the bottom. Used in market, hand, collection/pickers and inspection. No embedded rules panel.
- Nameless face: 4:5-ish portrait field shape. Monster combat values remain; spell/trap faces stay in the smaller 14-slot buff lane.
- Generated PNG includes the plaque, cost socket, combat seals and ornamental structure. Only names/numbers/type labels are live text. Originals are RGB; a runtime SVG filter removes black matte and clip paths composite the illustration. No claim of source alpha transparency; no old stat PNG overlay on these new cards.
- Right inspector: translucent coded surface with full rules, separate play cost where applicable, keyword explanations, tribe information, related cards and chest odds. Longer content scrolls. Close button / Escape / bounded keyboard focus.
- Permanent spell: infinity badge. Limited duration: remaining turns. `bornTurn` effects (ancientCiv/spellHeal): elapsed/limit plus remaining turns in tooltip and inspector. No rule changes.
- Set traps keep the generic trap icon and unknown cost; no hidden name, art, cost or UID leaks. Existing counter visibility rule retained.
- Market 8+4, separate reroll subframe, stock counts, 7 monster / 14 spell-trap capacities, hand expand UX and existing animation flows remain.

## Validation

- `npm run typecheck` — client and server pass.
- `npm run build` — design guard + TypeScript + Vite pass; existing >500kB chunk advisory remains.
- `node tests/duel-ui.mjs` — pass. Added basic/field routing, no embedded effects, inspector for all 3 types, Escape, unknown trap cost, elapsed/remaining spell regressions. Existing tests cover 14/7 limits, stocks and original indices, permissions by turn, 30 mana, HP, profile avatars, hand expansion, draw cancellation, turn banners and spell-reveal cleanup.
- Wrangler staging dry run — pass.
- Browser inspection: 1280×720 and 1920×1080, standard/dense boards, new monster/spell/trap frames, single right inspector, related cards, timed spells and 3-digit combat values. No viewport overflow at 1280×720; field and market rectangles do not intersect. Screenshots alongside this file.
- Mobile was not redesigned or visually validated for this release.
- Staging deployment/version and served SHA-256 comparisons: `deployment.json` / `remote-verification.json`.
- Authenticated online match on staging is not covered: the available staging browser session is logged out. Functional checks use the local dev fixture and shared controller/reducer tests.

## Assets / rollback

Source prompts and exact original paths: `manifest.json`. Runtime assets: `client/public/art/biblion/celestial/`.
Previous staging version: `22dc9c64-52d5-41a9-aba3-a1fe3fe77f43`.
Production is untouched.
