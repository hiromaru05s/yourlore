# v53 — lounge readiness, health and cosmetics

Requested scope implemented:

- The authenticated lounge prepares its complete menu artwork inventory once (751 images: card thumbnails, frames, icons, avatars, backgrounds and shop goods). Subsequent page switches never mount a full-screen loader. Full-resolution zoom and duel-only assets remain separate; avoiding those at menu boot keeps the first load bounded. Asset URL canonicalization prevents duplicate relative/absolute requests; preload concurrency is eight.
- Existing generated passive emblems now appear on all card faces, in the enlarged description's keyword row, inline keyword references and the explanatory panel. Accessible names/tooltips remain. Advanced collection search supports multiple passive filters (all selected passives), combined with type, cost and name.
- Player `maxHp` removed. Recovery and former maximum-health growth both add uncapped current health, with accurate heal events and quest progression. Elf/high-elf and other thresholds inspect current health; bots no longer refuse uncapped healing as “already full.” Health-gain triggers use heal events, including effects whose earlier damage masks the net gain. Monster health threshold effects inspect current health; Trick Room swaps current health with attack.
- Provisional replacement for previously full player recovery: restore **up to 40**, never reduce an already higher total. Hermit's Rest then adds 15. World Tree restores up to **32**. These are explicit provisional constants, not a reintroduced cap. Existing monster full-heal effects remove accumulated damage. `health-audit.json` reviews 41 affected cards from all 341 effective card definitions, with before/after Japanese rules; the complete effective catalog has no maximum-health wording. Balance version is v53.
- Turn-end carry limit is seven. Excess cards are dragged directly from the actual hand to the highlighted graveyard, followed by a shrinking flight animation and an authoritative single-card pick. A keyboard Delete/Enter alternative uses the same animation. Invalid picks retain the pending state, timeouts use the existing deterministic fallback, and stale pre-v53 discard counts use the current seven-card limit.
- Four sleeves and four paired deck-holder/shelf material themes (Star Atlas, Verdant, Crimson Seal, Ivory Moon), each priced at zero shards. Claims are atomic/idempotent and validated against the server catalog. Ownership is required to equip; credits do not change. Equipment persists in the profile and is propagated into both friendly/ranked room metadata. Furniture variants skin the existing approved 3D geometry; they are not new silhouettes. The shop preview is illustrative; the board screenshots show actual model application.

## Generated assets

Built-in `image_gen` mode, eight independent outputs. `imagegen-manifest.json` contains exact prompts and original tool paths; all PNG originals are retained in `originals/`. Runtime WebP files live under `client/public/cosmetics/v2/`, with dimensions 384×576 (sleeves) and 512×512 (materials); `assets.json` records byte counts and SHA-256. Only resizing/encoding uses Sharp. `asset-contact-sheet.png` is an inspection sheet.

## Verification

- Client/server typecheck, production build, diff whitespace checks.
- `tests/health-cosmetics-v53.mjs`: all live card wording, uncapped gains/events, current-health conditions, fixed recovery targets, damaged-monster stat swap, 7-card end turn, invalid and timeout picks, complete preload files, real SQLite execution of free claims and equipment authorization.
- Existing v52 balance mechanics (14 suites), quest/quick-card lifecycle and authoritative action handler, deck-name/profile-mode regression tests pass. Tests were updated only for the explicitly changed health/carry rules and current room-readiness fixture.
- `tests/health-cosmetics-browser.mjs`: menu navigation mounts zero loaders after the initial gate; passive search and icon-only descriptions; eight claims and two equipment choices; actual BaseController pending-discard flow via pointer + flight + keyboard, returning to the next turn with seven cards. Real static assets; account/API responses are explicit fixtures.
- Twelve deterministic-seed BOT smoke matches across starter pairings all terminated (56–278 actions); this verifies progress/finite state, not balance or win-rate tuning.
- `checks/` includes logs, reports and screenshots. `diagnostics/` retains development test issues: the first test clicked a card underneath its open filter panel; the furniture harness initially imported a second Vite HMR module instance. Corrected tests use the real pointer target and same module URL as the controller.

## Deployment

Staging only: `lore-server-staging`, `test.yourlore.xyz`, `lore-db-staging`. Migration `0015_furniture_cosmetics.sql` adds nullable `users.furniture`; ownership reuses the existing JSON cosmetics list in `users.sleeves`. Apply this migration before the new worker. No production deployment is authorized.

Wrangler flags were checked against https://developers.cloudflare.com/d1/wrangler-commands/ and the installed CLI. Deployment/version and remote verification are recorded separately. Browser fixture tests do not establish a real authenticated online match.

Staging deployment completed: runtime commit `353dc72`, Worker version `6f995b48-658b-43e7-8f48-b3aea5c0104c`. The remote staging schema includes `furniture`; every built JS/CSS/index and all eight new image assets match local SHA-256. Deployed browser checks passed for zero-loader navigation, passive search/descriptions, and eight free claims/equipment using fixture API responses. See `deployment.json` and `staging-checks/`. Production was not changed.
