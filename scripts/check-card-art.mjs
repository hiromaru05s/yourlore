#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { cardArtPath, ensureDirs, loadCards } from "./card-art-lib.mjs";
import { VARIANTS } from "./optimize-card-art.mjs";

await ensureDirs();

const cards = await loadCards({ includeStarters: process.argv.includes("--include-starters") });
const missing = [];
const staleVariants = [];
let present = 0;

const mtime = (p) => fs.stat(p).then((s) => s.mtimeMs, () => -1);

for (const card of cards) {
  const master = cardArtPath(card);
  const masterM = await mtime(master);
  if (masterM < 0) { missing.push(card.id); continue; }
  present += 1;
  // The client asks for the down-scaled variants everywhere except the zoom
  // view; a missing one falls back to the master, i.e. silently ships ~10x the
  // bytes. Flag it so `npm run art:optimize` gets run after new art lands.
  for (const v of VARIANTS) {
    if ((await mtime(path.join(path.dirname(master), v.dir, path.basename(master)))) < masterM) {
      staleVariants.push(`${card.id}/${v.dir}`);
      break;
    }
  }
}

console.log(`Card art: ${present}/${cards.length} present`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
if (staleVariants.length) {
  console.log(`Missing/stale size variants (${staleVariants.length}): ${staleVariants.slice(0, 20).join(", ")}${staleVariants.length > 20 ? ", …" : ""}`);
  console.log("Run: npm run art:optimize");
}
