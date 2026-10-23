# iPad card controls

The reported incident leaves both selected filters and page labels unchanged. The exact original incident has not been reproduced on a physical iPad. Current desktop WebKit with iPad touch emulation passes ordinary taps, open-filter dismissal, and rotation checks. Some automation runs stalled; these are not proof of the reported incident.

A separate reproduced failure (one rejected card-art download holds the old list while the page label changes, with retry below the visible scroll area) does not match the user's clarification and is not claimed as the cause or fixed in this patch.

The scoped mitigation removes reliance on synthesized mouse clicks for stationary touch/pen gestures on card controls. Pointer release invokes native button/summary activation once, trailing compatibility clicks are consumed, and movement, scrolling, cancel, secondary touches, disabled controls and teardown do not activate. Outside-filter dismissal now happens after click activation, rather than changing layout during pointerdown. Touch targets increase from 26/32px to at least 44px without changing card assets.

Validation: typecheck and build pass; touch activation regression covers withheld and duplicate clicks, keyboard/mouse, scrolling and lifecycle. WebKit coordinate-tap harness covers 1194x834, 834x1194, 1024x768 and 768x1024. Full guarded suite and live release verification are recorded separately. This is a touch handling mitigation; root cause confirmation of the user's original incident remains open.
