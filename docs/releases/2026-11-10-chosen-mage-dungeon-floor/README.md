# Chosen Mage and Dungeon Depths Fix

The Chosen Mage's optional turn-start selection is now queued behind any turn-start choice already in progress. Resolving that earlier choice surfaces the Mage selection in the same turn. Predator targeting retains the cost 3–4 restriction and excludes the Chosen Mage's ward.

Dungeon Depths now requires the opponent to have at least 9 mana crystals. Its activation gives its owner 1 Brand counter instead of reducing maximum mana; Mimic summoning remains unchanged.

Validation: focused regression tests, client/server typechecks, the production test suite, and production build. Production deployment details are recorded after release.
