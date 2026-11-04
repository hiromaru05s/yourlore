# Gift inbox copy cleanup — 2026-11-04

Removed the daily-login header description and idle footer description in Japanese, English and Korean. Replaced the visible Refresh label with a 20px SVG refresh icon in a 44px button, retaining its localized accessible name. Receipt/error feedback and claim behavior remain intact.

Source: current adopted implementation at `b09eaef2`, `client/src/ui/giftInbox.ts`, `client/src/styles/giftInbox.css`, shared `defaultUI.css` / `defaultButtons.css`, and `/art/lounge/gifts/letter-v1.webp`.

Local preview: `/Users/hiromaru05s/.codex/worktrees/gift-inbox-copy-cleanup/LORE_TCG`, `http://127.0.0.1:5514`. Existing gift browser scenarios passed for five viewports, individual/bulk receipt, history, network retry, Escape/focus and ja/en/ko. The old fixture needed `/api/onboarding` to return `stage: complete` and empty collections in its fallback; an adapted temporary runner was used. Client/server typecheck passed. Desktop/mobile screenshots were visually inspected with current real assets and fixture account data. No real-account gift claims were performed.

Production deployment verification follows after the guarded release.
