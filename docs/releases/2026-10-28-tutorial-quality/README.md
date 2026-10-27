# Tutorial quality release — 2026-10-28

Final deployed source: `88070176e75d6301f4e729249f021dfdafd7740a` (includes `105c6aa1` and `5187a9a6`).

## Changes

Rebuilt the tutorial into 25 selectable lessons: core summon/attack/mana/market actions first, then card abilities, then a solo victory and Home/deck/catalog orientation. The handwritten priority list is mapped in [coverage](../../qa/2026-10-28-tutorial-quality/coverage.md).

Zeno speaks in casual bubbles. Hovered and dragged cards have frame-tracked outlines; drags show an arrow and a release area. Inspection is an actual right-click exercise, with a reserved conversation lane below the readable card. The menu uses the current Home art and shared azure-silver surfaces/buttons.

The full walkthrough found and fixed Infiltrate's wrong attack gesture, Majesty's ineligible attacker highlight, missing Purging Touch target explanation, and stale turn ownership after switching prepared judgement scenarios. The only shared board change is an explicit practice-scene reset; normal duel snapshot ordering is unchanged.

## Validation

- Local rendered UI: all 25 lessons completed, including final victory and Home/deck/catalog transitions.
- Added market empty-slot refill: observed by passing the turn, followed by a real refresh.
- Inspection checked at normal size and 1024px width; cost/attack/health remain visible.
- Focused curriculum and turn-clock tests passed.
- Guarded final release: 249/249 production-suite checks, both typechecks and build passed.
- Signed-in production UI: all 25 parts completed through actual inputs. The initial sweep found the production screen still used a fixed 13-part boundary; it returned to the menu after later lessons. Fixed in `88070176`, then reloaded the deployed final bundle and replayed 13→14 plus victory→Home→deck→catalog→25/25 completion.
- Final production inspector checked at 1024×768. The card cost/attack/health remain readable. Source/destination overlap with the action bubble measured 0; tracked outline padding measured approximately 4px on all sides.
- No browser console errors observed in the final tab. Audio restored to its original 70% after the required slider exercise.
- Final Worker version: `679b9393-ee4f-4c2c-9cf3-f22a64b01b15`, 100% traffic. `deployment.json`, `deploy.log`, `served-assets.json`, screenshots and walkthrough observations provide the evidence.

This is tutorial play through the actual UI and game reducer, not a live PvP match. No test account setup or game-state injection was used on production.
