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
- Full production suite initially passed 131/132. The existing trap-removal tutorial DOM fixture assumed lesson 0 was Attune and lacked native-dialog stubs. Updated it to select mana by ID and added primer/action-blocking, premature-pass button recovery and open-dialog teardown checks. The focused DOM suite now passes.
- No claim of usability testing with children or authenticated staging gameplay.

## Staging verified

- The shared guarded release deployed source `65726a8ff34d5520839d3c8df0b1772f230a8a1e`, containing tutorial change `09ae4fc1` and regression-fixture fix `b3b9e3ae`.
- Worker version `0d8d711e-2f07-4642-a5a5-388306b3470d`, 100% traffic.
- Final integrated production suite: 138/138 passed. Expected hashes came from the same committed-snapshot release evidence; this task independently fetched and compared all 94 listed assets. `/` and `/api/auth/me` returned HTTP 200.
- Earlier attempts were interrupted by concurrent main updates or existing test-fixture/host-load issues. The initial captured cf0b5e6f build was superseded, so its asset list was replaced with the actually deployed release before comparison.
- CUA also completed the Attune lesson at 390×844 with the guide open: open hand, drag card, maximum mana 4→5, lesson clear.
- Staging verification concerns source/Worker/assets/HTTP; authenticated staging tutorial play was not performed.
