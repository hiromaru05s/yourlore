/* eslint-disable */
// v42 smoke: 매 턴 3장 드로우 · 손패 이월 상한 5 (선택 폐기 / 강제 종료 시 오른쪽부터) · 카운터 명칭 통일 · 상회 20개
import { DB, STARTERS, BALANCE_VERSION, PASSIVES } from "../client/src/shared/cards";
import { createGame, reduce, HAND_CARRY, TURN_DRAW } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const end = (g: GameState): GameState => reduce(g, { type: "endTurn" }).state;
ok(BALANCE_VERSION === "v42", "version", BALANCE_VERSION);
ok(HAND_CARRY === 5 && TURN_DRAW === 3, "constants", [HAND_CARRY, TURN_DRAW]);
// 매 턴 3장 드로우 (후공 첫 턴 · 3턴째 모두)
{ let g = fresh(); const h1 = g.players[1].hand.length; g = end(g); ok(g.players[1].hand.length === h1 + 3, "p1 first turn draws 3", [h1, g.players[1].hand.length]);
  g.players[1].hand.length = 0; g = end(g); g.players[0].hand.length = 2; const h0 = g.players[0].hand.length; g = end(g); g.players[1].hand.length = 0; g = end(g);
  ok(g.players[0].hand.length === h0 + 3, "p0 later turn draws 3", [h0, g.players[0].hand.length]); }
// 5장 이하면 그대로 종료
{ let g = fresh(); const p = g.players[0]; p.hand.length = 0; for (let i = 0; i < 5; i++) p.hand.push(card("GRAPE")); g = end(g); ok(g.cur === 1 && !g.pending && g.players[0].hand.length === 5, "5 cards: ends without prompt"); }
// 7장: 선택 폐기 2장 → 묘지로(제외 아님) → 자동으로 턴 종료
{ let g = fresh(); const p = g.players[0]; p.hand.length = 0; const ids = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"]; ids.forEach((id) => p.hand.push(card(id)));
  g = end(g); ok(g.pending?.reason === "handCap" && g.pending?.kind === "purge" && g.pending?.data?.val === 2 && g.pending?.allowCancel === false, "7 cards: pending handCap val 2", g.pending);
  const u1 = g.players[0].hand[0].uid, u2 = g.players[0].hand[3].uid;
  g = reduce(g, { type: "pick", uid: null }).state; ok(g.pending?.reason === "handCap", "cancel is refused");
  g = reduce(g, { type: "pick", uid: u1 }).state; ok(g.pending?.reason === "handCap" && g.pending?.data?.val === 1 && g.cur === 0, "first pick keeps prompting (1 left)");
  g = reduce(g, { type: "play", idx: 0 }).state; ok(g.pending?.reason === "handCap", "other actions blocked while choosing");
  g = reduce(g, { type: "pick", uid: u2 }).state;
  ok(g.cur === 1 && !g.pending && g.players[0].hand.length === 5, "second pick → turn ends with 5 in hand", [g.cur, g.players[0].hand.length]);
  ok(g.players[0].discard.filter((c) => c.id === "M1" || c.id === "M4").length === 2 && (g.players[0].removed ?? []).length === 0, "discarded to graveyard, not exiled"); }
// 강제 종료(시간 초과): 오른쪽(마지막)부터 폐기
{ let g = fresh(); const p = g.players[0]; p.hand.length = 0; ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].forEach((id) => p.hand.push(card(id)));
  g = end(g); ok(g.pending?.reason === "handCap", "8 cards prompt"); g = end(g);
  ok(g.cur === 1 && g.players[0].hand.map((c) => c.id).join() === "M1,M2,M3,M4,M5" && ["M6", "M7", "M8"].every((id) => g.players[0].discard.some((c) => c.id === id)), "forced: rightmost 3 discarded", g.players[0].hand.map((c) => c.id)); }
// 봇은 pending을 스스로 해소한다
{ let g = fresh(); const p = g.players[0]; p.hand.length = 0; ["M1", "M2", "M3", "M4", "M5", "M6", "M7"].forEach((id) => p.hand.push(card(id))); g = end(g);
  let n = 0; while (g.pending && n < 5) { g = reduce(g, greedyDecide(g)).state; n++; } ok(!g.pending && g.cur === 1 && g.players[0].hand.length === 5, "greedy bot resolves handCap", [n, g.cur]);
  let g2 = fresh(); const p2 = g2.players[0]; p2.hand.length = 0; ["M1", "M2", "M3", "M4", "M5", "M6", "M7"].forEach((id) => p2.hand.push(card(id))); g2 = end(g2);
  n = 0; while (g2.pending && n < 5) { g2 = reduce(g2, botDecide(g2, "hard")).state; n++; } ok(!g2.pending && g2.cur === 1 && g2.players[0].hand.length === 5, "hard bot resolves handCap", [n, g2.cur]); }
// 상회: 카운터 20개마다
{ let g = fresh(); const p = g.players[0]; p.hand.push(card("GUILD_CO")); p.maxMana = 30; p.mana = 30; g = reduce(g, { type: "play", idx: p.hand.length - 1 }).state;
  const e = g.players[0].enchants.find((x) => x.card.ench === "guild")!; e.cnt = 19; const hb = g.players[0].hand.length; g = end(g); g.players[1].hand.length = 0; g = end(g);
  ok(g.players[0].hand.some((c) => c.id === "DARK_MERCHANT") && (g.players[0].enchants.find((x) => x.card.ench === "guild")?.cnt ?? -1) === 0, "guild pays at 20", [e.cnt]); }
// 카운터 명칭 통일: 카드 텍스트·패시브 설명에 '〇〇 카운터' 없음 — 단 '낙인 카운터'는 별개 개념으로 반드시 명시
{ const bad: string[] = [];
  const KO = /(부패|기합|성|마켓|와인|세계수|다이스|주사위|제시|재사용|내구도|부화) 카운터/, JA = /(腐敗|気合|城|マーケット|ワイン|世界樹|ダイス|提示|再使用|耐久|孵化)カウンター/, EN = /\b(Decay|Guts|Castle|Market|Wine|Dice|Offer|Durability|Hatch) counters?\b/i;
  for (const c of Object.values(DB)) { for (const t of [c.text, c.textJa, c.textEn]) if (t && (KO.test(t) || JA.test(t) || EN.test(t))) bad.push(c.id + ": " + t); }
  for (const [k, v] of Object.entries(PASSIVES)) for (const l of ["ko", "ja", "en"] as const) if (KO.test(v[l].desc) || JA.test(v[l].desc) || EN.test(v[l].desc)) bad.push("passive " + k);
  ok(bad.length === 0, "no prefixed counter names in card texts", bad.slice(0, 5)); }
{ // 낙인을 다루는 카드는 세 언어 모두 '낙인 카운터/烙印カウンター/Brand counter'를 명시한다 (낙인 1개·낙인당·brand the opponent 금지)
  const BRAND_IDS = ["T4", "T6", "GT5_1", "ACID_RAIN", "STRONG_ACID", "TREASON", "UNBRAND", "S12", "GS6_4", "MEDITATE", "PURGE_TOUCH", "ORIGIN_RITE", "TGE4", "ASSASSIN4", "GUILD_HQ", "WASH_DEVICE", "UNBRANDER", "PENANCE"];
  const bad: string[] = [];
  for (const id of BRAND_IDS) { const c = DB[id]; if (!c) { bad.push(id + " missing"); continue; }
    if (!/낙인 카운터/.test(c.text) || /낙인(?! 카운터)/.test(c.text.replace(/'낙인'|「낙인」/g, ""))) bad.push(id + " ko: " + c.text);
    if (!/烙印カウンター/.test(c.textJa ?? "") || /烙印(?!カウンター)/.test(c.textJa ?? "")) bad.push(id + " ja: " + c.textJa);
    if (!/Brand counter/i.test(c.textEn ?? "") || /\bbrand(?!\s*counter)/i.test((c.textEn ?? "").replace(/Unbrand\w*/gi, ""))) bad.push(id + " en: " + c.textEn); }
  ok(bad.length === 0, "brand cards say 'Brand counter' explicitly in ko/ja/en", bad.slice(0, 6)); }
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
