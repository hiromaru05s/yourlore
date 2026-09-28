# Portrait resource icon follow-up

Source handoff: `4163729`, integrated as `ea52ab9`. Existing health icon stays lower-left;
the matching generated shield is lower-center and Dew lower-right, for both sides.

The initial component fixture did not run board projection. In the full production
BOT board, `boardProjection.ts` cleared the health counter transform but left the
new counters translated up by half their height. The integration smoke test caught
this misalignment (`local-before-projection-fix/`). The fix includes `.pt-resources`
in the same screen-space transform reset as `.pt-vitals` and `.pt-ring`.

The production-build browser check covers both portraits at 1280x720, 1920x1080,
390x844 and 844x390: left/center/right order, common row, portrait-center alignment,
non-overlap, viewport bounds, visible values, tooltips and accessible names. It also
checks the deployed bytes of health/shield/Dew images, JS/CSS, passive SVGs and board
models. Account endpoints use fixtures; it does not claim an online 2-player match.

Client/server typecheck, build and existing duel UI regression pass. Source reports
cover zero counters and 3-/4-digit values. Local and staging reports below are final
only when their `browser.json` exists without a failure report.

Public staging verification passed all 30 hashes and four full-board viewports,
with zero page/server errors (`staging/browser.json`). An independent source-owner
check confirmed both PNG hashes and the projection fix in the public source map
(`independent-verification.json`). Published source: `480612a`, Worker version
`b30bccdc-c32c-4bf7-ab42-f678a771191e`.
