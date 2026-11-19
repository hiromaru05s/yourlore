# Adopted damage numerals — 2026-11-19

User authorized production application of the final 01 study in the same session.

- Approved study source: `a39c95891`, `client/src/dev/damageFour/effect.ts` and `effect.css` in the damage-four-1119 worktree.
- Production base: `e3f4a6ca6aa9bc03d43020b9522e505237f6f3eb`, fetched main. Includes the latest adopted card-print sampling fix.
- Owning implementation: `client/src/ui/damageFeedback.ts` / `damageFeedback.css`; monster hits and portrait HP damage continue to share `damageNumber` through `anim.ts`.
- Release worktree: `/Users/hiromaru05s/.codex/worktrees/damage-release-1119/LORE_TCG`; local validation origin `http://127.0.0.1:5739`.

## Behavior

Damage 0–9 uses the approved ivory numeral and minimal background cut. Damage 10 and above uses a near-white pink `#ffe3e9` face, retaining the dark red edge, and a restrained red cut (peak opacity 0.62; 850ms). Small-hit background remains opacity 0.22 / 520ms. Position is 54% down the moving target bounds. Number typography, scale, overshoot, hold and clipped exit match the approved 1250ms study. No trial variants or trial page are shipped.

The actual dealt amount controls the presentation; combat calculations and HP updates are unchanged. Existing monster/portrait recoil is retained. Fast-forward, screen teardown, resize, hidden tab and disconnected anchors release active numbers. Reduced motion uses a static number with a fade and hides the slash.

## Validation

Client TypeScript passed. `tests/damage-feedback-browser.mjs` runs the actual reducer/controller on the existing cosmetic-studio battle fixture: 9/10 boundary, both sides, monster counterattack and direct player damage, 1280px and 390px, exact resulting HP/damage, reduced motion, fast-forward, resize and destroy cleanup. All passed with no page errors. Screenshots inspected against the selected study; visual adoption was the user's explicit instruction, not an automated score.

Browser report is stored alongside this record; screenshots remain under `/tmp/lore-damage-release/`. This fixture is not an authenticated human multiplayer session. The production deployment guard runs the full required Node suite, client/server typechecks and production build on the committed snapshot before deployment. Production version and published checks are recorded after deployment.
