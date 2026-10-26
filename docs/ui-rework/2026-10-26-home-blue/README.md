# Blue HOME panels

Replaces HOME's plain reading panel with the user's reference composition: translucent navy, a fine muted brass edge and corner engraving, connected mode tabs and a quiet outlined active deck. The duel disc, gift inbox, Zeno, background and navigation retain their existing behavior. The concurrent gift update keeps its letter in the header beside the balance.

The daily quest is a compact commission below sound, with a parchment/quill emblem, objective, progress and reward. It no longer uses unrelated card artwork. Completion, daily reset, automatic reward settlement, revision-checked replacement and the detail dialog stay with the existing progression owner.

HOME no longer renders the season date or ladder position above the rank. The tier, MMR and next-tier progress remain; the leaderboard's season data is unchanged.

Validation: client/server typecheck and real HOME fixture browser checks at 1440×900, 1280×720, 1024×600, 390×844, 320×640 and 844×390. Checks cover overlap, scroll, long objectives, progress, completion, reroll, keyboard dialog close, remount, mode selection and BOT modal opening. Screenshots were visually inspected. Fixture checks do not establish authenticated match behavior.

Production deployment uses the repository's committed-main guard, full production regression suite and snapshot build. Live verification is recorded after deployment.
