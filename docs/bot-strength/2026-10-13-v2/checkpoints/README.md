# Interrupted research checkpoints

These are completed-game prefixes, not finished acceptance cohorts. They were
saved while the shared staging release requested heavy calculations to stop.
Original JSONL bytes are retained in gzip files. No completed row is discarded.

Resume with the same frozen policy bundles, rosters, parameters, total count and
original seed offset using `RESUME_FROM=<checkpoint.json>` and a **new** result
name. The evaluator verifies those conditions and continues at the next game,
including the second seat of a partially completed pair. An unfinished game is
restarted from its original seed. Count only the resumed full result, never both
its prefix and the full result. Wall-clock timings are not comparable across
these interruptions.
