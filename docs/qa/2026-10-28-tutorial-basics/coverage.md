# Basic tutorial redesign — 2026-10-28

Scope: replace the 25-part compulsory sequence with one continuous, basic duel. Advanced keywords, persistent spells, quests, tribe synergies, special victories and menu tours are no longer in the first-run path. Rule notebook remains optional. Completion offers an Easy Single match.

## Sequence and rules

Goal (opponent health 0) → turns and deck-building overview → mana → open hand/right-click inspection → separate cost, ATK and monster-health highlights → summon and direct attack → Attune/max-mana refill → normal 3-card draw and 7-card carry limit → both markets are shared → stock marker and fixed purchase → graveyard → changing-market purchase/empty-slot refill → reshuffle and actual purchased-card draw → targeted spell → monster attack/destruction/overflow → refresh → Cull/Rift → completion.

Real reducer replay verifies: two 3-card draws; shared supply after purchase and refresh; fixed stock 3→2; the purchased Hare reaches hand; normal spell raises Pup ATK 1→4; 1 direct damage then 1 overflow; mana 4→max 5; Cull reaches Rift. No engine/card rule changes. The tutorial opponent only summons its prepared monster and passes; no player-state mutation during the lesson.

The first-run path has 47 checkpoints (several open-hand checkpoints immediately complete when already open), 1,421 Japanese body characters, and 11 instructed game actions plus spell targeting. 3–5 minutes is a design estimate, not a measured first-time-user study. Copy is explicit in Japanese, English and Korean.

## UI checks via Codex browser controls

- 1410×761: full visible-control walkthrough before final order polish; screenshots of normal-size inspection, individually highlighted statistics, stock, drag source/destination, purchased hand and monster targeting.
- 1024×768: final-order walkthrough; card inspection, backwards navigation, purchases, turn changes, spell targeting, monster attack and completion.
- Repeated inspection/back/forward revealed a closed-inspector dead end; fixed by reopening inspection when revisiting it. Returning through completed actions does not attempt to replay them.
- Speech is above the normal card inspector, avoids the highlighted numeral and keeps the existing face-anchored tail. No special shrinking or top placement of the inspector.
- Conversation clicks keep the expanded hand open. Compact-hand anchoring is recomputed on close and clamped to the viewport.
- Stock ring targets `.mkt-stock` and tracks DOM geometry every frame. Existing drag arrows and release labels retained.
- Persistent-turn badges checked separately on a real board fixture: 4, 10, 44 are legible, centered below each tile; End Turn changes them to 2, 8, 42. This is a fixture, not a production match.

Production verification is recorded separately after deployment. Browser screenshots and trails are evidence of actual UI operations; engine replay alone is not treated as UI proof.
