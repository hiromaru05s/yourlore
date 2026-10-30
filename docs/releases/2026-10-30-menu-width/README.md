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

## Production release

- Released source: `e6d2e5b3d9a4cbe3e389b9bd38b5a28a2048b822`, which includes width change `fae6c8ecba10e8f0556b12816e8fe9b98ab2817e`.
- A concurrent guarded release already held the production lock and incorporated this main update. Its committed snapshot completed schema validation, client/server typechecks, all **254/254** production tests and build. No lock was bypassed and no redundant deployment was performed.
- Worker version: `4f5419bf-4fc2-4c3a-94d6-11ac2b25dc28` at 100%; deployment `2d0cbb39-821d-4e8d-9334-80b25db36aff`.
- URL: https://yourlore.xyz/
- The integrated local production build also passed the five-viewport browser checks (`built.json`), including a populated ranking/current-standing fixture. The browser fixture supplies tutorial onboarding status and an empty gift inbox; initial missing fixture fields were corrected before this successful run.
- Production browser verification passed all five viewport sizes: target pages match cards exactly, no document horizontal overflow, no JavaScript runtime errors (`production.json`). Shop categories and tutorial book were opened using fixture API data against the actual published HTML/JS/CSS/art; this does not assert real account, purchase or PvP behavior. Representative production screenshots are included.
