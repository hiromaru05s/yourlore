#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { cardArtPath, ensureDirs, loadCards } from "./card-art-lib.mjs";
import { THUMBS } from "./build-card-thumbs.mjs";

await ensureDirs();

const cards = await loadCards({ includeStarters: process.argv.includes("--include-starters") });
const missing = [];
let present = 0;

for (const card of cards) {
  const exists = await fs.access(cardArtPath(card)).then(() => true, () => false);
  if (exists) present += 1;
  else missing.push(card.id);
}

// A missing or stale thumbnail is invisible until the gallery feels slow, so
// check it here rather than trusting that someone remembered to run art:thumbs.
const staleThumbs = [];
const mtime = (p) => fs.stat(p).then((st) => st.mtimeMs, () => -1);
for (const card of cards) {
  const master = cardArtPath(card);
  const masterM = await mtime(master);
  if (masterM < 0) continue;
  for (const t of THUMBS) {
    const thumb = path.join(path.dirname(master), "..", t.dir, path.basename(master));
    if ((await mtime(thumb)) < masterM) { staleThumbs.push(`${card.id}/${t.dir}`); break; }
  }
}

console.log(`Card art: ${present}/${cards.length} present`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
if (staleThumbs.length) {
  console.log(`Missing/stale thumbnails (${staleThumbs.length}): ${staleThumbs.slice(0, 20).join(", ")}${staleThumbs.length > 20 ? ", …" : ""}`);
  console.log("Run: npm run art:thumbs");
}
