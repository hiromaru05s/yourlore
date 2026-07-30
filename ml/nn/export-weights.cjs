// STEP 3: convert the trained weights.json into the shipped TS module.
//   node ml/nn/export-weights.cjs ml/nn/weights.json client/src/shared/botNetWeights.ts
const { readFileSync, writeFileSync } = require("fs");
const src = process.argv[2] || "ml/nn/weights.json";
const dst = process.argv[3] || "client/src/shared/botNetWeights.ts";
const w = JSON.parse(readFileSync(src, "utf8"));
const body =
`// ============================================================
// LORE — value-net weights for the HELL bot (generated, do not edit by hand).
// Regenerate: ml/nn/gen.ts -> ml/nn/train.cjs -> ml/nn/export-weights.cjs
// F->H1->H2->1 MLP, feature-standardized.
// ============================================================
export interface NetWeights {
  F: number; H1: number; H2: number;
  mean: number[]; std: number[];
  W1: number[]; b1: number[];
  W2: number[]; b2: number[];
  W3: number[]; b3: number[];
}
export const NET_WEIGHTS: NetWeights = ${JSON.stringify(w)};
`;
writeFileSync(dst, body);
console.error(`wrote ${dst} (${body.length} bytes)`);
