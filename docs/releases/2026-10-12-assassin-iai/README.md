# Assassin attack 01 adoption

User selected revision 2 / 01 (刹那の居合) and authorized staging on 2026-10-12.

- Applies to ASSASSIN1, ASSASSIN2, ASSASSIN3, ASSASSIN4 and ASSASSIN_SQUAD, using the existing assassin family selector. Other ambush monsters keep their normal attack. No game rules changed.
- Native card compresses at its own slot, disappears by 210 ms, cuts the actual target at 310 ms, returns during 650–840 ms, finishes at 1000 ms. Damage/contact callback fires once. Existing controller owns Seeker damage, guts and sound.
- Only selected 01 is in runtime. Comparison variants remain separate. The native card is restored on skip, abort, resize, scene removal and failure. Reduced motion keeps the source visible. Texture preparation is bounded with a live card DOM fallback.

## Evidence

- `tests/assassin-attack.mjs`: 367 assertions, including all 357 card definitions, exact family selection, reduced motion, slow frames, cancellation, single contact and cleanup.
- `selected-parity.json`: 72 comparisons of selected renderer canvas commands and transformed vertices against a74380eb variant 01, both sides and reduced motion. This establishes renderer equivalence, not a new subjective approval.
- `browser-qa.json`: actual GameView and attackStrike runtime, both owners, all five assassins and ordinary comparison cards, repeat/dual-ready state, cancellation, resize, detach, skip, concurrent sources and monster targets.
- Browser harness: `/src/dev/assassin-attack-qa/index.html?qa`. DEV entry only, not included in normal build.

Staging release verification is recorded separately after deployment. Browser fixture evidence is distinct from authenticated live-match verification.
