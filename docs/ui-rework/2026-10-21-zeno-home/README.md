# Zeno HOME material integration

The user identified the white rabbit in the current HOME screenshot, requested removal of the large blue circle, and authorized applying the material improvement to production.

## Changes

- Replace the stage-sized circular focus outline with a small ivory keyboard-only cue. Pointer interaction has no outline.
- Keep the approved rabbit silhouette, face, chest drop, greeting and idle choreography.
- HOME uses matte ivory surfaces with low-amplitude object-anchored pigment variation, cool half-tones and warm daylight. The dark face no longer reflects rectangular studio softboxes.
- Replace the HOME reflection environment with broad arcade openings and stone-colored bounce. Keep the glass drop distinct from the matte body.
- Add torso contact shadows, with explicit shadow-map disposal. Thin palms do not receive hard shadow islands.
- Separate the ear inset slightly from its animated outer surface to remove intermittent depth interference.
- Background artwork and animation are unchanged. Tutorial retains its existing material and light setup.

## Validation before release

- Typecheck, interaction bounds/cancellation, motion timing and HOME renderer cache tests passed.
- `tests/zeno-home-browser.mjs`: actual application boot with API fixtures, four viewport sizes, click and keyboard focus, greeting, drag/return, one complete ambient gesture, reduced motion, hidden-document pause, tutorial/HOME navigation and WebGL fallback. No page or shader errors.
- Reviewed the actual HOME at rest and in motion in the local browser. The first darker material draft was rejected internally; the selected version retains white readability and the drop highlight.
- Attached screenshots and `results.json` are local fixture evidence, not authenticated production evidence. Continuous video retained in the local QA output.
- Production deployment and deployed-source verification are recorded separately after release.
