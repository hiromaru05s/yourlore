# iPad card controls

The reported incident leaves both selected filters and page labels unchanged. The exact original incident has not been reproduced on a physical iPad. Current desktop WebKit with iPad touch emulation passes ordinary taps, open-filter dismissal, and rotation checks. Some automation runs stalled; these are not proof of the reported incident.

A separate reproduced failure (one rejected card-art download holds the old list while the page label changes, with retry below the visible scroll area) does not match the user's clarification and is not claimed as the cause or fixed in this patch.

The scoped mitigation removes reliance on synthesized mouse clicks for stationary touch/pen gestures on card controls. Pointer release invokes native button/summary activation once, trailing compatibility clicks are consumed, and movement, scrolling, cancel, secondary touches, disabled controls and teardown do not activate. Outside-filter dismissal now happens after click activation, rather than changing layout during pointerdown. Touch targets increase from 26/32px to at least 44px without changing card assets.

Validation: typecheck and build pass; touch activation regression covers withheld and duplicate clicks, keyboard/mouse, scrolling and lifecycle. WebKit coordinate-tap harness covers 1194x834, 834x1194, 1024x768 and 768x1024. Full guarded suite and live release verification are recorded separately. This is a touch handling mitigation; root cause confirmation of the user's original incident remains open.

## Production verification

- Released source: `d01ff56a5514c34a7d87ce6eabe4fd25191883c0`.
- Worker: `2f3c3de3-6e3b-483c-bced-1059409cabde`, 100% traffic, 2026-10-23.
- Guarded release: typecheck, 207/207 tests, production build passed.
- Production URL with API-only account fixture: WebKit 8/8 and Chromium 8/8 (four tablet viewports, normal and withheld compatibility click). No page errors. These are emulated tablet checks, not physical iPad or authenticated account validation.
- All 123 other JS/CSS/JSON assets matched SHA-256. The duel-preload JSON differs only in array order; sorted contents match exactly (97 modules and 15 assets).
- The root cause of the original reported incident remains unconfirmed; the deployed change is a scoped touch-input mitigation, not evidence that the original condition was reproduced.
