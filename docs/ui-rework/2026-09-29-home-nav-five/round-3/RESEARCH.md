# HOME bottom navigation — Round 03

2026-09-29. Local studies only. No production integration or deployment.
The first two rounds were rejected: web-like, then overly decorated. Round 02 source is retained in `../round-2/source/`.

## Sources actually inspected

- **Honkai: Star Rail — Character menu**: [screen](https://interfaceingame.com/screenshots/honkai-star-rail-character-menu/). Viewed the full screenshot. Character and empty space dominate; compact monochrome symbols sit on calm dark surfaces. Applied to 01: lower density, monochrome glyphs, one moving focus surface.
- **Persona 3 Reload**: [UI developer interview, Famitsu, 2023-11-29](https://www.famitsu.com/news/202311/29325647.html). Read developer comments and viewed the in-article menu screenshot. Interview discusses the inner-sea concept and maintaining responsive operation while iterating visual layouts. Applied to 02: angled composition, contrasting selected typography and directional reveal. The official trailer was linked but not used as observed animation evidence.
- **NieR:Automata — Using an item**: [video](https://interfaceingame.com/screenshots/nierautomata-using-an-item/). Played the approximately 12-second UI clip in browser and inspected early line formation, intermediate partial text, and the completed item selection. Applied to 03: flat paper/charcoal surfaces, restrained rules, short text movement. Timings below are original prototype choices, not measured timings from NieR.
- **Clair Obscur: Expedition 33**: [pause](https://interfaceingame.com/screenshots/clair-obscur-expedition-33-pause/), [character selection](https://interfaceingame.com/screenshots/clair-obscur-expedition-33-character-selection/). Viewed both screenshots. Serif typography, atmosphere retained behind sparse controls, illustrated selection surfaces. Applied to 04: restrained type and small corner marks; 05: continuous artwork strip with color reserved for selection. No animation timing claims are made from these still images.

Reference artwork was not downloaded or embedded in LORE. These are adaptations of hierarchy, composition and interaction principles, not reproductions of game assets.

## Five studies

| # | Design | Composition | Selection motion |
|---|---|---|---|
| 01 | 静かな光の水平線 | Low monochrome glyph row, single beam | 360ms moving surface; 300ms 5px text settling |
| 02 | 蒼のカットアウト | Ivory diagonal cut against navy, larger selected title | 280ms moving cut; 300ms directional type reveal |
| 03 | 書庫の索引 | Flat ivory index and charcoal block | 220ms selection block; 300ms short text movement |
| 04 | 余白と活字 | Scene-first serif typography, small corner marks | 460ms focus travel and text sharpening |
| 05 | 物語のフィルム | LORE artwork reel, labels on quiet dark footer | 420ms frame; 320ms color; 520ms artwork settling |

All seven destinations remain visible. The fixture changes selection only. It does not navigate to real game screens, save game data, authenticate, or initiate matches.

## Local implementation

- `client/home-nav-lab.html`: comparison UI, 1280/390/320 viewport modes, original comparison, demo, half-speed, reduced-motion control, source notes.
- `client/src/dev/homeNavScene.ts`: real HOME fixture with sampled profile; releases HOME subscriptions/audio after mount.
- `client/src/dev/homeNavMotion.ts`: original single-color SVG glyphs, moving selection surface, cancellation on rapid input, keyboard left/right/home/end controls.
- `client/src/dev/homeNavVariants.css`: five isolated compositions and responsive styles.

Animation review followed `docs/animation-quality-benchmark.md` and `docs/vfx-art-direction.md`, with the approved inscription video and frames inspected. For this small navigation interaction, continuity comes from the selected surface moving to the new location and the typography settling on that surface. There are no detached particles or decorative loops. This does not constitute user approval of the new visual quality.

The demo visits all seven destinations and returns to HOME. Manual selection cancels demo progression in that scene. New selection cancels old text/art animations and retargets the focus surface from its currently rendered position. Reduced-motion skips WAAPI movement and disables CSS transitions, while retaining immediate state feedback.

## Verification

- Browser checked all five at 1280×720, 390×844, 320×568 and 844×390. All seven labels contained within their buttons; measured results in `qa.json`, screenshots alongside this note.
- Click selection works; repeated deck → shop → cards leaves exactly one active item. ArrowRight from ranking selects friends.
- Half-speed sets the scene motion multiplier to 2; reduced-motion immediately selects the new item and yields 0s CSS transitions.
- Targeted TypeScript check for the fixture and its imports passed, using the client configuration plus Vite client declarations.
- The full client typecheck failed on unrelated concurrent `series-vfx-b/choreography.ts` and `series-vfx-c/main.ts` errors at the time of execution. These files were not modified by this task.
- No production build/deploy was performed. Visual quality remains for user review; functional checks alone are not visual approval.
