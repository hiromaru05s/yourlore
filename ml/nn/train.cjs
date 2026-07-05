// Tiny MLP value net trainer (pure Node). Architecture: F -> H1 -> H2 -> 1 (sigmoid).
// Adam optimizer, binary cross-entropy, feature standardization. Exports weights JSON.
const { readFileSync, writeFileSync } = require("fs");

const DATA = process.argv[2] || "nn/data.bin";
const OUT = process.argv[3] || "nn/weights.json";
const H1 = 64, H2 = 64;
const EPOCHS = Number(process.argv[4] || 12);
const BATCH = 256;
const LR = 0.002;

// ---- load ----
const buf = readFileSync(DATA);
const n = buf.readInt32LE(0), F = buf.readInt32LE(4);
const xf = new Float32Array(buf.buffer, buf.byteOffset + 8, n * F);
const yf = new Float32Array(buf.buffer, buf.byteOffset + 8 + n * F * 4, n);
console.error(`loaded ${n} samples, F=${F}`);

// ---- standardize features ----
const mean = new Float64Array(F), std = new Float64Array(F);
for (let i = 0; i < n; i++) for (let j = 0; j < F; j++) mean[j] += xf[i * F + j];
for (let j = 0; j < F; j++) mean[j] /= n;
for (let i = 0; i < n; i++) for (let j = 0; j < F; j++) { const d = xf[i * F + j] - mean[j]; std[j] += d * d; }
for (let j = 0; j < F; j++) std[j] = Math.sqrt(std[j] / n) || 1;

// ---- shuffle + split ----
const idx = new Int32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
let rs = 999 >>> 0; const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
const nVal = Math.floor(n * 0.1), nTr = n - nVal;

function getX(row) { const o = row * F, v = new Float64Array(F); for (let j = 0; j < F; j++) v[j] = (xf[o + j] - mean[j]) / std[j]; return v; }

// ---- init params (He) ----
const rn = () => (rnd() * 2 - 1);
function mat(r, c, scale) { const m = new Float64Array(r * c); for (let i = 0; i < r * c; i++) m[i] = rn() * scale; return m; }
let W1 = mat(H1, F, Math.sqrt(2 / F)), b1 = new Float64Array(H1);
let W2 = mat(H2, H1, Math.sqrt(2 / H1)), b2 = new Float64Array(H2);
let W3 = mat(1, H2, Math.sqrt(2 / H2)), b3 = new Float64Array(1);

// Adam state
function zeros(a) { return new Float64Array(a.length); }
const m1 = zeros(W1), v1 = zeros(W1), mb1 = zeros(b1), vb1 = zeros(b1);
const m2 = zeros(W2), v2 = zeros(W2), mb2 = zeros(b2), vb2 = zeros(b2);
const m3 = zeros(W3), v3 = zeros(W3), mb3 = zeros(b3), vb3 = zeros(b3);
const B1 = 0.9, B2 = 0.999, EPS = 1e-8;
let tstep = 0;
function adam(p, g, m, v) {
  tstep;
  for (let i = 0; i < p.length; i++) {
    m[i] = B1 * m[i] + (1 - B1) * g[i];
    v[i] = B2 * v[i] + (1 - B2) * g[i] * g[i];
    const mh = m[i] / (1 - Math.pow(B1, tstep));
    const vh = v[i] / (1 - Math.pow(B2, tstep));
    p[i] -= LR * mh / (Math.sqrt(vh) + EPS);
  }
}

const relu = (z) => z > 0 ? z : 0;
const sig = (z) => 1 / (1 + Math.exp(-z));

function forward(x) {
  const h1 = new Float64Array(H1);
  for (let i = 0; i < H1; i++) { let s = b1[i]; const o = i * F; for (let j = 0; j < F; j++) s += W1[o + j] * x[j]; h1[i] = relu(s); }
  const h2 = new Float64Array(H2);
  for (let i = 0; i < H2; i++) { let s = b2[i]; const o = i * H1; for (let j = 0; j < H1; j++) s += W2[o + j] * h1[j]; h2[i] = relu(s); }
  let s = b3[0]; for (let j = 0; j < H2; j++) s += W3[j] * h2[j];
  return { h1, h2, p: sig(s) };
}

function evalSplit(start, end) {
  let loss = 0, correct = 0, cnt = 0;
  for (let k = start; k < end; k++) {
    const row = idx[k]; const x = getX(row); const y = yf[row];
    const { p } = forward(x);
    const pc = Math.min(Math.max(p, 1e-7), 1 - 1e-7);
    loss += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
    cnt++;
  }
  return { loss: loss / cnt, acc: correct / cnt };
}

// grad buffers
const gW1 = zeros(W1), gb1 = zeros(b1), gW2 = zeros(W2), gb2 = zeros(b2), gW3 = zeros(W3), gb3 = zeros(b3);

for (let ep = 0; ep < EPOCHS; ep++) {
  // reshuffle training portion
  for (let i = nTr - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  for (let bs = 0; bs < nTr; bs += BATCH) {
    const be = Math.min(bs + BATCH, nTr);
    gW1.fill(0); gb1.fill(0); gW2.fill(0); gb2.fill(0); gW3.fill(0); gb3.fill(0);
    const bn = be - bs;
    for (let k = bs; k < be; k++) {
      const row = idx[k]; const x = getX(row); const y = yf[row];
      const { h1, h2, p } = forward(x);
      const dp = (p - y); // dL/dz3 for BCE+sigmoid
      for (let j = 0; j < H2; j++) { gW3[j] += dp * h2[j]; }
      gb3[0] += dp;
      const dh2 = new Float64Array(H2);
      for (let i = 0; i < H2; i++) if (h2[i] > 0) dh2[i] = dp * W3[i];
      for (let i = 0; i < H2; i++) { if (dh2[i] === 0) continue; const o = i * H1; for (let j = 0; j < H1; j++) gW2[o + j] += dh2[i] * h1[j]; gb2[i] += dh2[i]; }
      const dh1 = new Float64Array(H1);
      for (let j = 0; j < H1; j++) { if (h1[j] <= 0) continue; let s = 0; for (let i = 0; i < H2; i++) s += dh2[i] * W2[i * H1 + j]; dh1[j] = s; }
      for (let i = 0; i < H1; i++) { if (dh1[i] === 0) continue; const o = i * F; for (let j = 0; j < F; j++) gW1[o + j] += dh1[i] * x[j]; gb1[i] += dh1[i]; }
    }
    const inv = 1 / bn;
    for (let i = 0; i < gW1.length; i++) gW1[i] *= inv; for (let i = 0; i < gb1.length; i++) gb1[i] *= inv;
    for (let i = 0; i < gW2.length; i++) gW2[i] *= inv; for (let i = 0; i < gb2.length; i++) gb2[i] *= inv;
    for (let i = 0; i < gW3.length; i++) gW3[i] *= inv; for (let i = 0; i < gb3.length; i++) gb3[i] *= inv;
    tstep++;
    adam(W1, gW1, m1, v1); adam(b1, gb1, mb1, vb1);
    adam(W2, gW2, m2, v2); adam(b2, gb2, mb2, vb2);
    adam(W3, gW3, m3, v3); adam(b3, gb3, mb3, vb3);
  }
  const tr = evalSplit(0, Math.min(nTr, 20000));
  const va = evalSplit(nTr, n);
  console.error(`epoch ${ep + 1}/${EPOCHS}  train loss ${tr.loss.toFixed(4)} acc ${(tr.acc * 100).toFixed(1)}%  |  val loss ${va.loss.toFixed(4)} acc ${(va.acc * 100).toFixed(1)}%`);
}

writeFileSync(OUT, JSON.stringify({
  F, H1, H2,
  mean: Array.from(mean), std: Array.from(std),
  W1: Array.from(W1), b1: Array.from(b1),
  W2: Array.from(W2), b2: Array.from(b2),
  W3: Array.from(W3), b3: Array.from(b3),
}));
console.error(`wrote ${OUT}`);
