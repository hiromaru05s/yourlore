# Living story chapter gallery

Baseline: `d1e1aff20` from `gh/main`, including the adopted chapter gallery. Implementation: `client/src/screens/single.ts`, `client/src/styles/storyGallery.css`, `client/src/ui/{storyArt,storyGallery,singleIdle}.ts`.

Preview launch root: `/Users/hiromaru05s/.codex/worktrees/story-gallery-1119/LORE_TCG`. Actual app preview: `http://127.0.0.1:5197/single-preview.html?story`. Browser QA launches the same source with a Worker-backed in-memory account fixture; exact ephemeral origins are in its reports.

Five new original anime-style Biblion environments replace the chapter paintings. The adopted lounge reference is `client/public/art/lounge/toon-balanced-20261026/library-daylight.webp`; existing `art/single-standing/refined-v2/{lumi,noel,vera}.webp`, NPC page arrows, shared lounge header/background/dock remain in use. New production art lives in `client/public/art/single-story/chapters-v2/`.

Each environment is an actual 480×720, 96-frame, six-second looping GIF. Local cloth, foliage, crystal, pages, fountain water and painted illumination move with a stationary camera and architecture. `scripts/render-story-gifs.mjs` renders periodic WebGL deformation and encodes with FFmpeg. Posters are 768×1152 WebP. Offscreen, hidden, modal-covered and reduced-motion environments use posters; character meshes reuse the adopted breathing, hair and blinking IDLE.

Single-click selects without rebuilding the card. Double-click or Enter starts the chapter's next activity or dialogue; completed chapters can be reread. The former below-art detail panel is removed. Master selection is a separate dialog opened from Chapter 5. Locked art is faded blue-black with a central lock and unlock condition. Native swipe, mouse drag, arrows and keyboard navigation remain available; drag suppresses accidental activation.

Functional validation: client/server typecheck, gallery browser checks, and complete story browser flow pass. The basic tutorial is played through visible controls and its transcript is validated by the real Worker fixture. Later victories are seeded settled receipts; this is not a live PvP run. Gallery checks cover single/double click, Enter, no lower panel, locks, GIF playback, changing IDLE canvas, arrows/drag/touch, reduced motion, Japanese/English/Korean and 320/390/844/1280/1440 layouts.

Visual validation is separate: repeated actual-app frames and continuous loops were reviewed in IAB, alongside the approved benchmark `docs/vfx-prototypes/2026-09-27-rift-ink-rich/qa/inscription.mp4` from the primary workspace. Motion stays attached to the painted material; no isolated decorative particle rings or whole-image camera bobbing. At 1280×720 the card bottom clears the dock and the central lock clears title text. Numerical phase-0/phase-1 seam differences and actual GIF metadata are recorded in `gif-validation.json`; these verify periodicity, not aesthetic approval by the user.
