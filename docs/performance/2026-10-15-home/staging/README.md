# Staging verification — 2026-10-15

- URL: https://test.yourlore.xyz
- Source: `583ced2c838d0a05aab0a4804b6eef42bb04125c`
- Worker: `ba7fa566-9756-4406-8527-5151d4832078`, 100% traffic. Final deployment read-back still matches.
- Guarded committed snapshot: client/server typecheck, **157/157 production tests**, production build and upload.
- **102/102 built files** (HTML, chunks, stylesheet, manifest and service worker) match the actual guarded snapshot by SHA-256. The first immediate parity attempt saw one transient 404; the unchanged retry returned 200 and matching bytes for every file. No browser HTTP errors in the completed runs.
- Public menu artwork manifest: **1,221 files**, original compressed bytes, SHA-256 verified by the actual preparation path. No image resolution, AA, DPR, meshes, materials or animation details reduced.

## Real staging browser measurements

Chrome headless, default transport (HTTP/2 enabled), DPR 1, height 900, fresh browser context for each width. No artificial network/CPU throttling. API responses use the test fixture; HTML/JS/CSS/images/models/audio all come from staging. This verifies menu loading and rendering, not an authenticated multiplayer match. The anonymous login check uses the real anonymous API.

| Width | Cold HOME entry | Warm reload | Image wire requests after entry | Card gallery | Furniture list | Return HOME |
| --- | --- | --- | --- | --- | --- | --- |
| 1280 | 42.58 s | 7.47 s | 0 | 433 ms | 72 ms | 53 ms |
| 390 | 55.58 s | 7.46 s | 0 | 411 ms | 54 ms | 54 ms |

Times are single-run observations and include browser automation/actionability. They are not a general device/FPS guarantee. Warm reload downloads **zero** manifest artwork files, verified from CDP request headers on the real origin. Native image memory-cache responses may report `fromServiceWorker=false`; CDP cache flags and encoded wire length establish zero network image transfers during menu navigation.

Flows: HOME → BOT opponent dialog → card list → next page → full-size zoom → deck → gacha editions → sleeves → furniture → ranking → friends → fixed profile → guide → HOME → reload. No JS errors, HTTP errors or broken displayed images. The same Zeno canvas survives navigation and resumes on return. Screenshots were inspected at both widths; original artwork and 3D appearance are intact.

Records: `browser-report.json`, `anonymous.json`, `asset-parity.json`, `production-suite.json`, `guarded-build.json`, `menu-image-manifest.json`, and `deployment-final.json`.
