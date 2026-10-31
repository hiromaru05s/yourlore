# Effect playback and popup language audit — 2026-10-31

Source reference: current adopted implementation `2a43f1f1`; fixes `f5ff4e6d`; integrated `1979150c` (daily quest claims) in `522972d3`. Preview: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`, `http://127.0.0.1:5251`. The real controller, board, cards, models, popup renderers and main stylesheet imports are used. No art, geometry or animation timing was redesigned.

## Findings and changes

- The previous static scan replaced every interpolated expression with a number. It missed conditional Korean suffixes, callback loggers and variables containing Korean. The new scan expands conditional template arms and includes all log receivers and `logFn`.
- Authored English now covers damage causes (Brand, Bleeding, Decay, direct/self attacks, summons, Ghost and tribe synergy), dice verdicts, optional-effect completion, free/paid/counter refreshes, stacked skips, Attune–True, conditional traps, Casino, World Tree and tribal summons. Casino card names now use localized card anchors in Japanese as well as English. Damage sources require an English argument unless they are localized card anchors.
- Turn labels in both the board renderer and the physical-button animation use the selected locale. Turn-banner subtitle/accessibility text, result headings, market-preview heading, dice accessibility label, and gift/gacha/notebook popup headings are localized.
- Dice, Wheel of Fate and effect-result popups update all their text together when the language changes during playback. Their listeners are released on close. Result lines use literal text nodes so player names are not parsed as markup.
- API errors previously passed unknown Japanese/Korean/English server text through unchanged. All 72 current server errors now have JA/KO/EN copy, including the new daily-quest claim error integrated from main. Network failures and unknown errors use localized recovery messages.

## Verification

- `tests/vfx-popup-language.mjs`: **15,428 actual engine log events**, 3,213 unique localized variants, zero foreign-script leakage. Every current catalog card is played with three seeds, followed by choices and turns; additional seeds cover both owners, status damage, Casino/Ghost/Echo, mana reduction, refresh payments, stacked skips and retained trap branches for saved games.
- `tests/duel-language-source.mjs`: **2,271 expanded message variants**, 54 choice reasons, explicit damage-source localization assertion. This supplements actual execution, not a claim of every possible state combination.
- `tests/server-popup-language.mjs`: **216 error translations**, with real API error and network rejection paths in all three languages.
- `check.mjs`: **28 browser checks** covering actual `BaseController.applyResult` effect playback for both owners, JA/KO/EN, turn-button animation, turn banner, victory/defeat/draw, Wheel of Fate, normal-motion dice with mid-animation language changes, mobile wheel and live result-language changes. Literal player-name text also verified. No browser page errors.
- Typecheck, Rich Habit/choice rules, GameRoom broadcast/persistence, tutorial UI, turn-banner lifecycle, result navigation, 76 elemental parity cases and 56 Ember Debt parity cases passed.
- Reachable-module review distinguishes functional captions from proper-name artwork and preview-only render branches. Japanese preview captions in the Curse/Soul Harvest fallback backgrounds, default Chosen Victory renderer labels and Crown renderer's unused result branch are not production captions; the runtime supplies localized labels or disables those preview branches. LORE/BIBLION marks and decorative engraved lettering remain artwork.

These are isolated deterministic browser/engine fixtures, not authenticated live PvP. The production report separately records verification of the actual served bundles. Existing historical log records already stored by older versions are not rewritten by this release.
