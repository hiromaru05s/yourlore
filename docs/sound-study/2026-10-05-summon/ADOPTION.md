# Summon 04 adoption — 2026-10-05

User selected **04 空気のクッション** and authorized staging deployment.

- Copy `client/src/dev/summon-sound-nine/assets/04-air.mp3` byte-for-byte to `/sfx/lore-v8/summon.mp3`; no regeneration, gain, pitch, or timing change.
- SHA-256: `33c371f170aee355367c055556618ec6328b2aec35e449a080aa3e1bea9b7bbf`.
- Normal summon uses the existing slate landing contact callback. Special Mimic keeps its own cue. Magic play remains the selected 01 silk (`lore-v7`).
- The nine-option preview marks 04 as adopted; its current-sound controls resolve the active summon route in both single and board playback.
- Research and source licensing: [RESEARCH.md](RESEARCH.md), [sources.json](sources.json). Selection provides subjective approval; automated playback and asset checks provide separate functional evidence.

## Staging release

- URL: https://test.yourlore.xyz/
- Source: `d4aca95b2b63c9d7d9c010e05b70aed947489789` (includes current main and the selected spell frame changes).
- Worker: `7a7531d4-2ab1-4812-9787-5fd23f0adacb`, deployment `43507eb4-2e2c-442f-9ff5-2d8325685255`, 100% staging traffic.
- Guarded committed snapshot: client/server typecheck, **54/54** production tests and production build passed. See [deployment](staging/deployment.json), [test results](staging/production-tests.json), [guard log](staging/deploy.log).
- **44/44** live audio/manifest SHA-256 checks passed, including byte identity to preview summon 04 and preservation of spell 01: [asset checks](staging-assets.json).
- Two cold natural BOT browser attempts stopped at the artwork retry surface before the opening completed. They had no page errors and fetched the new summon URL. Retained in [initial-artwork-timeout](staging/initial-artwork-timeout/failure.json); no audio gameplay success is inferred from these attempts.
- A third run warmed 36 real public images and used the visible artwork retry action twice. Artwork reached 70/70, but `data-scene-ready=true` still did not appear within the bounded wait. [Final browser diagnostic](staging/CASTLE/failure.json). No page errors; natural summon playback **remains unverified on staging**. The automated audio tests and live byte parity above passed independently.
- Verification scope: approved audio file, routing, manifest and guarded release verified; browser gameplay blocked before the opening completed. No authenticated online PvP or new subjective listening approval is claimed.
