# Integrated staging — 2026-09-27

Deployed to https://test.yourlore.xyz. Production was not deployed.

Source: `57feec7`, Worker version: `3bc2bee7-d572-4759-8d4f-f8f33fbdd5c4`.

## Integrated changes

The existing seeker HOME/menu redesign and v52 card balance remain. Merged the
solid-draw branch (including the reapplied dd855a4 sound, aiming, Rift and ceremony
work) and committed the completed synchronized opening from the main workspace.
The current opening director owns real match startup, while the older ceremony
remains available in the developer preview. Historical pre-lounge archive
snapshots were not reapplied; their old UI is superseded.

Resolved overlapping controller, draw, sound and preview changes. `animateDraw`
now accepts its cancellation signal in the same options object as arrival UIDs
and previous hand poses. Opening cues share the new sound master bus. Browser
checks found legacy opening CSS animations and z-index overriding the new
cutscene; isolated the styles and verified both previews.

## Verification

Type checks, production build, staging dry run, opening server lifecycle, solid
card geometry/cancellation, motion, duel UI, quick playback, sound/aiming,
v52 balance, ranked scoring and settlement tests passed. Local Chrome checked
four opening viewports, both first players, dealing, cancellation, reduced motion,
WebGL fallback, the real BOT controller, and an online client fixture with clock
skew. Deployed menu checks use API fixtures. `staging-verification.json` records
remote asset hashes, a live anonymous login check, and a built BOT opening check
with fixture authentication/API. These are not authenticated two-user online
match verification. No database migration was needed.

Pre-existing untracked design/export/screenshot artifacts remain in place.
Build retains the existing large-chunk warning. See deployment.json and browser
reports for exact provenance and validation scope.
