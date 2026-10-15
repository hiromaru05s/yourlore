# Goldfault / 金脈の黒曜 — approved atelier 03

User approval (2026-10-16): 「これガチャ報酬に追加して。ステージングにあげて。スリーブ、デッキ置き場＆墓地の両方合格。」

## Reward behavior

- `sleeve:gacha-goldfault` and `furniture:gacha-goldfault` are two independent gacha-only rewards. Furniture equips deck holder and graveyard together. No purchase endpoint or schema change.
- Existing category odds remain starter 92.5%, cosmetics 7%, effects 0.5%. Four sleeves and four furniture rewards share the cosmetic category equally: 0.875% each. Owned cosmetics refund 100 Shards.
- Both enter the existing atomic inventory/ledger transaction and ownership-gated deck serializer. They can be combined with all other cosmetics; each player's settings resolve independently.

## Approved visual transfer

The approved `client/src/dev/gacha-atelier-three/art.ts` (SHA-256 `fe318e798d53aabda671586dad5030bc2e9e86435a63c1c1715855b51fb0bfeb`) and its palette were copied unchanged to production `ui/cosmetics/goldfault`. Only index 2 is used. The revised `goldfaultFurniture.ts` preserves the eight fitted obsidian faces, recessed gold joins, narrow metal bindings, corner clasps, and fixed card contact plane. Its only source edit is an inline local interface replacing a dependency on unrelated preview objects.

The 12-second phase remains on the actual material: gold travels within engraved cracks, stone facets catch narrow reflections, and the DOM hand/draw mask follows the same sleeve phase. There are no floating decorative particles. Static PNGs are generated from the authored canvas and the actual two furniture models, not replacements for their game animation.

A depth-tested overlay animates only the equipped surfaces and preserves stock occlusion. An invisible fixed caster retains the furniture contact shadow in the cached board. Geometry, materials, texture leases, observers and media-query listeners are released on replacement/disposal. Goldfault pile bounds do not inherit the generic button transition, preventing cached geometry from capturing an intermediate resize position.

## Validation

- Client and Worker TypeScript checks passed.
- `tests/gacha-cosmetics.mjs`: eight unique catalog rewards, assets/locales, ownership and all sixteen independent sleeve/furniture combinations.
- `tests/starter-collection.mjs`: actual Worker + in-memory SQL; forced first acquisition and duplicate for every reward, direct-buy rejection, Goldfault save/read-back and unowned rejection, atomic/idempotent spending, transaction rollback.
- `tests/goldfault-gacha-browser.mjs`: actual menu/cinematic/deck UI with explicitly mocked API receipts; locked entries, 4+4 rates, separate rewards and equipped save. This is not a live account draw.
- `tests/goldfault-runtime-browser.mjs`: production renderer in disposable actual-board fixture, empty/occupied furniture, opponent hand animation, both players and mixed slots, actual native draw, reduced motion, desktop/mobile resize, five equip/remove cycles and disposal. Browser errors: 0. Stable 5-second sample: zero full-board repaints; surfaces animate without forcing board reconstruction.
- Visual inspection: approved stone segmentation and thin connected gold channels remain readable on the white board; cards occlude the inset correctly; sleeves follow the native draw and opponent hand. Functional assertions and this visual review are separate from the user's original approval.

Runtime sample: `/cosmetic-studio.html?board=1&runtime=1&set=goldfault&side=opponent&count=0`. Use `count=8` for occupied piles. This isolated fixture exercises shipped rendering but is not authenticated multiplayer evidence.

Staging deployment evidence is recorded separately after guarded release.
