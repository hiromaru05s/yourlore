# Starter ownership and account identity

## Production diagnosis

The production `users.starter_cards` column and `collection_transactions` table are present. Both existing accounts have stored collections matching their gacha receipts: one account has one draw (12 cards including defaults), and another has thirty draws (41 cards including defaults). Their email addresses differ while their display names differ only in capitalization. No inventory loss or schema gap was found; no production inventory or schema was changed.

Read-only authenticated requests to `/api/auth/me` and `/api/collection` returned the exact stored collections for both accounts. A fresh Chrome context using the thirty-draw account showed the same deck ownership counts before and after reload. Switching Google identities is a plausible explanation for the reported symptom; the user's current login identity was not confirmed during diagnosis.

## Change

Settings now displays the signed-in email next to the account's display name so same-name Google accounts can be distinguished. The email comes from the private authenticated session and is shown only when the settings profile belongs to that account. It is escaped and omitted from other players' profiles.

## Validation

- Existing starter collection suite passed (atomic spend, rollback, idempotency, ownership limits and history).
- Auth lifecycle coverage now commits real gacha draws through the Worker and verifies inventory, credits and receipts across password reset/login and Google logout/login; switching to a same-name second Google account keeps ownership isolated, and switching back preserves the first collection. OAuth/email providers are mocked; SQL and Worker routes are exercised.
- Client/server typecheck passed.
- Chrome DOM check passed for current email, account switching, escaping and absence on another player's profile.

No account merge, compensating grants or destructive migration is included.
