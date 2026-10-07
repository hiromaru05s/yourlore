# Selected shield / brand grant effects — 2026-10-07

User-selected choreography: SF3 (initial shield), SA1 (additional shield), BF3 (initial brand), BA4 (additional brand). The original twenty-way study remains available locally at `/shield-brand-twenty.html` and shares the selected runtime material. The other sixteen options remain studies.

The revised light has a narrow near-white core, tapered intensity, colored penumbra, and a local reflected highlight. Shield light is ice-blue / white; brand light is carmine / warm amber. Crystal growth fronts replace SF3's radial wire spokes, SA1 carries a short cooling highlight around the existing shield edge, BF3 has asymmetric branching capillary highlights clipped to the spreading lacquer, and BA4 lights the contact edge of the compressing layers. The four approved assembly motions and durations are retained.

`ui/statusGrant` owns production geometry, material, optical paths and playback. Presentation uses the actual portrait badge geometry and typography, including the first badge created from zero. Public `statusGrant` events carry only owner, resource, before and after. Initial versus additional is selected at each mutation, not from the net batch delta; all twenty brand increment sites and the common shield gain helper emit it. No hidden card information or game timing is added to these events. The gameplay state still resolves synchronously. Dew behavior is untouched.

Public spell sources remain visible until arrival. Native resource labels commit at contact and are restored on completion, interruption, resize, reduced motion, hidden document, missing assets or disposal. Temporary canvases and WebGL contexts are released. Normal-motion WebGL unavailability uses the same Canvas material assembly with original art; reduced motion commits immediately.

Validation:
- `tests/status-grant.mjs`: both owners, both resources, initial/additional values, zero/negative no-op, gain/consume/regain, doubled shield and its existing dew reaction, real shield card action, audit of direct brand increments.
- `tests/status-grant-browser.mjs`: actual BaseController on the runtime cosmetic board with real reducer results, all four selected variants, portrait anchoring, final values, canvas cleanup, mobile overflow, reduced motion and disposal during playback. It can run against local or staged unmodified bundles using `LORE_TEST_URL`.
- Repository production suite, client/server type checks and committed-snapshot build run through `scripts/deploy-guard.mjs` before staging publication.

Functional test results do not certify visual parity with Genshin. Browser fixtures exercise real rendering and controller paths, but do not constitute an authenticated online match.
