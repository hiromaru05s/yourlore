# Rift, targeting, sound and duel ceremonies — 2026-09-23

Base: `240d0a5`, worktree `/tmp/lore-reading-staging-20260921`.
Preview: `http://127.0.0.1:5200/duel-lab.html?dense&polish`.
Live local duel: `http://127.0.0.1:5200/duel-lab.html?live`.

## Changes

- **Rift alignment:** the old Blender cutter was a separate diagonal oval, while the silver frame followed two longer curved ribs. Rebuilt the wooden through-cuts along those ribs and removed the obsolete inner oval/shoulder, for both board LODs. Existing ornaments, five-material batching, and all gameplay anchors are preserved. The exact sampled cutter now generates `riftOutline.ts`; the runtime covers its complete thickness with the same physical card scale as the board. The depth mask remains behind the actual table/rails. Labels are centered on the hit area.
- **Targeting:** replaced the dashed SVG with a tapered blue ribbon, luminous moving fins, a faceted head and target reticle. Both the head and fins use the curve tangent. Head length is bounded for short drags. Source/target positions follow the current card geometry each frame. Avatar hit testing only includes its actual frame/HP, excluding the mana tray. Cancellation covers Escape, resize, blur, pointer cancellation and navigation.
- **Sound:** 28 event types / 36 original stereo MP3 cues, 615 KiB total. Offline layers of filtered paper/air friction, inharmonic struck-glass modes, low body resonance and short stereo room reflections. No extracted Genshin/Hearthstone recordings and no old oscillator/MP3 fallback. Click/draw/attack/impact have three variations. Files decode once after user activation; gain/limiter, duplicate-event throttling, sixteen-voice limit, persisted mute/volume, and hidden-tab cleanup are centralized. Draw, exile, deck reconstruction and ceremony cues follow their visual starts. Existing event names elsewhere now resolve to this bank.
- **Opening:** both seekers enter around an opening gilt book and a faceted mana seal. The actual first player is revealed; no new roll or gameplay rule was added. Board readiness completes before the ceremony, then the existing three-card opening draws run. Furniture remains present from the start.
- **Victory/defeat:** a curved-page 3D book with engraved covers, page printing, gold fittings, an eye seal and finite light trails. Victory opens the book and lifts the mana seal; defeat folds and seals it in a cooler palette. The result modal and its rematch/home/review/MMR behavior remain connected to the original game result. Reduced-motion and GPU fallback paths remain available.

The ceremony module is loaded on demand and warmed during duel readiness. One temporary renderer, capped at DPR 1.5, finishes in 3.4 seconds and is disposed. The Rift still uses the small bounded 15 Hz surface; it does not force the entire board to redraw every animation frame.

## Preview controls

`勝利演出`, `敗北演出`, `デュエル開始`, `攻撃矢印`, plus the effect-name selector and `効果音を試聴`.
The ceremony preview holds its last pose longer for inspection; real opening/result playback lasts approximately 3.2/3.3 seconds. The arrow preview cycles public enemy monsters. Actual attack dragging uses the same renderer and live hit testing.

## Verification

- `npm run build` (design guard, TypeScript, Vite). Existing large-chunk advisory remains.
- `node tests/ceremony-audio-aim.mjs`: 58,176 curve samples, cutter bounds, all clip hashes/durations/peaks, input unlock, decode caching, rate limiting, polyphony, mute/persistence and interrupted opening cleanup.
- `node tests/duel-ui.mjs`: actual controller start-to-turn-banner sequence, subsequent turn announcements, card/zone/market/HP/portrait/hand regressions.
- `node tests/motion-v2.mjs`, `node tests/quick-playback.mjs`, `node tests/biblion-vfx.mjs`, `node tests/attack-vfx.mjs`.
- Browser inspection: full-size and reduced viewport, low-LOD 390 × 844 board, mobile opening portraits and typography, victory/defeat final poses, flowing arrow endpoints, and local live opening/draw flow.
- `model-repair.json`: original/new GLB hashes, byte/triangle/primitive counts and exact anchor-transform comparison. Both boards remain five primitives.

Audio signal/asset/routing tests establish coverage and playback behavior; perceived timbre still needs the user's listening review. These are original LORE effects inspired by material layering and timing, not a claim of matching a commercial game's production quality.

## Reproduction and references

`python scripts/audio/build_lore_sfx.py` requires NumPy, SciPy and FFmpeg. The audio manifest records the seed and all resulting hashes.

For the board repair, extract `board.glb` and `board-low.glb` from `240d0a5` into a temporary directory, then run Blender in background with `scripts/blender/align_rift_apertures.py -- <that directory>`. The script replaces only the carcass/cut components and re-batches the preserved fittings. Do not use already-repaired GLBs as inputs.

Official design references:
- [Hearthstone sound-design interview](https://hearthstone.blizzard.com/en-us/news/23964694): cadence, cast/contact separation and material layers.
- [Hearthstone visual-effects team](https://hearthstone.blizzard.com/en-us/news/22552047): board readability, identity and meaningful moments.
