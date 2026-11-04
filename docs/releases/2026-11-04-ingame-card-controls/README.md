# In-game card controls and END TURN — 2026-11-04

Primary clicks no longer open card inspection from the hand, active enchantments,
quests, unavailable market/offer cards, discard/removed-card browse lists, or battle
log card names. Right-click inspection remains available. Primary gameplay actions
(drag to play, attack, reorder, buy, and choose a card/target) remain intact.
Keyboard inspection of enchantments/quests and existing touch long-press bindings
remain available. Menu card inspection and related-card navigation are unchanged.

The player-turn button reads `END TURN` in Korean, Japanese, and English, retaining
the existing two-line physical button layout. The disabled opponent-turn label
continues to identify the opponent's turn in the selected language.

Source and preview:
- Initial current-main reference: `b09eaef2`; implementation: `c03f4cfa`.
- Integrated release source: `a40f87b6` (includes concurrent gift-inbox, Mana Crystals, and tutorial changes; `76f0e1f3` aligns the existing tutorial assertion with uppercase `END TURN`).
- Runtime: `client/src/ui/boardView.ts`, `cardInspection.ts`, `modal.ts`, `log.ts`,
  `readingBoardWidgets.ts`, and `client/src/i18n.ts`; existing board, card, and UI assets.
- Preview origin: `http://127.0.0.1:5207`, launched from
  `/Users/hiromaru05s/.codex/worktrees/ingame-card-controls/LORE_TCG`.

Validation:
- Client/server typecheck, duel DOM regression, and battle-log regression passed.
- Browser fixture: all three languages; hand/enchantment/quest/market/list primary
  click does not inspect; right-click does; hand drag cancellation and actual
  controller/engine field play pass. `browser-checks.json`, `ko.png`.
- Existing attack-drag browser regression passed for mouse and emulated touch:
  cancellation/retry, target legality, direct attack, and field reordering.
- Actual app boot → HOME → local single-player with fixture API account passed in
  all three languages; no page errors. `app-browser-checks.json`.
- These are browser/fixture checks, not authenticated PvP or physical-device tests.

Production verification:
- Guarded deployment of `a40f87b6b1189d7ce4661ee877b3381f775330dc` completed;
  this source includes `c03f4cfa`. Worker version
  `f2c30037-af0d-40cc-89e2-c675529226ae`, 100% traffic at 2026-11-04 18:28 KST.
- Shared release passed all 267 required regression files, typecheck, database
  schema preflight, design guard, and production build. See `validation.txt`.
- A prior build hit ENOSPC after its tests passed. The task's isolated worktree
  was reduced with Git sparse checkout, preserving code and release evidence;
  subsequent release succeeded. No user source work was deleted.
- Production `https://yourlore.xyz` application and assets passed Korean/Japanese/
  English browser smoke with a fixture local guest API: repeated left-clicks do
  not inspect the hand, right-click does, Escape closes inspection, and the active
  button reads END TURN. No page errors. Bundle URLs are in
  `production-browser-checks.json`; Korean screenshot visually inspected.
- The production smoke created no accounts or server game records. It does not
  establish authenticated PvP or physical-device behavior.
