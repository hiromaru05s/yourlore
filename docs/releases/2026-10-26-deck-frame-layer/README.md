# Deck collection frame layering correction — 2026-10-26

The card art and controls could paint over the collection panel rim. The frame overlay inherited `z-index: -1` from the shared background rule, while card internals had positive layers.

`client/src/styles/deckLayout.css` now confines all card layers to the collection scroll viewport, clips that viewport inside the chamfered opening, and paints only the four-pixel decorative rim above it. The overlay has no pointer events. The wider translucent frame inset stays behind the cards.

Implementation: `22160b85`. Verified implementation snapshot: `f523e70637bdb315393191b1b05b013a047fa239`. Final release source: `96329cc5b660e4b1c070d5868d837c7db60e70b4`, which additionally includes a ranking-only UI correction. The deck stylesheet is byte-identical between these snapshots. Previous spacing and confirmation styling remain adopted.

Preview origin: `/Users/hiromaru05s/.codex/worktrees/outcome-flow-preview/LORE_TCG`, Vite on `http://127.0.0.1:5586/?devLogin=1`. DOM inspection confirmed this checkout's `client/src/styles/deckLayout.css`, `/art/ui/lore-panel-azure-cut.png`, and full-resolution `/art/deck-masters-v1/` card images.

Visual verification: 1911×893 desktop at initial position and mid-scroll, 390×844 portrait, 844×390 landscape (workspace scroll). Cards remain behind the continuous rim; the edge is not a wide translucent overlay over card content. DOM hit testing confirms the add button is still the pointer target, and the frame overlay has `pointer-events: none`.

QA images use a local development guest. Production CSS parity and deployment receipt are recorded separately; no authenticated production deck mutation was performed.

The initial guard passed typecheck, 228/228 tests and build, then correctly withheld deployment because `gh/main` advanced. The subsequent guarded release includes this fix and validates the combined source again.

Production: `https://yourlore.xyz/`, Worker `a3ecb00b-3659-431a-b467-5764244cc0df`, 100% traffic at `2026-10-26T12:04:18.389363Z`. The combined source passed typecheck, 228/228 tests and build. All 11 public CSS files and HTML entrypoint references match the clean guarded build. See `production.json`, `production-suite.json` and `public-css.json`.
