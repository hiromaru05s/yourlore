# Animated card frame materials

## Approved scope and source

01 Mirror Silver, 02 Flowing Gold, 03 Obsidian Ember, 04 Nacre Prism, 05 Verdigris Runes. Obsidian uses deeper black, narrow polished reflections and faint molten fractures. The approved silhouette, card geometry, art, and blue/red/purple type panels remain unchanged. Frames are independent of sleeves and art effects.

Prices are 30,000 / 50,000 / 200,000 / 100,000 / 200,000 shards in 01–05 order. Shop → Accessories uses STARTER_MANA (アチューン) for all five actual rendered previews. Purchase ownership is account-wide; Deck → Appearance saves the selected frame independently for each of the five decks. The entire equipped deck, starters and cards bought during the duel, uses that frame. Unpurchased market offers retain their original presentation. These five are direct shop purchases; existing gacha rates/pool remain unchanged.

Base: adopted gh/main 32c9b360. Feature: a7516ddc. The priority card-continuity work is merged through b2ccdded (native print ownership, high-resolution alpha frame assets, normalized special captures). Priority main integration 2a94fdd7 is included; final main is checked again before deployment. Owning files: client/src/shared/cardFrames.ts, ui/cardFrame.ts, ui/cardFrameMaterial.ts, ui/shopFrames.ts, ui/deckAppearance.ts, server/src/{auth,decks,social,matchmaker,gameRoom}.ts. Runtime source and preview server: /Users/hiromaru05s/.codex/worktrees/starter-living-art/LORE_TCG; comparison on 5264, stable actual-board verification on 5265 (HMR/watch disabled).

## Integration and authority

The server sets prices, validates equipment ownership, carries authenticated equipment into online/BOT/friendly room setup, and returns both public frame selections in state snapshots. Permanent purchases debit and grant atomically in one conditional SQL statement; duplicate/concurrent retries never charge twice. Existing deck JSON and inventory storage support this without a schema migration. Old clients that omit frame selection preserve the previous setting.

One shared WebGL context produces masked frame and seal material canvases, cached by source and material. Offscreen materials skip painting. Reduced motion paints a still frame. Borrowed actual print layers keep their renderer ownership during draw. Clones retain their current canvas pixels until the new owner attaches. Specialized capture awaits frame readiness and embeds all material layers. Persistent/quest cleanup removes only its own effect canvas, preserving nested frame materials. The priority continuity implementation, including its geometry and movement, is retained.

## Verification boundaries

- Real server handlers + SQLite: exact prices, insufficient funds, forged prices/IDs, concurrent retries, inventory, old-client preservation, five deck slots, authenticated queue sanitization, friendly setup, and UID context across ownership/zones.
- Actual app with API-only fixture: five shop purchases, confirmation/owned states, correct remaining balance, independent deck selections, save/reopen, desktop/mobile and reduced motion. No account balance was changed by the fixture.
- Actual local reducer/controller/board: all five materials through live draw, purchase flight, summon and graveyard landing at 1280/390 px Chromium, plus 390 px WebKit. Original canvas identity and temporal pixel change are checked during draw, with material layers present on landing. Captured card faces retain art effects and frame materials together.
- Persistent spells and quests: both sides, gold/obsidian, E3/WORLD_SEED/Q_RIFT, 1280/390 px; nested materials survive final cleanup and buffers remain bounded.
- Frame renderer lifecycle: unchanged geometry, context-loss retention, static GPU fallback, cancelled preparation and disposal passed. Locked dependencies / committed-source production build also passed shop and ten board-material checks.
- Screenshots and JSON in qa; continuous browser recordings retained under /tmp/lore-frame-* during this run. Visual review checked the glossy black direction, type-color readability, original silhouette and responsive shop/appearance layout separately from functional assertions.

These are local/deployed fixtures and browser-emulated viewports, not authenticated human PvP or physical-device FPS evidence. Release identifiers and deployed verification are appended after publication.
