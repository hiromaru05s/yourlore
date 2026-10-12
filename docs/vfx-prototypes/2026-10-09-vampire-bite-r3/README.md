# Vampire bite studies — 3D revision 03

Six bite-based summon directions, each supporting VAMP1–VAMP5 and VAMP_BUTLER. Requested on 2026-10-09: use a vampire biting motif, realistic 3D animation, six alternatives, and no generated imagery.

Preview: http://127.0.0.1:5436/vampire-six.html

Start: `node node_modules/vite/bin/vite.js --config client/src/dev/vampire-six/vite.config.mjs`

## Construction

The active renderer imports `bite-rig.ts`, not `material-r2.ts`. No generated effect textures or sprite planes are loaded. The existing card face is captured unchanged as the source surface; the teeth, jaws, blood beads and blood threads are procedural 3D meshes. Revision 02 assets remain archived, unused by this preview.

- Closed, curved elliptical canines with 40 longitudinal / 28 radial subdivisions, enamel/root vertex shading, physical roughness and clearcoat.
- Upper and lower jaw groups rotate open and close; the two jaw directions bite the front card edge so the lower jaw is visible instead of hidden under the card.
- A directional shadow map projects teeth onto the card. Contact shading and the local surface depression use the same tooth coordinates.
- Both card face and card thickness deform together: the first visual check caught an exposed backing disc at each depression and this was fixed.
- Lower-jaw geometry bounds are kept above the board during opening, withdrawal and landing; seven descent samples cover this separately.
- Bite pressure and wounds begin only after the teeth reach the surface. Each direction has its own closure, hold and release timings; they share one summon lifecycle and one landing.
- The liquid variant deforms its actual canine geometry before solidifying. The suction variant uses segmented physical blood threads connecting the punctures to the teeth.
- Rank changes fang height; the butler uses restrained height. Teeth retract geometrically before the card lands flat at 2260 ms; bite marks close by 3030 ms.

## Six directions

| Direction | Main motion | Bite contact |
|---|---|---|
| 双牙の穿印 | Two long canines, quick downward puncture and withdrawal | 1120 ms |
| 顎門の咬合 | Upper/lower jaw clamp around the card edge | 1260 ms |
| 斜牙の裂傷 | Oblique puncture followed by a short dragging cut | 1100 ms |
| 吸血の脈動 | Held bite, blood threads and temporary loss of color | 1050 ms |
| 血牙の凝成 | Pulsing liquid mesh hardens into red fangs and strikes | 1390 ms |
| 王牙の重咬 | Four canines, larger jaw, slow heavy closure and release | 1420 ms |

## Reference and evidence

Read `AGENTS.md`, `docs/animation-quality-benchmark.md`, `docs/vfx-art-direction.md`, and `docs/world-bible.md`. Revisited the approved 銀紋の流墨 continuous recording and inspected existing bite shapes in `series-vfx-b/forms.ts` and curved tooth geometry in `ui/mimic/royal-ornaments.ts`. The first is a continuity/material benchmark; the latter are bite silhouette and 3D geometry references, not copied artwork.

Browser reports: `qa/report.json` and `qa/report-mobile.json`: 136 checks passed on desktop and 136 on mobile, with no reported errors. Client TypeScript checking and the isolated Vite build passed. Checks include 12 bite-specific assertions for no pre-contact wounds/deformation and fully closed teeth before pressure, plus all six cards × six directions on both sides, hand source, simultaneous summons, restoration, reduced motion and cleanup.

`qa/six-continuous.mp4` contains the complete authored timeline sampled at 30 fps. This is a motion review export, not a measured real-time frame rate. `qa/preview-browser.png` and board screenshots are actual browser captures. Functional passing and visual approval are separate; these remain local selection studies, without normal-game adoption or deployment.
