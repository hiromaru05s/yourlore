# Full tutorial rewind

## Implementation

Each meaningful tour step saves an immutable entry checkpoint: complete GameState, lesson action cursor/history/facts, lesson events and phase, full battle-log events, hand expansion, log visibility and inspected-card UID/scroll. Scene definitions retain their original function references; all mutable data is deep-cloned. Revisiting a checkpoint discards its abandoned future. Automatic already-open hand steps are not Back destinations. Completed actions are no longer skipped.

The tutorial-only owner stops new actions and opponent timers, fast-forwards and drains active presentation, retires the old runtime, closes old dialogs and creates a fresh runtime from the checkpoint. Old callbacks cannot mutate the restored board. BaseController and normal/online game rules are unchanged.

## Checks before release

- Client/server typechecks passed.
- Real reducer regression restores and deep-compares every field at all 11 action checkpoints, then replays the exact actions and compares the complete resulting state and lesson metadata. Includes RNG, UID allocation, both players, mana, health, deck order, graveyard/Rift, market stock/offers, effects and both 3-card draws. Checks snapshot immutability and future truncation.
- Actual local board, visible controls in Chrome: full tutorial completed while repeatedly rewinding and replaying summon, direct attack, turn change, purchase, spell cast and Cull.
- Summon rollback: DOM snapshot identical to before summon, Pup returns to hand, empty own field, mana 4/4. Re-summon works.
- Back again restores the monster-health explanation and opens its card inspector; Next closes it and resumes the summon guide.
- Attack rollback restores opponent HP 44→45; replay works.
- Turn rollback restores turn 3→1, deck 0→3, prior hand, mana 5/5→0/5, opponent field empty and opponent mana 3/4→4/4; replay draws normally.
- Purchase rollback restores stock ×2→×3, mana, graveyard and full visible board; abandoned purchase disappears from battle log; re-purchase works.
- Back during spell confirmation closes the old selection dialog; re-opening and casting works. After casting, Back restores ATK 4→1, spell in hand and mana 5/5.
- Back immediately after starting a monster attack restores the living enemy and opponent HP44; re-attack resolves once.
- Cull rollback restores the card in hand and empty Rift; replay reaches completion.
- No browser console errors in this walkthrough. Screenshots and JSON/trail are local UI evidence, not a production verification claim.
