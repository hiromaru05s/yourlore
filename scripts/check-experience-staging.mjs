/** Validate real authoritative settlements and reject self-reported EXP. */
process.argv.push('--api-only');
await import('../tests/full-game-staging-audit.mjs');
