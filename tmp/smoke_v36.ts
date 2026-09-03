/* eslint-disable */
// v36 smoke (main lineage) — 몬스터 대개편
import { DB, BALANCE_VERSION, BUYABLE_POOL } from "../client/src/shared/cards";
import { createGame, reduce, effMaxMana, buyCost, playCost, summonReqMet } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({
  uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]),
  exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra,
}) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };

ok(BALANCE_VERSION === "v36", "version", BALANCE_VERSION);
for (const id of ["NWL4", "NSPR", "CREATOR", "GM7_0", "GM10_0", "CULL_TITAN", "WORLD_GUARD", "GM9_2"]) ok(!DB[id], `deleted ${id}`);
ok(DB.CASINO.def === 4, "casino 0/4");
ok(DB.INFKNIGHT.name === "기사" && DB.INFKNIGHT.nameJa === "騎士", "knight rename");
ok(DB.GOLEM1.atk === 1 && DB.TSO5.atk === 6 && DB.HIGH_ELF.atk === 25, "stat patches");
ok(DB.TGE1.hatchTurns === 4 && DB.TGE1.hatchDur === 2 && DB.TGE1.play === 1, "origin egg");
ok(DB.GUILD_HQ.cost === 6 && DB.WORLD_TREE.cost === 10 && DB.CURSE.noShop === true, "new cards");
ok(DB.CHOSEN_ARCHER.directOnly === undefined, "archer no ambush");
ok(DB.NGA4.nameEn === "Blade Fiend" && (DB.NGA4.mult ?? 1) === 2, "en name + dual", DB.NGA4.nameEn);
ok(DB.TGE5.textJa!.includes("始原の術式"), "ja text tge5", DB.TGE5.textJa);

// 마나 골렘: 다른 골램 1체당 최대 마나 +1
{ const g = fresh(); const p = g.players[0]; const base = effMaxMana(p);
  p.field.push(mk("M10")); ok(effMaxMana(p) === base, "manaGolem alone +0");
  p.field.push(mk("GOLEM1"), mk("NWL3")); ok(effMaxMana(p) === base + 2, "manaGolem +2", effMaxMana(p) - base); }
// 골램 킹 조건
{ const g = fresh(); const p = g.players[0]; ok(!summonReqMet(p, card("GOLEM3")), "golemKing blocked"); p.discard.push(card("GOLEM1")); ok(summonReqMet(p, card("GOLEM3")), "golemKing ok"); }
// 골램 특공부대 기합 +3
{ let g = fresh(); g.players[0].field.push(mk("GOLEM1")); g = play(g, "NGA3"); const sq = g.players[0].field.find((m) => m.id === "NGA3"); ok(sq?.guts === 4, "golemSquad guts 4", sq?.guts); }
// 리더 골램: 아군 사망 시 기합
{ let g = fresh(); const lg = mk("GOLEM2", { guts: 1 }); const s = mk("SOLDIER2"); g.players[0].field.push(lg, s);
  const att = mk("M1"); g.players[1].field.push(att); g.cur = 1; g = reduce(g, { type: "attack", uid: att.uid }).state; g = reduce(g, { type: "chooseTarget", uid: s.uid }).state;
  ok(g.players[0].field.find((m) => m.id === "GOLEM2")?.guts === 2, "leaderGolem guts", g.players[0].field.find((m) => m.id === "GOLEM2")?.guts); }
// 가디언 골램: 피격 시 기합 → 파괴 무효
{ let g = fresh(); const wall = mk("NWL3"); g.players[1].field.push(wall); const att = mk("M1", { atkMod: 20 }); g.players[0].field.push(att);
  g = reduce(g, { type: "attack", uid: att.uid }).state; g = reduce(g, { type: "chooseTarget", uid: wall.uid }).state;
  ok(g.players[1].field.some((m) => m.uid === wall.uid), "gutsOnHit survives"); }
// 엠버 드레이크 연속 공격
{ let g = fresh(); const dr = mk("M7", { atkMod: 10 }); g.players[0].field.push(dr); const a = mk("M1"), b = mk("M2"); g.players[1].field.push(a, b);
  g = reduce(g, { type: "attack", uid: dr.uid }).state; g = reduce(g, { type: "chooseTarget", uid: a.uid }).state;
  const d2 = g.players[0].field.find((m) => m.uid === dr.uid)!; ok(!d2.exhausted && d2.attacksUsed === 1, "chainKill not exhausted", d2);
  g = reduce(g, { type: "attack", uid: dr.uid }).state; g = reduce(g, { type: "chooseTarget", uid: b.uid }).state;
  ok(g.players[1].field.length === 0, "chainKill second kill"); }
// 렐릭 헌터 제시 카운터 → 무료 갱신
{ let g = fresh(); g = play(g, "M9"); const p = g.players[0]; ok(p.refreshTokens === 1, "refresh token"); const mana = p.mana; g = reduce(g, { type: "refresh" }).state; ok(g.players[0].mana === mana && g.players[0].refreshTokens === 0, "free refresh"); }
// 워로드 기사 / 기수 +4 / 정예 병사 / 고무왕 기합
{ let g = fresh(); g.players[0].field.push(mk("M1")); g = play(g, "M11"); ok(g.players[0].field.some((m) => m.id === "INFKNIGHT"), "warlord knight");
  g = play(g, "HORDE"); const kn = g.players[0].field.find((m) => m.id === "INFKNIGHT"); ok(kn?.atkMod === 4, "horde +4", kn?.atkMod);
  g = play(g, "VITAL4"); ok(g.players[0].field.find((m) => m.id === "INFKNIGHT")?.guts === 1, "rally guts existing");
  g.players[0].field = g.players[0].field.filter((m) => m.id === "VITAL4"); // 필드 상한(7) 여유 확보
  g = play(g, "ELITE"); const sold = g.players[0].field.filter((m) => m.id === "SOLDIER2"); ok(sold.length === 2 && sold.every((s) => s.guts === 1), "elite soldiers with rally guts", sold.map((s) => s.guts)); }
// 드래곤 융합
{ let g = fresh(); g.players[0].field.push(mk("SOLDIER2", { token: true })); g = play(g, "GM6_0"); ok(g.players[0].field.length === 1 && g.players[0].field[0].id === "DRAGON_RIDER", "dragon rider", g.players[0].field.map((m) => m.id));
  let g2 = fresh(); g2.players[0].field.push(mk("INFKNIGHT", { token: true })); g2 = play(g2, "GM6_0"); ok(g2.players[0].field[0]?.id === "ANTIQUE_DK", "antique dk", g2.players[0].field.map((m) => m.id)); }
// 드래곤 라이더 2회째 절반
{ let g = fresh(); const r = mk("DRAGON_RIDER"); g.players[0].field.push(r); const hp = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: r.uid }).state; g = reduce(g, { type: "attack", uid: r.uid }).state; ok(g.players[1].hp === hp - 14 - 7, "halfSecond", hp - g.players[1].hp); }
// 검귀 광란 (아군 공격 포함) — 크래시 없이 해결되는지
{ let g = fresh(); const bf = mk("NGA4"); const own = mk("M2"); g.players[0].field.push(bf, own); g.players[1].field.push(mk("M1"));
  g = reduce(g, { type: "attack", uid: bf.uid }).state; ok(!g.pending, "berserk resolves without pending"); const b2 = g.players[0].field.find((m) => m.uid === bf.uid)!; ok(b2.attacksUsed === 1 && !b2.exhausted, "berserk dual", b2); }
// 시초의 알 부화
{ let g = fresh(); g = play(g, "TGE1"); const egg = g.players[0].field[0]; ok(egg.hatch === 4 && egg.dur === 2, "egg counters", egg);
  for (let i = 0; i < 4; i++) g = reduce(g, { type: "endTurn" }).state;
  const m = g.players[0].field[0]; ok(!!m && m.tribe === "시초" && m.id !== "TGE1", "egg hatched into origin", m?.id); }
// 시초의 정령 → 술식 → 시초 소환 시 상대 카드 파괴
{ let g = fresh(); g = play(g, "TGE5"); ok(g.players[0].enchants.some((e) => e.card.id === "ORIGIN_RITE"), "origin rite deployed");
  g.players[1].field.push(mk("M1")); g = play(g, "TGE2"); ok(g.players[1].field.length === 0, "rite destroyed enemy"); ok(g.pending?.reason === "emberBuff", "ember pending"); g = reduce(g, { type: "chooseTarget", uid: g.players[0].field.find((m) => m.id === "TGE5")!.uid }).state; ok(g.players[0].field.find((m) => m.id === "TGE5")?.atkMod === 2, "ember +2");
  g = play(g, "TGE6"); ok((g.players[1].brand || 0) >= 1, "rite brand when empty", g.players[1].brand); }
// 시초의 재판관 1회
{ let g = fresh(); g.players[0].discard.push(card("TGE2"), card("TGE3")); g = play(g, "TGE4"); ok(g.players[1].brand === 3, "arbiter brand 3", g.players[1].brand); g = play(g, "TGE4"); ok(g.players[1].brand === 3, "arbiter once"); }
// 러스트캡 슬러그: 전체 부패 + 붕괴 보너스
{ let g = fresh(); const a = mk("M1", { decayCnt: 2 }); const b = mk("M2"); g.players[1].field.push(a, b); const mm = g.players[0].maxMana;
  g = play(g, "RUST_SLUG"); ok(!g.players[1].field.some((m) => m.uid === a.uid), "slug collapse"); ok(g.players[0].maxMana === mm + 1, "slug mana bonus"); ok(g.players[1].field.find((m) => m.uid === b.uid)?.decayCnt === 1, "slug decay all"); }
// 꼬마 주술사 저주
{ let g = fresh(); for (let i = 0; i < 10; i++) g.players[0].discard.push(card("S1")); g.players[0].field.push(mk("NHEX")); g.cur = 1; let curses = 0;
  for (let i = 0; i < 12 && !curses; i++) { g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; curses = g.players[1].discard.filter((c) => c.id === "CURSE").length; }
  ok(curses === 3, "hex curses", curses);
  g.cur = 1; const p1 = g.players[1]; const ci = p1.discard.findIndex((c) => c.id === "CURSE"); p1.hand.push(p1.discard.splice(ci, 1)[0]); p1.mana = 5; const hp = p1.hp;
  g = reduce(g, { type: "play", idx: p1.hand.length - 1 }).state; ok(g.players[1].hp === hp - 1 && (g.players[1].removed ?? []).some((c) => c.id === "CURSE"), "curse self dmg + exile"); }
// 침묵 4
{ let g = fresh(); g.players[1].field.push(mk("NT_SEAL3")); const p = g.players[0]; p.hand.push(card("S1")); p.maxMana = 10; p.mana = 10; const n = p.hand.length; g = reduce(g, { type: "play", idx: n - 1 }).state; ok(g.players[0].hand.length === n, "seal4 blocks cost2");
  g.players[0].hand.push(card("S13")); g = reduce(g, { type: "play", idx: g.players[0].hand.length - 1 }).state; ok(g.players[0].hand.length === n + 1, "seal4 blocks cost4 too");
  g.players[0].hand.push(card("AHEUK")); g = reduce(g, { type: "play", idx: g.players[0].hand.length - 1 }).state; ok(g.players[0].hand.length === n + 1, "seal4 allows cost6", g.players[0].hand.map((c) => c.id)); }
// 대현자 할인 / 함정 기술자 할인
{ const g = fresh(); const p = g.players[0]; p.field.push(mk("NMD6")); for (let i = 0; i < 13; i++) p.discard.push(card("S1")); ok(playCost(card("S13"), p) === 3, "sage discount", playCost(card("S13"), p));
  p.field.push(mk("TRAPSMITH")); ok(buyCost(p, card("T13")) === DB.T13.cost - 1, "trap discount"); }
// 세계수 카운터 + 발동
{ let g = fresh(); g.players[0].field.push(mk("WORLD_TREE")); g = play(g, "VITAL2"); const wt = g.players[0].field.find((m) => m.id === "WORLD_TREE")!; ok(wt.gcount === 1, "world tree counter", wt.gcount);
  g.players[0].hp = 10; g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; ok(g.pending?.reason === "worldTree", "world tree pending", g.pending?.reason);
  g = reduce(g, { type: "chooseTarget", uid: wt.uid }).state; ok(g.players[0].hp === Math.floor(g.players[0].maxHp * 0.8), "world tree heal 80%", [g.players[0].hp, g.players[0].maxHp]); }
// 세계수: 다친 아군 몬스터 전회복 (HP 전투)
{ let g = fresh(); const wt = mk("WORLD_TREE", { gcount: 1 }); const hurt = mk("M2", { dmg: 2 }); g.players[0].field.push(wt, hurt); g.players[0].hp = 5; g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; ok(g.pending?.reason === "worldTree", "wt pending2"); g = reduce(g, { type: "chooseTarget", uid: wt.uid }).state; ok((g.players[0].field.find((m) => m.uid === hurt.uid)?.dmg || 0) === 0, "world tree monster heal"); }
// 암살자 본부: 낙인 + 나이트 마켓
{ let g = fresh(); g.players[0].field.push(mk("GUILD_HQ"), mk("ASSASSIN1")); const as = g.players[0].field[1]; g = reduce(g, { type: "attack", uid: as.uid }).state; ok(g.players[1].brand === 1, "HQ brand");
  g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; ok(g.pending?.reason === "nightMarket", "night market", g.pending?.reason);
  g.players[0].mana = 10; g = reduce(g, { type: "pick", uid: "ASSASSIN2" }).state; ok(g.players[0].discard.some((c) => c.id === "ASSASSIN2"), "night market buy"); }
// 기록자
{ let g = fresh(); g = play(g, "NMD4"); ok(g.pending?.reason === "chronicler", "chronicler pending"); const ids = g.pending!.data!.ids as string[]; ok(ids.length > 0, "chronicler ids", ids); g = reduce(g, { type: "pick", uid: null }).state; ok(!g.pending, "chronicler cancel"); }
// 차원 유폐자
{ let g = fresh(); g.players[1].removed = [card("STARTER_TRASH"), card("S1")]; g = play(g, "GM6_1"); ok(g.pending?.reason === "jailer", "jailer pending"); const uid = g.players[1].removed![0].uid; g = reduce(g, { type: "pick", uid }).state; ok((g.players[0].removed ?? []).some((c) => c.uid === uid), "jailer moved"); g = reduce(g, { type: "pick", uid: null }).state; }
// 장군
{ let g = fresh(); g = play(g, "GM6_7"); ok(g.players[0].field.some((m) => m.id === "INFKNIGHT"), "general knight"); g = reduce(g, { type: "endTurn" }).state; let got = false; for (let i = 0; i < 8 && !got; i++) { g = play(g, "M1"); got = g.players[0].field.filter((m) => m.id === "INFKNIGHT").length >= 2; g.players[0].field = g.players[0].field.filter((m) => m.id !== "M1"); } ok(got, "general dice knight"); }
// 공허의 공성병: 사망 시 병사
{ let g = fresh(); const sb = mk("GM6_8"); g.players[0].field.push(sb); const att = mk("M1", { atkMod: 10 }); g.players[1].field.push(att); g.cur = 1; g = reduce(g, { type: "attack", uid: att.uid }).state; g = reduce(g, { type: "chooseTarget", uid: sb.uid }).state; ok(g.players[0].field.some((m) => m.id === "SOLDIER2"), "siege soldier on death"); }
// 선택받은 검사 컬 제외 / 도적 함정 세트
{ let g2 = fresh(); const kn = mk("CHOSEN_KNIGHT"); g2.players[0].field.push(kn); g2.players[0].discard.push(card("STARTER_TRASH"), card("STARTER_TRASH")); g2 = reduce(g2, { type: "attack", uid: kn.uid }).state; ok((g2.players[0].removed ?? []).filter((c) => c.star === "trash").length === 2, "knight exile 2 culls");
  let g3 = fresh(); const rg = mk("CHOSEN_ROGUE", { atkMod: 5 }); g3.players[0].field.push(rg); g3.players[0].discard.push(card("T1")); g3 = reduce(g3, { type: "attack", uid: rg.uid }).state; ok(g3.pending?.reason === "rogueTrap", "rogue pending"); const tr = g3.players[0].discard.find((c) => c.t === "trap")!; g3 = reduce(g3, { type: "pick", uid: tr.uid }).state; ok(g3.players[0].traps.length === 1, "rogue trap set"); }
// 궁수 거인 사냥 (회피 없는 대상)
{ let g = fresh(); const ar = mk("CHOSEN_ARCHER"); g.players[0].field.push(ar); const big = mk("GOLEM3", { guts: 1, defMod: 6 }); g.players[1].field.push(big); g = reduce(g, { type: "attack", uid: ar.uid }).state; g = reduce(g, { type: "chooseTarget", uid: big.uid }).state; ok(!g.players[1].field.some((m) => m.uid === big.uid), "giant slayer ignores guts"); }
// 엘더 킹 조건 + 전체 파괴
{ let g = fresh(); const p = g.players[0]; p.maxHp = 120; ok(!summonReqMet(p, card("ELDER_ELF_KING")), "elder needs elf"); p.discard.push(card("ELF")); ok(summonReqMet(p, card("ELDER_ELF_KING")), "elder ok"); g.players[1].field.push(mk("M1")); g.players[1].traps.push({ card: card("T1") }); g = play(g, "ELDER_ELF_KING"); ok(g.players[1].field.length === 0 && g.players[1].traps.length === 0, "elder wipe"); }
// 특급 암살자 조건
{ const g = fresh(); const p = g.players[0]; ok(!summonReqMet(p, card("ASSASSIN4")), "nightlord blocked"); p.discard.push(card("ASSASSIN1"), card("ASSASSIN2"), card("GUILD_HQ")); ok(summonReqMet(p, card("ASSASSIN4")), "nightlord ok 3 kinds"); ok(summonReqMet(p, card("ASSASSIN3")), "elite assassin ok"); }
// 강철의 전사: 체력 +2
{ let g = fresh(); g.players[0].field.push(mk("GM5_2")); g = play(g, "M1"); ok(g.players[0].field.find((m) => m.id === "M1")?.defMod === 2, "summonBuff def"); }
// 뱀파이어 집사: 직접 공격도 카운트
{ let g = fresh(); const vb = mk("VAMP_BUTLER"); g.players[0].field.push(vb); g = reduce(g, { type: "attack", uid: vb.uid }).state; ok(g.players[0].field.find((m) => m.uid === vb.uid)?.gcount === 1, "butler direct count"); }
// 세계수의 파수꾼
{ let g = fresh(); g = play(g, "VITAL3"); const mh = g.players[0].maxHp; g = play(g, "VITAL2"); ok(g.players[0].maxHp === mh + 4 + 5, "tree keeper +5", g.players[0].maxHp - mh); }
// 전설의 도박꾼 — 크래시 없이
{ let g = fresh(); g.players[0].field.push(mk("LEGEND_GAMBLER")); for (let i = 0; i < 6; i++) g = reduce(g, { type: "endTurn" }).state; ok(true, "legend gambler ticks"); }

// ---- bot self-play: crash / hang guard ----
let games = 0, errs = 0, longest = 0;
for (let seed = 1; seed <= 80; seed++) {
  let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
  let steps = 0, last = "", rep = 0;
  try {
    while (!g.over && steps < 4000) {
      const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g);
      const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; }
      g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++;
    }
    if (!g.over) { errs++; console.log("  ✗ hang seed", seed, g.turn, last); }
    longest = Math.max(longest, g.turn); games++;
  } catch (e) { errs++; console.log("  ✗ crash seed", seed, e); }
}
ok(errs === 0, `self-play ${games} games clean`, errs);
console.log(`\n${pass} pass / ${fail} fail · self-play ${games} games, longest ${longest} turns`);
if (fail) process.exit(1);
