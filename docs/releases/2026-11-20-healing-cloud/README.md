# Healing cloud 03 production adoption — 2026-11-20

User selected 03 「祝福の綿雲」 and explicitly requested production. The approved source is `3242d783d`, `client/src/dev/healThree/effect.ts` and `effect.css`, from the `heal-three-1119` worktree. Preserve its green numeral gradient, font, 9/10 inversion, white cloud banks, erosion masks, 1500ms clock and cloud width capped to 88% of the target. Only variant 03 is included in the production runtime.

Implementation starts from `10bf25e0e` (`gh/main`) in `/Users/hiromaru05s/.codex/worktrees/heal-cloud-production-1120/LORE_TCG`. Integration QA starts Vite from its `client` directory on `http://127.0.0.1:5211`; the actual board/controller fixture is `/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`. Later main updates are integrated before release.

- `client/src/ui/healingFeedback.ts` / `.css`: adopted number and cloud; projected monster-follow support, reduced motion, disconnection, resize, visibility, skip and teardown cleanup. No plus sign.
- `client/src/ui/anim.ts`: player HP recovery and monster HP recovery call the production runtime. Existing Seeker and NPC reactions remain.
- `client/src/game/controller.ts`: ordinary and Growth player healing use their existing feedback calls. Blood Rite now calls the same feedback at its actual HP contact. Monster full-recovery events are played together before rerender.
- `client/src/shared/engine.ts` / `types.ts`: S14 and Colosseum Rest report a typed `monsterHeal` event with the actual restored HP and resulting HP. Their state changes are unchanged. Healthy monsters, eggs in S14, stat swaps and maximum-HP buffs do not generate recovery numbers.

Checks: root TypeScript passed; `tests/healing-feedback.mjs` verifies real reducer recovery amounts on both fields, healthy/egg exclusions, repeated recovery, Colosseum choice and invalid targets. `tests/quick-playback.mjs` verifies each monster recovery reaches the renderer once before rerender. Browser integration uses the actual reducer/controller and adopted board, with both sides, both target kinds, 9/10/128, Blood Rite, reduced motion, fast-forward, resize and destruction. It records playback and screenshots separately from assertions. Browser amount extremes use explicit fixture card magnitudes. Authenticated online PvP is outside this verification.

Release status: awaiting final browser verification and guarded production deploy. The deployment must use `npm run deploy` with a clean commit equal to current `gh/main`, after the shared release lock is available. No guard bypass.
