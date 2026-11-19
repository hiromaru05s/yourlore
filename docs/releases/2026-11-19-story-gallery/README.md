# Story chapter gallery

Source baseline: `5de0b41ef` (fetched `gh/main`, 2026-11-19).
Implementation: `client/src/screens/single.ts`, `client/src/styles/storyGallery.css`, `client/src/ui/storyGallery.ts`.
Preview launch root: `/Users/hiromaru05s/.codex/worktrees/story-gallery-1119/LORE_TCG`; Vite serves the actual application through the story browser fixture, with the origin recorded in its report.

Five original painted chapter environments in `client/public/art/single-story/chapters-v1/`, generated for this release and encoded as 768×1152 WebP. Existing adopted portraits remain `art/single-standing/refined-v2/{lumi,noel,vera}.webp`; page arrows reuse `client/src/assets/single/page-arrow.svg` from NPC battles. Shared lounge background, header and dock retain the baseline implementation.

Wide portrait covers form a horizontally scrolling chapter gallery. Mouse drag, native touch scroll, left/right keyboard and NPC arrows navigate it. Locked chapters remain visible but cannot be entered. Chapter selection preserves existing story actions, qualifications, dialogue persistence and Master entries.

Validation: `tests/story-gallery-browser.mjs` checks arrow boundaries, drag without selection, keyboard, image loads, portrait proportions, viewport overflow and Japanese/English/Korean. Existing `tests/single-story-browser.mjs` checks progression and story/training flows. Fixture later-game victories are test receipts, not live PvP. Visual review and functional checks do not constitute user design approval.
