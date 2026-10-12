# 選ばれし領域 — 効果音7案 (2026-10-08)

Rejected cue replacement study. Follow-up selection: 02 重刃の確定, adopted at /sfx/chosen-v2/heavy-blade.mp3 on 2026-10-08. Initial comparison QA below predates adoption.

Open http://127.0.0.1:5420/chosen-sound-seven.html with the client Vite server. Click 01–07 or use keys 1–7. Supports completion excerpt, full animation, audio only, sequential comparison, stop, and independent preview volume.

## Direction

Replace the prior oscillator-based cue with layered blade, metal, glass and air recordings. Distinguish attack, body, pitch, spacing and decay across seven options: 白銀の抜刀 / 重刃の確定 / 銀晶の閃光 / 双刃の噛合 / 黒冠の裁定 / 天光の戴冠 / 一閃の封印. These descriptions express intended character, not user approval.

Approved crown 01 artwork and production `ChosenRenderer` are unchanged. The preview uses a real `GameView` fixture, not an authenticated match. Sound begins at the shared `CHOSEN_FLASH_MS` (2700 ms). Audio scheduling and animation share AudioContext time. Hidden page, replay, selection change, stop and page exit cancel the previous cue.

## Rebuild and sources

Run `scripts/audio/build_chosen_seven.py` with Python + NumPy and ffmpeg installed. Source hashes, credits and URLs are in `sources.json`; per-candidate recipes and decoded output measurements are in `client/src/dev/chosen-sound-seven/assets/manifest.json`.

CC0 sources:
- Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds (license included under sources/).
- rubberduck 80 CC0 RPG SFX: https://opengameart.org/node/86018 (existing project source recordings).
- artisticdude Swishes: https://opengameart.org/content/swishes-sound-pack (existing project source recordings).
- Kenney Interface Sounds: https://kenney.nl/assets/interface-sounds (existing project source recording).

No new oscillator tones. Layers use resampling, FFT filtering, shaping, stereo placement and diffuse reflections. 48 kHz stereo MP3, 192 kbps. Strongest 200 ms RMS differs by approximately 1 dB across seven clips; decoded peaks below -5 dBFS and onset below 2 ms. Objective level matching is not a guarantee of equal subjective loudness.

## Verification

- Client TypeScript noEmit: pass.
- Browser QA: all seven actual AudioBufferSource starts and completed sequential playback; completion frame observed at 2707.7 ms; audio-only playback; interrupted playback cancellation; no page exceptions.
- 390 px viewport: scroll width 390 px, all seven controls visible; desktop and mobile screenshots saved here.
- QA evidence: browser-qa.json. These checks establish playback and scheduling, not subjective speaker approval. No authenticated gameplay or staging change is claimed.
