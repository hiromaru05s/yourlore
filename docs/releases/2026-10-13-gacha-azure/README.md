# Azure Wake 01 — staging adoption

Selected by the user on 2026-10-13 from the radiance-three revision 6 preview (`http://127.0.0.1:5448/?v=1`). The animation is named **蒼流の航跡 / AZURE WAKE**. Other compared variants are not selectable in the shop.

The existing shop gacha's one/ten draw preview buttons now open the selected fullscreen animation. This remains a presentation preview: fixed sample items, no RNG, purchase request, shard spend, inventory grant, or draw history mutation. The selected edition supplies the featured sleeve. The renderer retains the avatar and board-furniture silhouettes for future item integration, using actual board models rather than coercing them into cards.

The ribbon remains sewn at the head. It hangs through the initial opening and first leaf motion, then progressively swings behind the back cover over opening progress 0.34–0.86. It does not fade out or disappear on the first opening frame. The final spread does not expose a ribbon over the result. Existing page designs, movement-derived fading wake, short initial selection beat and mana-to-result transition are retained.

The animation is lazy loaded; exit, skip, replay, reduced motion, resize and close-before-loading are handled by its modal owner. Scene geometry, textures, shadow maps, passes and the WebGL context belong to each instance and are released on close after outstanding loads settle. Partial successful asset loads are released if another required load fails.

## Validation

- `node tests/gacha-azure-motion.mjs`: attached/continuous ribbon, early opening visibility, final concealment, cover/page ordering, centered arrival, and shortened timing.
- Local browser integration: one draw reaches result, back returns focus to its button; frame QA checks 6.4/7.4/8.4/17.95 seconds.
- `qa/ribbon-opening.png`: actual runtime renderer at 7.4 seconds, showing the ribbon below the opening front cover.
- Dev-only fixtures: `/gacha-azure-qa.html` (actual shop component) and `/gacha-azure-frames.html` (deterministic frame controls). They are excluded from production build inputs.

Deployment must pass `node scripts/deploy-guard.mjs staging` from the committed current `gh/main`. Local/browser validation is not a claim of authenticated staging playback or production release.
