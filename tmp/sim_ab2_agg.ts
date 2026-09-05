import { DB, STARTERS, BALANCE_VERSION } from "../client/src/shared/cards";
import * as fs from "fs";
const dir = process.argv[2], outBase = process.argv[3], lethalDir = process.argv[4], run1 = process.argv[5];
type Acc = { n: number; wA: number; wB: number; used: number; buyTurn: number; nBuy: number; turnsB: number; drawsB: number; d: number[] };
type Ctrl = { n: number; w: number; turns: number; draws: number };
function load(d: string) {
  const acc: Record<string, Record<string, Acc>> = { starter1: {}, starter3: {}, buy: {} };
  const ctrl: Record<string, Ctrl> = { starter: { n: 0, w: 0, turns: 0, draws: 0 }, buy: { n: 0, w: 0, turns: 0, draws: 0 } };
  let games = 0, sec = 0, lethal = false, pairs = 0;
  for (const f of fs.readdirSync(d).filter((f) => f.startsWith("shard_") && f.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(`${d}/${f}`, "utf8")); games += j.games; sec = Math.max(sec, j.sec); lethal = j.lethal; pairs = j.pairs;
    for (const m of Object.keys(acc)) for (const [id, a] of Object.entries(j.acc[m] as Record<string, Acc>)) {
      const t = (acc[m][id] ??= { n: 0, wA: 0, wB: 0, used: 0, buyTurn: 0, nBuy: 0, turnsB: 0, drawsB: 0, d: [] });
      for (const k of Object.keys(t) as (keyof Acc)[]) if (k === "d") t.d.push(...a.d); else (t[k] as number) += a[k] as number;
    }
    for (const m of Object.keys(ctrl)) for (const k of Object.keys(ctrl[m]) as (keyof Ctrl)[]) ctrl[m][k] += j.ctrl[m][k];
  }
  return { acc, ctrl, games, sec, lethal, pairs };
}
const main = load(dir);
const nm = (id: string) => (DB[id] ?? STARTERS[id])?.name ?? id;
const ja = (id: string) => ((DB[id] ?? STARTERS[id]) as { nameJa?: string })?.nameJa;
const T: Record<string, string> = { mon: "モンスター", spell: "魔法", trap: "罠", starter: "スターター" };
type Row = { id: string; name: string; t: string; cost: number; n: number; wrA: number; wrB: number; delta: number; se: number; adj: number; eff: number; usable: string; rank: number; rlo: number; rhi: number; play: number; buyTurn: number; turns: number; draws: number; tier: string; d: number[] };
function rows(m: string): Row[] {
  const rs = Object.entries(main.acc[m]).map(([id, a]) => {
    const d = a.d.map((x) => x / 2); const mean = d.reduce((s, x) => s + x, 0) / d.length;
    const varr = d.reduce((s, x) => s + (x - mean) ** 2, 0) / (d.length - 1); const se = Math.sqrt(varr / d.length);
    const c = DB[id] ?? STARTERS[id];
    return { id, name: nm(id), t: c.t, cost: c.cost, n: a.n, wrA: a.wA / a.n, wrB: a.wB / a.n, delta: mean, se, adj: 0, eff: 0, usable: "", rank: 0, rlo: 0, rhi: 0, play: a.n ? a.used / a.n : NaN, buyTurn: a.nBuy ? a.buyTurn / a.nBuy : NaN, turns: a.turnsB / a.n, draws: a.drawsB / a.n, tier: "", d } as Row;
  }).sort((x, y) => y.delta - x.delta);
  rs.forEach((r, i) => (r.rank = i + 1));
  // cost-adjusted (buy only): delta minus mean delta of same cost
  if (m === "buy") { const byC: Record<number, number[]> = {}; rs.forEach((r) => (byC[r.cost] ??= []).push(r.delta)); rs.forEach((r) => (r.adj = r.delta - byC[r.cost].reduce((s, x) => s + x, 0) / byC[r.cost].length)); }
  // usability: play rate <10% → 評価不能 (bot never/rarely plays it) ; 10–50% → 参考
  rs.forEach((r) => (r.usable = r.play < 0.1 ? "✕評価不能" : r.play < 0.5 ? "△参考" : "○"));
  // waste baseline (buy only): mean Δ of never-played cards per cost = pure mana+dilution loss; eff = Δ − waste(cost)
  if (m === "buy") {
    const w: Record<number, number[]> = {}; rs.filter((r) => r.play < 0.02).forEach((r) => (w[r.cost] ??= []).push(r.delta));
    const pts = Object.entries(w).filter(([, a]) => a.length >= 2).map(([c, a]) => [Number(c), a.reduce((s, x) => s + x, 0) / a.length] as [number, number]).sort((a, b) => a[0] - b[0]);
    const waste = (c: number) => { if (!pts.length) return 0; if (c <= pts[0][0]) return pts[0][1] * (c / pts[0][0]); const hi = pts.find((p) => p[0] >= c); if (!hi) { const [c0, w0] = pts[pts.length - 1]; return w0 * (c / c0); } const lo = pts.filter((p) => p[0] <= c).pop()!; return lo[0] === hi[0] ? lo[1] : lo[1] + ((hi[1] - lo[1]) * (c - lo[0])) / (hi[0] - lo[0]); };
    rs.forEach((r) => (r.eff = r.delta - waste(r.cost)));
    (globalThis as any).__waste = pts;
  }
  // block bootstrap over pairs (pair index k is shared by every card → resample k jointly)
  const N = rs[0].d.length, B = 600, M = rs.length; const cnt = new Int32Array(N); const means = new Float64Array(M);
  const rankLo = new Array(M).fill(0), rankHi = new Array(M).fill(0); const rankSamples: Int16Array[] = rs.map(() => new Int16Array(B));
  let seed = 12345; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  for (let b = 0; b < B; b++) {
    cnt.fill(0); for (let i = 0; i < N; i++) cnt[Math.floor(rnd() * N)]++;
    for (let j = 0; j < M; j++) { const d = rs[j].d; let s = 0; for (let k = 0; k < N; k++) if (cnt[k]) s += cnt[k] * d[k]; means[j] = s / N; }
    const order = Array.from({ length: M }, (_, j) => j).sort((x, y) => means[y] - means[x]);
    order.forEach((j, r) => (rankSamples[j][b] = r + 1));
  }
  rs.forEach((r, j) => { const s = Array.from(rankSamples[j]).sort((x, y) => x - y); r.rlo = s[Math.floor(B * 0.025)]; r.rhi = s[Math.ceil(B * 0.975) - 1]; });
  rs.forEach((r) => { const z = Math.abs(r.delta) / r.se; r.tier = z >= 3.9 ? "◎確実" : z >= 1.96 ? "○有意" : "－誤差内"; });
  return rs;
}
const pct = (x: number) => (x * 100).toFixed(1);
const sgn = (x: number) => (x >= 0 ? "+" : "") + pct(x);
const spearman = (a: Record<string, number>, b: Record<string, number>) => {
  const ids = Object.keys(a).filter((id) => id in b); const rk = (o: Record<string, number>) => { const s = [...ids].sort((x, y) => o[y] - o[x]); const r: Record<string, number> = {}; s.forEach((id, i) => (r[id] = i)); return r; };
  const ra = rk(a), rb = rk(b); const n = ids.length; const d2 = ids.reduce((s, id) => s + (ra[id] - rb[id]) ** 2, 0); return { rho: 1 - (6 * d2) / (n * (n * n - 1)), n };
};
const S1 = rows("starter1"), S3 = rows("starter3"), Bq = rows("buy");
const out: Record<string, unknown> = { version: BALANCE_VERSION, games: main.games, pairs: main.pairs, lethal: main.lethal, ctrl: main.ctrl };
let md = `# カードパワーランキング v2 (${BALANCE_VERSION}, bot paired A/B)\n\n`;
md += `## 方法と信頼性\n\n`;
md += `- 総ゲーム数 **${main.games.toLocaleString()}** / 各カード **${main.pairs}ペア** (同一シード・同一デッキで「カードあり vs なし」を1対1比較)。\n`;
md += `- デッキ環境: 両者とも 50% ボットのアーキタイプ・プリセット(AGGRO/RAMP/MIDRANGE/GAMBLER/ELF ほか、botTune適用) / 50% DECK_POOL からランダム8枚。先攻・被験者側はペアごとに交互。\n`;
md += `- ボット: greedy(hard相当・ブランダーなし)、リーサル探索${main.lethal ? "あり" : "なし"}。${lethalDir && fs.existsSync(lethalDir + "/DONE") ? "探索ありの検証走行との比較は末尾。" : ""}\n`;
md += `- **Δ勝率** = 被験者側の勝率(カードあり) − 同一ゲームの勝率(カードなし)。引き分け(4000手上限)は0.5。±は95%信頼区間の半幅。\n`;
md += `- **順位95%区間** = ペアをまとめてブートストラップ再抽出(600回)した時の順位の2.5〜97.5%点。区間が重なるカード同士は順位を断定できない。\n`;
md += `- **信頼度**: ◎確実 = |Δ| ≥ 3.9SE (p<0.0001) / ○有意 = ≥1.96SE (p<0.05) / －誤差内。\n`;
md += `- **効果値**(購入のみ) = Δ − マナ浪費基準(そのコストの「ボットが一度も使わなかったカード」の平均Δ = 純粋なマナ損+デッキ希釈)。0 なら「効果ゼロのカードと同じ」、正なら効果がコストに見合う。\n`;
md += `- **評価**: ○ = 使用率50%以上 / △参考 = 10〜50% / ✕評価不能 = 10%未満(ボットが扱えないカード。Δはマナ浪費分でありカードの強さではない)。\n`;
md += `- 購入カードは最初に買える自ターンに強制購入(マナ消費、墓地へ)。「使用率」= 購入後に1度でもプレイ(罠は設置)した割合。使用率が低いカードはボットが扱えていないので過小評価。\n`;
md += `- 対照群(カードなし)の平均: 購入側 勝率 ${pct(main.ctrl.buy.w / main.ctrl.buy.n)} / 平均ターン ${(main.ctrl.buy.turns / main.ctrl.buy.n).toFixed(1)} / 引き分け ${pct(main.ctrl.buy.draws / main.ctrl.buy.n)}。\n\n`;
if (run1 && fs.existsSync(run1)) {
  const r1 = JSON.parse(fs.readFileSync(run1, "utf8"));
  const mp = (rs: { id: string; delta: number }[]) => Object.fromEntries(rs.map((r) => [r.id, r.delta]));
  const sb = spearman(mp(r1.buy), mp(Bq)), ss = spearman(mp(r1.starter), mp(S1));
  md += `### 再現性 (独立シードの第1走行 1000ペア との順位相関)\n\n- 購入カード: Spearman ρ = **${sb.rho.toFixed(3)}** (n=${sb.n})\n- スターター(1枚): ρ = **${ss.rho.toFixed(3)}** (n=${ss.n}) — スターターは効果が小さく順位が不安定\n\n`;
  out.repro = { buy: sb, starter: ss };
}
const table = (rs: Row[], kind: "starter" | "buy") => {
  md += `| 順位 | 順位95%区間 | カード | ID | 種別 | コスト | Δ勝率 | ±95% | 信頼度 |${kind === "buy" ? " 効果値 | 使用率 | 評価 | 購入T |" : " 使用率 | 評価 |"}\n|--:|:--:|---|---|---|--:|--:|--:|:--:|${kind === "buy" ? "--:|--:|:--:|--:|" : "--:|:--:|"}\n`;
  rs.forEach((r) => { md += `| ${r.rank} | ${r.rlo}–${r.rhi} | ${r.name}${ja(r.id) ? ` / ${ja(r.id)}` : ""} | ${r.id} | ${T[r.t] ?? r.t} | ${r.cost} | **${sgn(r.delta)}** | ${pct(1.96 * r.se)} | ${r.tier} |${kind === "buy" ? ` ${sgn(r.eff)} | ${pct(r.play)} | ${r.usable} | ${isNaN(r.buyTurn) ? "-" : r.buyTurn.toFixed(1)} |` : ` ${pct(r.play)} | ${r.usable} |`}\n`; });
  md += "\n";
};
md += `## スターター — 1枚差し替え (${S1.length}枚)\n\nデッキ8枚目の「ゴミ」を対象カードに差し替え。\n\n`; table(S1, "starter");
md += `## スターター — 3枚差し替え (${S3.length}枚)\n\nデッキ6〜8枚目の「ゴミ」3枚を対象カード3枚に差し替え(効果を増幅して検出しやすくした版)。\n\n`; table(S3, "starter");
const usableB = Bq.filter((r) => r.usable !== "✕評価不能"), unB = Bq.filter((r) => r.usable === "✕評価不能");
const wpts = (globalThis as any).__waste as [number, number][];
md += `## 全体 — 購入カード ${Bq.length}枚 (評価可能 ${usableB.length}枚)\n\nマナ浪費基準(コスト→Δ): ${wpts.map(([c, w]) => `${c}→${sgn(w)}`).join(", ")}\n\n`; table(usableB, "buy");
md += `### 評価不能 — ボットが使わなかった ${unB.length}枚\n\n順位はΔ順だがカードの強さとは無関係。castable()条件やAIの判断で一度も使われていない。\n\n`; table(unB, "buy");
md += `### 効果値順 Top30 (評価可能のみ)\n\n`; table([...usableB].sort((a, b) => b.eff - a.eff).slice(0, 30), "buy");
for (const t of ["mon", "spell", "trap"]) { md += `### 種別内: ${T[t]} (評価可能のみ)\n\n`; table(usableB.filter((r) => r.t === t), "buy"); }
md += `### コスト帯の平均Δ\n\n| コスト | 枚数 | 平均Δ | 最強 | 最弱 |\n|--:|--:|--:|---|---|\n`;
for (const c of [...new Set(Bq.map((r) => r.cost))].sort((x, y) => x - y)) { const rs = usableB.filter((r) => r.cost === c); if (!rs.length) continue; md += `| ${c} | ${rs.length} | ${sgn(rs.reduce((s, r) => s + r.delta, 0) / rs.length)} | ${rs[0].name} ${sgn(rs[0].delta)} | ${rs[rs.length - 1].name} ${sgn(rs[rs.length - 1].delta)} |\n`; }
md += "\n";
if (lethalDir && fs.existsSync(lethalDir + "/DONE")) {
  const L = load(lethalDir);
  const cmp = (m: string, rsMain: Row[]) => {
    const n = Object.values(L.acc[m])[0]?.d.length ?? 0; const rows2: { id: string; dl: number; dm: number; diff: number; seDiff: number }[] = [];
    for (const [id, a] of Object.entries(L.acc[m])) { const r = rsMain.find((x) => x.id === id)!; const dl = a.d.map((x) => x / 2), dm = r.d.slice(0, n); const diffs = dl.map((x, i) => x - dm[i]); const mean = diffs.reduce((s, x) => s + x, 0) / n; const sd = Math.sqrt(diffs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)); rows2.push({ id, dl: dl.reduce((s, x) => s + x, 0) / n, dm: dm.reduce((s, x) => s + x, 0) / n, diff: mean, seDiff: sd / Math.sqrt(n) }); }
    const rho = spearman(Object.fromEntries(rows2.map((r) => [r.id, r.dl])), Object.fromEntries(rsMain.map((r) => [r.id, r.delta])));
    const sig = rows2.filter((r) => Math.abs(r.diff) > 1.96 * r.seDiff);
    const top = (arr: { id: string; v: number }[]) => new Set(arr.sort((a, b) => b.v - a.v).slice(0, 20).map((r) => r.id));
    const tl = top(rows2.map((r) => ({ id: r.id, v: r.dl }))), tm = top(rsMain.map((r) => ({ id: r.id, v: r.delta })));
    const ov = [...tl].filter((id) => tm.has(id)).length;
    md += `- **${m}**: 同一シード${n}ペアで比較。順位相関 ρ = **${rho.rho.toFixed(3)}**、Top20の一致 ${ov}/20。Δが有意に変わったカード ${sig.length}/${rows2.length}: ${sig.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 12).map((r) => `${nm(r.id)} (${sgn(r.dm)}→${sgn(r.dl)})`).join(", ")}\n`;
    return { rho: rho.rho, top20overlap: ov, changed: sig.map((r) => ({ id: r.id, main: r.dm, lethal: r.dl })) };
  };
  md += `## 検証: リーサル探索ありボット (${L.games.toLocaleString()}ゲーム)\n\n`;
  out.lethalCheck = { buy: cmp("buy", Bq), starter1: cmp("starter1", S1), starter3: cmp("starter3", S3) };
  md += "\n";
}
const strip = (rs: Row[]) => rs.map(({ d, ...r }) => r);
fs.writeFileSync(outBase + ".md", md);
fs.writeFileSync(outBase + ".json", JSON.stringify({ ...out, starter1: strip(S1), starter3: strip(S3), buy: strip(Bq) }, null, 1));
const csv = (rs: Row[], kind: string) => rs.map((r) => [kind, r.rank, r.rlo, r.rhi, r.id, r.name, r.t, r.cost, (r.delta * 100).toFixed(2), (1.96 * r.se * 100).toFixed(2), r.tier, (r.eff * 100).toFixed(2), r.usable, (r.play * 100).toFixed(1), isNaN(r.buyTurn) ? "" : r.buyTurn.toFixed(2), r.n].join(",")).join("\n");
fs.writeFileSync(outBase + ".csv", "set,rank,rank_lo95,rank_hi95,id,name,type,cost,delta_pct,ci95_pct,tier,effect_pct,usable,play_pct,buy_turn,n_pairs\n" + [csv(S1, "starter1"), csv(S3, "starter3"), csv(Bq, "buy")].join("\n"));
console.log(`games=${main.games} pairs=${main.pairs}`);
console.log(`\nSTARTER x3`); S3.forEach((r) => console.log(`${r.rank} [${r.rlo}-${r.rhi}] ${r.name} ${sgn(r.delta)} ±${pct(1.96 * r.se)} ${r.tier} play=${pct(r.play)}`));
console.log(`\nBUY top30`); Bq.slice(0, 30).forEach((r) => console.log(`${r.rank} [${r.rlo}-${r.rhi}] ${r.name} [${r.id}] c${r.cost} ${r.t} ${sgn(r.delta)} ±${pct(1.96 * r.se)} eff${sgn(r.eff)} ${r.usable} play=${pct(r.play)}`));
console.log(`\nBUY bottom20`); Bq.slice(-20).forEach((r) => console.log(`${r.rank} [${r.rlo}-${r.rhi}] ${r.name} [${r.id}] c${r.cost} ${r.t} ${sgn(r.delta)} ±${pct(1.96 * r.se)} eff${sgn(r.eff)} ${r.usable} play=${pct(r.play)}`));
console.log(`\ntiers buy:`, Bq.reduce((o, r) => ((o[r.tier] = (o[r.tier] || 0) + 1), o), {} as Record<string, number>), `starter1:`, S1.reduce((o, r) => ((o[r.tier] = (o[r.tier] || 0) + 1), o), {} as Record<string, number>), `starter3:`, S3.reduce((o, r) => ((o[r.tier] = (o[r.tier] || 0) + 1), o), {} as Record<string, number>));
