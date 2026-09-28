# Adopted shelf return: paired echo

User selected portal study 3 and then explicitly requested staging publication.

Runtime delta is limited to sceneMotion.ts plus shelfReturn.ts, cardReturnMotion.ts and portalReturnMotion.ts. The shelf return defaults to portal-echo: 2060ms, #38667c / #e6edf0, local disappearance and reappearance immediately left of the deck. The approved material and UV animation are unchanged.

Each runtime invocation has an independent clock. Abort, scene disposal and resize stop playback; generated meshes/materials are released; borrowed sleeve textures remain alive. Only the existing public shelf top face is captured. There are no server, database, art or rule changes.

Development comparison hooks are deliberately excluded from this release commit. The original working checkout retains its five-variant comparison page.

Validation before publication:
- Isolated client/server typecheck and production build passed on e79d6a7.
- portal-return-motion: 1,782,000 samples passed; connected-return-motion: 360,000 samples passed.
- Prior adoption browser checks used the real animateReshuffle path without a preview override: PC/mobile, both sides, 1/14/40 cards, independent clocks, abort/resize, reduced-motion renderer, disposal and resource cleanup, no page errors. These records remain under the original checkout's matching documentation directory.
- A staging deployment and live verification are a separate step; this source commit alone does not prove publication.
