# Coin result — approved 05 Lumen Weave

2026-10-07: user selected 05 from the seven coin-result studies and authorized staging delivery.

Source: local `client/src/dev/order-seven/result.ts`, SHA-256 `71c51c0f16a870adad8784ad3b44a7e6869a2cb272d743addbe0bf8fa40d5677`, variant index 4. Only its two continuous light sheets, coin settling, metallic lettering and reflection are adopted. Other candidate designs remain preview-only.

The result starts at the existing authoritative 3.22 s reveal. Collision, VS caustic, toss, sounds, 5.58 s deal boundary and 6.93 s server gate are unchanged. No BATTLE START or turn notification is added. The existing controller owns turn notices.

Runtime adaptations: preserve the incoming mobile coin radius at the toss/result boundary; retain Japanese/English/Korean outcomes and fit the longer English title; reduced motion holds a still pose and fades with the existing exit clock. No new assets or dependencies.

Validation before release:
- Client typecheck and opening lifecycle regression pass.
- Real result tests cover landing continuity on desktop/mobile, both outcomes in all three languages, static reduced motion and result lifetime; existing tests cover one deal, no duplicate notices/cues, server deadlines, old rooms, hidden tabs, abort and cleanup.
- Browser actual GameView opening lab: both Japanese outcomes inspected at ~3.95 s; 390 × 844 opponent result has no document horizontal overflow. Continuous playback returns to the board with dealt hands. No browser error logged. These checks are local runtime evidence, not authenticated staging PvP evidence.
- Screenshots are retained in the primary workspace under this directory's `qa/` folder. Deployment source/version and asset parity are recorded separately after guarded deployment.
