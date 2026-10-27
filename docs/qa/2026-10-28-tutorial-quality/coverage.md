# Tutorial curriculum and quality audit — 2026-10-28

The handwritten outline is a priority guide, not a source of game rules. Card data and the production reducer determine every prepared scenario. Tutorial progress has a new account-scoped v4 namespace because lesson indices changed.

| User outline | Current lessons (1-based) |
|---|---|
| Win condition, first/second player HP | 1; observed victory in 23 |
| Right-click inspection, play cost, summon, ATK/HP | 1; separate ATK and HP spotlights |
| Attack monsters, overflow, destruction, graveyard | 2 |
| Mana increase and spell costs | 3–4 |
| Persistent spells and spell field | 5 |
| Fixed stock, shared offers, buy, refresh, empty-slot refill | 6–7 |
| Turn transition, mana refill, three-card draw, hand carry limit | 7 |
| Deck refill from graveyard, purchased cards drawn into hand | 7 |
| Quick spell purchase and immediate resolution | 8 |
| Rift, Cull, Chest/dice | 9 |
| Quests and rewards | 10 |
| On summon, own turn start/end, conditions, continuous effects on field | 11 |
| Egg durability and hatch, Counter, Dual Wield, Infiltrate | 12 |
| Log, sound/help, own/opponent deck, graveyard, Rift | 13 |
| Shield and Dew, expiry vs healing | 14 |
| Evasion/Taunt success and failure, Decay, Guts, Aura | 15 |
| Majesty; previously deployed vs newly summoned attacker | 16 |
| Tribe names, distinct kinds, duplicates, once-per-tier bonuses | 17 |
| Brand, Bleed, removing counters, Curse as a card | 18 |
| Void, Relic, exile vs destruction | 19 |
| Play conditions, per-name limits, optional targets | 20 |
| Evolution materials, triggered chains, individual once-only effects | 21 |
| Origin, Chosen Domain, turn-60 judgement/draw, contract defeat | 22 |
| Win independently, Home, deck presets, card catalog | 23–25 |

Basic actions precede settings and advanced rules. The menu separates first-duel practice, card abilities, and the final duel/Home. Every lesson is individually selectable for review; no server reward or live match is involved.

## Findings fixed

- The first course used to spend 28 steps describing controls before any play. It now starts with a real inspection, summon and attack.
- Rift is explicitly named in spoken body copy. Deck refill is explained as drawing with an empty deck; Rift cards are excluded, except for explicit card effects.
- Floating rings read transformed card/drag-ghost bounds on each animation frame. The open hand's dimming hole includes card overhang.
- A tracked arrow and marked destination show where to release each hand card or attack. The label stays inside the destination so it cannot cover the source card name.
- Zeno avoids both ends of the action. During inspection, a separate lower conversation area leaves the card numbers visible; normal cast-selection UI temporarily hides the practice coach.
- Opening or closing the hand updates guide geometry and copy on the next frame instead of a 350ms interval.
- Infiltrate must drag to the opposing portrait when enemies exist; clicking did not execute that attack. The guide now teaches the real gesture.
- Majesty guidance selects only a monster that is currently allowed to attack, rather than every copy with the same card ID.
- Purging Touch copy now explains its graveyard target selection and draw as well as Brand removal.
- Switching prepared scenes can rewind the turn number. A tutorial-only reset clears the view's old turn watermark after pending presentation completes; stale-turn protection remains enabled for ordinary duels.

## Evidence boundaries

The full reducer curriculum is exercised by `tests/tutorial-parts.mjs`. UI validation uses actual clicks, right-clicks, drags and visible choices via the browser; no controller action injection is used in this audit. Local browser checks use the real UI and engine with a disposable fixture account. Production checks and exact deployment evidence are recorded separately in the release report.

## Local walkthrough result

All 25 parts reached completion via rendered UI, including the final HP-zero victory and Home/deck/catalog transitions. Rechecked the added market turn-refill step and first lesson inspection/stat spotlights. Inspected the enlarged card at the normal window and 1024px viewport; the cost/attack/health remain visible above Zeno. Hover tracking around Chest measured approximately 4px padding on each side. `npm run test:production`: 249 passed; final focused curriculum and turn-clock checks passed. Screenshots capture menu and inspection layout.
