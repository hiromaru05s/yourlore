# Fate Wheel correction — 2026-09-27

Reproduced on base 637d592: STARTER_CHEST emits dice but never offers Fate Wheel (the old snapshot gate only accepted spells in RANDOM_CARDS). Some list entries now have no dice and incorrectly offered a no-op reroll. Summon dice and dice emitted while resolving a choice were also omitted.

The reducer now detects actual dice events during own card/action resolution, stores the action immediately before those dice, and resumes any follow-up choice when keeping the result. Rerolls replay the complete action from that snapshot, including post-effect accounting; costs, health, summons and counters are not applied twice. The allowance is consumed only on reroll and still resets on the next own turn. Lethal results wait for this decision before match settlement. Private snapshots remain redacted from both clients, and legacy persisted idx snapshots are accepted.

This corrects own card plays, attacks and target/choice resolution. Automatic turn-transition effects and opponent-owned reactions retain their existing scope; no new turn rewind mechanic was introduced.

## Verification

- `node tests/fate-wheel.mjs`: starters, existing spells, summon dice, selection continuation, no-dice suppression, unchanged input, keep/replay accounting, casino counter, once-per-turn/reset, lethal deferral, invalid picks, redaction and legacy persisted rooms.
- `node tests/fate-wheel-browser.mjs`: real controller and dialog; chest → keep → another chest → reroll → third chest without another offer.
- `node tests/health-cosmetics-v53.mjs`: pass.
- `npm run typecheck`, `npm run build`, `git diff --check`: pass (existing large-chunk build advisory).
- 1,032 card/seed cases without an equipped Wheel match the base reducer's complete state and events exactly.
- Existing `tests/duel-ui.mjs` fails at line 102 because the JSDOM harness cannot find #hpbar-me. The same failure was reproduced on unchanged main 637d592. The real-browser regression above passes.

Browser captures use a deterministic local fixture and skip effect playback; no real-account online match is claimed. Deployment evidence is recorded separately.
