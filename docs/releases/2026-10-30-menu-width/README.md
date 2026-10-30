# Menu width alignment — 2026-10-30

User requested ranking, shop and tutorial widths to match the card page, followed by production deployment. Cards and friends remain unchanged.

- Reference: remote main `472a717e28e2921f2f5519be8df4879d4c89a4fe`; subsequently rebased onto `9e490308b1dd34461928e2b7782923b983a78d7c`.
- Card width source: `client/src/styles/menuApproved.css` (3vw gutters, 12px at <=650px, no width cap).
- Reference friends source: `client/src/styles/menuWorkspace.css`. Friends agrees at 1440px and 844px but retains its existing 1500px cap on wider monitors; the requested card page is the width authority.
- Change: `client/src/styles/loungeLayout.css` removes the ranking/shop/tutorial caps and matches card gutters. Vertical spacing, shared frame assets, content and interactions remain unchanged.
- Preview origin: `/Users/hiromaru05s/.codex/worktrees/menu-width-align/LORE_TCG`, `http://127.0.0.1:5510/`.
- Verified actual page rectangles at 1440x900, 1920x1080, 390x844, 320x568 and 844x390. All three target pages have the same left edge and width as cards; no document horizontal overflow.
- Visually inspected the adopted backgrounds, azure-silver panels, card art and Zeno. Shop categories and tutorial companion tab were opened. API responses are local fixtures; no real purchase or account mutation was exercised.
- `after.json`: browser runtime errors were empty. `before.json` has a fixture-only gift inbox error, resolved by providing the expected `items` array before final verification.
- Client build passed; guarded production deployment performs full typecheck, production suite, schema check and build again on a committed snapshot.

Production verification is recorded separately after deployment.
