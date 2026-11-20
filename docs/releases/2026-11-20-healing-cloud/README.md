# Healing cloud 03 production adoption — 2026-11-20

User selected 03 「祝福の綿雲」 and explicitly requested production. The approved source is `3242d783d`, `client/src/dev/healThree/effect.ts` and `effect.css`, from the `heal-three-1119` worktree. Preserve its green numeral gradient, font, 9/10 inversion, white cloud banks, erosion masks, 1500ms clock and cloud width capped to 88% of the target. Only variant 03 is included in the production runtime.

Implementation starts from `10bf25e0e` (`gh/main`) in `/Users/hiromaru05s/.codex/worktrees/heal-cloud-production-1120/LORE_TCG`. Integration QA starts Vite from its `client` directory on `http://127.0.0.1:5211`; the actual board/controller fixture is `/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`. Later main updates are integrated before release.

- `client/src/ui/healingFeedback.ts` / `.css`: adopted number and cloud; projected monster-follow support, reduced motion, disconnection, resize, visibility, skip and teardown cleanup. No plus sign.
- `client/src/ui/anim.ts`: player HP recovery and monster HP recovery call the production runtime. Existing Seeker and NPC reactions remain.
- `client/src/game/controller.ts`: ordinary and Growth player healing use their existing feedback calls. Blood Rite now calls the same feedback at its actual HP contact. Monster full-recovery events are played together before rerender.
- `client/src/shared/engine.ts` / `types.ts`: S14 and Colosseum Rest report a typed `monsterHeal` event with the actual restored HP and resulting HP. Their state changes are unchanged. Healthy monsters, eggs in S14, stat swaps and maximum-HP buffs do not generate recovery numbers.

Checks: root TypeScript passed; `tests/healing-feedback.mjs` verifies real reducer recovery amounts on both fields, healthy/egg exclusions, repeated recovery, Colosseum choice and invalid targets. `tests/quick-playback.mjs` verifies each monster recovery reaches the renderer once before rerender. Browser integration uses the actual reducer/controller and adopted board, with both sides, both target kinds, 9/10/128, Blood Rite, reduced motion, fast-forward, resize and destruction. It records playback and screenshots separately from assertions. Browser amount extremes use explicit fixture card magnitudes. Authenticated online PvP is outside this verification.

Local browser verification passed with zero page errors, no horizontal overflow and complete skip/resize/destruction cleanup. The first cleanup assertion incorrectly waited for the zero-size positioning root to be visible; it now waits for the actual numeral, and the complete run passed on merged main `ddd8ccfe0`. Recorded motion confirms the same white-cloud expansion/dissolve and numeral gradient as the approved preview. Evidence: `qa/local-browser.json`; local video/screenshots in `/tmp/lore-healing-release/`.

Production deployed through the shared guarded release on 2026-11-20 02:29 KST/JST (2026-11-19 17:29 UTC). Source `4cdb1e1c5cdcbe94973d70608abdac25e610683b`; Worker version `90d7c2e3-6cd7-4e0e-8508-767b2b9d4cb8`, traffic 100%. This source includes the adopted healing commit and the subsequent window-listener compatibility fix. Another authorized release held the shared lock; its exact main snapshot included this change and completed `npm run deploy`. No duplicate deploy or guard bypass was needed.

Release verification:

- Root TypeScript, production tests **306/306**, and production build passed. The first shared run found unqualified `addEventListener` incompatible with Node DOM fixtures; `window.addEventListener` fixed it, and the 1,308-card inspection test and full suite passed.
- Captured hashes from the guard's actual build snapshot before cleanup. All **143 HTML/JS/CSS artifacts** fetched from `https://yourlore.xyz` match the build SHA-256. HTML checks follow the host's canonical redirects.
- Full browser integration against the **production URL** passed with zero page errors, no horizontal overflow, both sides, monster and player healing, Blood Rite, 9/10/128, reduced motion, skip, resize and controller destruction. Resize QA waits for the real resize event before asserting cleanup; an immediate count after the viewport command could run before that event.
- Evidence: `qa/deployment.json`, `production-suite.json`, `served-assets.json`, `live-browser.json`. Production video/screenshots remain in `/tmp/lore-healing-live-final/`; the local source of all three comparison variants remains the approved preview worktree.

The production browser check uses reducer/controller fixtures on the live served application. It does not establish an authenticated multiplayer-match result.
