# Single admission recovery — 2026-10-26

User report: BOT start remains at 0%; rename the mode to シングル.

Source baseline: `546846da` (`gh/main`). The production deployment inspected before the change was source `01a8129f`, version `9e508ccf-c08a-49c1-b091-6c7d040311f2`; baseline adds verification records on top of that source. Existing checkout modifications were preserved in their original worktree.

## Change

- Bound Cache Storage probe/open/scan/write waits. Single admission switches to ordinary original-asset loading if worker activation or the manifest does not complete within 10 seconds. A stalled cache or worker handshake also falls back to the network. The service worker bounds its cache reads and serves network assets when storage stops responding.
- Bound manifest, game-module, font and model-preparation waits. An independent failed preparation now exposes Retry immediately, even if another parallel operation never resolves. Cancelled/failed transfers cannot publish progress into a retry.
- Show the cache, asset, code, model, deck/font and start phases separately. Public room creation remains after resource admission.
- Rename the player-facing mode across HOME, opponent picker, match-history filters, rewards, ranking rules and tutorial guidance in Japanese/English/Korean. Internal mode identifiers, gameplay and rewards remain compatible.

## Validation

- `menu-cache.mjs`: cache-hit integrity/reuse plus stalled service-worker cache-read network fallback.
- `menu-preparation.mjs`: never-resolving worker activation and cache scan (0% routes) fall back and complete; corrupt bytes remain rejected; normal caching/retry/cancellation unchanged.
- `game-admission.mjs`: a failed code transfer exposes Retry while a simultaneous cache task never settles; retry succeeds; room admission/cancellation preserved.
- `duel-fonts.mjs`: a never-resolving font task times out and can be retried.
- `asset-readiness-retry.mjs`, `loading-cache.mjs`, `menu-selected.mjs`, typecheck and build passed.
- Browser: `local/browser-report.json`. Fresh desktop (1280px), mobile (390px) and induced page-cache stall all reached scene-ready with three hand cards and no page errors. These use a guest API fixture and real built assets, not authenticated multiplayer evidence. The user's pre-release authenticated normal challenge also reached the board during investigation; that does not prove this was their original failure cause.

Preview served from `/Users/hiromaru05s/.codex/worktrees/single-loading-fix/LORE_TCG/client/dist` at `http://127.0.0.1:5186`. HOME reads `client/src/screens/home.ts`, current Zeno/background, and adopted `defaultUI.css`/`defaultButtons.css`; live board reads `screens/game.ts` and `ui/boardView.ts`. Screenshots were inspected against those current components.

Production release and post-deploy checks are recorded separately after deployment.

Integration: remote main advanced to `876ac24b` during validation. Merged it in `00cb03a2`, preserving its shared-engine/card changes; the integrated build passed. Browser validation explicitly pins the Japanese locale rather than relying on the asynchronous IP default.
