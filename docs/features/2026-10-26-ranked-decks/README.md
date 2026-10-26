# Ranked players' recent decks

Current-season top 100 players publicly expose up to three distinct starting-deck compositions from completed ranked matches, irrespective of their profile-stat privacy setting. Open a player's name in the leaderboard and switch decks with the three buttons. Cards use the existing in-game inspection view. Duplicate copies are grouped with counts; the fixed Attune is shown separately from the eight selectable cards.

The GameRoom records its frozen queue deck snapshot after authoritative ranked settlement. Deck composition is a sorted multiset, preserving duplicate counts. A D1 transaction updates the last-use timestamp and retains only the latest three patterns per player. Retried or out-of-order results cannot replace newer patterns. Casual, BOT, unjoined, and unfinished rooms do not write history. Every read checks current leaderboard eligibility with the same participation and tie-breaking rules; rank 101 and below return 404, including direct requests. Responses disable caching.

Existing D1 match telemetry did not contain starting decks, so this feature starts recording when deployed. It does not reconstruct past decks from the current editor or cards played during a duel. The empty state explains this, and players with fewer than three distinct decks see the available patterns.

Validation:

- `npm run typecheck`
- `node tests/ranked-decks.mjs`: production SQL against SQLite, 100/101 boundary, private profiles, inactive ratings, membership revocation, composition equality/copy counts, retention, retries, methods, empty state, complete authoritative ranked room settlement, casual and void rooms.
- `node tests/ranked-decks-browser.mjs`: deterministic API fixtures with the real UI, 100 accessible entries, 3 deck selections, card inspection, long names, empty #100, navigation cleanup; desktop, 390px, 320px and 844px landscape, no horizontal overflow and 44px deck controls.
- `npm run test:production` and `npm run build` are required before release.

Screenshots show fixture data, not authenticated live PvP or user visual approval. Release and live verification are recorded in `release.md` after deployment.
