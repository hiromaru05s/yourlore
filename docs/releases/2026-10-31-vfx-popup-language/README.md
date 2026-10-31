# VFX and popup language — production verification

- Runtime source: `628d33ae23f6ab8acd30a397ad84dcfec49f9cbb`.
- Production: https://yourlore.xyz
- Worker version: `6a0993b3-3032-48da-98e6-e0d2a6fe9e91` at 100%.
- Deployment: `9f88be88-341c-4851-b151-a09bdb38f9df`, 2026-10-31 13:22:21 UTC.
- Previous runtime `6cfb2246dabe662d3bf316d3a4762ceba74d05f0` is included, preserving daily-quest claims and v73 card changes.

The guarded committed snapshot passed schema checks, client/server typecheck, **265/265 production-suite scripts**, design guard and build before publication. The first candidate was not deployed: three older tests expected English in Japanese UI or lacked the language-change mock. Those tests now check the localized contract and Wheel of Fate listener cleanup; the complete suite passed on the final source.

All **153 served JS/CSS/JSON artifacts** match SHA-256 hashes of that exact guarded build. The browser verification loads the real production entry/game/CSS/assets and mounts the shipped online controller against isolated WebSocket/API fixtures. It checks all three languages for Armorer and Elf choices, actual effect-result playback, the animated turn button and victory modal. No real account, match or reward was changed. This is served-code verification, not a live PvP claim.

The fixture uses UTF-8, matching the actual production index, and waits for the final UI after effect playback before checking the physical turn label. Production screenshots capture settled result screens. Turn-label assertions use the actual node text; `innerText` may be empty during the physical control’s transition.

- [Audit scope and local checks](../../qa/2026-10-31-vfx-popup-language/README.md)
- [Production browser report](../../qa/2026-10-31-vfx-popup-language/production/report.json)
- [Production suite](production-suite.json)
- [Served artifact hashes](served-assets.json)
- [Deployment metadata](deployment.json)
