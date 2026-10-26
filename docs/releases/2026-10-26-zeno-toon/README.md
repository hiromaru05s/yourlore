# Zeno — approved toon surface

2026-10-26: user approved the live `zeno-toon.html` preview and requested production adoption. The previous three material studies were rejected. This release adopts the toon preview's defaults: shadow softness 0.045 and contour multiplier 1.15.

Shared HOME/tutorial rendering now uses warm ivory light, blue-violet shadow planes, a colored contour and a stylized cyan teardrop. The shader is original; no extracted game assets or generated animation frames are used. Geometry, camera, placement, gesture timing and interaction are retained. Outlines share their parent's deforming geometry. Expression materials retain their identity so smiles/yawns continue to animate opacity. Custom comparison forms and silhouettes remain independent.

## Validation before release

- Client typecheck and focused toon/material, gesture and interaction tests pass.
- Existing HOME browser suite passes: greeting, bounded rotation/return, full ambient gesture, idle motion, hidden-document suspension, reduced motion, renderer reuse after tutorial, four viewport sizes and WebGL fallback. No browser exceptions or shader errors.
- Tutorial screenshot now waits for the actual canvas and loading overlay completion.
- Visual inspection: HOME background, warm/cool plane separation, droplet highlight, narrow contour, greeting and ambient gesture frames, desktop/mobile and tutorial. Local browser video records the continuous gesture sequence; the contact sheet is supplementary, not a replacement for the motion checks.
- Browser QA uses API fixtures and real client assets. It does not establish authenticated-account or online-battle behavior.

Production deployment/asset verification is recorded separately after the guarded release.
