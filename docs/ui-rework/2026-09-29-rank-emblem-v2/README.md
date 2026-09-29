# Tier emblem revision — 2026-09-29

User scope: keep the approved ranked-result flow, replace the emblem art, and make promotion articulate the emblem itself.

## Implemented

- Eight original SVG silhouettes: forged iron clamps, bronze collar, silver blades, gold feather plates, platinum arches, diamond facets, master horns, grandmaster extended wings.
- Beveled metal, recessed frames, faceted gemstone and inset highlights. SVG gradient IDs remain unique when old/new badges, HOME and the leaderboard coexist.
- Promotion: MMR count (500–2100 ms), outgoing plates fold inward (2100–2540 ms), new frame/gem arrive, wings fan open, base and crown lock into place. Settled by 4250 ms. One cancellable result clock drives all parts.
- Ordinary gains/losses retain the assembled silhouette; a short material pulse distinguishes these from promotions. HOME and settled results have subtle gemstone illumination. Reduced-motion disables animation.
- Uses the shared production emblem renderer on HOME, result and tier chips. The preview adds all seven promotion destinations and a direct “紋章から再生” control using the production RankPresentation.

## Verification

- `node tests/rank-emblem.mjs`: seven promotions, same-tier gain/loss/draw, GM demotion, unique/resolvable gradient references, hidden-tab completion, receipt replay suppression, reduced-motion, detached DOM and destroy cancellation.
- Initial shared-workspace `npm run typecheck` and `npm run build` passed. A subsequent shared-workspace typecheck was blocked by another in-progress file, `src/dev/series-vfx-c/entry.ts` importing missing `./revision2/main`. No changes were made to that work.
- Final isolated preview snapshot typecheck/build recorded separately in `validation.txt`.
- Browser: gold promotion observed from count through articulated reveal to 1162 MMR; old/new wing transforms sampled and verified to settle. Actual BaseController battle-result path verified through GM victory to 1613 MMR, rank #25. Desktop and 390×844 result screenshots show the complete controls; viewport reset afterward. No browser errors; existing Three shadow-map deprecation warnings remain.
- Visual review: eight-tier gallery, gold transform contact sheet, GM result on the board and mobile. The frame sequence shows feather angles, crown travel and final seating. This is an original vector treatment, not a copy of LoL artwork.
- `sampled-motion.mp4` is a time-preserving sequence of browser screenshots, not a frame-rate performance recording. Use the live preview to judge smoothness. `motion-samples.json` records actual computed wing transforms.

Preview: http://127.0.0.1:5327/rank-lab.html — retained local Vite process, fixed source snapshot in `/private/tmp/lore-ranked-validation-20260929/client`.

This revision is integrated locally. No staging/production deployment or server/rating-rule change was performed.
