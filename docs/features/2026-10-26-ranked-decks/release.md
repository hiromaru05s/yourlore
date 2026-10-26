# Production release — 2026-10-26

- Origin: https://yourlore.xyz
- Feature commit: `9450f92a` (merged into main).
- Deployed source: `a679258097f2f09f6633e6a62ba7a55e8dd5e3b0`, confirmed to contain the feature commit.
- Worker version: `c59c5bc4-656b-40ac-a261-196715e5f9fd`, at 100%, deployed 2026-10-26 16:51:34 Asia/Seoul through the repository's guarded release workflow.
- Additive D1 migration `0026_ranked_recent_decks.sql` was applied to `lore-db` and the table was confirmed present.
- This task's release validation passed all 216 tests, type checks and a production build. The final deployed source additionally includes the intervening Rift Ore update and its guarded release validation.

Live verification at 16:51 Asia/Seoul:

- All 3 currently ranked players returned HTTP 200 from the actual public deck endpoint, with `Cache-Control: no-store`.
- Unknown user: 404; missing user: 400; unsupported method: 405.
- Production client assets and live leaderboard/deck APIs rendered correctly at 390px and 1440px. The browser's startup identity alone was a local fixture; no authenticated production account was used. No page errors or horizontal overflow; open/close worked.
- Each player currently has zero recorded patterns. The live empty state explains that only ranked matches completed after deployment are recorded. No historical deck was invented or populated from current presets.
- Recording, deduplication, retention, boundary 100/101 and authoritative result settlement were verified against the real server code with SQLite room fixtures. An authenticated live PvP match was not performed during release verification.

Evidence: `production-checks.json`, `production-deployment.json`, `production-mobile.png`, `production-desktop.png`.
