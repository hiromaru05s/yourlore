# Chosen Mage and Dungeon Depths Fix

The Chosen Mage's optional turn-start selection is now queued behind any turn-start choice already in progress. Resolving that earlier choice surfaces the Mage selection in the same turn. Predator targeting retains the cost 3–4 restriction and excludes the Chosen Mage's ward.

Dungeon Depths now requires the opponent to have at least 9 mana crystals. Its activation gives its owner 1 Brand counter instead of reducing maximum mana; Mimic summoning remains unchanged.

Follow-up after the user's screenshot: the card detail panel reads the canonical `CARD_EFFECT_TEXT` table, which the first release had not updated. The Japanese, Korean, and English detail text and the bot's cast threshold are now aligned with the rule implementation.

Validation: focused regression tests, client/server typechecks, 269/269 production tests, and production build all passed.

Production: final source `0c677297f51bf55913757a776c4b43242596d8a7`; Worker version `0c6efd86-81f8-4d05-be99-5525d78dc0b4` at 100% traffic. The new version deployed after this screenshot follow-up. `https://yourlore.xyz` returned HTTP 200.
