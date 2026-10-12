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
