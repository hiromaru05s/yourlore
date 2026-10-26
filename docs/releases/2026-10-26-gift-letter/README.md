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
