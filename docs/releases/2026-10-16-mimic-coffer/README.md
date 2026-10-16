# 貪欲な宝箱 — approved mimic 01

Selected by the user on 2026-10-16 for staging and gacha. Uses the approved wooden jaws, brass fittings, ivory teeth, eyes and tongue, plus the fixed two-tone sleeve cut edge. Other comparison variants are not registered.

- `sleeve:gacha-mimic-coffer` and `furniture:gacha-mimic-coffer` are separate gacha-only rewards. Furniture equips deck holder and graveyard together.
- Keeps current server category rates (starter 92.5%, cosmetics 7%, effects 0.5%). Each cosmetic uses the equal share of the current catalog. Existing collection transactions, replay protection, ownership checks and 100-Shard cosmetic duplicate refunds apply.
- Selected physical geometry is rendered in the normal equipment adapter with cached-board depth occlusion. Only moving surfaces repaint. Deck jaws open on the real draw-start signal; hand and draw copies share the same animated sleeve artwork. Balanced quality renders equipped furniture at 2x within the existing 6MP budget; economy mode retains its existing cap.
- Shared artwork leases, equipment removal, controller disposal, reduced motion and document-hidden animation suspension are handled. The outer sleeve crop is restored on removal.

## Validation

- `node tests/starter-collection.mjs`: actual Worker bundled against transactional SQLite, all catalog rewards, duplicate refunds, forbidden purchase, replay, equipment ownership/persistence.
- `tests/coffer-gacha-browser.mjs`: API fixture, actual UI lineup/rates, locked/unlocked equipment, separate reward results and save.
- `tests/coffer-runtime-browser.mjs`: normal production equipment adapter on actual board fixture, empty/stocked piles, both players, independent slots, real draw, mobile/tablet layout, reduced motion, repeated equip/remove and disposal. Screenshots and JSON are in `qa/`.
- `scripts/check-coffer-staging.mjs`: isolated temporary authenticated staging account, real server RNG until both rewards and duplicates, replay checks, persistence and optional live UI. Removes its QA account/session/transactions in `finally`.

Release/deployed evidence is recorded separately; local fixtures are not authenticated live gameplay.
