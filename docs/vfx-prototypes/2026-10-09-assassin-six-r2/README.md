> User rejected this revision on 2026-10-09. Rebuilt source-surface studies are in `../2026-10-09-assassin-six-r3/README.md`. This file preserves the rejected revision record.

# Assassin summon — revision 02

Local comparison: `http://127.0.0.1:5416/assassin-six.html`

Five cards (ASSASSIN1, ASSASSIN2, ASSASSIN3, ASSASSIN4, ASSASSIN_SQUAD), six revised directions. Preview only; no runtime selection or deployment. The first six at commit `8523640e` were rejected by the user. Their original evidence remains in `../2026-10-08-assassin-six/`.

## Applied-animation review before rebuilding

Read the animation benchmark, VFX art direction, world bible, the recent user feedback in the verdant, tribe, and dew chats, and the actual selected runtime sources. Integrated current `gh/main` (`9b566407`) into this isolated preview worktree to inspect the applied implementations.

- **絡根の解放 / verdant 04:** selection and runtime route to `client/src/ui/verdant/studyRenderer.ts` and `organicStudies.ts`. The important properties are deformation of real surfaces, broad shade / midtone / narrow highlights, contact shadows, staggered release, and the board-normal projection. Examined the release screenshots and normal-speed playback in `docs/releases/2026-10-08-verdant-04/`.
- **月縁の雫 T2:** inspected the selected liquid renderer and playback under `docs/releases/2026-10-08-dew-t2/`. The user accepted believable optical behavior and then asked for only enough tint and contour to keep it visible. Detail must come from the material, not extra decorations.
- **Selected tribe summons:** `client/src/ui/tribePresentation/selection.ts`, `renderer.ts`, and `approved.ts` preserve a readable card, restrained silhouettes, distinct timing, and one summon actor. Selected references include 霧からの実体化 and 黒炎の消失.
- **Quest pact:** reviewed the physically folded paper, cloth and attached card surface. A new object popping up beside the card is not the same as continuous transformation.

The comparison page now includes the two adopted playback records. These are recorded release evidence, not a new claim about current remote-server playback.

## Why the first version was insufficient

Canvas ribbons and blades acquired more lines without acquiring actual volume. Surface sheen did not follow a deformed normal; objects read as decoration over a card. The sliced-card variant also lacked a clear reason in an assassin summon. Passing lifecycle checks did not establish visual quality.

## Revised material and motion

| Direction | Source and release |
| --- | --- |
| 夜装の解放 | Two side seams unfold into dark woven cloth. Shoulder opens first, weighted hem lags, burgundy lining shows during the turn. |
| 鋼鱗の抜刀 | Overlapping steel lamellae stay hinged to the perimeter, open in sequence, and retract. The actual card is never sliced. |
| 黒漆の脱皮 | A single glossy skin peels with a curled free edge. The remaining sheet stays against the card. |
| 夜霧の実体化 | Layered turbulent density is confined to the card outline and thins upward; deliberately quieter than the solid materials. |
| 緋紐の解き目 | Woven tubes release their crossing, with slack moving toward the ends. |
| 夜鴉の羽衣 | Rooted feather vanes overlap, reveal shafts and barbs, and turn in sequence. |

Physical meshes, woven/brushed/barbed bump detail, roughness, sheen and clearcoat replace flat gradients. Card-face capture now preserves the padded surface ratio; the physical face plane accounts for that padding. Preview angles are oblique, top and low. Board rendering uses the actual DOM board projection once, with a nonzero eye position for physical reflections. The actor returns to the native field card at the end.

Self-review corrections: reduced the plastic-looking cloth/feather sheen; made steel facets flatter; corrected the lacquer curl so the unpeeled sheet no longer floats; removed an intersecting underside layer from the lacquer curl; verified those shapes from the low angle as well as the board view. These changes address specific observed problems. They do not constitute user visual approval.

## Verification

- `npm --prefix client run typecheck`
- From `client/`: `../node_modules/.bin/vite build --config src/dev/assassin-six/vite.config.mjs`
- `node tests/assassin-six-browser.mjs`
- Browser QA checks all five faces, both sides, six variants, one actor, landing projection, three simultaneous actors, reduced motion, hand click, iframe cleanup, responsive overflow and decodable reference videos. See `qa/report.json` for the measured result.
- Visual evidence includes all five six-up views, low and top angles, light/dark backgrounds, own/opponent board views and mobile. Recorded browser QA is not a real authenticated match and the functional result is separate from visual acceptance.

The shared primary checkout and production summon dispatch remain unchanged by this revision.

Final lifecycle repair: switching away from the board can deliver one resize callback after its iframe becomes zero-sized. The board and physical renderer now reject that viewport before `drawImage`; the existing board-exit browser check reproduces this path.

Final result: **145/145 checks passed, browser errors []**, TypeScript and preview build passed. On this machine, the six-up draw submissions measured median 13.2 ms / p95 16.0 ms (150 samples); these are CPU submission timings, not a GPU frame-rate guarantee.
