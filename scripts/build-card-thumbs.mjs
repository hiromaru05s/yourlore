#!/usr/bin/env node
// ============================================================
// LORE — card art thumbnails.
//
// The masters in art/cards are 832x1216 (some 1024x1536). Nothing except the
// zoom overlay renders art at anything close to that, and the browser decodes
// and rasterises one image at a time — so oversized art shows up as the LAST
// cards in a grid appearing a few hundred ms after the first ones, not as
// bandwidth. Two derived sizes cover every view:
//
//   cards-sm/  384px — board, hand, market, and high-density gallery grids
//   cards-xs/  192px — gallery grids at 1x/2x (srcset picks between the two)
//
// Measured over 336 warm images, 384px vs 192px: p90 504ms -> 175ms.
//
//   npm run art:thumbs            # only missing/stale files
//   npm run art:thumbs -- --force # rebuild everything
// ============================================================
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const MASTERS = path.join(ROOT, "client/public/art/cards");

// Keep in sync with artEl() in client/src/ui/cardView.ts.
export const THUMBS = [
  { dir: "cards-sm", width: 384, quality: 78 },
  { dir: "cards-xs", width: 192, quality: 76 },
];

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 6;

const mtime = (p) => fs.stat(p).then((s) => s.mtimeMs, () => -1);

async function masters() {
  const entries = await fs.readdir(MASTERS, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".webp")).map((e) => e.name).sort();
}

async function build(sharp, name) {
  const src = path.join(MASTERS, name);
  const srcM = await mtime(src);
  const made = [];
  for (const t of THUMBS) {
    const out = path.join(ROOT, "client/public/art", t.dir, name);
    if (!FORCE && (await mtime(out)) >= srcM) continue;
    // withoutEnlargement: a master smaller than the target is copied at its own
    // size rather than upscaled into a bigger, blurrier file.
    await sharp(src)
      .resize({ width: t.width, withoutEnlargement: true })
      .webp({ quality: t.quality, effort: 5 })
      .toFile(out);
    made.push(t.dir);
  }
  return made;
}

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.error("build-card-thumbs: `sharp` is not installed. Run `npm i -D sharp` and retry.");
    process.exit(1);
  }
  await Promise.all(THUMBS.map((t) => fs.mkdir(path.join(ROOT, "client/public/art", t.dir), { recursive: true })));

  const names = await masters();
  if (!names.length) {
    console.error(`build-card-thumbs: no masters in ${MASTERS}`);
    process.exit(1);
  }

  let built = 0, skipped = 0;
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

  const totalBytes = async (dir) => {
    const files = await fs.readdir(dir).catch(() => []);
    let n = 0;
    for (const f of files) if (f.endsWith(".webp")) n += await fs.stat(path.join(dir, f)).then((s) => s.size, () => 0);
    return n;
  };
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";
  console.log(`card thumbs: ${names.length} masters — ${built} rebuilt, ${skipped} up to date`);
  console.log(`  cards     ${mb(await totalBytes(MASTERS))}`);
  for (const t of THUMBS) console.log(`  ${t.dir.padEnd(9)} ${mb(await totalBytes(path.join(ROOT, "client/public/art", t.dir)))}`);
}

// Only build when run directly — check-card-art.mjs imports THUMBS from here.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
