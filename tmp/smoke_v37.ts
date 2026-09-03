/* eslint-disable */
// v37 smoke — 성 아키타입 + 함정 리워크
import { DB, STARTERS, BALANCE_VERSION, DECK_POOL } from "../client/src/shared/cards";
import { createGame, reduce, buyCost, curHp } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const trap = (id: string) => ({ card: card(id) });
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.maxMana = 30; p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };
const atkTo = (g: GameState, att: FieldMon, tgt: FieldMon | null): GameState => { g = reduce(g, { type: "attack", uid: att.uid }).state; if (g.pending?.reason === "attack") g = reduce(g, { type: "chooseTarget", uid: tgt!.uid }).state; return g; };

ok(BALANCE_VERSION === "v37", "version", BALANCE_VERSION);
for (const id of ["GT5_2", "GT5_3", "GT6_0", "GT6_2", "GT6_3", "GT6_5", "GT8_1", "GT8_2", "GT8_3", "GT8_5", "GT9_3", "GT10_1", "GT12_1", "NT_NULL8", "GM9_2"]) ok(!DB[id], `deleted ${id}`);
ok(DECK_POOL.includes("CASTLE") && DECK_POOL.includes("ACID_RAIN"), "starters in pool");
ok(DB.T1.nameJa === "アチューン無効装置" && DB.T3.nameJa === "落とし穴" && DB.NT_NULL3.nameJa === "初級魔力遮断" && DB.LEVY.nameJa === "召集" && DB.LEVY.cost === 6 && DB.LEVY.play === 1, "renames");
ok(DB.NMD6.onSummon === undefined && DB.NGA4.onSummon === undefined, "sage/blade fiend effects removed");
ok(DB.GRAPE2.val === 6 && DB.WINE.val === 9, "grape/wine");
// 성: 카운터 3 → 공격 흡수 → 병사 소환 +1 → 5코 소환 불가
{ let g = fresh(); g = play(g, "CASTLE"); const cs = g.players[0].field.find((m) => m.id === "CASTLE")!; ok(cs.gcount === 3, "castle init 3", cs.gcount);
  g = play(g, "BUDGET"); const cs2 = g.players[0].field.find((m) => m.id === "CASTLE")!; const sold = g.players[0].field.filter((m) => m.id === "SOLDIER2").length; ok(sold === 0 || cs2.gcount === 4, "castle +1 on soldier", [sold, cs2.gcount]);
  const before = g.players[0].hand.length; g = play(g, "NMD6"); ok(g.players[0].hand.length === before + 1, "castle blocks cost>=5 summon");
  g.players[1].field.push(mk("M1", { atkMod: 10 })); g.cur = 1; const att = g.players[1].field[0]; const c0 = g.players[0].field.find((m) => m.id === "CASTLE")!.gcount!;
  g = atkTo(g, att, g.players[0].field.find((m) => m.id === "CASTLE")!); const cs3 = g.players[0].field.find((m) => m.id === "CASTLE"); ok(!!cs3 && cs3.gcount === c0 - 1 && (cs3.dmg || 0) === 0, "castle absorbs", [c0, cs3?.gcount]); }
// 선전포고 + 증축 + 반역죄
{ let g = fresh(); g = play(g, "CASTLE"); g.players[0].traps.push(trap("WAR_DECL") as never); g.players[1].field.push(mk("M1")); g.cur = 1; const att = g.players[1].field[0];
  g = atkTo(g, att, g.players[0].field.find((m) => m.id === "CASTLE")!); ok(g.players[0].field.filter((m) => m.id === "INFKNIGHT").length === 3, "war decl 3 knights"); ok(g.players[0].field.find((m) => m.id === "CASTLE")!.gcount! >= 5, "castle +1 per knight", g.players[0].field.find((m) => m.id === "CASTLE")!.gcount);
  g.cur = 0; const gc = g.players[0].field.find((m) => m.id === "CASTLE")!.gcount!; g = play(g, "EXPANSION"); ok(g.players[0].field.find((m) => m.id === "CASTLE")!.gcount === gc + 5, "expansion +5");
  g.cur = 1; g = play(g, "TREASON"); ok(g.players[0].field.length === 0 && g.players[0].brand === 3, "treason wipes + brand 3", [g.players[0].field.length, g.players[0].brand]); }
// 영토 하사
{ let g = fresh(); g.players[0].field.push(mk("CASTLE")); g = play(g, "LAND_GRANT"); ok(g.pending?.reason === "landGrant", "land grant pending"); g = reduce(g, { type: "pick", uid: "TAR3" }).state; ok(g.players[0].field.some((m) => m.id === "TAR3"), "land grant summons"); }
// 육면의 변덕 / 운영 예산 / 제인
{ let g = fresh(); g.players[0].brand = 2; g.players[1].brand = 4; g = play(g, "UNBRAND"); ok(!g.players[0].brand && !g.players[1].brand, "unbrand"); g = play(g, "GAMBLE"); ok(true, "gamble runs"); }
// 도박꾼: 예측 pending → 효과 선택 pending
{ let g = fresh(); g.players[0].field.push(mk("LEGEND_GAMBLER")); let seen = false, picked = false;
  for (let i = 0; i < 40 && !picked; i++) { g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; if (g.pending?.reason === "gamblerGuess") { seen = true; g = reduce(g, { type: "pick", uid: "3" }).state; if (g.pending?.reason === "gamblerPick") { picked = true; const mm = g.players[0].maxMana; g = reduce(g, { type: "pick", uid: "1" }).state; ok(g.players[0].maxMana === mm + 4, "gambler effect 1"); } } if (g.over) break; }
  ok(seen && (picked || g.over), "gambler guess/pick flow", [seen, picked, g.over]); }
// 드래곤: 병사+기사 → 선택
{ let g = fresh(); g.players[0].field.push(mk("SOLDIER2", { token: true }), mk("INFKNIGHT", { token: true })); g = play(g, "GM6_0"); ok(g.pending?.reason === "dragonFuse", "dragon choice"); g = reduce(g, { type: "pick", uid: "DRAGON_RIDER" }).state; ok(g.players[0].field.some((m) => m.id === "DRAGON_RIDER") && g.players[0].field.some((m) => m.id === "INFKNIGHT") && !g.players[0].field.some((m) => m.id === "GM6_0"), "dragon rider chosen", g.players[0].field.map((m) => m.id)); }
// 정예: 덱 구성 10장 이하
{ let g = fresh(); ok(g.players[0].deck.length + g.players[0].hand.length + g.players[0].discard.length <= 10, "fresh deck comp ≤10"); g = play(g, "ELITE"); ok(g.players[0].field.filter((m) => m.id === "SOLDIER2").length === 2, "elite soldiers by deck comp"); }
// 가시 방패 / 매직 카운터 / 폐문 / 용암 함정 / 식탐 / 복수 / 낙뢰 / 약탈
{ let g = fresh(); const a = mk("M5"); g.players[0].field.push(a); g.players[1].traps.push(trap("T9") as never); g = atkTo(g, a, null); ok((g.players[0].field.find((m) => m.uid === a.uid)?.dmg || 0) === 3, "spiky 3 dmg", g.players[0].field.map((m) => [m.id, m.dmg]));
  g.players[1].traps.push(trap("T4") as never); g.players[0].field.forEach((m) => { m.exhausted = false; m.attacksUsed = 0; }); g = atkTo(g, a, null); ok(g.players[0].brand === 1, "magic counter brand");
  const big = mk("M11"); g.players[0].field.push(big); g.players[1].traps.push(trap("GT11_1") as never); g = atkTo(g, big, null); ok(g.players[0].noHighAtkTurn === true, "gate shut flag"); const hp = g.players[1].hp; g.players[0].field.forEach((m) => { m.exhausted = false; m.attacksUsed = 0; }); g = reduce(g, { type: "attack", uid: big.uid }).state; ok(g.players[1].hp === hp, "gate shut blocks cost4");
  let g2 = fresh(); const b2 = mk("M4"); g2.players[0].field.push(b2); g2.players[1].traps.push(trap("GT5_1") as never); g2 = atkTo(g2, b2, null); ok(!g2.players[0].field.length && g2.players[0].brand === 1, "lava pit kill + brand");
  let g3 = fresh(); const own = mk("M2"); g3.players[1].field.push(own); const b3 = mk("M1"); g3.players[0].field.push(b3); g3.players[1].traps.push(trap("GT5_4") as never); g3 = atkTo(g3, b3, own); ok(g3.players[1].field[0].defMod === 12, "gluttony +12");
  let g4 = fresh(); const v1 = mk("M2"); g4.players[1].field.push(v1); const c1 = mk("M1"), c2 = mk("M4"); g4.players[0].field.push(c1, c2); g4.players[1].traps.push(trap("GT9_2") as never); g4 = atkTo(g4, c1, v1); ok(g4.players[1].field.length === 0 && g4.players[0].field.length === 0, "vengeance", [g4.players[1].field.length, g4.players[0].field.length]);
  let g5 = fresh(); const l1 = mk("M1"); g5.players[0].field.push(l1); g5.players[1].traps.push(trap("T13") as never); g5 = atkTo(g5, l1, null); ok(true, "lightning runs");
  let g6 = fresh(); const p1 = mk("M1"); g6.players[0].field.push(p1); g6.players[0].discard.push(card("S1")); g6.players[1].traps.push(trap("T11") as never); const n6 = g6.players[1].discard.length; g6 = atkTo(g6, p1, null); ok(g6.players[1].discard.length === n6 + 2 || g6.players[1].discard.length === n6 + 1, "plunder moved", g6.players[1].discard.length - n6); }
// 성벽 강화 / 반격 명령 / 정보상 / 징병 / 마름쇠 / 대역 / 포식 함정
{ let g = fresh(); g.players[1].field.push(mk("CASTLE", { gcount: 3 })); const a = mk("M4"); g.players[0].field.push(a); g.players[1].traps.push(trap("T12") as never); g = atkTo(g, a, g.players[1].field[0]); ok(g.players[0].hand.some((c) => c.id === "M4") && g.players[1].field[0].gcount === 8, "rampart bounce + castle +5", g.players[1].field[0].gcount);
  const b = mk("M1"); g.players[0].field.push(b); g.players[1].traps.push(trap("GT10_0") as never); g = atkTo(g, b, g.players[1].field[0]); ok(g.players[1].field.filter((m) => m.id === "INFKNIGHT").length >= 1, "rally knights");
  let g2 = fresh(); const c = mk("M1"); g2.players[0].field.push(c); g2.players[1].traps.push(trap("GT11_0") as never); g2 = atkTo(g2, c, null); ok(g2.players[1].enchants.some((e) => e.card.id === "GUILD_EYE"), "informant deploys");
  let g3 = fresh(); const d = mk("M11"); g3.players[0].field.push(d); g3.players[1].traps.push(trap("NT_NULL4") as never); g3 = atkTo(g3, d, null); ok(g3.players[1].field.filter((m) => m.id === "SOLDIER2").length === 4, "conscript 4 soldiers");
  let g4 = fresh(); const e1 = mk("M1"), e2 = mk("M2"), e3 = mk("M4"); g4.players[0].field.push(e1, e2, e3); g4.players[1].traps.push(trap("T8") as never); g4 = atkTo(g4, e1, null); ok(g4.players[0].field.every((m) => m.decayCnt === 2), "caltrops 3x2", g4.players[0].field.map((m) => m.decayCnt));
  let g5 = fresh(); const f1 = mk("M4"), f2 = mk("M1"); g5.players[0].field.push(f1, f2); g5.players[1].traps.push(trap("GT5_0") as never); g5 = atkTo(g5, f1, null); ok(!g5.players[0].field.some((m) => m.uid === f2.uid) || (g5.players[0].field.find((m) => m.uid === f2.uid)?.dmg || 0) > 0, "decoy redirects");
  let g6 = fresh(); g6.players[1].field.push(mk("TPO2")); const h = mk("M4"); g6.players[0].field.push(h); g6.players[1].traps.push(trap("T10") as never); g6 = atkTo(g6, h, g6.players[1].field[0]); ok(!g6.players[0].field.length && (g6.players[0].removed ?? []).some((c) => c.id === "M4"), "prey guard exile"); }
// 중급 마력 차단: 보물상자·어튠 제외, 초급 보유 시 캡 5 / 어튠 무효 장치
{ let g = fresh(); g.players[1].traps.push(trap("T2") as never); const p = g.players[0]; p.maxMana = 10; p.mana = 10; p.hand.push(card("STARTER_MANA")); const mm = p.maxMana; g = reduce(g, { type: "play", idx: p.hand.length - 1 }).state; ok(g.players[0].maxMana === mm + 1 && g.players[1].traps.length === 1, "T2 ignores attune");
  g.players[0].hand.push(card("S13")); g = reduce(g, { type: "play", idx: g.players[0].hand.length - 1 }).state; ok(g.players[1].traps.length === 0, "T2 negates cost4");
  let g2 = fresh(); g2.players[1].traps.push(trap("T2") as never); g2.players[1].discard.push(card("NT_NULL3")); g2.players[0].maxMana = 10; g2.players[0].mana = 10; g2.players[0].hand.push(card("AHEUK")); g2 = reduce(g2, { type: "play", idx: g2.players[0].hand.length - 1 }).state; ok(g2.players[1].traps.length === 1, "T2 cap5 still ignores cost6 attune-black? (attune excluded)");
  let g3 = fresh(); g3.players[1].traps.push(trap("T1") as never); g3.players[0].hand.push(card("STARTER_MANA")); g3.players[0].mana = 10; let jam = false; for (let i = 0; i < 1; i++) { const mm3 = g3.players[0].maxMana; const r = reduce(g3, { type: "play", idx: g3.players[0].hand.length - 1 }).state; jam = r.players[1].traps.length === 0; ok(jam, "attune jam consumed"); ok(r.players[0].maxMana === mm3 + 1 || r.players[0].maxHp >= g3.players[0].maxHp + 5, "attune jam outcome"); } }
// 산성비/강산성비/부패한 땅/통행세/미믹 파티/다종족 계약
{ let g = fresh(); g.players[0].enchants.push({ card: card("ACID_RAIN"), turns: 99 }); g.players[1].field.push(mk("M1", { decayCnt: 2 })); g = play(g, "RUST_SLUG"); ok(g.players[1].brand === 1, "acid rain brand", g.players[1].brand);
  let g2 = fresh(); g2.players[1].field.push(mk("M1"), mk("M2", { decayCnt: 1 })); const hp = g2.players[1].hp; g2 = play(g2, "STRONG_ACID"); ok(g2.players[1].field.length === 1 && g2.players[1].hp === hp - 7 - 3 && g2.players[1].brand === 1, "strong acid on cast", [g2.players[1].field.length, hp - g2.players[1].hp, g2.players[1].brand]);
  let g3 = fresh(); g3.players[0].enchants.push({ card: card("ROTTEN_GROUND"), turns: 99 }); g3 = play(g3, "M1"); ok(g3.players[0].field[0].decayCnt === 2, "rotten ground");
  let g4 = fresh(); g4.players[0].enchants.push({ card: card("TRIBE_PACT"), turns: 99 }); ok(buyCost(g4.players[0], card("TAR3")) === 2, "tribe pact -1"); g4.turn = 45; g4.cur = 1; g4 = reduce(g4, { type: "endTurn" }).state; ok(g4.over && g4.winner === 1, "tribe pact lose at 45");
  let g5 = fresh(); g5.players[1].traps.push(trap("MIMIC_PARTY") as never); g5.players[0].hand.push(card("STARTER_CHEST")); g5.players[0].mana = 5; g5 = reduce(g5, { type: "play", idx: g5.players[0].hand.length - 1 }).state; ok(g5.players[1].field.filter((m) => m.id === "MIMIC").length === 3, "mimic party 3 own", g5.players[1].field.length); }
// ---- self-play ----
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) {
  let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true, deck: seed % 4 === 0 ? ["CASTLE", "ACID_RAIN", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST", "GHOST", "TRUMPET"] : undefined }, p1: { id: "b", name: "B", isBot: true } } as never).state;
  let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; }
    if (!g.over) { errs++; console.log("  ✗ hang seed", seed, g.turn, last); } games++; } catch (e) { errs++; console.log("  ✗ crash seed", seed, e); }
}
ok(errs === 0, `self-play ${games} games clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
