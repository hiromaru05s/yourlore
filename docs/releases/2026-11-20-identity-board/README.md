# Identity board and default card frame release

User authorized production release on 2026-11-20, keeping all other sleeves disabled.

Source: `0e35990f2` includes the approved seven-slot rules/tutorial, nameplate/identity furniture, compact grave, buff icons, opponent monster spacing and simple card frames. Integrated current main `b70066ac3` via `4a9e27146`. The only merge conflict was expanded-hand CSS: preserve main's .667/.759 expanded sizing and this branch's responsive compact scaling together.

## Production adoption

- GameView enables identityFurniture, alignedRail and buffIcons before scene creation. Production CSS owns the reviewed styles; preview files import those same styles.
- Production loads `identity-folded-1120/identity-addon.glb` and `identity-aligned-1120/shelf.glb`. The generated medal sample remains hidden. The lower medal frame is reserved; no sample is represented as earned.
- Actual public rank snapshots, when present, use the established rankEmblem art on the folded upper frame. Missing rank snapshots leave it empty.
- All non-default sleeves stay in inventory but cannot be equipped/purchased or newly drawn. Shared deck normalization and all actual game sleeve URLs fall back to default.
- Client/server seven-slot limit and JA/EN/KO rule/tutorial copy are included.

## Checks and deployment

Ordinary GameView fixture (`/nameplate-board.html`, no preview feature attributes) verified at 1920×1080 and 1280×720. The folded GLB loads, buff icons are square with rounded corners, and no sample insignia are created. Actual public rank data was injected into the fixture to verify rendering. No browser errors. Local preview server cwd: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG/client`, port 5473.

Seven-slot browser checks passed at 1440×900, 1920×1080, 1280×720, 1366×768, 390×844 and 844×390, including quest inspection and long player names (`layout-checks.json`).

Released source: `60ddcb996143f76f4a68191839b75f8273f762e3`. The standard production deployment guard built a clean committed snapshot and deployed it on 2026-11-20 at 03:41 UTC. Worker version `ecff7fd3-de7c-4bf3-b326-8c589593221f` serves 100% of traffic (`deployment.json`).

- Client/server TypeScript and production database schema checks passed.
- Production suite: 308/308 passed (`production-suite.json`). Initial guard stopped before deployment on four regressions: the cache test used the historical silhouette, two integration tests expected now-disabled sleeves, and the unavailable-sleeve message needed JA/EN/KO localization. Updated current-shape cache comparison, disabled-equipment/ownership assertions and translations all passed the full rerun.
- Eight served frame/model assets match source SHA-256 (`served-assets.json`). Live entry and relevant game, board, card surface and CSS chunks match the exact guarded build (`served-build.json`).
- Live public login page returned 200 and rendered without page errors (`live-smoke.json`).

Fixture checks and served asset verification are not authenticated live PvP verification. No user inventory was deleted and no data migration was required.
