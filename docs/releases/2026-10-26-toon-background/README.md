# Approved toon background and distant birds

The user approved the outlined background preview with smaller clouds and animated distant birds, then requested production deployment. The shared menu plate now uses the same crisp cel artwork as that preview, matching Zeno's approved toon shader. HOME retains independent cloud movement, anchored ivy sway and shared daylight; cloud dimensions are 65% of the earlier layout. Four small blue-gray birds intermittently flap/glide behind the castle and architecture's alpha plate. Quiet gaps and alternating flight directions keep the scene restrained.

Artwork: `client/public/art/lounge/toon-outline-20261026/{library-wide,clouds,ivy}.webp`. The preload, menu-cache asset list, CSS fallback and WebGL renderer reference the same revision. No image sequence is used for birds. The comparison UI and manual bird cue are preview-only.

## Validation before release

- Client/server TypeScript checks pass.
- Bird simulation covers two cycles, quiet intervals, alternating direction, frozen time, finite geometry, wing deformation and transparent layering.
- HOME browser checks pass at 1280×800, 1280×720, 390×844 and 844×390, including pointer hit tests, motion, shared daylight, reduced motion, hidden-page suspension, repeated HOME/tutorial navigation, context loss, no-WebGL fallback, pending-load disposal and late daylight synchronization.
- Desktop/mobile screenshots were visually reviewed. Browser checks use fixture account/API data; they do not claim authenticated multiplayer coverage.

## Production

Published source `7c47e8efca20dd6c0138bf61cf50ab4bea8ed5d5` to https://yourlore.xyz, Worker version `963f210f-27f3-42f8-94e1-d11c87923afb` at 100% traffic. The guarded committed snapshot ran npm ci, client/server typechecks, all 212/212 production tests, the design guard and production build. Source and deployment guards passed.

Captured hashes from that exact snapshot before automatic cleanup: all 150/150 HTML/JS/CSS/JSON files and approved background layers match live production responses. Post-release HOME browser checks passed using actual production static assets and fixture account/API responses: greeting, continuous idle, complete ambient gesture, drag/return, reduced motion, hidden-page suspension, tutorial/HOME reuse, four viewport sizes and WebGL fallback. No browser/shader errors. Desktop and phone screenshots were visually reviewed; this does not establish real-account or physical-device testing.

This release record is a documentation-only follow-up; the deployed application source is the commit above.
