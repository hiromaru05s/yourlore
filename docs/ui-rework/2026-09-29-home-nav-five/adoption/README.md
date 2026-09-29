# Adopted HOME navigation 01

User selected Round 03 / 01 and authorized commit, push, merge and staging on 2026-09-29.

- Feature: `676932b`; main merge: `7029b6c`.
- Staging: https://test.yourlore.xyz/
- Worker version: `9b9f8c21-2353-434e-964b-6e1be22b17fe`.
- All 15 released HTML/JS/CSS files matched by SHA-256 (`deployment.json`).
- Previously deployed deck/catalog work was not yet in main. Six exact files from its verified release were retained as a deployment overlay; their immutable source hashes are in `preserved-staging-source.json`. Those unrelated files are not claimed as this task's commits. A future release must preserve/integrate that overlay until its owner merges it.
- Client/server typecheck, design guard, production build and focused navigation lifecycle test passed. Existing bundle-size advisory remains.
- Local real router guest UI: all seven menu destinations retain exactly one current item, seven monochrome glyphs and one cursor; 390px English labels fit. Guest local API rank loading is unavailable; online rank/match behavior was not tested.
- Animation cleanup, reduced motion, first ResizeObserver delivery and keyboard focus/guard behavior verified by `tests/lounge-horizon.mjs`.
- Production was not deployed; no database migration or game-rule change.

Shared reasoning: [menu-design-insights.md](../../../menu-design-insights.md). `AGENTS.md` links agents to it before menu work. Further screen concepts are separate local proposals, not approved production changes.
