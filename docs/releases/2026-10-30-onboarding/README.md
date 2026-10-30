# Basic duel → first starter deck

The basic duel now opens with the requested Zeno greeting. Finishing its actual action sequence grants 3,000 Shards once, then guides the player through the existing shop's paid ten draws (1,000 Shards), one free purchase of the current daily shop's leftmost starter, and the existing deck editor. The exercise edits the active preset from six Culls and two Chests, explains the fixed Attune and eight chosen starters, removes one Cull, adds any owned non-Cull starter, and saves the resulting active deck. The Companion receives one short introduction; its pages are optional. The final requested encouragement offers an easy Single duel.

## Authority and recovery

- The server replays the real basic tutorial actions. Reward receipt and the 3,000-Shard balance change commit in one transaction.
- Account-scoped fixed transaction IDs make the teaching draw and purchase retry-safe, including lost responses and KST midnight. The normal gacha uses its current odds and duplicate refunds.
- Only the first current daily starter is eligible for the free lesson purchase. It costs zero, grants at most the normal eight-copy cap, gives no duplicate refund, and is separate from ordinary daily purchase limits. Other purchases retain their normal prices and limits.
- Completion is derived from reward and purchase receipts. Reload/sign-in resumes the current stage; the in-progress deck draft survives reload in the same tab. The saved deck is unchanged until the player confirms. Other presets are preserved.
- The server checks ownership and the exercise's five-Cull/eight-choice-card result before saving the deck-completion receipt in the same transaction as the deck. No book-reading completion is required.
- Existing users receive this new basic reward only after completing this basic tutorial with a valid action transcript; old local-only completion flags do not authorize currency. Replaying after receipt never grants it again.
- No database migration or changes to existing user balances are needed for release.

## Source and visual reference

Implementation started from fetched main `e547544f647344d4f8ed84411e133b60329971e3`. Work/preview root: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`. Browser test starts Vite on a dynamically allocated loopback port from that worktree.

Reused adopted implementations: `client/src/screens/shop.ts`, `client/src/ui/shopGacha.ts`, `client/src/ui/gachaCinematic.ts`, `client/src/ui/shopStarters.ts`, `client/src/screens/deck.ts`, `client/src/ui/tutorialSpotlight.ts`, `client/src/ui/manaSpirit.ts`, and `client/src/ui/seekerBook.ts`. Shared menu surfaces/buttons, current card artwork, library background, and Zeno are retained. The book's ordinary Zeno hero is hidden only while the guided Zeno overlay is active to avoid two simultaneous speakers.

## Validation scope

- `tests/onboarding.mjs`: replay rejection, authenticated ownership, concurrent/retried reward grant, rollback on ledger failure, ten-draw cost and receipt identity, forced leftmost zero-cost purchase, invalid requests, cross-midnight retries, eight-copy cap, normal purchase price, deck validation, account isolation, and final completion.
- Existing `tutorial-parts`, `starter-collection`, and `seeker-book` tests passed.
- `tests/onboarding-browser.mjs`: real rendered controls, current Worker handlers and isolated SQLite account fixtures. One full 49-step basic walkthrough, paid gacha receipt/gallery, zero-cost purchase confirmation, remove/add/save, reload after removing Cull, Companion introduction, and easy-Single request at 1280/1024 pixels. Follow-up visual pass covers final copy/layout.
- Screenshots and machine-readable reports: `docs/qa/2026-10-30-onboarding/`.
- These local fixtures are not real production-account purchases or authenticated multiplayer. The browser test deliberately stops at the Single-start request rather than creating a real match. Visual inspection is separate from user approval.

Production deployment and post-release verification are recorded in `production.json` after the guarded release.
