# Story chapter start and continue

User request: offer 最初から / 続きから, disable Continue without saved progress, use one click, and confirm Start over with YES / NO.

- Base: remote `gh/main`, `7e51b93d1dd1eaff798dfc1722cfdf9e09760996` (fetched 2026-11-19).
- Implementation: `client/src/screens/single.ts`, `client/src/ui/storyScene.ts`, `client/src/styles/storyGallery.css`.
- Source / preview launch directory: `/Users/hiromaru05s/.codex/worktrees/story-start-continue-1119/LORE_TCG`.
- Preview: `http://127.0.0.1:5196/single-preview.html?story`, local guest fixture.
- Existing chapter paintings, animated covers, NPC assets, lounge and shared azure-silver UI are inherited from the base. The browser check confirmed animated chapter GIFs and NPC canvas rendering.

Each chapter now contains native Start over and Continue buttons, with no double-click launch. Start over opens a native modal with NO focused, Escape cancellation and YES confirmation. YES resets that chapter's before/after conversation cursors and opens its first line; completed objectives and chapter unlock receipts are retained. Continue uses a valid account-scoped conversation cursor first, then any pending chapter objective/conversation. Finished chapters have no continuation unless a reread was paused; chapter 5 continues to the Master selection.

Validation:

- Client typecheck, design guard and production build passed.
- `tests/single-story.mjs`: passed server progress gates, account isolation and idempotency.
- `tests/story-gallery-browser.mjs`: passed disabled states, YES/NO/Escape, keyboard activation, exact line resumption, restart, completed reread, drag/touch scrolling, reduced motion and three languages. Captures at 320, 390, 844, 1280 and 1440 pixels in `/tmp/lore-story-start-continue-qa`.
- Desktop and mobile screenshots inspected; the confirmation dialog was subsequently centered and checked at 1280x720 and 320x740. Assets and preview origin were checked in the running browser.
- The full `tests/single-story-browser.mjs` run timed out at the existing tutorial's Next button (step 2); no page or API errors were recorded. This run does not establish full tutorial completion.

- A targeted copy of the story browser flow using a settled basic-practice receipt passed: VN save retry, later chapters, NPC entries, normal-match gates, Master selection, Aries dialogue/personal story, training book and three languages. Evidence: `/tmp/lore-story-entry-flow-fixture-qa/report.json`. This uses fixtures for completed battles/practice and does not establish live PvP or full tutorial play.

## Full-screen advance and release authorization

The user additionally requested advancing by clicking anywhere on the conversation screen and deploying both changes to production. The whole native conversation dialog now advances on a click, including the background, character area, text, name and header. Dedicated buttons are excluded from the shared handler, retaining Back / Pause / SKIP / Next without double advancement. Busy and closed conversations do not advance. Keyboard navigation is preserved.

Integrated remote main `f87eca10e3b1dac1180c10671ddfe1487b1d5548` before this follow-up, retaining the accepted result ceremony changes. `client/src/styles/singleStory.css` adds the pointer cursor; no character, painting, animation or dialogue changes.

Release authorization covers Start over / Continue and full-screen advance together. The guarded production deploy validates the committed remote-main snapshot and holds the shared release lock; deployment result is reported after publication.
