/* eslint-disable */
// v33 smoke — 던전 최하층 + 미믹/제외 아키타입 (보석의 비/은신처/허무의 과실/사도)
import { DB, BALANCE_VERSION, DECK_POOL } from "../client/src/shared/cards";
import { createGame, reduce, effAtk } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

ok(BALANCE_VERSION === "v33", "version v33", BALANCE_VERSION);
for (const id of ["DUNGEON_FLOOR", "GEM_RAIN", "MIMIC_LAIR", "VOID_FRUIT", "VOID_APOSTLE"]) ok(!!DB[id], `${id} 존재`);
ok(DECK_POOL.includes("DUNGEON_FLOOR"), "던전 최하층 스타터");

const mk = (id: string): FieldMon => ({
  uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]),
  exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0,
}) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play0 = (g: GameState, id: string): GameState => {
  g.players[0].hand.unshift(card(id));
  g.players[0].mana = Math.max(g.players[0].mana, 30);
  return reduce(g, { type: "play", idx: 0 }).state;
};
const rmz0 = (g: GameState) => (g.players[0].removed ??= []);

// 던전 최하층
{
  let g = fresh();
  g.players[1].maxMana = 5;
  g = play0(g, "DUNGEON_FLOOR");
  ok(g.players[0].hand.some((c) => c.id === "DUNGEON_FLOOR"), "던전: 상대 마나 7 미만 거부");
  g.players[1].maxMana = 8;
  g.players[0].maxMana = 6;
  g = reduce(g, { type: "play", idx: g.players[0].hand.findIndex((c) => c.id === "DUNGEON_FLOOR") }).state;
  const mims = g.players[0].field.filter((m) => m.id === "MIMIC").length;
  ok(mims >= 1 && mims <= 6, "던전: 🎲만큼 미믹 소환", mims);
  ok(g.players[0].maxMana === 5, "던전: 최대 마나 -1");
  let g2 = fresh();
  g2.players[1].maxMana = 8; g2.players[0].maxMana = 3;
  g2 = play0(g2, "DUNGEON_FLOOR");
  ok(g2.players[0].maxMana === 3, "던전: 바닥 3 (마나 유지)");
}
// 보석의 비
{
  let g = fresh();
  const mim = mk("MIMIC");
  g.players[0].field.push(mim);
  g = play0(g, "GEM_RAIN");
  ok(effAtk(g.players[0], g.players[0].field.find((x) => x.id === "MIMIC")!) === (DB.MIMIC.atk || 0) + 3, "보석의 비: 기존 미믹 +3");
  // 신규 소환도 +3 (applyFieldGlobals)
  g.players[1].maxMana = 8; g.players[0].maxMana = 10;
  g = play0(g, "DUNGEON_FLOOR");
  const all = g.players[0].field.filter((x) => x.id === "MIMIC");
  ok(all.every((x) => effAtk(g.players[0], x) === (DB.MIMIC.atk || 0) + 3), "보석의 비: 신규 미믹도 +3");
  // 해제 시 회수
  const gi = g.players[0].enchants.findIndex((e) => e.card.ench === "gemRain");
  const ec = g.players[0].enchants.splice(gi, 1)[0];
  // binEnch는 엔진 내부 — 파훼술로 대신 검증하기엔 대상 선택이 필요하므로 직접 호출 대신 스킵하고 장치해제 사용
  g.players[0].enchants.splice(0, 0, ec); // 되돌리고
  g.players[1].enchants.push({ card: card("NHEAL"), turns: 99 } as never); // DISARM 전제조건(상대 영구마법 존재) 충족용
  g.players[0].hand.unshift(card("DISARM1")); // 영구마법 1장 파괴(양측)
  g.players[0].mana = 20;
  g = reduce(g, { type: "play", idx: 0 }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: ec.card.uid }).state;
  ok(!g.players[0].enchants.some((e) => e.card.ench === "gemRain"), "보석의 비: 파괴됨");
  ok(g.players[0].field.filter((x) => x.id === "MIMIC").every((x) => effAtk(g.players[0], x) === (DB.MIMIC.atk || 0)), "보석의 비: 해제시 버프 회수");
}
// 미믹의 은신처
{
  let g = fresh();
  const mim = mk("MIMIC");
  g.players[0].field.push(mim);
  g.players[0].traps.push({ card: card("MIMIC_LAIR") } as never);
  rmz0(g).push(card("MIMIC"), card("MIMIC"), card("MIMIC2"));
  const hp1 = g.players[1].hp;
  // 상대 몬스터로 미믹을 잡는다 (B 턴에 공격)
  g = reduce(g, { type: "endTurn" }).state;
  const killer = mk("GM10_0");
  g.players[1].field.push(killer);
  g = reduce(g, { type: "attack", uid: killer.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: mim.uid }).state;
  ok(!g.players[0].field.some((x) => x.uid === mim.uid), "은신처: 미믹 사망");
  ok(g.players[1].hp <= hp1 - 6 + 2, "은신처: 제외 미믹 3×2 = 6뎀 (관통과 합산 허용)", hp1 - g.players[1].hp);
  ok(g.players[0].traps.length === 0, "은신처: 함정 소모");
}
// 허무의 과실
{
  let g = fresh();
  g = play0(g, "VOID_FRUIT");
  rmz0(g).push(card("STARTER_TRASH"), card("STARTER_TRASH"), card("MIMIC"));
  const mh = g.players[0].maxHp;
  g = reduce(g, { type: "endTurn" }).state;
  g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].maxHp === mh + 3, "허무의 과실: 제외 3장 → 최대 체력 +3", g.players[0].maxHp - mh);
}
// 허무공간의 사도
{
  let g = fresh();
  rmz0(g).push(card("STARTER_TRASH"), card("STARTER_TRASH"), card("STARTER_TRASH"), card("STARTER_TRASH"));
  const hp0 = g.players[0].hp;
  g = play0(g, "VOID_APOSTLE");
  const ap = g.players[0].field.find((x) => x.id === "VOID_APOSTLE");
  ok(g.players[0].hp === hp0 - 13, "사도: 자해 13");
  ok((ap?.atkMod ?? 0) === 4 && (ap?.defMod ?? 0) === 4, "사도: 제외 4장 → +4/+4");
}
// 봇 자가대전
{
  let done = 0;
  for (let s = 1; s <= 40; s++) {
    const deck = ["DUNGEON_FLOOR", "DUNGEON_FLOOR", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"];
    let st = createGame({ seed: s * 4241, mode: "bot", starting: (s % 2) as 0 | 1,
      p0: { id: "a", name: "A", isBot: true, deck }, p1: { id: "b", name: "B", isBot: true, deck } } as never).state;
    if (s % 3 === 0) { st.players[0].enchants.push({ card: card("VOID_FRUIT"), turns: 99 } as never); st.players[1].enchants.push({ card: card("GEM_RAIN"), turns: 99 } as never); }
    if (s % 5 === 0) { st.players[0].traps.push({ card: card("MIMIC_LAIR") } as never); st.players[0].field.push(mk("VOID_APOSTLE")); }
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 40, "봇 자가대전 40판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
