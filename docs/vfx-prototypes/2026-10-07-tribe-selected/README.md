# Approved tribe presentation — 2026-10-07

User selected all synergy stages, and these summons from the revision 2 preview:

| Tribe | Study | Runtime index |
|---|---|---|
| 孤独 | 02 / 霧からの実体化 | 1 |
| 捕食 | 03 / 爪の一撃 | 2 |
| 貴族 | 03 / 黄金の叙任 | 2 |
| 魔族 | 02 / 黒炎の消失 | 1 |
| 始原 | 02 / 古層の覚醒 | 1 |

`client/src/ui/tribePresentation/` freezes the exact approved renderer, timing and catalog from preview commit 59f4912e. `approved-hashes.json` and the production regression test protect that source parity. No rejected summon is selected.

The existing hand reveal transfers into one tribe flight/landing clock. After its first 450 ms the overlay uses the actual projected slot. Ordinary non-tribe summons keep their existing slate presentation; selected tribes do not stack slate or duplicate landing impacts. Public card faces are captured upright and released on completion, abort, skip, disconnected anchor, hidden page and errors. Reduced motion returns the real card directly. Spell, attack, destruction and readiness effects are unchanged.

Synergy: actual engine threshold minus one chooses stages 1/2/3, saturating at 3. Origin's threshold 6 routes to the frozen victory seal only with an actual matching win event. Its prior source-card illumination and magic-circle painter remain unchanged. No gameplay rules or thresholds change.

Verification:
- 24 card IDs select the requested 5 studies; unrelated cards retain fallback.
- Tier saturation 2–9; reduced motion, pre-abort, capture cancellation, unavailable texture fallback and detached source.
- Existing 28 engine synergy fixtures.
- `/tribe-approved.html` runs 18 actual reducer/controller cases: both owners × five summons and four synergy/victory cases. This QA entry is not a production build entry point.
- Required production regression suite, typecheck and build run through the guarded staging release. Staging delivered-file parity and local browser runtime evidence are separate from authenticated staging gameplay.
