# HOME: approved wider hall, ivy and shared sunlight

The 2026-10-15 v2 preview was approved for staging. The old background felt too close, the guide had an unwanted floating shadow, and the duel label sat below the center. HOME now uses the approved wider hall and independently moving ivy. The guide's actual 3D key/fill lights follow the same cloud-dependent sunlight as the windows, its floor/CSS shadows are removed, and the duel label is centered.

The two PNG assets under `client/public/art/lounge/atmosphere-v2/` are byte-identical to the selected preview. Both are in the menu readiness/content-hash manifest. Existing cloud art is retained. The background source is 1672×941; the result is a wider composition with improved edge sampling, not native 4K artwork. Built-in image-generation provenance and exact prompts are preserved in `APPROVED-PREVIEW.md`.

`homeAtmosphere.ts` retains the approved artwork, shaders, leaf deformation, light geometry and timing. `homeDaylight.ts` lets the background publish its light/time sample to HOME's cached `manaSpirit.ts` renderer. A one-time ready notification redraws an initially frozen guide when textures arrive. The guide's listeners are removed on destruction. Tutorial guide lighting remains independently configured. Preview controls and API fixtures are not used in the normal application.

Verification: `tests/home-atmosphere-browser.mjs` exercises the actual HOME and tutorial modules with local fixture API data. It checks motion, shared-light changes, centered text and shadow styling, four window sizes, reduced motion, hidden-document drawing, repeated navigation, WebGL fallback/context loss and late image loading. An initially reduced-motion guide receives the late-loaded daylight once. The browser results are in `local/checks.json`; these checks are not authenticated gameplay evidence.

Staging release uses `scripts/deploy-guard.mjs staging` from current `gh/main`, including typecheck, the full current production suite and build. Deployed Worker source/version, live asset hashes, and post-deploy HOME screenshots are recorded separately under `staging/` after successful release.
