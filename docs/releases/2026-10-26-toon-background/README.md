# Approved toon background and distant birds

The user approved the outlined background preview with smaller clouds and animated distant birds, then requested production deployment. The shared menu plate now uses the same crisp cel artwork as that preview, matching Zeno's approved toon shader. HOME retains independent cloud movement, anchored ivy sway and shared daylight; cloud dimensions are 65% of the earlier layout. Four small blue-gray birds intermittently flap/glide behind the castle and architecture's alpha plate. Quiet gaps and alternating flight directions keep the scene restrained.

Artwork: `client/public/art/lounge/toon-outline-20261026/{library-wide,clouds,ivy}.webp`. The preload, menu-cache asset list, CSS fallback and WebGL renderer reference the same revision. No image sequence is used for birds. The comparison UI and manual bird cue are preview-only.

## Validation before release

- Client/server TypeScript checks pass.
- Bird simulation covers two cycles, quiet intervals, alternating direction, frozen time, finite geometry, wing deformation and transparent layering.
- HOME browser checks pass at 1280×800, 1280×720, 390×844 and 844×390, including pointer hit tests, motion, shared daylight, reduced motion, hidden-page suspension, repeated HOME/tutorial navigation, context loss, no-WebGL fallback, pending-load disposal and late daylight synchronization.
- Desktop/mobile screenshots were visually reviewed. Browser checks use fixture account/API data; they do not claim authenticated multiplayer coverage.
- Production publication and deployed evidence will be recorded after the guarded release completes.
