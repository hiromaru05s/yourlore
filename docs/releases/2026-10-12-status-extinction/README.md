# Selected status extinction: S1 / D2 / B2

User selection on 2026-10-12: シールドは1、雫は2、烙印は2。ステージング適用。

- Shield S1「霜鋼の破断」940 ms.
- Dew D2「水膜の破裂」880 ms.
- Brand B2「呪紋の焼却」1040 ms.

The approved UV geometry, shader, number treatment and timing are taken unchanged from the [comparison studies](../../vfx-prototypes/2026-10-12-status-extinction-four/README.md). Runtime selection contains only these three studies. Counter textures are bounded to 12 cache entries; the renderer is shared and disposed when the controller leaves.

The shared reducer emits a public `statusExtinction` event only for a positive-to-zero transition. Shield absorption, expiry and removal; Dew payments and clearing; Brand single-counter and full clearing all use this boundary. Partial decreases and repeated zero emit nothing. State resolution remains synchronous. Both online viewers receive the same event, and reconnect snapshots do not replay it.

The production BaseController plays the original badge material at its native portrait position before the board commits its next snapshot. Adjacent simultaneous clear events share playback. Cancellation, resize, hidden document and controller destruction resolve all promises and remove transient canvases; reduced motion removes the badge immediately. Unavailable WebGL uses a short native-face fade. No particles, sounds or decrement animation are added.

Validation records accompany this release. Browser fixtures use the actual controller and board with authoritative reducer outputs. These are separate from authenticated two-player online-match verification.

## Verified before release

- 31 reducer/server cases, including both sockets and reconnect.
- Client and server typecheck with locked dependencies.
- 20 browser groups: all three variants on both sides at 1280 and 390 px, partial loss, repeated zero, both-player clearing, reduced motion, skip, resize and controller disposal. Browser errors: 0.
- Nine sampled frames match the approved preview renderer pixel for pixel. Forty different counter values keep GPU textures bounded at 12.
- Continuous runtime frame observations and native-board images verify material origin and cleanup; this is not a hardware performance certification.
