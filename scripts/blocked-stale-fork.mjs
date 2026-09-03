#!/usr/bin/env node
// This root tree is a STALE FORK (archive-home design + daily missions — retired, never to be deployed).
// 2026-09-04: a deploy from here shipped the retired design to test.yourlore.xyz by mistake.
// Deploy ONLY from the GitHub-main lineage worktree: .worktrees/main-merge (npm run deploy:staging there).
console.error("BLOCKED: this root tree is a stale fork with the retired archive-home design. Deploy from .worktrees/main-merge (GitHub main).");
process.exit(1);
