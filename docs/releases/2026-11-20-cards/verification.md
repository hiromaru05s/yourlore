# 2026-11-20 card update — v102

Base: `0213c98d2203cdec2192837ab316d87a058b715a` (`gh/main`, verified before implementation and again before release).
Workspace and preview server: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG`, Vite client on `http://127.0.0.1:5473`.
Current adopted sources: `client/src/shared/cards.ts`, `engine.ts`, `ui/cardView.ts`, `ui/boardView.ts`, `styles/reading-board.css`, `styles/duelBuffIcons.css` and actual `/art/cards/` assets. Existing board, characters and card frames were retained.

## Scope and agreed rules

- Six existing effects: Purging Touch removes one Brand; Unbrander removes one from each player and retains Curse healing; Countercalc randomly selects either field and retains its mana/turn limits; Trial Golem reacts to destruction of any own persistent spell; Rune Secret requires 18 spells or two Rune spells and is unique per player's field; Mini Spirit gains one HP from basic Attune and +2/+2 per actual passive addition/removal on either field.
- Shared pool: Execution (buy 2/cast 3) and Arcane Dismantler (2, 1/3).
- Eight new starters: Blood Magic - Birth, Rune Guidance, Rune Pebble, Primal Civilization, Comrade Aid, Exiled Hexer, Substitute, Shield Attack.
- Three moved starters: S10 is now Mana Draw (cast 1/draw 2); Erosion casts for 5; Mimic Leader costs 3 and receives +2/+2 per other Mimic on summon. Existing IDs/art and unmodified clauses are preserved.
- Rune Guidance's reduction is per player, shared across copies and persisted for the game. Committed uses including negated casts reduce cost; only a cast actually paid at zero receives the extra Rune spell. Its 1-to-0 transition does not receive it.
- Rune Pebble counts only Rune spells and Rune monsters in the existing deck-composition zones, excludes Rune Guidance and Rift, and deals all damage in one packet to one selected target.
- Rune Secret has independent progress counters; two Rune activations complete to the graveyard, ordinary 18-spell completion to the Rift. Replays follow existing spell-use counting rules. Both counters are visible on board and in accessible details.
- Trial Golem reacts to self-destruction (including Rune Barrier and Mana Backflow); direct grave transfers, expiration without destruction, and Rift transfers do not count.
- Comrade Aid chooses a present non-Origin tribe, then an eligible card of that tribe. Printed summon conditions are ignored; field capacity and external summoning restrictions remain enforced.
- New starters enter the normal starter collection. No free-grant or pricing change was requested.

## Verification before guarded release

- `tests/card-rework-1120.mjs`: 57 checks across both player seats, random selection coverage, repeated/negated uses, target validation, persisted delayed effects, passive no-ops, entry/exit and temporary-suppression boundaries, summon requirements/capacity, Curse threshold, and idempotent room migration.
- Client/server TypeScript checks passed.
- Canonical text checks: 446 cards × 3 languages, 1,338 texts. The 19 changed/new cards were reviewed against engine behavior and the four explicit user clarifications. Audit hashes freeze this review; they are not independent evidence of semantic correctness.
- `tests/card-rework-1120-browser.mjs`: 114 actual card detail views (19 cards × JA/KO/EN × 1440/390 widths), complete text and horizontal/vertical overflow checks; no page errors.
- `tests/card-rework-1120-board-browser.mjs`: actual current GameView at 1920×1080; both players' dual quest counters fit, and Arcane Dismantler, Rune Pebble and Shield Attack resolve through actual modal clicks and confirmation.
- First full regression pass identified 11 expected prior-rule assertions/localization issues. They were corrected and affected focused suites rechecked. The release guard reruns the complete production suite on the committed snapshot.
- New art: ten individual built-in ImageGen illustrations, current card references, stylized/painterly rather than photorealistic. Masters 1472×1344 WebP quality 92 with 384/192-pixel thumbnails; prompts and source identifiers are adjacent. Existing 433 thumbnails report stale filesystem timestamps in this checkout, but their committed bytes are unchanged; all ten new sets were generated and loaded.

## Evidence boundary

Browser reports use API/board fixtures with actual served production components. They do not prove an authenticated production PvP match. Production deployment ID, exact committed source and served asset hashes are recorded after the guarded release.

## Guarded production release

- Source commit: `82b40185817073ff162803ecf87adcc4bbfb37d3`.
- `npm run deploy`: committed isolated snapshot, remote-main/previous-release guards, production schema verification, client/server typecheck, **309/309** production suites and production build all passed.
- Deployment: `644ea642-1ffa-47a9-8a5e-cbcd003a5813`; Worker version `42ce355c-df6c-421c-a0c5-0857249db4b8`, **100%**, at `2026-11-20T06:01:09.868266Z`.
- Verified `https://yourlore.xyz`: all 30 new card-art files match local SHA-256; 11 live entry/core UI files match the exact guarded build. Public login page returned HTTP 200 with no page errors.
- Adjacent `release.json`, `production-tests.json`, `served-assets.json`, and `served-build.json` contain the final evidence. This evidence-only documentation commit does not change runtime behavior.
