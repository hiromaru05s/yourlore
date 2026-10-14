# Tutorial learning structure — 2026-10-14

User feedback: use カードの購入 instead of 借用; explain the whole game before asking a beginner to play Attune.

- Five paced rule pages precede the first card action: goal/Spirit, hand and field, mana, turn flow, purchase cycle.
- Lessons now start with summon/direct attack, then enemy-target attack, then increasing mana. Basic battle lessons precede optional concepts and the final practice duel.
- Zeno gives one current instruction and a short reason. Hand-open, summon, targeting, purchase, pass and opponent-wait states each update the guide and highlight.
- Early wrong purchases/passes cannot consume lesson resources. Premature End Turn is rejected before the base controller locks its button. The final duel stays free-play.
- Existing lesson IDs, reward keys, clear records and 250-per-lesson/3,000-total rewards are unchanged. JA/EN/KO copy updated; visible purchase terminology also aligned with the world bible.

## Validation

- Client typecheck: passed.
- tests/tutorial-academy.mjs: all 12 reducer/replay routes, guide action gates, stable reward identities, authenticated reward handler isolation/rollback/deduplication and exact total passed (in-memory database).
- CUA, real local app at port 5227: five-page introduction → open hand → drag Blade Hare → direct attack → clear; next lesson → select own monster → select enemy → clear; Attune appears third.
- CUA: premature End Turn retains Turn 1 / 4 mana / END TURN and shows a helpful redirect. Found and fixed an optimistic button lock during testing.
- CUA: double-click market purchase → graveyard → End Turn → Zeno passes → draw purchased card → clear. Purchase instruction now explicitly says to press twice.
- CUA: all five rule pages fit 390×844, no horizontal overflow; review closes back to lessons. Desktop and mobile screenshots attached.
- Actual card stats checked in browser. Removed stale hardcoded attack/damage numbers from teaching copy.
- Existing browser test files adapted to lesson IDs and the primer; those standalone Playwright scripts were not executed in this turn. Browser verification used CUA.
- No claim of usability testing with children or authenticated staging gameplay.
