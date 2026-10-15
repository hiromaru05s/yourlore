# Quest play: approved amethyst pact 01

User selected 紫墨の血判 (01) from the refined quest-pact-five study (prototype commit 56163db5), and requested language-neutral contract writing plus staging integration.

The runtime now uses only the selected book/ink/wax/stamp renderer. Interior headings, body, condition and footer are authored stroke glyphs, with no font, Japanese, English or numerical text. Real card identity and the native quest progress UI still use the game's existing localization. The approved 4800 ms opening, sealing and closing envelopes are retained. The closing card moves into the projected quest slot and hands ownership back to the native GameView. Renderer loading starts during the hand reveal. Abort, hidden document, reduced motion and unavailable WebGL retain the native placement fallback.

## Verification

- Typecheck passed.
- `tests/quest-pact.mjs` checks the actual runtime lifecycle with a controlled GPU stand-in: full duration, cancellation before/during capture and rendering, reduced motion without GPU allocation, renderer failure, hidden document, concurrent casts, disconnected target and disposal. This is functional evidence, not visual approval.
- Browser harness `/quest-play-lab.html?qa=1` uses the real reducer, BaseController, GameView and selected WebGL renderer. At 1280×720 and 390×844, Japanese/self Q_RIFT, English/opponent Q_WINTER with 3 occupied slots, English/self Q_MANA with 8 occupied slots, and Japanese/opponent Q_BRAND all reached the native tile with the same UID. Each native handoff differed by less than 0.5 px; no overlay/reveal residue or horizontal page overflow remained. Fast-forward restored the native quest.
- Contract textures generated under Japanese and English were pixel-identical.
- In-browser visual inspection on the board confirmed the purple book, surface-bound glyphs, wax and stamp, and no readable interior headings. Animation selection remains the user's approved 01; functional tests are not used to assert a new visual quality approval.
- The development harness is excluded from the production build. These are local gameplay-pipeline checks, not an authenticated two-player staging match.

Staging release SHA and delivery verification are recorded separately after the guarded deployment.
