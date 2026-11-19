# 蒼晶の記録召喚 — LORE original study 11

Prototype only. The approved 1.15× draw was integrated separately; this summon is not included in that production release.

## Direction

LORE's card is a registered record medium, activated through its edge engraving. The central readable card turns into a faceted blue crystalline record, compresses along its engraved cleavage planes, and streams into a book-shaped receiving inscription on the actual monster zone. The record reconstitutes as the native field card. Its 1.45-degree rock is short and restrained.

The required central enlarged reveal is present for either player. White orb flight, impact cracks and the Shadowverse timing sequence are not used in this original variant. The previous Shadowverse study remains explicitly labeled as the previous imitation, for comparison. Current LORE uses the actual adopted animation path in the comparison iframe.

Reference: [Genshin Impact official Zhongli demo](https://www.youtube.com/watch?v=4oBpaBEMBIM), 00:30–01:25. Studied mineral facets, dark bodies with narrow specular faces, warm fine highlights and locally concentrated light. No downloaded reference art or video is packaged in this prototype. This is an interpretation of those material/light traits, not a claim to reproduce its rendering pipeline.

The approved `docs/animation-quality-benchmark.md` and the frozen “銀紋の流墨” sequence were reviewed from the Desktop checkout. Surface detail, material continuity, travel and reception share one clock. The user's current realistic-material request takes precedence over the older general Toon guidance.

## Choreography and implementation

- 0.02–0.73 s: native central reveal and reading beat.
- 0.73–1.12 s: engraving unlocks, print crystallizes across its surface.
- 1.12–1.92 s: thick faceted fragments compress into a record core and transfer with a tapered blue light wake.
- 1.79–2.02 s: actual native field card forms beneath the planar scan and local light.
- 2.02–2.20 s: a small rigid-body rock settles; inscription contracts back into the card by 2.8 s.

`client/src/dev/cinematic-vfx/loreCrystals.ts` supplies geometry, original print UVs, material transition, facets and lighting. `loreSummon.ts` supplies the perspective-projected inscription and motion-derived wake. `scene.ts` coordinates them with `SummonPrint`, which preserves the actual field card and its full native frame/badges. No final raster-to-native card replacement occurs.

## Source and preview provenance

Adopted main baseline: `33c8700c989c254565151ba051f0141a886e0de8` (includes draw code `daf41132a`). Original summon implementation begins at `6ebf20bc4`, with subsequent visual refinement in this branch.

Actual board/card paths: `client/src/ui/boardView.ts`, `client/src/ui/cardView.ts`, `client/src/styles/card.css`, `client/src/styles/defaultUI.css`, and `client/src/dev/cinematic-vfx/fixture.ts`. Board art, frame assets and character paths are inherited from the merged main, not copied from an older screenshot.

Server root: `/Users/hiromaru05s/.codex/worktrees/cinematic-vfx-1118/LORE_TCG/client` (Vite process 8383 checked via lsof).

Preview: http://127.0.0.1:5298/cinematic-vfx.html

## Evidence and boundaries

`tests/cinematic-lore-browser.mjs` / `qa/browser-report.json`: 1100×680 and 390×680, both players; central native reveal, unchanged original field children/styles/frame at rest, interruption cleanup, repeated preparation with stable GPU geometry/texture counts, white/dark focus views and continuous playback. A local Chrome run measured 190 animation-frame intervals, median 16.7 ms and p95 16.8 ms. This is not a physical mobile performance claim.

`qa/studio-report.json`: default original summon, previous-study selector and current LORE comparison controls. `qa/preview.mp4` trims the loading/preparation intervals from a real-time browser recording of both sides; `qa/normal-playback.webm` retains the full capture.

Functional checks do not certify visual approval or parity with a commercial game. The user has not yet approved this new original design. This is a real-board fixture, not a live PvP summon implementation.

`qa/preview60.mp4` renders the same browser timeline in exact 1/60-second steps for a smooth review clip. It is not a real-time performance measurement; the separate real-time capture and RAF measurements above provide that evidence.
