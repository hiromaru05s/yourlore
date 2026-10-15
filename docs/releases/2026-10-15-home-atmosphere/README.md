# HOME: approved clouds and changing sunlight

User approval: 2026-10-15, after the `home-atmosphere.html` preview and automatic-light refinement: “OK、これでステージングあげといて”. Scope is staging.

The HOME background now separates the sky, painted cloud layers, and transparent library foreground. Cloud alpha at each window controls local light transmission. Shaft width and intensity change slowly; each corresponding floor pool follows it. The selected preview's artwork, shader parameters, timing, and 2× DPR cap are retained.

## Integration

- `client/src/ui/homeAtmosphere.ts` owns the Three.js scene, two cloud layers, window-anchored shafts, floor illumination and dust.
- `client/src/ui/lounge.ts` imports it only for HOME; language/profile repaint does not create another scene. The existing route disposer aborts late imports and destroys the mounted scene.
- `client/src/styles/homeAtmosphere.css` keeps the existing desktop/mobile readability gradients. The generated foreground and sky form the static loading/WebGL fallback.
- `client/src/ui/menuAssets.ts` includes both PNGs in the existing preload/content-hash cache manifest.
- `client/public/art/lounge/atmosphere-v1/` contains the exact two approved preview PNGs. They were generated with built-in image_gen from the user's screenshot (background reconstruction and sky-alpha extraction) and a separate cloud-generation prompt. No additional image generation was performed for release.

The transparent library was reconstructed from the screenshot, including the region previously hidden by the mascot; it is not a pixel-exact extraction of the older illustration. The current runtime mascot, navigation, ranked actions, and tutorial remain separately owned by their existing modules.

## Behavior and verification

Background animation pauses when the document is hidden or reduced motion is enabled. Route teardown removes the canvas and frees GPU geometry, materials, textures and context. Failed WebGL initialization, lost context or texture failures leave the static plate visible.

`tests/home-atmosphere-browser.mjs` exercises actual HOME + lounge modules with fixture API data: live motion, single canvas across repaint, desktop/mobile/landscape fit, navigation hit testing, reduced motion, hidden-document drawing, repeated HOME/tutorial navigation, context-loss/no-WebGL fallback and leaving during image loading. These are frontend fixture checks, not authenticated gameplay evidence.

Full client/server typecheck and the guarded release's production suite/build are required before staging. Deployed source/version and asset checks are recorded separately after deployment; local images are in `local/`.
