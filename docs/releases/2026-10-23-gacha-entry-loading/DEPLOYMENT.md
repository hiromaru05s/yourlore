# Production verification

- URL: https://yourlore.xyz
- Deployed source: `5003e78f9be1bf1163def0aedff27fbab755e83e` (on `gh/main`). Includes the preceding surrender-button release `d26b448b`.
- Worker version: `3b7fc03e-0ea2-4d5e-80b5-de84cdf0c43f`, 100% traffic.
- Guarded deployment: `node scripts/deploy-guard.mjs production` from a clean dedicated worktree; committed snapshot typecheck, 201/201 production tests, and build passed.
- Exact deployed HTML/JS/CSS/JSON parity: 125 files.
- Production browser entry check: six viewport sizes, initial-view draw controls, independent collection readiness, late profile response, complete intro/result, one fixture request/receipt, zero obsolete preview-model requests and zero page exceptions.
- Production reward regression: 26 fixture draws/receipts, all ten furniture families and ten sleeve families, all three animated card effects, ten-result navigation, overview/inspection, skip, Escape and reduced motion. Zero page exceptions.

Immediately after deployment, one preload JSON request returned 404 and the initial browser sessions showed the startup reload message. A subsequent request returned 200; the complete 125-file parity run and fresh browser runs above then passed. Short-lived deployment propagation is an inference; no persistent startup failure was reproduced after propagation.

These tests use API fixtures against the actual deployed application/assets. They do not spend a real user's balance or prove a live authenticated purchase. Loading performance figures in README.md are controlled local measurements (10 Mbps / 80 ms), separate from deployed browser success.

Deployment logs and full browser videos remain under `/tmp/lore-gacha-*`. Compact, reproducible evidence is under `qa/production/`. This verification record is saved after the deployment; the application source remains the commit listed above.
