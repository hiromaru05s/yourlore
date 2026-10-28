# Production tutorial rollback verification — 2026-10-28

- Released source: `25bff426e6673c07347c9af2a4afcf038d30512a`
- Production: https://yourlore.xyz/
- Worker version: `56baf101-3fe1-4635-9400-068844fda85f`
- Guarded `npm run deploy`: 250/250 production-suite tests passed, client/server typechecks and production build passed.
- Current gh/main was incorporated before deploying. An existing production release lock was respected until its owner completed.

## Production browser evidence

Reloaded the deployed site in Chrome with the existing signed-in account and played the tutorial using visible controls. No hidden game-state injection.

- Summoned Stone Pup, pressed Back, compared the complete visible board with its pre-summon snapshot: identical hand UIDs, empty own field, mana 4/4, both players, decks, graveyards, Rift and markets. Re-summon succeeded.
- Direct attack followed by Back restored opponent health 44 to 45. Re-attack succeeded.
- Fixed-market purchase followed by Back restored stock to 3 and the prior mana and graveyard. Purchased again successfully.
- Spell use followed by Back restored Pup attack from 4 to 1, the spell in hand and mana 5/5. Cast again successfully.
- Continued through turn draws, market interactions, combat and Cull to all 49 steps and the completed-tutorial handoff to the optional Seeker Companion.
- Browser console error list was empty after the walkthrough.

`walkthrough.jsonl` records visible tour progression. JSON snapshots and screenshots accompany it. `served-assets.json` records hashes of the fetched production loader, application and game chunks. `summon-restored.png` shows the restored hand and summon guide; `complete.png` shows completion.

## Coverage boundary

The checkpoint regression deep-compares all mutable game state and replays all 11 instructed action checkpoints, including RNG, UIDs, effects and both turn draws. Local UI additionally verified turn rollback, battle-log rollback, Back during a spell confirmation and Back during attack animation; see ../../qa/2026-10-28-tutorial-rollback/README.md. Production checks above are actual tutorial UI checks, not live PvP or first-time player timing tests.
