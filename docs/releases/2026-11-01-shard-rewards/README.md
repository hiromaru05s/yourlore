# Shard reward increase — 2026-11-01

Ranked matches now grant 40 shards for a win / 20 for a loss, capped at 600 per UTC+9 day. Normal matches grant 20 / 10, capped at 200. Draws remain zero; the two daily caps remain independent. Existing receipts count toward the increased caps without changing past payouts.

All 13 daily quest definitions now pay three times their previous amounts: 900 / 1,050 / 1,200. Three assignments, objectives, progress, replacement allowance and explicit claim behavior remain unchanged. BOT first-clear rewards and other reward sources are unchanged.

After deploying the new assignment definitions, run `server/migrations/0031_triple_daily_quest_rewards.sql` explicitly against production. This idempotent data migration upgrades saved unpaid assignments with old amounts, preserving quest objectives, progress and revision. Claimed rows and rows with payment receipts remain unchanged. It does not credit user balances or retroactively top up paid rewards.

## Source and validation

- Base: latest remote main `c4ccc0697d007d71ea7035159e3052d36a1ce6ff`.
- Production before release: source `5111ea856d9f270ca9e2b9731a597a9fb91297ac`, version `6a1c30e6-6abb-42b9-a226-a6c554519152`.
- Working directory: `/Users/hiromaru05s/.codex/worktrees/shard-reward-increase/LORE_TCG`.
- Shared client/server amounts: `client/src/shared/progression.ts`; payout code remains `server/src/progression.ts`. HOME uses the same cap constants in `client/src/ui/dailyRewards.ts`.
- Typecheck passed. All 23 reward scenario groups passed, including caps, midnight reset, retries, transaction rollback, claims, and repeated migration with existing payments preserved.
- Guarded production validation and post-deploy results are recorded after release.

## Production result

- Guarded release completed from `bebc5a4805d6821fe5cb7b24b599d5e00fe2d19f`; Worker version `e18150c1-e4f9-4d59-8a5e-d94809af5d15`, 100% traffic at `https://yourlore.xyz`.
- All 267 required regression files, typecheck, schema preflight and production build passed.
- The post-deploy data migration upgraded 67 saved unclaimed assignments. Readback confirms all unpaid assignments use 900 / 1,050 / 1,200; 11 claimed assignments retain their old amounts. Migration does not issue currency.
- Real production browser/API smoke passed: fresh assignments have new amounts; ranked/normal progress bars have maxima 600/200. Explicit 900-shard claim changed the disposable account balance 2,480 → 3,380. Three concurrent requests awarded 1,050 / 0 / 0, resulting in 4,430. Incomplete/stale claims were rejected; duplicate/legacy payments remained zero; received state persisted after reload.
- Desktop/mobile screenshots captured; mobile screenshot visually inspected for the increased reward text and claim button. The adopted production UI/assets were loaded from `https://yourlore.xyz`; no new UI or art was introduced.
- Disposable QA account and related rows were deleted. Live match payout/caps were validated locally with server settlement tests; no real-user production PvP match, OAuth or physical-device test was performed.
- Release evidence is committed afterward without changing the deployed application source.
