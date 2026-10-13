# BOT strength experiments

The active implementation and reproduction commands are documented in
[bot-strength/README.md](bot-strength/README.md). The four tiers now use ordinary
legal decks, sampled public information, and paired rollout search for hard/hell.
Card balance is unchanged.

The `nn/`, `botNet`, and older scripts are retained as historical experiments;
they are no longer the runtime policy. Their earlier win rates are not acceptance
results for the current implementation. In particular, `eval-bots.ts` assigned A
the first turn in both legs, so its results must not be described as paired-seat
validation.
