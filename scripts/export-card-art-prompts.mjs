#!/usr/bin/env node
import fs from "node:fs/promises";
import { cardArtPath, cardArtPrompt, ensureDirs, loadCards, promptOutputPath } from "./card-art-lib.mjs";

const args = new Set(process.argv.slice(2));
const includeStarters = args.has("--include-starters");
const includeExisting = args.has("--all");

await ensureDirs();

const cards = await loadCards({ includeStarters });
const rows = [];

for (const card of cards) {
  const target = cardArtPath(card);
  const exists = await fs.access(target).then(() => true, () => false);
  if (exists && !includeExisting) continue;
  rows.push({
    id: card.id,
    name: card.name,
    type: card.t,
    cost: card.cost,
    target,
    prompt: cardArtPrompt(card),
  });
}

await fs.writeFile(promptOutputPath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));

console.log(`Wrote ${rows.length} prompt(s) to ${promptOutputPath}`);
if (!includeExisting) console.log("Existing card art was skipped. Use --all to regenerate every prompt.");
