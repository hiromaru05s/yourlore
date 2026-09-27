# Per-deck appearance — 2026-09-27

Deck builder → select preset → Appearance → select sleeve and holder/shelf set → Save. The active battle preset carries its cards, market watch list, sleeve and paired furniture together. Equipment UI was removed from profile; shop directions now point to the deck builder. Existing common equipment becomes the initial value of every legacy slot; explicit defaults remain independent.

## Persistence and compatibility

The five presets store `sleeve` and `furniture` in the existing users.decks JSON. No schema migration is required. Save validates ownership for every slot and atomically updates presets plus the active deck compatibility columns. Old card-only clients preserve equipment. Auth, matchmaking and friendly challenges resolve the active preset. Online snapshots pin both players to match-start appearance when reconnecting.

## Validation

- `npm run typecheck` — client and server pass.
- `npm run build` — pass; existing bundle-size advisory remains.
- `node tests/deck-appearance.mjs` — real Worker routes with SQLite, legacy inheritance, independent defaults, ownership rejection with no partial update, old-client preservation, auth/queue/friendly propagation, switching and unchanged credits.
- `node tests/menu-records.mjs` and `node tests/health-cosmetics-v53.mjs` — pass.
- `tests/deck-appearance-browser.mjs` — desktop/mobile, independent save/revisit, locked items, profile/shop and actual BOT board.
- Updated `tests/health-cosmetics-browser.mjs` — shop claims, per-deck equipment, passive search, hand discard and authoritative appearance for both players on reconnect.
- Browser API account fixtures are synthetic; server persistence is tested separately with real SQLite. No real-account authenticated online match is claimed.

Local browser captures/reports are in checks/. Staging deployment evidence is recorded separately after deployment.

## Staging

Deployed runtime `e339cb9c379d28605ec3984afcb532b6bf68f6e0` to `test.yourlore.xyz`; Worker version `502aab32-bdb5-4dc0-98ec-5d440c17f9f8`. Deployed HTML and JS/CSS SHA-256 match the local build. The appearance browser test also passes against staging with fixture accounts and real deployed assets/BOT runtime; see staging/. No production deployment.
