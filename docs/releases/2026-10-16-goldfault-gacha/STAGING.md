# Staging release evidence

- Released source: `af18dc7151bb33ed5406dacfa57a93f1b46e219a` (includes approved Goldfault implementation `dc760806`).
- Guard: `node scripts/deploy-guard.mjs staging`; clean committed snapshot, current remote main and deployed ancestry/version checks passed.
- Client + Worker typecheck, design guard and production build passed. Production suite: **179/179** passed.
- Worker `lore-server-staging`, version `24692320-6752-4e85-89f9-ef97dba80a43`, 100% traffic, deployment `7e708d76-7a42-44e6-8eb8-6ef7ff2df4e6`, 2026-10-15 15:36 UTC.
- **108 assets** (HTML, JS, CSS, manifests and both new PNGs) matched SHA-256 from the exact temporary snapshot used by the guard. HTTP home 200; anonymous collection 401. See `qa/staging-parity.json` and `qa/deployment.json`.

## Concurrent release and browser boundary

During post-release browser checks, another guarded release published descendant `173139382d7e1b99df49cad57d7d6733fa4a5fc7` (version `c2b822d3-b958-4304-b90a-d9051fff0b45`, 100%, 2026-10-15 15:44 UTC). Its main history includes both Goldfault commits. It changes HOME/duel loading, not Goldfault. No rollback or replacement deployment was performed.

Local production-renderer fixture checks and real Worker/SQLite tests passed as recorded in README. Browser attempts against staging experienced existing board-asset fetch aborts/timeouts; an attempt spanning the concurrent deployment also encountered two 404s. The later attempt on the descendant build still timed out fetching board widgets. Screenshots taken before the loading cover disappeared are **not** treated as visual evidence. Direct staging browser verification is therefore incomplete; no authenticated live draw or multiplayer result is claimed. The successful 108-file parity check belongs to the original guarded release at its verification time, not to the descendant's different bundle names.

Staging: https://test.yourlore.xyz/
Approved equipment fixture: https://test.yourlore.xyz/cosmetic-studio.html?board=1&runtime=1&set=goldfault&side=opponent&count=0
