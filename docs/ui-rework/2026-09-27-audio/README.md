# LORE sound rework — 2026-09-27

## Changes

The v2 bank repeatedly layered generated glass notes and low resonances onto unrelated actions. Runtime inspection also found two contact sounds for one attack (the animation and following hit/damage event), summon audio preceding the card's landing, and a separate opening player/cache that bypassed the shared voice budget. The opening deal additionally voiced the same cards already handled by paperDraw.

The active bank is now `/sfx/lore-v3/`: **32 cues, 40 stereo MP3s, approximately 227 KiB**. UI, cards, books, cloth, wood, chips and dice use edited physical recordings. Glass is reserved for mana, healing, turn announcements and outcomes; mana has a short ascending release, healing a lower, softer pair. Repeated UI/card actions are shorter, quieter and drier than combat. There is no new oscillator/noise layer. Old published banks remain as historical assets, but active application code does not request them.

- UI confirmation replaces the generic button click from the same action. The volume preview uses a short UI sound instead of the old coin sequence.
- Attack launch/contact are owned by the movement timeline. Only the exact subsequent hit already voiced at contact is suppressed. Counterattack, piercing, spell damage and both players' healing remain audible; zero-value events are silent.
- Summon/Mimic sounds trigger at actual card landing, including reduced-motion presentation.
- Opening uses the same cache, volume and voice budget. Toss and landing have distinct physical cues. Duplicate scripted deal sounds were removed; card flight owns the deal audio.
- Dice have dedicated roll/settle audio, starting after GPU preparation rather than before loading. The prior spell/pop/mana combination was removed. Discard uses a paper movement cue.
- Eight active voices maximum, with per-family budgets and priority. Replaced/stopped voices fade over 35 ms. Pending decodes are invalidated on stop/mute/navigation; sounds arriving more than 90 ms late are dropped. Opening/dice scopes cancel their audio on skip; fast-forwarded event batches stay silent and skip stale dice. Sound fetches remain two at a time and outside initial artwork readiness.

## Sources and rebuild

Selected original recordings and licenses are retained under `sources/`, with individual SHA-256 and source pages in `sources/manifest.json`. Sources are Kenney's CC0 packs:

- https://kenney.nl/assets/casino-audio
- https://kenney.nl/assets/impact-sounds
- https://kenney.nl/assets/rpg-audio
- https://kenney.nl/assets/interface-sounds

The renderer performs leading-padding removal, fades, filtering, layered mixing, small pitch changes, short reflections, event-specific peak/RMS targets and MP3 encoding. `client/public/sfx/lore-v3/manifest.json` identifies the recordings used by every output.

```sh
python scripts/audio/build_lore_sfx_v3.py  # numpy, scipy, ffmpeg
python scripts/audio/check_lore_sfx_v3.py
node tests/audio-v3.mjs
node tests/audio-v3-browser.mjs
```

`review-sequence.mp3` is a 21-second cue reel at the default master gain. `review-sequence.json` lists cue timestamps. Automated waveform and playback checks establish technical correctness; tonal preference is assessed by listening to the actual game/reel, not inferred from peak measurements.

## Verification

- Client/server typecheck and production build.
- All 40 encoded MP3s: peak below -3 dBFS, onset below 90 ms, faded ends; actual Chrome decode/render produces non-silent stereo audio.
- Mixer: mute/unmute while decoding, navigation cancellation, late decode deadline, shared opening cancellation, priority/polyphony, UI coalescing, exact attack/counter/piercing event ownership.
- Real BaseController/browser: monster attack produces one attack + one impact, direct attack one attack + one face-hit, opponent healing sounds, summon starts within 40 ms of the landing VFX.
- Existing ceremony/aim and quick-spell playback suites; first-screen loading stays usable while sound requests are deliberately held.
- Staging records will be stored alongside these checks. No production deployment.
