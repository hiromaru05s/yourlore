# Assassin summon — revision 03

Preview: `http://127.0.0.1:5416/assassin-six.html`

Five card identities, six new directions. Local selection preview; no runtime adoption or deployment. Revision 02 (`933282a1`) was rejected by the user. Its evidence is preserved in `../2026-10-09-assassin-six-r2/`.

## New review of applied quality

The earlier revision mistook physical props for source continuity: a cloth, shutter or feather could look three-dimensional while the card underneath did not materially participate. This revision replaces that construction.

Reviewed the benchmark and VFX direction again, the original 銀紋の流墨 video and its continuous frames, current selected Rift / obsidian / decay / slate implementations, and the actual user feedback in the decay chat. The request to retain only the dissolving card, excluding dripping/puddles, was especially relevant: material behavior can be the complete event.

The page's **採用済みと比較** now calls four applied renderer implementations directly with the same selected assassin face:

- 双環の秘文 — `ui/riftInkMaterial.ts`: artwork, true alpha contour, relief, moving surface detail and deformation share UVs.
- 銀刻の黒曜 — `ui/riftDestruction/gpu.ts`, style 0: the source card becomes six connected material regions, with surface details following their geometry.
- 蝕孔の崩壊 — `ui/decay/renderer.ts`: the actual image erodes through irregular holes; it is not replaced by a dissolving prop.
- 岩層の着地 — `ui/summon/renderer.ts`, selected variant 2: surface highlight, weight, board contact and aftermath have separate timing.

These are direct imports, not recreated lookalikes. The four comparison clocks are normalized to each source phase (not a claim that all four have equal duration). Original benchmark, verdant and dew recordings remain available below. The copied benchmark MP4 is unmodified; its source is the primary checkout's `docs/vfx-prototypes/2026-09-27-rift-ink-rich/qa/inscription.mp4`.

## Redesign

A captured face is tessellated once. Its picture, carved frame, alpha contour, material relief and silhouette use the same UV coordinates. The illustration first gains local detail, becomes shadow material during the hand-to-board motion, and reconstructs to the same native field card. There is no stationary card concealed beneath an independently animated cover.

| Direction | Main action and timing difference |
| --- | --- |
| 影織りの帰還 | The whole face narrows into one flexible dark ribbon; it holds a curved silhouette, then opens slowly. |
| 暗襲の一閃 | A sharper compression to a diagonal edge, a short reflection peak at 945 ms, and an earlier reconstruction. |
| 濡影の浮上 | Rounded, compressed wet material; low surface deformation and moving narrow reflections persist as its shape recovers. |
| 煙影の凝集 | The source face erodes and advects into uneven smoke density; surviving strands become a continuous image again. |
| 銀縁の潜行 | The original contour and image relief remain during camouflage; an irregular advancing boundary restores the face. |
| 三影の帰陣 | Three material streams separate with delayed clocks and reunite. Squad uses five streams. Duplicated seam vertices prevent bridge triangles. |

Duration is 2.8 seconds. A common hand/flight/landing clock places the card on the actual board normal. Materials derive detail from the current card, rather than borrowing another card illustration or adding generic particle/ring decorations. Nightlord receives stronger surface detail. Reduced motion presents the settled card.

## Self-review and functional checks

Compared normal playback, stopped intermediate stages, top / oblique / low angles, white / dark backgrounds and the actual GameView board. The single-summon fixture now keeps both immediate neighbors visible, so an empty reserved lane cannot conceal overlap problems. Reworked the three-stream geometry after its thin, bridged form read as a rigid frame rather than flowing material.

Functional verification is recorded separately in `qa/report.json`. Browser QA covers all five faces, both sides and six variants; single actor and exact landing; three simultaneous actors; actual hand click; mobile overflow; reduced motion; view exit and zero-size iframe cleanup; four direct renderer references and three decodable reference recordings. The normal-speed section runs for two full cycles, with additional deterministic transition frames.

Commands:

- `npm --prefix client run typecheck`
- From `client/`: `../node_modules/.bin/vite build --config src/dev/assassin-six/vite.config.mjs`
- `node tests/assassin-six-browser.mjs`

The saved images and normal-speed recording support visual review; passing assertions does not establish user approval. This is a local GameView fixture, not an authenticated online duel.

Final verification: **147/147 assertions passed, browser errors []**, TypeScript and preview build passed. The six-up CPU draw submissions measured median 0.6 ms / p95 1.0 ms over 150 samples; GPU frame time was not measured. `qa/browser-playback.webm` records the browser QA, `qa/normal-speed.mp4` is an unretimed 3.6-second extract of its normal playback, and `playback-motion.jpg` samples that recording. `references/provenance.json` verifies the benchmark copy against its source.
