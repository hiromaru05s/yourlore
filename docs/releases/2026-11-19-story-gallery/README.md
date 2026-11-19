# Story chapter gallery

Source baseline: `5de0b41ef` (fetched `gh/main`, 2026-11-19).
Implementation: `client/src/screens/single.ts`, `client/src/styles/storyGallery.css`, `client/src/ui/storyGallery.ts`.
Preview launch root: `/Users/hiromaru05s/.codex/worktrees/story-gallery-1119/LORE_TCG`; Vite serves the actual application through the story browser fixture, with the origin recorded in its report.

Five original painted chapter environments in `client/public/art/single-story/chapters-v1/`, generated for this release and encoded as 768×1152 WebP. Existing adopted portraits remain `art/single-standing/refined-v2/{lumi,noel,vera}.webp`; page arrows reuse `client/src/assets/single/page-arrow.svg` from NPC battles. Shared lounge background, header and dock retain the baseline implementation.

Wide portrait covers form a horizontally scrolling chapter gallery. Mouse drag, native touch scroll, left/right keyboard and NPC arrows navigate it. Locked chapters remain visible but cannot be entered. Chapter selection preserves existing story actions, qualifications, dialogue persistence and Master entries.

Validation: `tests/story-gallery-browser.mjs` checks arrow boundaries, drag without selection, keyboard, image loads, portrait proportions, viewport overflow and Japanese/English/Korean. Existing `tests/single-story-browser.mjs` checks progression and story/training flows. Fixture later-game victories are test receipts, not live PvP. Visual review and functional checks do not constitute user design approval.

Local checks passed: client/server typecheck, complete existing story browser workflow, and gallery browser checks including native touch swipe and selecting a chapter to open its dialogue. Desktop and mobile captures were visually reviewed after exempting cover artwork and NPC arrows from standard button plates. Preview origin: `http://127.0.0.1:5174/` (fixture API, actual app and assets). See `gallery-report.json`, `progression-report.json`, `desktop.png`, `mobile.png`.

## Production verification

Released 2026-11-19 at 10:16 KST to https://yourlore.xyz. Source: `4f20db7a55ae2cb59b5fe48e92e3c7e23b5f50df`. Worker: `75f3b6c1-3c60-455f-b042-1ad84c6e9f45`, 100% traffic. Guarded snapshot passed schema verification, client/server typecheck, all 299 production tests, design guard and build. The first attempt passed all checks but correctly stopped because main advanced with another release's documentation; the fast-forwarded release passed again and deployed.

All five public chapter WebP SHA-256 hashes match committed files. Browser checks at the actual production origin passed arrows, mouse drag, native touch swipe, locked chapters, story entry and 320/390/844/1280 widths, with no browser/API errors. Production browser identity and progression use an isolated API fixture; public app JS/CSS/images are real. This is not a real-account progression or live PvP test. Local browser validation covered Japanese, English and Korean and the real Worker fixture's progression. Production desktop/mobile captures were visually inspected. Shared background, header, navigation and adopted portraits match the source baseline.
