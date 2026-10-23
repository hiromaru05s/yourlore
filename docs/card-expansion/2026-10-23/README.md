# Goblin / relic expansion — v62

Seven starter cards and three shared-market cards, authored in Japanese, Korean and English.

## Rules confirmed with the user

- Raider attack aura and Leader count affect only the owner’s field.
- Settlement and Training Ground trigger only at the start of the owner’s turn.
- King checks current owned cards, including cards acquired during the match: deck, hand, graveyard and all field zones. Rift is excluded. The five Goblin-related IDs include Settlement, Leader and King itself.
- Relic Protection skips one Shield expiration only; the following opponent-turn expiration remains active.
- Mana Backflow destroys itself at the start of the fifteenth owner turn after it was cast. Existing global mana bounds still apply.

## Artwork

Ten original illustrations generated with built-in image_gen, guided by the established LORE hand-drawn fantasy direction. No existing card art was replaced. Each card has a 1472×1344 master, 384px and 192px variants. Prompts and generation sources are in `art-prompts.json`; the 30 delivered files are recorded in `asset-manifest.json`.

## Verification evidence

- `tests/goblin-expansion.mjs`: every dice face for King and Training Ground, activation payment, own/opponent turn boundaries, spell/monster destruction versus exile, graveyard-origin Shield triggers and one-expiration retention.
- `tests/goblin-expansion-server.mjs`: authoritative room, two sockets, hidden hand, summon damage, Shield events and hibernation across both expiration boundaries.
- `qa/browser-report.json`: local fixture using the production card renderer and duel controller, with real animations enabled; card sheet, full rules and 1440/1024 board screenshots.
- `npm run text:check`: 377 cards × 3 languages. Related Goblin cards are linked from the card inspector.
- Starter collection integration uses the existing DECK_POOL path. Collectible starter pool becomes 43; category rates remain 92.5% starter / 7% cosmetic / 0.5% effect. Per-card starter odds change with the expanded pool.

These local fixtures are not an authenticated live matchmaking test. Production release verification is recorded separately after deployment.
