# HOME tier size — 2026-10-30

The user requested a larger HOME tier icon without making the other controls too small, followed by production deployment.

- The existing SVG crest is now 104px square normally, 88px in compact layouts and 64px in short landscape layouts (previously 30–48px wide).
- Compact HOME places rank and duel side by side. Portrait phones show play/rank/deck before the three quests, with vertical scrolling instead of further shrinking controls. Desktop quest placement is retained.
- Preserve the adopted azure panel/buttons, silver duel frame, current Zeno and illustrated background. No art replacement or animation changes.
- The same quest DOM node moves between portrait content and desktop profile; API state and event handlers persist through resize and profile refresh.

Source: started from remote main `89e4e752fc671415baea52466d5759cf39d32bad`, which matched the production deployment inspected during work. Owning files: `client/src/screens/home.ts`, `client/src/ui/lounge.ts`, `client/src/ui/rankPresentation.ts`, and new `client/src/styles/homeTier.css`. Adopted materials remain owned by `homeDuelButton.ts`, `homeDuelButton.css`, `defaultUI.css`, `rankEmblem.ts`, `homeSpirit.ts` and `homeAtmosphere.ts`.

Preview launch directory: `/Users/hiromaru05s/.codex/worktrees/home-tier-large/LORE_TCG`; Vite URL: `http://127.0.0.1:5508`. Screenshots use real current art with fixture account/rank/quest API responses. They are not authenticated-account or physical-device tests and do not imply user visual approval.

Validation: `tests/home-tier-browser.mjs` passed nine viewports (320×568 through 1440×900, including landscape), Japanese/English/Korean, all three quests, circle geometry, rank/deck separation, quest reachability, preserved node on profile refresh/orientation, keyboard rank navigation, mode/BOT/deck navigation, and rank failure/retry. Client/server typechecks passed. Browser report and representative screenshots are included.

Deployment status will be recorded after the guarded production release.
