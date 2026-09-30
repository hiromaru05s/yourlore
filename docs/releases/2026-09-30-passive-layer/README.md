# Card passive stacking order

The shared card status band used z-index 6, above the attack/health/cost seals at 5. Lower the regular and field status bands to 4, preserving artwork below and numeric seals above passives, including wrapped rows.

Validation: client/server typecheck and production build pass. Chrome gallery checks at 1280×800 and 390×844 use ANTIQUE_DK with six innate passives. At naturally overlapping points on both attack and health seals, temporary paint-order probes reproduce the old passive-on-top behavior and confirm the corrected seal-on-top behavior. Enlarged card inspection also has status 4 and numeric seals 5. Browser page errors: zero. Account/API responses use test fixtures; these checks do not cover authenticated online play.

Staging: runtime `dce9f830`, version `cd487f74-6604-4b23-9c41-4b660ba02ae4`, 100% traffic. The deployed frontend passes the same desktop/mobile natural-overlap and enlarged-card checks with zero page errors. All 18 deployed HTML/JS/CSS hashes match the local production build. Account/API fixture boundary remains the same.
