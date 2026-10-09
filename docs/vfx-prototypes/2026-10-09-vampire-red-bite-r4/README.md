# Red fangs — single bite / revision 04

2026-10-09 user correction: red fangs, clear against the background, one bite. The prior literal ivory teeth and visible jaw structures were rejected. All six directions are rebuilt with independent red fang silhouettes and one closure, while preserving six-card selection and the existing board fixture. No generated imagery is used.

Preview: http://127.0.0.1:5436/vampire-six.html

## Research actually inspected

- Gabriel Aguiar, [Pokémon Bite Attack](https://www.artstation.com/artwork/9NAkdW?album_id=518240), and the author's [Real Time VFX post](https://realtimevfx.com/t/made-the-pokemon-bite-attack-in-unity-quite-simple-but-fun-stuff/22019). Inspected the animated example and the open/closing teeth sequence on the artist's page. The useful construction is two separated rows, unequal canine lengths, negative space between them, and a brief decisive closure. Use this motion grammar; no meshes or textures are copied.
- Riot, [League's VFX Style Guide](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/) and [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/). Read the primary articles on gameplay clarity, controlled noise, silhouette, value, color and timing. The old PDF link now redirects to the homepage, so this revision does not claim inspection of its embedded videos.
- Magda Storbjörk, [Claw Attack VFX](https://magda_storbjork.artstation.com/projects/rl6QOG). Read the artist's explanation of separating bite and claw attacks and blood dissolution; this is supplementary text research, not a claimed video review.
- Local requirements: `animation-quality-benchmark.md`, `vfx-art-direction.md`, `world-bible.md`. The approved source/contact/material principles still apply; previous work already inspected the preserved 銀紋の流墨 recording.

## Translation into the six studies

1. 紅牙: four curved red blades; direct snap.
2. 鋸牙: alternating long and short faceted fangs; interlocking rows.
3. 斜咬: longer fangs on a diagonal axis; a small turn resolves into the bite.
4. 針牙: narrow, precise teeth; fastest closure.
5. 血刃: broad wet curves; small pre-bite liquid deformation settles before closure.
6. 王咬: larger teeth and a wider gape; slightly longer anticipation and contact hold.

All have exactly one monotonically closing phase, an 80–135 ms final snap, a short held peak, and root-to-tip erosion without reopening. The normal preview plays once; looping is opt-in. Replaying is explicitly controlled by the user.

## Rendering

Solid procedural 3D meshes with a curved spine, raised ridge, shaded side faces, a dark silhouette edge, scarlet face, and narrow pale-red highlight. No gums, lip arcs, ivory teeth, rings or particle fields. A temporary local darkening of the original card art separates red forms from the detailed red illustration. Directional contact shadows tie the shapes to the card. The original card art and numbers remain intact before/after the summon. Mesh erosion and its shadow use the same threshold.

## Evidence and boundaries

The comparison remains local and is not adopted in normal matches. `qa/report*.json` cover functional behavior separately from visual judgment. `qa/six-continuous.mp4` is deterministic authored-time sampling, not a real-time FPS claim. Actual browser captures cover light/dark and board views. Research does not constitute user approval of these six designs.

Final validation: 143 checks passed at 1280×720 and 143 at 390×844, no report errors. These include exactly one closure per direction, no reopening, loop off by default, six cards × six variants × both sides, source hand/restore, reduced motion, concurrency, pause and cleanup. Client TypeScript and isolated Vite build passed.
