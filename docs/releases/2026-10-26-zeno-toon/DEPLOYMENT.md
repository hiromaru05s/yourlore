# Production verification — 2026-10-26

- Live: https://yourlore.xyz
- Released source: `641391b12f072818c1f5f23a198577dabb3b8184`.
- Worker version: `f690701f-f153-4c60-9eb7-2b9c2c1064f6`, 100% traffic.
- Release used `scripts/deploy-guard.mjs production`: current gh/main, isolated committed snapshot, npm ci, client/server typechecks, 211/211 production tests, design guard and Vite 7.3.6 build, unchanged-deployment and source-ancestry guards.
- Captured HTML/JS/CSS/JSON from the actual guarded snapshot before cleanup; all 147/147 SHA-256 hashes match the production responses.
- Production HOME browser suite passes, including complete ambient gesture, greeting/rotation/return, reduced motion, hidden-document suspension, tutorial/HOME renderer reuse, four viewport sizes and fallback. Browser/shader errors: zero.
- Inspected production HOME rendering against the approved toon preview and local integration. Warm light, blue-violet shadows, colored outlines and cyan teardrop match. Screenshots and continuous browser recording are in `qa/production/`.
- Browser QA uses isolated account/API fixtures with real production client assets. It is not an authenticated account or online duel test.

This record is documentation after deployment; the released application source remains the commit listed above.
