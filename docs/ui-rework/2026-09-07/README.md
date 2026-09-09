# Biblion staging duel rework — 2026-09-07

Target: **https://test.yourlore.xyz**. Branch: `codex/biblion-ingame-rework`.

The board now uses a shallow-perspective marble table, navy library surroundings, fine metal card frames, and the two approved Seekers. Generated files contain only illustration; prices, stats, slots, stock, resources and labels are rendered from live game state.

## Implemented and retained

| Area | Result |
| --- | --- |
| Players | Opponent centered at the top; own Seeker centered against the bottom edge. Expanded hand can cover the portrait. |
| Market | One central counter containing 8 stock-3 slots and 4 stock-1 slots under normal rules. Current remaining stock is shown. The reroll button and blue line identify only the rerollable group. Its count follows supply-reduction effects. |
| Purchase UX | Tap to inspect; double tap to arm, then tap to confirm. Discounts, affordability, pending-target restrictions and watch markers remain. Original supply indices are preserved after sorting. |
| Monster field | 7 slots on each side; attack, target selection, reorder, stats and status counters remain. |
| Spell / trap field | Separate clearly labelled band with a combined capacity of 7 on each side. Set traps show sleeves without leaking identities; enchant duration and counters remain. |
| Resources | HP number plus a live HP bar. Mana grows to 30 individual crystals, arranged in rows of 10; spent crystals are dark. |
| Hand | Compact horizontal hand to the right of own Seeker; tap to expand, tap a card to inspect, drag up to play. This now works consistently in portrait mode too. |
| Deck / Shelf | Deck on the right, Shelf immediately further right. Shelf is a shallow physical rack with sideways standing cards. Existing deck-composition, remaining-deck and public-history browsing remain. |
| Rift | Existing removed-card browser remains. |
| Profile | Only the approved red and blue Seekers are offered. Uses the existing authenticated avatar persistence endpoint and match profile data; no schema migration. Existing saved card avatars remain supported outside duel until the user chooses a Seeker. |
| Effects | Full-screen focal rotating card reveal, sleeve visible on the reverse, landing dust, short hurt-expression/recoil. Fast-forward and reduced-motion support retained. Secret trap plays never reveal the face. |
| Controls | Turn timer, end turn, surrender, log drawer, sound, guide, target/cancel overlays, deck viewers, card zoom, tutorial and engine-event feedback remain. |
| Synergy | Side-rail display removed. Gameplay and card-keyword information are unchanged. |

## Deliberate rule boundary

This is a presentation rework. The authoritative engine and server rules were not changed. In particular, **the currently active player's supply is still displayed when the turn changes**, and the existing automatic supply refresh behavior is retained. The user's proposed persistent shared stock rule remains a separate future gameplay change. Fixed stock may be 2 or 1 after purchases, and supply-reduction card effects can lower the normal 4 slots.

## Validation

- `npm run typecheck`: client and server.
- `node tests/duel-ui.mjs`: 7 + 7 zones, trap secrecy, stock badges, sorted supply index mapping, purchase confirmation, turn restrictions, 30 mana / 23 available, HP value/bar, two avatar options and persistence callback, hand states, sizing inputs.
- `npm run build` and `git diff --check`.
- Wrangler 4 staging dry-run resolved only `lore-server-staging`, `lore-db-staging` and staging Durable Objects.
- Browser visual inspection: 1280×720 normal and maximum board, 1672×941 maximum board, 390×844 portrait, 844×390 landscape; hand expansion, drag-play rotation/reverse, hurt expression, profile selection.
- Public staging HTML references the expected build; JS, CSS and all three Biblion illustration files returned HTTP 200 with SHA-256 hashes matching the tested local build (see `remote-verification.json`).
- The profile component test uses an isolated API stub, not a real user's profile. Network matchmaking is not claimed as an end-to-end test.

Local-only visual fixtures are available through Vite at `/duel-lab.html`, `/duel-lab.html?dense=1`, and `/profile-lab.html`. They are **not entries in the production build** and are not deployed. No new test controls were added to the game itself.

## Maintenance and rollback

The old in-game layout solver, rail rendering and responsive override layer were replaced. Still-used log/tutorial/modal/event styles were extracted to `game-overlays.css`. Home-specific mobile styles were retained. The tracked self-referential `client/node_modules` link was removed because it prevents a clean Vite start; dependencies remain ignored and installed normally.

`deployment.json` records the pre-change staging version and the deployed version. Roll back using Wrangler's `rollback` command with that previous version and **`--env staging`**. Production is not a deployment target for this branch. Asset hashes and generation references are recorded in `assets.json`.
