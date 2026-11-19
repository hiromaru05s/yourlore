# Approved duel opening release — 2026-11-19

User approval: full-bleed battle cards, blue-white pre-contact light, strong initial clash / rejoin and sustained blue mana friction, compact floating one-medal profile panel. Result sound **III-C / h-land.wav** explicitly selected in this chat. Other six sounds: rise B, impact B, toss B, rejoin A, friction A, exit A.

## Sources and scope

Reference main: `65f0775f772e0e3551ef745573c0fe66dffe09fa`; worktree base `d815a6ac9364fc8040f8f069122dfc06ac5f1a68`. No intervening main changes to the opening implementation, NPC roster/art, game screen/controller or GameRoom at inspection. Existing work was preserved.

Preview server: `/Users/hiromaru05s/.codex/worktrees/opening-flame-1118/LORE_TCG/client`, port 5278. Replays: `/duel-lab.html?opening&playable&npc=normal` and `npc=hard`; `sounds=result` retains comparison candidates, with III-C the default. `ranked` uses explicitly simulated Lv 24/37 and MMR 1218/1462.

Sources: `client/src/shared/botNpcs.ts`, `client/public/art/npcs/v2/{noel,vera}.webp`, accepted `client/public/art/duel-portraits/wind-v5/`, and `client/public/art/ui/duel-nameplate-azure.svg`. Shared library clean plate is the accepted Lumi background, also used for the two new NPCs in the same library. Aries and Sion art were not changed.

## Characters

Built-in image_gen created Noel/Vera masters, clean forehead underpaintings and registered foreground forelocks. Exact prompts are in `prompts.json`; final assets are under `client/public/art/duel-portraits/wind-npcs-v1/`. No API/CLI fallback was used.

The live shader and GIF baker share a 2.4-second loop. Eight directional GIFs cover Seeker, Lumi, Noel and Vera: 768 square, 48 frames, 20 fps. The game uses high-resolution PNG layers and the shared GPU rig rather than upscaling a low-resolution idle GIF. Loose cape/coat fabric and hair receive wind; shoulders, torso, hands, glasses and visible face landmarks stay anchored. Noel's hair can occlude the inner lens naturally; fixed-landmark probes use the uncovered outer eye/lens. Forelocks are opaque painted layers over a stationary forehead, not animated colour-key masks. Source and destination cloth masks prevent pulling sleeve pixels into the cape.

Accepted Seeker/Lumi PNGs, GIFs and Lumi fringe matte source remain byte-identical. The shared wind module was extended; their existing motion fields are unchanged.

## Runtime and profiles

The approved seven sounds now run through the production director and existing mute/limiter/abort bus. The old opening music intro is replaced by this synchronized sound sequence; existing battle music begins on battle-ready. The persistent sound inventory and SHA256 manifest include the seven adopted files; the WAV MIME type is explicit.

The compact panel contains name, Lv, one medal slot and (ranked only) rank/MMR. Missing NPC/legacy level is shown as a dash, not an invented level. Server room creation snapshots public levels and ranked ratings, including GM; no XP total or private profile data is exposed. Existing stored rooms retain their deadline and tolerate absent profiles.

Opening artwork is warmed for the actual selected opponent before readiness; gallery caching does not make every NPC illustration a duel-admission requirement.

## Verification

- `anatomy.json`: all 48 frames in both directions; every hand-marked protected region has zero changed pixels. Hair/fringe and cloth motion are independently required. `*-motion-map.png` visualize the moving pixels.
- The baker compares t=0 and t=2.4 and reports equal loop seams for all four characters; no WebGL/JS errors.
- `browser-qa.json`: real renderer/board, normal and hard, desktop 1280x720 / portrait 390x844 / landscape 844x390. Exactly seven default cues, including h-land, at the contact/result timestamps; audible friction, return to board, abort silence and reduced-motion silence. Screenshots are rendering evidence, not authentic ranked profiles.
- `app-browser.json`: real app startup/resume and OnlineController for easy/normal/hard/hell, correct opening identity and unchanged board portrait, return to unlocked board. API/account/WebSocket responses are fixtures, not authenticated live PvP.
- Client/server typechecks, profile SQLite tests, opening readiness/server persistence tests, both-seat NPC/profile mapping, result continuity/deadline/cancellation tests and audio lifecycle checks pass.
- Full production suite initially exposed two stale fixture/inventory assumptions; the tier fixture and sound manifest checks were updated and their tests pass. Final clean-snapshot suite/build/deploy status is recorded in the release report after deployment.

Visual inspection and functional tests are distinct: screenshots and enlarged frame strips were inspected for intact forelocks, no white gaps, stable anatomy and compact panels. They are not a substitute for the user's artistic judgment or a physical-phone test.

## Production verification

Released source `1166b8625f4fee3507b39e6edfeaa360bf525f76`, Worker version `0a019838-5f46-4d52-8f86-51451d8b2a44`. The existing guard completed schema validation, typechecks, **302/302** tests, clean-snapshot production build and deployment. Details: `release.json`.

`production-assets.json` records 27 matching served SHA256s: all eight GIFs, PNG layers, seven selected sounds, adopted nameplate and empty-medal art. `production-app.json` records the actual production-bundled app for all four dojo difficulties: each rendered the correct character, played all seven sounds including III-C within 150 ms of the intended timestamps, and returned to an unlocked board without JS errors. Noel/Vera frames are `production-noel.png` / `production-vera.png`. Public production code/assets were real; account/API/WebSocket state was supplied by fixtures. Authenticated live PvP and physical-phone playback were not performed.
