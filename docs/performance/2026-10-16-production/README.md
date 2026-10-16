# Production loading and in-game performance — 2026-10-16

Baseline: `29ecbdba1e229b7034c8961a00d920b287c38d93`, confirmed as the production Worker source before this work.

Changes preserve the original image pixels, model resolution, materials, animation timings and game rules:

- Separate card inspection from `anim.ts`; menu imports no longer pull all duel VFX into the initial shared chunk. Keep the old animation exports compatible.
- Bind the current content manifest at startup without downloading the catalogue. Cache normal visible requests only after SHA-256 verification, share concurrent transfers, preserve per-client release bindings and eviction recovery. APIs, HTML and JS stay outside the service-worker content cache. Cached complete audio also serves media requests; uncached partial transfers are not stored/shared as full bodies.
- Duel admission prepares common models, VFX, all playing-size card images, current-language fonts and controls. Full card masters and unselected cosmetic galleries are fetched on demand; public current cards get low-priority master warmup. Hidden opponent identities are not inspected. Large legacy CSS fallback plates are prepared only when actually visible; small CSS state controls remain in admission.
- Eighteen runtime PNGs use lossless WebP, with exact RGBA equality (including transparent RGB), identical dimensions and no source color metadata lost. The original PNGs remain for historical previews. `lossless-assets.json` records every original/new byte count and decoded pixel hash. Encoder: cwebp 1.6.0, `-lossless -exact -m 6`.
- Cache invariant gambler mesh calculations and avoid rebuilding positions/normals on rigid spin frames. All authored vertices, normals and mesh transforms remain unchanged.

Measured scope:

| Check | Before | After |
|---|---:|---:|
| Wide duel manifest mandatory public bytes | 176.71 MiB / 1,353 entries | about 53 MiB; no whole master/gallery archive |
| 18 PNG/WebP originals | 28,382,461 bytes | 19,030,144 bytes |
| Gambler geometry, 180 frames, style 0 | 375.61 ms | 126.51 ms |
| Gambler geometry, 180 frames, style 1 | 450.38 ms | 199.33 ms |

The geometry benchmark uses the baseline source and new source in six alternating local Node trials; positions and normals are bit-identical throughout 151 sampled frames per adopted style. This is geometry CPU cost, not an FPS claim. The regression test also checks 288 frames across all five styles and reduced motion.

Validation:

- Typecheck and production build pass; product suite 189/189 passes before release guard validation.
- Local production-build HOME, reload, real local BOT route, card inspection/play and opponent turn exercise the normal renderer with fixture account APIs. Desktop frame p95 stayed about 16.7 ms in the sampled idle/play/BOT windows. Random BOT choices differ between runs, so these are regression observations, not a controlled percentage FPS improvement.
- Six menu routes, two passes, widths 1280 and 700: no broken visible images or browser/HTTP errors. Second visits take 133–228 ms locally, including an explicit 100 ms test settle.
- Gambler real-board regression: 17 groups covering both adopted variants, both sides, direct/hand/generated entry, skip/cancel/resize, small viewport and reduced motion.
- Existing service-worker tests plus verified on-demand persistence, same-hash concurrent fetch coalescing, stale response rejection and cached-media reuse pass.

The baseline public-origin browser run reached HOME at 35.3 seconds but timed out during the 177 MiB duel preload after four minutes. Local timings include the approved entrance/opening animations. Network, device and cache conditions materially affect elapsed load time. Fixture account APIs and local BOT play do not establish authenticated production PvP or reward behavior; server gameplay/reward logic is unchanged.

Compact reports accompany this note. Raw screenshots, network traces and CPU profiles are in `/tmp/lore-performance-*` for this execution. Production deployment and asset parity are verified separately after the guarded release.

## Production follow-up: progressing pack transfers

The first guarded release passed 143/143 deployed-file hashes. Its remote browser probe reached HOME in 14.4 seconds, but two pack requests were aborted at the existing fixed 180-second deadline after already receiving 3.12 and 3.83 MiB. Retrying those files individually discarded useful progress. An additional transfer helper now keeps reading while bytes arrive and times out only after 60 seconds without progress. It preallocates the expected bounded size, rejects incomplete/oversized bodies and preserves SHA-256 verification before storage. A new regression proves a transfer can exceed its idle window in total duration without restarting, and that true stalls still fail and clean up. The product suite now includes 190 tests.

A separate HTTP/2 curl probe fetched a 3.03 MiB pack in 4.16 seconds; browser transport and public-origin timing must therefore be kept distinct from payload-size savings. The remote probe uses fixture account APIs and cannot establish authenticated PvP behavior.
