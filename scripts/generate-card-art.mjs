#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDirs, promptOutputPath } from "./card-art-lib.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const providerArg = args.find((arg) => arg.startsWith("--provider="));
const modelArg = args.find((arg) => arg.startsWith("--model="));
const force = args.includes("--force");

const provider = providerArg?.split("=")[1] ?? process.env.ART_PROVIDER ?? "replicate";
const model = modelArg?.split("=")[1] ?? process.env.ART_MODEL ?? defaultModel(provider);
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const only = onlyArg ? new Set(onlyArg.split("=")[1].split(",").map((id) => id.trim()).filter(Boolean)) : null;

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

console.log(`Generating ${queue.length} image(s) with provider=${provider}, model=${model}`);

for (const row of queue) {
  await fs.mkdir(path.dirname(row.target), { recursive: true });
  const exists = await fs.access(row.target).then(() => true, () => false);
  if (exists && !force) {
    console.log(`skip ${row.id}: ${row.target}`);
    continue;
  }

  console.log(`${dryRun ? "dry" : "gen"} ${row.id}: ${row.name}`);
  if (dryRun) continue;

  if (provider === "replicate") {
    await generateWithReplicate(row, model);
  } else if (provider === "openai") {
    await generateWithOpenAI(row, model);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

console.log("Done.");

function defaultModel(providerName) {
  if (providerName === "replicate") return "black-forest-labs/flux-dev";
  if (providerName === "openai") return "gpt-image-2";
  return "";
}

async function generateWithReplicate(row, modelName) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("Missing REPLICATE_API_TOKEN. Run: export REPLICATE_API_TOKEN=...");
  }

  let prediction = await createReplicatePrediction(apiToken, modelName, row);
  while (prediction.status !== "succeeded") {
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Replicate prediction ${prediction.status} for ${row.id}: ${prediction.error ?? "no error details"}`);
    }
    await sleep(1500);
    prediction = await getReplicatePrediction(apiToken, prediction.urls.get);
  }

  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!url) throw new Error(`Replicate returned no image URL for ${row.id}`);
  await downloadImage(url, row.target);
}

async function createReplicatePrediction(apiToken, modelName, row) {
  for (;;) {
    let response;
    try {
      response = await fetch(`https://api.replicate.com/v1/models/${modelName}/predictions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Prefer": "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt: row.prompt,
            aspect_ratio: process.env.REPLICATE_ASPECT_RATIO ?? "2:3",
            output_format: "webp",
            output_quality: Number(process.env.REPLICATE_OUTPUT_QUALITY ?? 90),
            num_outputs: 1,
          },
        }),
      });
    } catch (error) {
      console.log(`network retry ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(5000);
      continue;
    }

    if (response.ok) return response.json();

    const text = await response.text();
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) || parseRetryAfter(text) || 10;
      console.log(`rate limited ${row.id}; waiting ${retryAfter}s`);
      await sleep((retryAfter + 1) * 1000);
      continue;
    }

    throw new Error(`Replicate generation failed for ${row.id}: ${response.status} ${text}`);
  }
}

function parseRetryAfter(text) {
  try {
    const payload = JSON.parse(text);
    return Number(payload.retry_after) || 0;
  } catch {
    return 0;
  }
}

async function getReplicatePrediction(apiToken, url) {
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Replicate polling failed: ${response.status} ${text}`);
  }
  return response.json();
}

async function generateWithOpenAI(row, modelName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Run: export OPENAI_API_KEY=...");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      prompt: row.prompt,
      n: 1,
      size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1536",
      quality: process.env.OPENAI_IMAGE_QUALITY ?? "low",
      output_format: "webp",
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
    await downloadImage(image.url, row.target);
  } else {
    throw new Error(`OpenAI returned no image data for ${row.id}`);
  }
}

async function downloadImage(url, target) {
  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed for ${target}: ${imageResponse.status}`);
  }
  await fs.writeFile(target, Buffer.from(await imageResponse.arrayBuffer()));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
