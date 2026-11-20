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

TypeScript, full production suite, deployment guard and served-asset verification are recorded in the release report after completion. Fixture checks are not authenticated live PvP verification.
