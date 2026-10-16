# 紫晶の断層 — selected Rift set 02

The approved prototype's amethyst facets, opening sleeve cleft, opaque cut edge and fixed pale bevel are now normal equipped cosmetics. The selected geometry and 1024×1536 furniture bed textures were extracted without shipping the other two comparison directions. Furniture and sleeve animate on the shared match clock, respect reduced motion, and release their GPU/DOM resources with the match. Equipped boards use bounded 2× rasterization (6 million pixel cap); the animated overlay preserves cached board rendering and depth occlusion.

Independent gacha rewards:
- `sleeve:gacha-amethyst-cleft`: 紫晶の断層のスリーブ
- `furniture:gacha-amethyst-cleft`: 紫晶の断層のデッキ置き場＆墓地

The existing 92.5% starter / 7% cosmetic / 0.5% effect categories are unchanged. The server selects uniformly within the current cosmetic catalog. Ownership, duplicate refunds, request replay and equipment validation continue through the existing collection ledger; no migration is required. Neither piece grants the other piece.

Validation commands (from repository root):

```sh
npm run typecheck
node tests/gacha-cosmetics.mjs
node tests/starter-collection.mjs
node tests/health-cosmetics-v53.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5635 node tests/amethyst-runtime-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5635 node tests/amethyst-gacha-browser.mjs
```

The runtime browser check uses `/cosmetic-studio.html?board=1&runtime=1&set=amethyst-cleft&side=opponent&count=0`, which exercises normal equipment routing, both players, empty piles, hand animation, real draw motion, mixed slots, reduced motion, responsive layout, repeated removal and disposal. The gacha browser test uses an explicit API fixture; it is not evidence of live account transactions.

After a guarded staging deployment, `node scripts/check-amethyst-staging.mjs` checks real RNG, inventory and authenticated equipment UI on a temporary staging-only account, then removes its rows. It writes evidence to `/tmp/amethyst-staging` by default. Use the release source SHA and live Worker version to identify which deployment was tested.

## Staging verification — 2026-10-16

- App source: `b24b03178fa094a9ea5beed9adb92215231d48de`, guarded release; 185/185 production checks passed.
- Worker: `f565fd6a-36cc-4ed8-8cd6-717058ccb545`, 100% traffic at verification.
- 179 HTML, JS, CSS, manifest, artwork pack and selected PNG hashes match the guarded build. One pack briefly returned 404 immediately after upload; its targeted retry matched.
- Real staging RNG awarded both independent items in 1,340 draws on an isolated funded QA account. Replay, persisted ownership, authenticated equipment save and the two lineup entries passed. This is a functional sample, not a probability estimate.
- Published normal-runtime board fixture passed opponent/self draw, empty piles, mixed slots, animated hand, reduced motion, mobile layout, five equipment removal cycles and disposal with zero browser errors. Resting cosmetic animation caused zero full-board redraws in the recorded 5-second window. This fixture does not claim authenticated multiplayer gameplay.
- The temporary account was removed and absence verified. The first bulk cleanup hit D1_RESET_DO; direct cleanup identified an automatically created rating row. Removing its ratings and presence allowed verified cleanup. The QA script now includes these rows and uses the direct query path for cleanup.

Machine-readable evidence is in `qa/`.
