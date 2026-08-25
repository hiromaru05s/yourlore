/* eslint-disable */
// v32 smoke — 종족 리워크: 고귀 삭제 · 고독/포식/귀족 리워크 · 마족 신설 · 담합
import { DB, BALANCE_VERSION, TRIBES, DECK_POOL, BUYABLE_POOL } from "../client/src/shared/cards";
import { createGame, reduce, effMaxMana, playCost } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

// ---- DB 무결성 ----
ok(BALANCE_VERSION === "v32", "version v32", BALANCE_VERSION);
for (const id of ["TNO2", "TNO3", "TNO5"]) ok(!DB[id], `${id} 삭제`);
ok(!TRIBES["고귀"] && !!TRIBES["마족"], "TRIBES 고귀 삭제·마족 추가");
const ROSTER: Record<string, [string, number][]> = {
  "포식": [["TPO1", 1], ["TPO2", 2], ["TPO3", 3], ["TPO5", 4]],
  "고독": [["TSO1", 1], ["TSO2", 2], ["TSO3", 3], ["TSO5", 4]],
  "귀족": [["TAR1", 1], ["TAR2", 2], ["TAR3", 3], ["TAR5", 4]],
  "마족": [["TDE1", 1], ["TDE2", 2], ["TDE3", 3], ["TDE4", 4]],
};
for (const [tr, list] of Object.entries(ROSTER)) for (const [id, c] of list) ok(DB[id]?.tribe === tr && DB[id].cost === c, `${id} ${tr} c${c}`);
ok(DECK_POOL.includes("COLLUSION") && DB.COLLUSION.react === "collusion", "담합 스타터");

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

// ---- 포식 ----
{ // TPO1: 조건 + 바운스
  let g = fresh();
  g = play0(g, "TPO1");
  ok(g.players[0].hand.some((c) => c.id === "TPO1"), "TPO1: 상대 2코 이하 없으면 소환 거부");
  const low = mk("M1");
  g.players[1].field.push(low);
  g = reduce(g, { type: "play", idx: g.players[0].hand.findIndex((c) => c.id === "TPO1") }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: low.uid }).state;
  ok(g.players[1].field.length === 0 && g.players[1].hand.some((c) => c.id === "M1"), "TPO1: 바운스");
}
{ // TPO2: 전투 킬 성장
  let g = fresh();
  const beast = mk("TPO2"); // 2/1
  beast.atkMod = 10; // 확실히 킬 나게
  g.players[0].field.push(beast);
  g.players[1].field.push(mk("M1")); // c1
  g = reduce(g, { type: "attack", uid: beast.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: g.players[1].field[0]?.uid ?? null }).state;
  const fb = g.players[0].field.find((x) => x.id === "TPO2");
  ok((fb?.atkMod ?? 0) === 11 && (fb?.defMod ?? 0) === 1, "TPO2: 킬 성장 +1/+1(코스트1)", `${fb?.atkMod}/${fb?.defMod}`);
}
{ // TPO5: 3~4코 파괴 + 마나
  let g = fresh();
  g.players[1].field.push(mk("M12")); // c4? M12 타이탄 게이트 cost4 — 3~4코 대상
  const mm = g.players[0].maxMana;
  g = play0(g, "TPO5");
  ok(g.players[1].field.length === 0, "TPO5: 3~4코 파괴");
  ok(g.players[0].maxMana === mm + 1, "TPO5: 성공 시 최대 마나 +1");
}
// ---- 고독 ----
{ // TSO1: 소환 잠금
  let g = fresh();
  g = play0(g, "TSO1");
  ok(g.players[0].field.some((x) => x.id === "TSO1"), "TSO1 소환");
  g = play0(g, "M1");
  ok(!g.players[0].field.some((x) => x.id === "M1"), "TSO1: 다른 소환 봉쇄");
  for (let i = 0; i < 6; i++) g = reduce(g, { type: "endTurn" }).state;
  g = play0(g, "M1");
  ok(g.players[0].field.some((x) => x.id === "M1"), "TSO1: 3턴 후 해제");
}
{ // TSO2: 고독 버프 / TSO3: 묘지 청정 드로우 / TSO5: 조건
  let g = fresh();
  g = play0(g, "TSO2");
  const w = g.players[0].field.find((x) => x.id === "TSO2");
  ok((w?.atkMod ?? 0) === 3 && (w?.defMod ?? 0) === 3, "TSO2: 필드 1장 이하 +3/+3");
  let g2 = fresh();
  g2.players[0].discard = g2.players[0].discard.filter((c) => c.t !== "mon");
  const h0 = g2.players[0].hand.length;
  g2 = play0(g2, "TSO3");
  ok(g2.players[0].hand.length === h0 + 4, "TSO3: 묘지 무몬스터 → 4드로우");
  let g3 = fresh();
  g3.players[0].field.push(mk("M1"));
  g3 = play0(g3, "TSO5");
  ok(!g3.players[0].field.some((x) => x.id === "TSO5"), "TSO5: 타종족 있으면 거부");
}
// ---- 귀족 ----
{ // TAR1 드로우 / TAR2 공격 봉쇄 / TAR3 함정 봉쇄 / TAR5 벽
  let g = fresh();
  g.players[0].field.push(mk("TAR1"));
  g = reduce(g, { type: "endTurn" }).state;
  g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].hand.length === 4, "TAR1: 턴 시작 드로우 4장(3+1)", g.players[0].hand.length);

  let g2 = fresh();
  const cheap = mk("M4"); // c2
  g2.players[0].field.push(cheap);
  g2.players[1].field.push(mk("TAR2"));
  const hp1 = g2.players[1].hp;
  g2 = reduce(g2, { type: "attack", uid: cheap.uid }).state;
  ok(!g2.pending && g2.players[1].hp === hp1, "TAR2: 2코 이하 공격 봉쇄");

  let g3 = fresh();
  g3.players[1].field.push(mk("TAR3"));
  g3.players[0].mana = 10;
  g3.players[0].hand.unshift(card("T13"));
  g3 = reduce(g3, { type: "play", idx: 0 }).state;
  ok(g3.players[0].traps.length === 0, "TAR3: 함정 세트 봉쇄");

  let g4 = fresh();
  const knight = mk("M4"); // c2 — 6코 이하
  g4.players[0].field.push(knight);
  g4.players[1].field.push(mk("TAR5"));
  const hp4 = g4.players[1].hp;
  g4 = reduce(g4, { type: "attack", uid: knight.uid }).state;
  if (g4.pending) g4 = reduce(g4, { type: "chooseTarget", uid: g4.players[1].field[0].uid }).state;
  ok(g4.players[1].field.some((x) => x.id === "TAR5" && !(x.dmg ?? 0)), "TAR5: 6코 이하는 공격 불가(재선택)");
  ok(g4.players[1].hp === hp4, "TAR5: 직접 공격도 불가");
}
// ---- 마족 ----
{ // TDE1 조건+대가 / TDE2 세금 / TDE4 마나 4
  let g = fresh();
  g.players[0].maxMana = 4;
  g = play0(g, "TDE1");
  ok(!g.players[0].field.some((x) => x.id === "TDE1"), "TDE1: 최대 마나 4면 거부");
  g.players[0].maxMana = 6;
  g = play0(g, "TDE1");
  ok(g.players[0].field.some((x) => x.id === "TDE1"), "TDE1: 소환");
  ok(g.players[0].maxMana === 5 && (g.players[0].manaRegain?.length ?? 0) === 1, "TDE1: 최대 마나 -1 + 복구 예약");
  for (let i = 0; i < 10; i++) g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].maxMana >= 6, "TDE1: 5턴 후 복구", g.players[0].maxMana);

  let g2 = fresh();
  g2.players[0].maxMana = 8;
  g2.players[0].field.push(mk("TDE2"));
  ok(effMaxMana(g2.players[0]) === 6, "TDE2: 유효 최대 마나 -2", effMaxMana(g2.players[0]));
  g2.players[0].maxMana = 4;
  ok(effMaxMana(g2.players[0]) === 3, "TDE2: 바닥 3", effMaxMana(g2.players[0]));

  let g3 = fresh();
  g3.players[0].maxMana = 9;
  g3 = play0(g3, "TDE4");
  ok(g3.players[0].maxMana === 4, "TDE4: 최대 마나가 4가 된다");
}
// ---- 시너지 ----
{ // 마족 2/3/4종
  let g = fresh();
  g.players[0].maxMana = 30;
  g = play0(g, "TDE1"); g = play0(g, "TDE2");
  ok(g.players[1].spellCastCap === 2, "마족 2종: 상대 마법 한도 2");
  g = play0(g, "TDE3");
  ok(g.players[1].spellCastCap === 0, "마족 3종: 상대 마법 봉인");
  g = play0(g, "TDE4");
  ok(g.players[1].manaCostMult === 3, "마족 4종: 마나 3배");
  ok(playCost(card("S11"), g.players[1]) === DB.S11.cost * 3, "마나 3배: playCost 반영");
  // 상대가 마법을 못 쓰는지
  g = reduce(g, { type: "endTurn" }).state; // → B
  g.players[1].mana = 30;
  g.players[1].hand.unshift(card("S11"));
  const hpA = g.players[0].hp;
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[0].hp === hpA, "마족 3종: 상대 마법 불발");
}
{ // 귀족 4종 + 고독 4종
  let g = fresh();
  for (const id of ["TAR1", "TAR2", "TAR3", "TAR5"]) g = play0(g, id);
  ok(g.players[1].maxMana === 5, "귀족 4종: 상대 최대 마나 5");
  let g2 = fresh();
  for (const id of ["TSO1"]) g2 = play0(g2, id); // 은둔자 → 잠금이 있으니 필드 직접 주입으로 시너지 유도
  let g3 = fresh();
  for (const id of ["TSO1", "TSO2", "TSO3", "TSO5"]) g3.players[0].field.push(mk(id));
  g3 = play0(g3, "TSO2"); // 소환 경로로 checkTribe 트리거 (5번째지만 distinct 4)
  ok(g3.players[1].soloCurse === true, "고독 4종: 저주 부여");
}
{ // 포식 4종: 필드 전파괴 + 30뎀
  let g = fresh();
  g.players[1].field.push(mk("M5"));
  g.players[1].traps.push({ card: card("T13") } as never);
  const hp1 = g.players[1].hp;
  for (const id of ["TPO2", "TPO3", "TPO5"]) g.players[0].field.push(mk(id));
  g.players[1].field.push(mk("M1")); // TPO1 소환 조건용
  g = play0(g, "TPO1");
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: g.players[1].field.find((x) => (x.cost ?? 0) <= 2)?.uid ?? null }).state;
  ok(g.players[1].field.length === 0 && g.players[1].traps.length === 0, "포식 4종: 상대 필드 전파괴");
  ok(g.players[1].hp === hp1 - 30, "포식 4종: 30 데미지", hp1 - g.players[1].hp);
}
// ---- 담합 ----
{
  let g = fresh();
  const tribeMon = mk("TAR2");
  g.players[1].field.push(tribeMon);
  g.players[1].traps.push({ card: card("COLLUSION") } as never);
  g.players[1].maxMana = 6;
  const att = mk("GM10_0"); // c10 — lowAtkBan(2코 이하)에 안 걸림
  g.players[0].field.push(att);
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: tribeMon.uid }).state;
  ok(g.players[0].field.length === 0, "담합: 공격 몬스터 파괴");
  ok(g.players[1].field.some((x) => x.id === "TAR2" && !(x.dmg ?? 0)), "담합: 공격 무효");
  ok(g.players[1].maxMana === 5, "담합: 최대 마나 -1");
  ok(g.players[1].discard.some((c) => c.tribe === "귀족" && c.id !== "TAR2"), "담합: 동족 카드 획득");
}
// ---- 봇 자가대전 ----
{
  let done = 0;
  for (let s = 1; s <= 60; s++) {
    const tribes = [["TPO1", "TPO2"], ["TSO1", "TSO2"], ["TAR1", "TAR2"], ["TDE1", "TDE2"], ["COLLUSION", "COLLUSION"]][s % 5];
    const deck = [...tribes, "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"];
    let st = createGame({ seed: s * 9973, mode: "bot", starting: (s % 2) as 0 | 1,
      p0: { id: "a", name: "A", isBot: true, deck }, p1: { id: "b", name: "B", isBot: true, deck } } as never).state;
    // 시너지/신카드 강제 커버리지: 일부 게임에 종족 4종을 필드에 심는다
    if (s % 7 === 0) for (const id of ["TDE1", "TDE2", "TDE3"]) st.players[0].field.push(mk(id));
    if (s % 11 === 0) for (const id of ["TAR2", "TAR3", "TAR5"]) st.players[1].field.push(mk(id));
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 60, "봇 자가대전 60판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
