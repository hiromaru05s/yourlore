# Card passive stacking order

The shared card status band used z-index 6, above the attack/health/cost seals at 5. Lower the regular and field status bands to 4, preserving artwork below and numeric seals above passives, including wrapped rows.

Validation: client/server typecheck and production build pass. Chrome gallery checks at 1280×800 and 390×844 use ANTIQUE_DK with six innate passives. At naturally overlapping points on both attack and health seals, temporary paint-order probes reproduce the old passive-on-top behavior and confirm the corrected seal-on-top behavior. Enlarged card inspection also has status 4 and numeric seals 5. Browser page errors: zero. Account/API responses use test fixtures; these checks do not cover authenticated online play.
