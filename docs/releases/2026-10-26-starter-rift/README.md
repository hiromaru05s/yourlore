# Starter and Rift Matter rework — 2026-10-26

- Goblin: printed 1/1. A completed direct attack deals an additional 1 damage as a separate effect, including when Shield absorbed the attack. Monster attacks and overflow do not trigger it.
- Ghost: each opponent recovery gives every Ghost in play +1 lasting ATK. Recovery itself no longer damages its owner. Each successful max-mana growth event deals 2 damage per Ghost after the action; blocked or capped growth does not count. Multiple increases in one action count individually. Existing Infiltrate remains.
- FLAME retains its ID and damage/usage rules, is renamed Fire / ファイアー / 파이어, and joins the Fire spell predicate, discounts, retrieval, previous-Fire checks, and reference series. Existing decks and usage records retain the same ID.
- Rift Matter (RIFT_MATTER): cost-5 market spell, unavailable as a starter and never playable from hand. Another card sending it to its owner's Rift queues a mandatory choice of 2 opposing field cards (1 if only 1 legal target exists). Aura and Relic protections remain. Exile bypasses destruction triggers. The owner chooses even during the opponent's turn; queued choices survive serialization and reconnect.
- The bot's obsolete Ghost healing/self-harm valuation was removed.

## Art

Created with built-in ImageGen using existing RIFT and SELECTED_SWORD artwork as visual references. Hand-painted violet Rift matter absorbs two record tablets; no photographic rendering, characters or text. The full prompt is in `art-prompt.txt`.

New artwork only: `client/public/art/cards/RIFT_MATTER.webp`, 1472×1344, WebP quality 92. Derived 384 px / 192 px versions are in cards-sm / cards-xs. No existing art was replaced.

## Validation

- `tests/starter-rift-rework.mjs`: 13 deterministic rule scenarios covering direct vs monster attacks, Shield, Ghost healing/mana growth/cap/lock/multiple events, Fire discounts/combos/retrieval, Rift play rejection, target selection, fewer targets, protections, purchase/non-triggering, Fire Zone, and enemy-caused Rift entry.
- `tests/starter-rift-server.mjs`: authoritative GameRoom fixture with two socket clients. Rejects normal play, wrong player and invalid target; persists the first selection across room rehydration and synchronizes both clients after the second.
- `tests/starter-rift-browser.mjs`: actual production card renderer/controller on local Vite. Japanese card faces/full rules, generated-art dimensions, actual picker clicks for both targets, desktop board screenshots. Browser errors: none. See `qa/browser-report.json`.
- Existing Ember Debt VFX test keeps all damage/state parity assertions, explicitly allowing the newly required Fire-family play record.
- Three-language reviewed text hashes and Rift glossary metadata updated for this rework.
- Local type checks and build passed. The first full run found the expected outdated text audit, missing Rift glossary registration and old Fire-family parity assertion; all three were corrected and their focused checks passed. The guarded production release reruns the complete suite before publishing; its final outcome is recorded separately.

Visual review: inspected the generated image and rendered card faces/rules at normal size. This is implementation review, not a claim of user visual approval. Browser and server fixture evidence does not establish an authenticated live PvP match or real-device performance.

## Production result

- Source: `e97bc14ccd90466cfba0797163df8835dd781231`, including the preceding notification-badge release.
- Deployed to `https://yourlore.xyz` on 2026-10-26 at 15:34 KST/JST.
- Version: `45704b80-e02a-438f-a437-8ab7727043cd` at 100% traffic (`deployment.json`).
- Guarded release: client/server type checks, **215/215** production test files, design guard and Vite build passed (`suite.json`).
- Post-deployment: all **125** built HTML/JS/CSS/JSON files matched the live bytes; all **3** Rift Matter artwork sizes matched their SHA-256 (`asset-parity.json`, `art-parity.json`).
- No authenticated production PvP match was performed. The two-client/reconnect test above is an authoritative GameRoom fixture.

Browser runner setup if needed: `npm install --prefix /tmp/lore-starter-tools playwright`; run Vite on port 5307, then `node tests/starter-rift-browser.mjs`.
