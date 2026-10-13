# Combat tempo — 2026-10-13

## Behavior

- The contact callback releases damage, exhaustion, and counter events while the attack recovery continues. Shared attacks retain the existing trajectory through 820 ms; counter anticipation is 100 ms, contact 260 ms, recovery 800 ms. Standalone approved counter previews retain their original timing.
- Actual visible monster actors receive recoil and immediate HP text updates. Frame-sized red damage numerals last 500 ms from their first animation frame and follow a moving counter card. Both seeker and static NPC portrait frames react.
- A lethal ordinary hit freezes its visible face into a separately owned graveyard exit. Committing the new board and accepting the next action do not remove it. Scene disposal, resize, visibility loss, and its deadline still clean it up.
- Summon-associated Dew and shield grants start with the summon reveal. Different resources overlap; repeated writes to the same resource retain order. Extinction waits for any earlier grant of that resource.
- Final 25 seconds increase turn-button shake, flash speed and warm emission; opponent turns clear the warning. Reduced motion keeps readable numerals and a static warning.

## Preview

`/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`

The preview uses the actual reducer, GameView and BaseController. Controls cover counter, lethal hit/next action, mutual destruction, both portrait sides, multi-attack, Priest summon with Dew and shield, and a remaining-time slider.

## Validation boundary

The browser regression is `tests/combat-tempo-browser.mjs` (set `PLAYWRIGHT_MODULE` if Playwright is outside this checkout). It exercises both sides, desktop/portrait viewports, follow-up input during graveyard transfer, reduced motion and cancellation. Optional `LORE_CAPTURE=1` / `LORE_RECORD=1` save media. Pure contact-gate and urgency checks are included in the production suite. Existing counter geometry and rules remain covered by `tests/counter-animation.mjs`.

Actual-board fixtures do not establish authenticated multiplayer or user visual approval. Local real-board browser regression: 15 checks passed, including 1280×900 and 390×844, both portrait sides, reduced motion, skip, resize and disposal. No browser playback errors or remaining effect nodes. This is functional evidence; the staging build and visual playback are checked separately.
