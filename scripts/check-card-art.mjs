#!/usr/bin/env node
import fs from "node:fs/promises";
import { cardArtPath, ensureDirs, loadCards } from "./card-art-lib.mjs";

await ensureDirs();

const cards = await loadCards({ includeStarters: process.argv.includes("--include-starters") });
const missing = [];
let present = 0;

for (const card of cards) {
  const exists = await fs.access(cardArtPath(card)).then(() => true, () => false);
  if (exists) present += 1;
  else missing.push(card.id);
}

console.log(`Card art: ${present}/${cards.length} present`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
