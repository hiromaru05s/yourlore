# Menu and player UI integration — 2026-09-30

Base: d4add2cc (previous integration of all published staging runtime sources).

## Requests included

- Remove HOME entrance skip button and Escape skip.
- Correct ranked duel label alignment.
- Replace shard decoration with generated transparent PNG icon.
- Match settings, invitation event, inquiry, profile and tutorial to the current HOME appearance.
- Keep bottom navigation shading fixed throughout the HOME reveal.
- Render persistent field card effects below player portraits and HP; preserve transient attack/summon effects.
- Hide Shield and Dew icons at zero; display each only while positive, preserving separate positions. Applies to both players and hides again after consumption.

## Verification before deployment

- Full client/server typecheck: PASS.
- Production build and design guard: PASS.
- HOME entrance regression: PASS, including API fixture cache fix from the integrated main branch.
- 33 menu screenshots/interactions: PASS, including responsive layouts, Japanese/English, inquiry error/retry and navigation shade timing.
- Monster/resource regression: PASS (18 entries). Covers zero, each resource alone, both positive, back to zero on both portraits; drag, summon, attack, multi-attack, stat changes, destruction, cancellation and disposal.
- Wrangler 4 staging dry run: PASS.

Evidence uses local API fixtures and real GameView/controller paths. Remote verification is recorded separately after deployment. Work-in-progress VFX prototypes and unrelated workspace edits are preserved outside this release. No production deployment or database migration.

## Staging result

Deployed runtime `97dc64e8` to https://test.yourlore.xyz. Worker version `1091a0b4-18b6-4ff9-9b33-fd1c2e571325` serves 100% of traffic.

All 16 JS/CSS/HTML/icon hashes match the production build. Staging HOME entrance regression and 32 menu states/interactions passed. The deployed BOT board hides both zero counters while retaining HP, and surrender completes the outcome animation successfully without resource icons. Local outcome surface capture also handles neither/one/both resources present. API/account responses in these browser checks are fixtures; this release does not claim a new authenticated online match test.

The staging menu navigation check initially timed out waiting for the browser load event; it passed after waiting for DOM content and the actual loader readiness instead. This is a test wait adjustment only.
