# Staging evidence — approved mimic 01

- Released shared-main source: `b24b03178fa094a9ea5beed9adb92215231d48de`, including coffer implementation `01595de1` and draw-event fix `04c3fa55`.
- The concurrent guarded release included this set after main integration. Its committed snapshot completed client/server typecheck, the 185-case production suite and production build before deploying. No duplicate deployment or rollback was performed by this task.
- Worker `lore-server-staging`; version `f565fd6a-36cc-4ed8-8cd6-717058ccb545`; 100% traffic. Deployment `98580ba9-acd5-4350-8804-438e4ee5a509`, 2026-10-16 01:14:33 UTC.
- Captured SHA-256 hashes directly from the guard's temporary committed snapshot before cleanup. All **138** deployed HTML/JS/CSS/JSON files and selected PNGs matched. Home 200, anonymous collection 401.
- Deployed normal equipment renderer verified on opponent board: empty deck and graveyard, stocked piles, animated hand, real draw and cleanup. Browser errors: none. Drawing buffer **2880×1800** for a **1440×900** viewport (2x).
- The board verification uses the deployed board fixture, not authenticated multiplayer. Evidence is in `qa/staging/`.
- Current pool: 20 cosmetic rewards sharing 7%; coffer furniture and sleeve are separate **0.35%** rewards. Cosmetic duplicates refund 100 Shards.

Staging: https://test.yourlore.xyz/
Board: https://test.yourlore.xyz/cosmetic-studio.html?board=1&runtime=1&set=coffer&side=opponent&count=0

## Authenticated live verification

An isolated temporary staging account exercised actual server RNG for 560 draws. Both coffer rewards were granted independently, then both duplicate types refunded exactly 100 Shards. Verified rejected unowned equipment, receipt replay without extra spend, persisted inventory/profile and both saved equipment slots. The authenticated browser confirmed enabled owned equipment and both real gacha lineup entries. The temporary account, sessions and generated activity were removed by successful `finally` cleanup. No existing player account was altered.
