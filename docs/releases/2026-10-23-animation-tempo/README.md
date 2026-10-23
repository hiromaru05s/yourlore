# Duel animation time reduction — 2026-10-23

Requested: standard summons, spell plays, quests and persistent spell placement take 70% of their previous presentation time; dedicated summon/spell/effect sequences take 75%. Player turn time must not increase.

`animationTempo.ts` supplies two presentation clocks. Each runtime advances the existing authored timeline at the chosen rate, preserving contact gates, pose curves, final native-face handoffs and cleanup. Shared DOM flight transitions and waits use the same duration scale. Resource loading, cancellation watchdogs, input deadlines, server state and turn clocks remain on real time. Time spent preparing assets is not claimed as a fixed-percentage reduction.

| Stage | Previous | Current |
| --- | ---: | ---: |
| Standard summon material | 2,500 ms | 1,750 ms |
| Standard spell frame | 640 ms | 448 ms |
| Quest pact | 4,800 ms | 3,360 ms |
| Persistent spell placement | 2,200 ms | 1,540 ms |
| Castle material (excluding hand flight) | 2,600 ms | 1,950 ms |
| Castle hand flight | 440 ms | 330 ms |

The 75% clock covers selected summon families (including Mimic, merchant coins, tribes, fusion, hatch and rebirth), dedicated spell runtimes (including curse, creation, elemental spells, soul harvest, massacre, timewarp, rune replay, fate-wheel rewind and treason), effect grants/extinction, Rift and destruction material, and triggered monster feedback. Persistent ambient loops and player decision time are not sped up. Standard combat attacks and dice rolls are outside the requested summon/spell VFX duration change.

## Validation

- TypeScript client/server checks.
- Production suite plus updated deterministic lifecycle tests: the same authored contact and cleanup phases are asserted at 70%/75% wall time. Final guarded release reruns the complete suite from the committed current-main snapshot.
- `tests/animation-tempo-browser.mjs`: real reducer → controller → board playback, 15 cases across both owners, 1280px and 390px viewports, cancellation/resize/hidden/reduced motion; explicit checks that the selected runtime appeared and no transient layers remained.
- Continuous playback video and sampled frames: `/tmp/lore-animation-tempo/`. Standard material progressed at approximately 1.429 authored milliseconds per real millisecond; dedicated castle/mage material at approximately 1.333. Native faces remain at the ending pose. This is browser fixture evidence, not an authenticated multiplayer match or a new user visual approval.
- Existing turn-clock regression verifies server-time accounting, delayed playback, reconnect, expiry, opening and disabled tutorial timers. No engine or server timer implementation changed.

Deployment status and exact source/version are recorded separately after the guarded production release.
