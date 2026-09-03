#!/usr/bin/env node
// ============================================================
// LORE — build/deploy guard: refuse to ship the retired "archive home" design
// (desktop/mobile archive skin + daily missions). It was reverted from main on
// 2026-08-24 and must never be deployed again (user directive, 2026-09-04).
// Runs before every `npm run build` (and therefore before every deploy).
// ============================================================
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname, "..");
const FORBIDDEN_FILES = [
  "client/src/styles/archive-mobile.css",
  "client/src/styles/archive-desktop.css",
];
const FORBIDDEN_MARKERS = [
  ["client/src/screens/home.ts", /archive-(mobile|desktop)|HOME_I18N|daily.?mission/i],
];
const problems = [];
for (const f of FORBIDDEN_FILES) if (existsSync(resolve(root, f))) problems.push(`forbidden file present: ${f}`);
for (const [f, re] of FORBIDDEN_MARKERS) {
  const p = resolve(root, f);
  if (existsSync(p) && re.test(readFileSync(p, "utf8"))) problems.push(`retired design marker in ${f}: ${re}`);
}
if (problems.length) {
  console.error("✗ guard-design: the retired archive-home design must not be built or deployed.");
  for (const x of problems) console.error("   - " + x);
  console.error("   Work from GitHub main (worktree .worktrees/main-merge), never from the stale root fork.");
  process.exit(1);
}
console.log("✓ guard-design: ok");
