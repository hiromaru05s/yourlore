# Deck-selected card effects and collection rewards

Approved materials: 星晶の刻面 (03, approved twice-speed clock), 星砂箔 (02, revision 2), 虹彩の薄膜 (01, approved twice-speed clock).

Account ownership lives in the existing `users.sleeves` inventory. Each of the five deck presets stores its own `effect`. The server validates ownership, preserves omitted equipment from older clients, and pins active equipment in normal/ranked/friendly/BOT room setup. No database migration is required.

Draws use independent server-side unbiased category selection: starter 92.5%, cosmetic slot 7%, effects 0.5%. The three effects are equally likely within their category (each 1/600 overall). An empty cosmetic catalog produces an explicit empty result. Duplicate effects refund 500 Shards; capped starters refund 50. Draw ledger idempotency and balance/inventory CAS apply to every result, including empty results.

Card finishes follow instance ownership in all public zones and appear immediately on purchase. Shared face builders cover hands, field cards, persistent spell/quest tiles, zoom, and discard viewers. Hidden backs and unsold offers have no face finish. Movement snapshots preserve the material under typography; cloned DOM faces reconnect to the live renderer. Reduced motion displays a fixed frame and stops the frame loop, hidden tabs suspend drawing, and disposal releases observers and surfaces.

## Validation

- `node tests/starter-collection.mjs`: exact 10,000 category boundaries; grants and duplicate refunds; transaction rollback; same-request replay; unowned equipment and free-claim rejection; old-client preservation; authoritative queue equipment.
- `node tests/deck-appearance.mjs`: independent presets, ownership, atomic save, auth/queue/friendly propagation.
- `tests/card-effects-browser.mjs`: actual application deck selection/save/reload, mobile geometry, zoom, mixed reward cinematic, production GameView, acquisition, clone, reduced motion, teardown. This uses API fixtures, not an authenticated two-player staging match.
- Independent Prism Veil and Stardust runtime checks are recorded beside this file. Approved renderer pixel comparisons live in their respective release folders.

Release source, Worker version and live asset parity will be recorded after the guarded staging release. Production is outside this task.
