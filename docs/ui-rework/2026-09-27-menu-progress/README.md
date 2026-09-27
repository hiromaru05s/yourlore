# Menu, collection and loading polish — 2026-09-27

- All five deck presets support names up to 24 Unicode characters. Select a slot, use the quill, confirm, then Save. Blank resets to the localized default. Names survive the shared client/server sanitizer, existing `/api/deck` persistence and reload; home shows the selected name. Rendered names are escaped.
- Deck candidates fit two complete rows with the next visible; catalog fits three complete rows with a fourth visible. Verified at 1440×900, 1280×720 and 390×844. Card pages contain at most 96 cards, swapped after decode. Very short 844×390 and 320×568 viewports retain readable minimum card size, one complete row and a glimpse of the next instead of an unusably small three-row view.
- Ranked home title is about 9% smaller. Redundant topbar settings gear removed; profile beside logo and existing utility menu remain.
- Profile defaults to ranked, with separate Normal and BOT filters. Selected totals, win rate and history always use the same mode. Public profiles respect the existing privacy gate; mini profiles explicitly show ranked results. Each mode retains its own last 40 matches, so recent BOT games cannot displace ranked history. Draws, unfinished games and tutorials do not inflate wins/losses.
- Boot no longer competes with 36 simultaneous audio requests. Menu sounds warm after the scene is visible, with two background requests at a time; the full bank warms during duel preparation. Login/lobby and shop backgrounds use the existing compressed WebP. The home sigil and logo use alpha-preserving WebP (2,415,407 bytes → 214,866 bytes combined); obsolete HTML preloads now point to the actual logo/background. Small menu avatars have dedicated 640×320 WebP sheets; high-resolution duel artwork is unchanged. Critical images load with high priority and non-rendering pseudo-elements are excluded from the readiness inventory.
- Both library and duel loaders display actual preparation progress and current phase/count. The percentage measures preparation tasks, not network bytes or an estimated countdown. Pending/failed artwork keeps the cover in place; retries retain progress. Duel scene readiness and two compositing frames are required before reveal.
- Eight-frame right-facing pixel runner and seven cyan-lit active navigation emblems generated with the built-in `image_gen` tool. Current-page controls retain `aria-current`, keyboard focus and accessible text. Reduced-motion disables the runner animation.

## Assets and prompts

- `originals/`: all eight full-resolution generated PNG originals, retaining native alpha.
- `imagegen-prompts.json`: exact final prompts, reference roles and original tool output locations.
- `assets.json`: runtime paths, dimensions, hashes and sizes.
- Runtime icons: `client/public/art/lounge/icons/active-v1/*.webp` (256×256).
- Runtime runner: `client/public/ui/loading/v1/runner.webp` (512×256, four columns × two rows).
- Generated asset resizing/encoding uses Sharp; no background substitution or manual alpha removal.

## Verification

- `npm run typecheck`, `npm run build`, `git diff --check`.
- `node tests/menu-records.mjs`: deck name round-trip and normalization; actual SQLite execution of profile SQL with mode separation, 40-per-mode history, non-winning draw handling, unfinished/unrelated/tutorial exclusions, privacy gate.
- `node tests/menu-progress-browser.mjs`: five-name save/reload, safe text rendering, selected name on home, row counts/scroll boundaries at five sizes, ranked default + three filters, all seven active navigation assets.
- `node tests/menu-loading-priority.mjs`: anonymous login remains usable with all sound requests held; zero audio before reveal, at most two background requests, WebP login background.
- `node tests/presentation-loading-browser.mjs`: portrait delayed past the former six-second cutoff, percentage below 100 while pending, animated runner frames, explicit image retry and recovery.
- `checks/`: logs, JSON reports and browser screenshots. Browser auth/API fixtures are explicit; these do not establish a real authenticated online match.
- Deployed checks: `LORE_VERIFY_SCOPE=menu` checks all built JS/CSS, HTML, new icons/runner, compressed backgrounds/logo/sigil (28 hashes), real anonymous login, and the deployed BOT opening through restored player input. BOT authentication and API responses are fixtures; no real online match is claimed.
- Build retains the pre-existing large JS chunk warning; no new dependencies or database migrations.

Deployment is restricted to `lore-server-staging` / `test.yourlore.xyz` / `lore-db-staging`. Production promotion is reserved for the user's manual review and approval.

## Final staging result and remaining limit

Runtime commit `9496f80`, worker version `14ef7923-ef90-4dbb-9a06-354a730872de`. All requested menu checks passed on this build. All 28 deployed asset hashes match; real anonymous login and BOT opening/input restoration passed (BOT API/authentication is a fixture).

Cold-start timing remains variable: one network diagnostic completed the loading gate within roughly 12 seconds, but the final integrated BOT run took 109,704 ms to reach the opening, and earlier attempts exceeded 120 seconds. Network diagnostics show HTTP 200 responses with slowly arriving bodies, not JavaScript exceptions. This does not establish that the network alone is responsible, nor that loading performance is solved. Progress and the cover remain visible until resources are ready. The earlier timeout is retained under `diagnostics/`; it is not hidden by the passing result. Production has not been deployed.
