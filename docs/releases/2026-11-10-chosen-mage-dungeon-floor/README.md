# Chosen Mage and Dungeon Depths Fix

The Chosen Mage's optional turn-start selection is now queued behind any turn-start choice already in progress. Resolving that earlier choice surfaces the Mage selection in the same turn. Predator targeting retains the cost 3–4 restriction and excludes the Chosen Mage's ward.

Dungeon Depths now requires the opponent to have at least 9 mana crystals. Its activation gives its owner 1 Brand counter instead of reducing maximum mana; Mimic summoning remains unchanged.

Validation: focused regression tests, client/server typechecks, 269/269 production tests, and production build all passed.

Production: source `98e5f6a49c4ca8486f94c1d4785878dc34e059fd`; Worker version `aba1bd2e-8835-4c22-bc24-0e547b60674f` at 100% traffic. Deployment status confirmed the source annotation and version; `https://yourlore.xyz` returned HTTP 200.
