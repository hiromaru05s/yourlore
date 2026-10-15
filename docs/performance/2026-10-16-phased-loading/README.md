# Initial admission: separate visible HOME from duel preparation

The previous admission gate waited for the entire persistent public asset inventory,
all webfont files, generated furniture shop previews and the full dynamic duel graph
before HOME became interactive. In the previous live staging measurement this was
248 MB and 126 seconds. This was an excessive first-entry cost, even though it
removed later in-game transfers.

This change keeps original imagery, fonts, resolution, rendering and animation timing:

- HOME waits for visible images/fonts and its first complete atmosphere frame. The
  approved 3.8-second entrance remains. Idle speculation is limited to the selected
  deck images; opening HOME does not start the full duel archive or shop renderer.
- Opponent selection starts shared, retryable duel preparation. Immediate Start joins
  that same work. The game remains behind its preparation screen until public bytes,
  module graph, current-language glyphs and scene preparation are ready.
- Authenticated BOT rooms are requested after admission. Matchmaking sockets are
  opened after admission, and queue time excludes asset preparation. Cancelled screens
  never enqueue or mount a late game. Existing-room reconnects still have to prepare
  any assets absent from the local cache.
- Menu-only backgrounds, shop scene plates and the complete multilingual font archive
  are excluded from the duel transfer. Current-language card/interface glyphs are
  loaded by FontFaceSet. Common dialog icons, all full-resolution card art, possible
  generated cards, cosmetic assets, VFX, models and sounds stay prepared for gameplay.
- Packs separate menu, duel and font scopes. The service-worker binding still covers
  the complete compatible manifest so pruning cannot invalidate other screens/tabs.
  Original SHA-256 checks, sparse cache repair, retries and old-client isolation remain.
- Furniture catalogue images are generated when that catalogue is opened. Navigation
  keeps its visible-image readiness covers; it no longer promises that every possible
  menu image was downloaded before the first HOME.

## Measurements

`local-before.json` is a new baseline built from f8399992. `local-after.json` measures
this change before the final minor retry/fallback additions. Chrome, production build,
40 ms simulated network latency, real static files, API fixtures and local guest BOT.
Bandwidth is unlimited locally. Timings are single runs on a shared development host,
not a statistical speed guarantee. API request interception can affect HTTP caching.

| 1280 px | Before | After |
| --- | ---: | ---: |
| Cold HOME | 8.885 s | 4.840 s |
| Bytes through HOME screenshot | 253.065 MB | 15.094 MB |
| Reload HOME | 4.788 s | 4.594 s |
| Duel selection to preparation cover removal | 0.956 s | approximately 2.4 s (see JSON) |
| Public game transfers after preparation cover removal | 0 | 0 |

HOME bytes fall by approximately 94%. Duel preparation is reported separately rather
than hidden in a new timing boundary: first duel still downloads approximately 194 MB
on this fixture, with unchanged full artwork. This is less total data than the previous
all-menu/all-font admission, but cold match preparation still depends on bandwidth.
The approved opening, first-player selection and any initial BOT turn are included in
`duelMs`, so use `preparationMs` for the loading interval.

Both 1280 and 390 px passed card play / BOT turns with zero late game asset transfers,
service-worker network fallbacks, broken visible images, page errors or HTTP errors.
All measured frame p95 values were <=16.8 ms, but BOT samples still contained isolated
88/109 ms long tasks; this change does not claim universal zero stutter.
`menus.json` records HOME, opponents, gallery/pagination/zoom, deck, shop categories,
ranking, friends, profile, guide and HOME return. New menu assets may transfer under
that screen's readiness gate. The HOME mascot canvas is retained across navigation.

## Regression coverage

`game-admission.mjs`: bounded HOME speculation, joined immediate Start, no decoding
race with packs, no room creation before readiness, responsive model variants,
cancellation, preparation failure/retry, and actual lobby socket gating.
`duel-fonts.mjs`: current-language selection, failure/retry, cached success and language
change. `menu-packs.mjs`: phase selection, complete bindings, separate pack scopes,
restricted-storage image/binary fallback, corruption rejection and exact byte parity.
`loading-readiness.mjs`: HOME does not fetch the global archive; it waits for the
visible atmosphere frame, and navigation cancels that wait.

Final guarded release and live staging evidence are recorded below after deployment.
