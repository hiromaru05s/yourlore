# Test site startup recovery — 2026-10-16

The deployed HTML, `/api/geo`, and unauthenticated `/api/auth/me` returned HTTP 200 during investigation. A fresh Chrome context opened the real login page. The user's exact browser/session failure was not independently identified; do not describe the deployment as a confirmed server outage.

Two indefinite startup failures were reproduced against the previous deployed client (aadadf88):

- Holding `/api/geo` open left `#app` empty. Boot awaited geography, including its response body, before creating the App. No loading/recovery surface existed.
- Holding HOME's ivy texture request open left the cover at “100% / Ready” while atmosphere state remained `loading`. The background's first-frame promise had no deadline. The rest of HOME was loaded but inert. This reproduction used an account fixture, not a real authenticated session.

## Change

A small entry module loads the application and optional geography concurrently. Saved language skips geography entirely; otherwise a deadline of 800 ms covers both headers and JSON body, then uses the browser language. The request is aborted on timeout. Normal account/session behavior is retained.

HTML supplies a styled startup surface and a native reload link before any application JavaScript, CSS, or fonts arrive. Module/CSS failures and startup exceptions leave explicit recovery instead of an empty document. Initial session lookup uses a 10-second deadline and strict errors; service failures are not silently treated as logout. A failed lookup can be retried by reloading without deleting cookies or persistent cache.

The HOME background retains all normal assets, resolution, shaders, timing and movement. Only a failed or stalled initialization falls back after 15 seconds to the existing, fully decoded CSS background. The abandoned renderer is disposed and a late module cannot remount it. Navigation cancels the timer and renderer. Progress reaches 100% only after the first-frame/fallback gate finishes. Duel admission and archive preparation remain intact.

## Verification boundaries

- `tests/startup-recovery.mjs`: saved language, stalled geo headers/body, HTTP failures, strict session errors/abort, module evaluation failure, static recovery link, background deadline, normal scene retention and disposal on navigation.
- `tests/startup-recovery-browser.mjs`: PC/mobile login and reload; stalled geography; saved language; auth failure and reload recovery; stalled auth; failed module graph; missing entry JavaScript; stalled HOME texture. Only the HOME case uses an account fixture. Remote normal cases use the real deployed API.
- `tests/duel-performance-browser.mjs`: unchanged normal HOME and local BOT entry, complete opening, card play, BOT turn and full-resolution market inspection. Account API is a fixture; this does not establish authenticated multiplayer correctness.

Before/after failure injection and browser screenshots are retained in `before/` and `local/`. Local login checks use an unauthenticated API fixture; their durations are not public-site performance measurements. Browser screenshots confirm recovery layout and visibility, not a new animation-quality review.

Local checks: typecheck/build passed; production suite 182/182 passed. Normal HOME (including its unchanged entrance) was 4.720 s / 4.656 s at 1280 / 390 widths. All sampled gameplay p95 frame intervals were 16.7 ms with zero sampled long tasks and zero post-admission asset requests. These are local fixture measurements, not a universal frame-rate guarantee. The local built browser run preceded the final progress-label-only change; the deployed validation must cover the final guarded snapshot.
