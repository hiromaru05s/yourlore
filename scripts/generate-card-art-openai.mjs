#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDirs, promptOutputPath } from "./card-art-lib.mjs";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Run: export OPENAI_API_KEY=...");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const only = onlyArg ? new Set(onlyArg.split("=")[1].split(",").map((id) => id.trim()).filter(Boolean)) : null;

const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
const size = process.env.OPENAI_IMAGE_SIZE ?? "1024x1536";
const quality = process.env.OPENAI_IMAGE_QUALITY ?? "low";
const outputFormat = "webp";

await ensureDirs();

const jsonl = await fs.readFile(promptOutputPath, "utf8").catch(() => "");
const rows = jsonl.split("\n").filter(Boolean).map((line) => JSON.parse(line));
const queue = rows
  .filter((row) => !only || only.has(row.id))
  .slice(0, Number.isFinite(limit) ? limit : undefined);

if (!queue.length) {
  console.log("No queued card art prompts. Run: npm run art:prompts");
  process.exit(0);
}

console.log(`Generating ${queue.length} image(s) with ${model}, ${size}, quality=${quality}`);

for (const row of queue) {
  await fs.mkdir(path.dirname(row.target), { recursive: true });
  const exists = await fs.access(row.target).then(() => true, () => false);
  if (exists) {
    console.log(`skip ${row.id}: ${row.target}`);
    continue;
  }

  console.log(`${dryRun ? "dry" : "gen"} ${row.id}: ${row.name}`);
  if (dryRun) continue;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: row.prompt,
      n: 1,
      size,
      quality,
      output_format: outputFormat,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image generation failed for ${row.id}: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const image = payload.data?.[0];
  if (image?.b64_json) {
    await fs.writeFile(row.target, Buffer.from(image.b64_json, "base64"));
  } else if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`Image download failed for ${row.id}: ${imageResponse.status}`);
    await fs.writeFile(row.target, Buffer.from(await imageResponse.arrayBuffer()));
  } else {
    throw new Error(`No image data returned for ${row.id}`);
  }
}

console.log("Done.");
