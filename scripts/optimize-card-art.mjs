#!/usr/bin/env node
// ============================================================
// LORE — card art derivatives.
//
// WHY: the masters in client/public/art/cards are 832x1216 (some 1024x1536),
// ~165 KB each. Every place that is NOT the zoom overlay renders them at
// 90–150 CSS px (archive grid, deck pool, market, hand, board) or 22–74 px
// (avatars). Shipping the master to those slots means the archive screen
// alone pulls ~57 MB and the avatar picker ~33 MB — that is the "card images
// load absurdly slowly" bug.
//
// This writes two down-scaled variants next to the masters:
//   art/cards/w384/<ID>.webp  — every in-game / grid card  (~15 KB)
//   art/cards/w128/<ID>.webp  — avatars, mini thumbnails    (~3 KB)
// The master stays the source of truth and is still used by the zoom view.
//
//   npm run art:optimize            # only stale/missing variants
//   npm run art:optimize -- --force # rebuild everything
// ============================================================
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "client/public/art/cards");

// Keep in sync with cardArtSrc() in client/src/ui/cardView.ts.
export const VARIANTS = [
  { dir: "w384", width: 384, quality: 78 }, // 2x of the largest non-zoom card art window (~150px)
  { dir: "w128", width: 128, quality: 70 }, // 2x of the largest avatar (~74px)
];

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 6;

/** Masters only — the variant sub-directories are skipped by the withFileTypes filter. */
async function masters() {
  const entries = await fs.readdir(SRC_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".webp")).map((e) => e.name).sort();
}

async function mtime(p) {
  return fs.stat(p).then((s) => s.mtimeMs, () => -1);
}

async function build(sharp, name) {
  const src = path.join(SRC_DIR, name);
  const srcM = await mtime(src);
  const made = [];
  for (const v of VARIANTS) {
    const out = path.join(SRC_DIR, v.dir, name);
    if (!FORCE && (await mtime(out)) >= srcM) continue;
    // withoutEnlargement: a master that is already smaller than the target is
    // copied at its own size rather than upscaled into a bigger, blurrier file.
    await sharp(src)
      .resize({ width: v.width, withoutEnlargement: true })
      .webp({ quality: v.quality, effort: 5 })
      .toFile(out);
    made.push(v.dir);
  }
  return made;
}

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.error("optimize-card-art: `sharp` is not installed. Run `npm i -D sharp` and retry.");
    process.exit(1);
  }

  await Promise.all(VARIANTS.map((v) => fs.mkdir(path.join(SRC_DIR, v.dir), { recursive: true })));
  const names = await masters();
  if (!names.length) {
    console.error(`optimize-card-art: no masters found in ${SRC_DIR}`);
    process.exit(1);
  }

  let built = 0;
  let skipped = 0;
  const queue = [...names];
  const worker = async () => {
    for (let name = queue.pop(); name; name = queue.pop()) {
      const made = await build(sharp, name).catch((err) => {
        console.error(`  ! ${name}: ${err.message}`);
        return [];
      });
      if (made.length) built += 1; else skipped += 1;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const bytes = async (dir) => {
    const files = await fs.readdir(dir).catch(() => []);
    let total = 0;
    for (const f of files) {
      if (!f.endsWith(".webp")) continue;
      total += await fs.stat(path.join(dir, f)).then((s) => s.size, () => 0);
    }
    return total;
  };
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";
  console.log(`card art: ${names.length} masters — ${built} rebuilt, ${skipped} up to date`);
  console.log(`  masters ${mb(await bytes(SRC_DIR))}`);
  for (const v of VARIANTS) console.log(`  ${v.dir}    ${mb(await bytes(path.join(SRC_DIR, v.dir)))}`);
}

// Only build when run directly — check-card-art.mjs imports VARIANTS from here.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
