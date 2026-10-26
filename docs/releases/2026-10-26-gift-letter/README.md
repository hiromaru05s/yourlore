# Header gift letter

Replaces the HOME courier panel with a generated ivory envelope immediately left of the shard balance. The inbox button keeps its existing owner across header refreshes, including individual/bulk claims and focus restoration. Removes the old courier grid row and preserves phone quest clearance.

Image: `client/public/art/lounge/gifts/letter-v1.webp` (256×130, alpha, 9,006 bytes). Generated with the built-in image_gen tool, then trimmed and resized for the UI. The same envelope appears in the inbox heading and empty state.

## Generation prompt

Use case: stylized-concept. Asset type: small game UI inbox icon for LORE, a hand-painted dark fantasy card game set in a pale-stone magical library with navy and silver UI. Primary request: a single closed ivory paper letter envelope, front facing with its triangular folded flap visible, held by a small muted blue-silver wax seal. Shape must read instantly at 32 pixels wide. Elegant restrained hand-painted illustration, crisp simple silhouette, broad controlled shadows, light ivory edges and slate blue fold shadows, subtle paper texture, minimal ornament. Composition: horizontal envelope centered, fills 85 percent of square canvas width, only slight natural asymmetry; almost frontal, no dramatic perspective. Scene/backdrop: genuine transparent background. No text, letters, numbers, glyphs, frame, badge, glow, particles, wings, bird, surrounding objects, cast shadow or background. Output one isolated envelope icon only.

## Validation

- Client/server TypeScript checks passed.
- `tests/gift-inbox-browser.mjs`: API fixtures cover five viewport sizes, header position and hit testing, opening/closing/focus, individual and bulk claims, count/balance refresh, history, retry and Japanese/English/Korean.
- Visual review covers desktop, portrait and landscape. Browser fixtures do not establish real-account gift receipt or physical-device behavior.
- Production release uses `npm run deploy`, which checks source ancestry and current deployment, then runs the production suite and build before publishing.

## Production

Published in the integrated release `1c72c550d17b23f945e23a94cbbdc399d9e078bf`, version `9753142a-c05e-46c6-ab04-1716e6b77f9a` at 100%. The initial release correctly stopped when concurrent HOME/menu changes advanced main. The updated source retains this letter change and passed the full 211/211 production suite before deployment.

Post-deployment `tests/gift-inbox-browser.mjs` passed against `https://yourlore.xyz` across five viewports and all three languages using fixture account/gift API responses and the actual deployed static assets. The letter URL returns HTTP 200, image/webp, 9,006 bytes and the same SHA-256 as the workspace asset. See `browser-checks.json` and `deployment.json`. Visual inspection confirmed the integrated desktop and mobile layout; real-account gift receipt and physical devices were not exercised.
