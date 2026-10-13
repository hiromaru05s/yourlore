# Sally — arsenal command (selected #4)

User selection on 2026-10-13: 「ウェポンマスターは４、そのほかは通常召喚のままでいいや。これdステージング適用して」.

Only `SALLY_WEAPONMASTER` adopts **百兵の号令**, from armorer-four revision c9df2c84. `APPRENTICE_ARMORER` and `VETERAN_ARMORER` retain common slate summoning. No card rules change.

The selected seven forged weapons, curved guards, blade fullers, leather wraps, brass inlays, materials, lighting, 3.6-second choreography and timings are extracted intact; the three unselected prototype assemblies are excluded. Hand/generated entry uses a 420ms board-parallel transfer, then the selected timeline. The card plane stays fixed; padded public-face capture preserves its aspect ratio. Each invocation hides its native source synchronously, owns a captured face and one impact, and releases the shared GPU renderer after the last simultaneous job. Abort, resize, hidden page, scene clearing, skip and source replacement restore the original visibility. Reduced motion retains the native card with one impact.

Routing: `focusSummon` skips the generic reveal only for Sally; `flyIntoSlot` directly invokes the selected hand path. `playMonster` reaches Sally through `playSlateSummon`. Shared cancellation includes Sally. Neither Armorer matches the dedicated selector.

Verification fixture: `/weaponmaster-runtime.html` (development only, excluded from production Vite entries). It calls actual GameView + summonFromHand / ghostSummon / playMonster on both board sides, checks renderer counts, final cleanup and card bounds. Separate GPU pixel measurement checks the 180 × 281.25 source plane including correct transparent padding. Unit tests cover effect ownership, impact timing, async-capture cancellation, replacement, shared GPU lifetime, reduced motion and error fallback.

Local fixture playback and deployed asset equality are separate evidence; neither claims authenticated online gameplay.

Desktop verification: all 10 actual routes passed (Sally direct/hand/generated on both sides and the two Armorers on both sides). Native before/after bounds are equal on direct summons. GPU card-body measurement is 180 × 282 raster pixels at both 0ms and 3600ms (nominal height 281.25), with no shader errors. See the adjacent JSON and board screenshot.

Initial production suite: 118/119 passed. The remaining Verdant test had an incomplete `boardProjection` mock that omitted `CARD_RATIO`, now required by the Sally renderer in the bundled routing graph. Restoring the actual exported constant in that mock made its focused rerun pass; no Verdant behavior was changed. Full validation runs again from the release snapshot before publishing. Client/server typecheck and build passed locally.

390×844 responsive verification: the same 10 actual routes passed. Browser error log was empty. `mobile-routes.json`, `mobile-final.png`, and `board-final.png` record restoration. Lifecycle unit coverage separately verifies cancellation, hidden document, resize, pagehide, abort, detachment, pending capture, source replacement, overlapping jobs, reduced motion, and capture/draw fallback.
