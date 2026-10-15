# HOME readiness and navigation performance — 2026-10-15

User request: initial loading may take longer; prepare HOME and menus so artwork does not arrive late after entry. Preserve quality and deploy staging.

## Implementation

- Build-generated SHA-256 manifest of 1,221 current menu images (~131 MB original compressed data), including every card size, full-resolution zoom, frames/passive icons, NPC portraits, shop skins and material textures.
- First entry waits for verified file caching, furniture catalog rendering, duel code/model warmup, current-screen image decode and fonts before the approved entrance opens controls. Progress is real completed files. Failure keeps retry/reload; restricted storage uses the existing bounded image decode cache.
- Public artwork only in content-addressed CacheStorage. HTML, scripts, APIs, credentials and WebSockets are not intercepted/cached. Worker bindings are persisted per client so old/new app tabs keep their own image versions. Unused old content is pruned while live tabs are protected. Same files are reused across reloads/releases.
- HOME keeps one Zeno GPU scene per App, suspends rendering when away, reuses geometry/environment/programs on return, and disposes it on logout. No geometry, material, animation quality, AA, resolution or DPR reduction.
- Gallery cards declare their assets, avoiding recursive style inspection of every text and SVG decoration. The lounge observer only scans dialogs when an overlay is added/removed.

## Local evidence

`comparison.json` and `before/`, `after/` record the actual runs. API responses are fixtures; public code/images/models are real built files. One sample per width with varying shared-host load: timings are observations, not a general speed guarantee. Network request counts are recorded by the HTTP server; final checks also capture CDP wire bytes. Native memory-cache responses can report `fromServiceWorker=false`, so that flag alone is not used as transfer proof.

- Entry-afterward image requests: 1280 width 509 → 0; 390 width 546 → 0.
- First card gallery style reads: ~12,000 → ~1,000 (including test probes). Second page ~4,300 → ~270.
- Tested BOT picker, two gallery pages, full-size card zoom, deck, gacha edition changes, sleeves, furniture, ranking, friends, profile, character preview, guide and return HOME.
- Same HOME canvas reused on return. No broken displayed images, JS errors or HTTP errors. Warm reload performs zero manifest artwork downloads.
- Cold initial loading intentionally includes more work. No claim of reduced total asset size, improved in-game FPS or authenticated multiplayer QA.

## Automated coverage

`menu-cache.mjs`: actual files, hash manifest, zero revalidation, per-client release isolation, worker restart, API/HTML/script bypass, eviction fallback and safe old-cache pruning.
`menu-preparation.mjs`: reject stale bytes, retry recovery, cache reuse and cancellation.
`home-spirit-cache.mjs`: one scene per App, suspend/resume, localization on reuse and logout disposal.
Existing asset-readiness retry and selected-menu interaction tests also pass.

## Integration

The local comparison predates main 118c2bac. The release also preserves the subsequently adopted growth/erosion/anesthesia effects, removal of shop board previews, and fixed profile character UI. The final browser script follows the updated profile and does not restore its retired picker.

## Deployment

Pending guarded staging release and deployed-file/browser verification; see the staging subdirectory when completed.
