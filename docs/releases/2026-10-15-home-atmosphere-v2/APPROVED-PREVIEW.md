# HOME atmosphere v2 — wide hall / shared daylight / living ivy

2026-10-15 preview, made in response to feedback on the staged HOME. No runtime adoption or staging deployment is included in this revision.

## Open / reproduce

```sh
node scripts/preview-home-atmosphere-v2.mjs
# http://127.0.0.1:5593/home-atmosphere-v2.html
node tests/home-atmosphere-v2-browser.mjs
```

The preview mounts the existing HOME and menu with fixture user data. A development-server resolver substitutes only the background and mascot modules, so normal production entrypoints still use the staged versions. The API is locally stubbed. Navigation/start controls do not create games or modify accounts.

## Visual changes

- A wider establishing view reveals more arches, the complete eye window, the reading desk, and a larger floor area. The new composition avoids the old close-up impression at desktop aspect ratios.
- A modest alpha-aware reconstruction filter improves stone-edge sampling without sharpening transparent sky borders. The renderer uses native device pixel ratio up to 2. This is not a claim of a 4K source: the built-in generation tool returned a **1672 × 941** background despite the 3840 × 2160 prompt; the old source is 1505 × 1045. Perceived detail here comes from the new composition, edge sampling, and separately rendered foliage/3D character, rather than a full native-4K raster.
- The actual 3D mascot has no circular floor shadow or CSS drop-shadow. A warm upper-left directional light, cool skylight, and restrained reflection environment put its white material in the same daylight as the library. The background's cloud-dependent window transmission controls the mascot lighting every frame; the mascot is not a separately recolored flat sprite.
- The main duel text sits exactly at the center of the disc. DUEL and the subtitle are equally offset above/below it. All previous button actions/mode semantics are retained in the underlying HOME.
- The original ivy was removed from the new architecture plate. Three independent alpha-textured, subdivided meshes sway around their fixed upper attachments. Small branch ripples vary with height; the marble stays motionless, and there is no second static copy beneath moving leaves.
- The preview control panel can pause the atmosphere, freeze leaf deformation, accelerate changes 5×, or hide the UI to inspect the space. Reduced-motion, document visibility and renderer teardown retain their lifecycle behavior.

## Assets and implementation

Both bitmap assets were generated using the built-in `image_gen` tool (no CLI/API fallback). Their generated alpha is preserved; original generated files are retained.

- Background: `client/public/previews/home-atmosphere-v2/library-wide.png` (1672 × 941 RGBA)
- Ivy: `client/public/previews/home-atmosphere-v2/ivy.png` (727 × 2162 RGBA)
- Existing approved cloud texture: `client/public/art/lounge/atmosphere-v1/clouds.png`
- Preview: `client/src/dev/home-atmosphere-v2/` and `client/home-atmosphere-v2.html`
- Server substitutions: `scripts/preview-home-atmosphere-v2.mjs`

Workspace root: `/Users/hiromaru05s/.codex/worktrees/home-atmosphere-staging/LORE_TCG`.

## Verification and limits

Client TypeScript check passed. Browser checks in `qa/verification.json` passed at 1536×960, 1920×1080, 1280×720, 1024×768, and 390×844. Main-text center offset measured 0px in both axes at every size, also checked for all three modes in Japanese, English and Korean. No horizontal overflow or JavaScript/WebGL errors. A 1440×900 Retina window also renders a 2880×1800 canvas (see qa/retina.json). Background and mascot lighting samples differed by less than one frame. Pause, independent leaf deformation, reduced motion, repeated mounting, and teardown passed.

Visual review: desktop wide-hall framing and warm/cool mascot shading were inspected in desktop/portrait screenshots. Normal-speed motion was sampled over 8 seconds, with a separate uninterrupted recording saved as qa/normal-motion.webm. Foliage deformation was also isolated from the static architecture in the browser check. Screenshots record appearance; the automated tests establish geometry/lifecycle behavior, not user approval. Portrait windows still crop horizontally to fill the viewport; the widest space is visible in landscape windows. Authenticated gameplay is outside this preview.

## Exact generation prompts

### Background (edit target: staged transparent library foreground)

Use case: precise-object-edit / background-extraction. Edit target: attached fantasy library background plate. Produce a new HIGH RESOLUTION 3840x2160 landscape 16:9 game background PNG with real alpha. Pull the camera back substantially, to about 65% of the reference architectural size, revealing more of this SAME spacious Biblion white marble library hall: the complete upper vault and full round golden eye/compass window, several airy arches across the left and center, more sunlit marble floor in the lower quarter, and the same wooden reading desk and books at the right. The composition must visibly feel like a wide establishing interior, not a closeup of one column. Preserve the reference illustration style, elegant ivory marble, slender gold trim, burgundy and navy hanging banners, distant blue castle and mountain lake through openings. Fine crisp architectural edges and detailed textures, no blur or depth-of-field. The central area is welcoming open floor and airy arches. Warm daylight from upper left. IMPORTANT LAYERING: all sky seen through the arches and circular window must be fully transparent; retain distant castle, mountains and lake as opaque scenery. Remove ALL ivy, climbing leaves and potted plants from the architecture (they will be separate animated layers); leave clean marble underneath. Do not draw moving light rays or airborne particles. No character, no mascot, no text, no UI, no logo overlay. Keep the outer image rectangle full and filled by architecture/floor: transparency only in sky apertures. Output at requested high resolution, no padding or decorative border.

Generated source: `/Users/hiromaru05s/.codex/generated_images/01a13e18-eedb-7460-8d7d-c008d1563c7a/exec-bb003738-da63-4dff-96f3-b5df858a8f5e.png`.

### Ivy (reference: original staged library ivy)

Use case: background-extraction / precise-object-edit. Reference: the dark green ivy climbing down the center white column in the attached library art. Create ONLY a separate tall narrow cascading ivy vine sprite, transparent PNG, long portrait 1:3 shape. Match the original elegant fantasy illustration leaf shapes, small lobed ivy leaves, dense dark green central stem with irregular slender offshoots, muted olive leaves illuminated softly from upper left, cool shaded leaf undersides. Hundreds of tiny crisply separated leaves, fine stems. A clump fastens at the TOP and slender tendrils cascade toward bottom, irregular asymmetric silhouette. Leave transparent gaps between the leaves and between branchlets. The bottom narrows to several fine trailing twigs. All the vine is isolated in transparent air, no column, no stone, no wall, no floor, no cast shadow, no sky, no pot, no text. Fill most of the tall canvas but preserve clear transparency at the outer edges. This exact sprite will be attached to library columns and its lower twigs animated by a light breeze.

Generated source: `/Users/hiromaru05s/.codex/generated_images/01a13e18-eedb-7460-8d7d-c008d1563c7a/exec-11bab371-c100-4a66-b136-b20b28fdbae2.png`.
