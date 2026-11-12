# Single-player duel portraits

The idle art and crop come from the live board (client/src/shared/botNpcs.ts and
client/public/art/npcs/v2), including both distinct characters named Sion/Shion.
Source reference: 38d62dba. The player's adopted shoulder recoil and mana crest
in client/public/art/seekers/faceless-v2 provide the timing reference. Like the
silver-ink benchmark, motion and light follow the painted surface: the hall
stays still, the head moves around the neck, the hand and hair follow separately,
and the crest catches light before the clothing settles.

From the repository root, run `python art/npc-motion/render.py` with Pillow,
NumPy, OpenCV and gifsicle installed. It produces 21 one-shot GIFs under
client/public/art/npcs/reactions-v1. Only the current opponent's assets load.
Individual names can be passed to rebuild a subset.

For the recorded browser test, start Vite in client on port 4287. Run
`node art/npc-motion/board-check.mjs` and again with `--mobile` (Chrome and
Playwright required; PLAYWRIGHT_MODULE can point to an installed module).
The fixture supplies HP events and crystal changes to the production controller
without a user session. The checks inspect the retained portrait and actual GIF,
replay and interruption; recordings and reports are written to output/npc-reactions.
