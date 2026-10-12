# Taunt 03 — 黒金の王盾

User selected shield variant 03 for staging. The original 01 motion remains unchanged: twin shields unfold, hold and retract over 1000 ms; only the selected sculpted black steel / antique gold shield is adopted. Runtime and comparison page share the geometry and animation functions.

## Runtime

The shared engine adds public `sourceUid` / `attackerUid` metadata to both taunt dice outcomes without consuming extra RNG. The controller presents this source card's shield before its dice and before the redirected attack. If evasion also applies, the order is shield → taunt dice → evasion dice → evasion → attack when not evaded. No duplicate dice. Direct attacks on a taunter and attacks without a taunt roll do not add the prelude.

Exact UID lookup supports duplicate cards and granted passives. The native card stays visible. Playback cancels on fast-forward, destruction of the controller, resize, page hide, loss of visibility, abort, removal or replacement. Reduced-motion / GPU fallback keeps the visible card and the 1000 ms presentation boundary.

## Verification scope

- `tests/taunt-shield.mjs`: 80 engine parity cases against the pre-integration engine, both outcomes/sides, granted taunt, duplicates, direct targets, no source; 1000 ms boundary, concurrent sources, async preparation, cancellation, reduced motion, capture/draw failure.
- `taunt-runtime.html`: real BaseController + shared reduce + GameView with seven combat cases, including taunt followed by evasion. Results and screenshots are recorded alongside this file.
- Guarded staging build runs current production suite, typecheck and build from the committed remote main snapshot.
- Deployment source/version and SHA-256 checks cover served assets. This is separate from authenticated online match verification; no authenticated online match claim is made here.

Visual selection was provided by the user. Automated success does not independently establish visual approval. Production is outside this release.

## Staging release — 2026-10-13 KST

- Deployed source: `647190befca5c99ee5d6ad334955c624180f6256`.
- Worker version: `f971c9aa-c06b-4166-86b0-65c1506ad939`, 100% staging traffic.
- `deploy-guard.mjs staging`: clean committed snapshot, Wrangler 4.144.0, client/server typechecks, 105/105 production tests, design guard and production build passed.
- The first validated source `145a643e` was superseded by a documentation-only merge during checks; the guard stopped before deploying. The latest source was validated again and deployed successfully.
- 62 served HTML/JS/CSS files match the exact guarded build by SHA-256 (`staging-assets.json`). The immediate post-deploy request briefly returned 404 during propagation; the completed retry matched every file.
- Public staging login screen loads `main-CQx53XL8.js`; browser errors: none. No authenticated online match was run.
- Local BaseController sequence: 7/7 pass, including both sides, successes/failures, duplicate card IDs, granted taunt and chained evasion. Native cards remain visible; stop leaves zero taunt overlays/captures. Desktop and 390px viewport screenshots recorded.
