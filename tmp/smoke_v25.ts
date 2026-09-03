/* eslint-disable */
// v25 smoke — 함정 리워크: 신규 react 전종 발화 + DB 무결성 + 봇 자가대전 크래시 체크
import { DB, BALANCE_VERSION, BUYABLE_POOL } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

// ---- DB 무결성 ----
ok(BALANCE_VERSION === "v25", "version v25", BALANCE_VERSION);
for (const id of ["GT10_2", "GT10_3", "GT6_4", "NT_NULL5", "GT8_0"]) ok(!DB[id], `${id} 삭제됨`);
ok(DB.NT_SNARE?.react === "snare" && DB.NT_SNARE.cost === 3, "NT_SNARE 존재");
const REACTS: Record<string, string> = {
  GT9_3: "soulSwap", GT10_0: "counterOrder", GT12_0: "lastBastion", GT5_4: "devourGuard",
  GT8_5: "brandMagic", GT6_1: "toll", GT11_1: "gateClose", GT12_1: "doomsday",
  GT11_0: "infoDealer", NT_NULL6: "secondNull",
};
for (const [id, r] of Object.entries(REACTS)) ok(DB[id]?.react === r, `${id} react=${r}`, DB[id]?.react);
ok(DB.GT11_0.name === "정보상", "GT11_0 이름 정보상", DB.GT11_0.name);
ok(DB.NT_NULL6.name === "마나 역류", "NT_NULL6 이름", DB.NT_NULL6.name);
ok(DB.T10.val === 4, "T10 회복 4");
ok(DB.GT10_1.cost === 5 && DB.GT10_1.val === 6, "GT10_1 5코/6뎀");
ok(DB.GT9_2.cost === 5, "GT9_2 5코");
ok(DB.GT12_0.exileOnDestroy === true, "GT12_0 공허");
for (const id of BUYABLE_POOL) { const c = DB[id]; if (c.t === "trap" && c.cost > 1) ok(c.play === 1, `${id} 함정 시전 1`, c.play); }

// ---- 엔진 시나리오 ----
const mk = (g: GameState, id: string): FieldMon => ({
  uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]),
  exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0,
}) as FieldMon;
const trap = (id: string): { card: CardInst } => ({ card: { uid: "tr" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst });
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;

// gateClose: 직접 공격 무효 + 이번 턴 직접 공격 봉쇄
{
  let g = fresh();
  const m = mk(g, "M4"); // 4/1
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT11_1") as never);
  const hp0 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[1].hp === hp0, "gateClose: 공격 무효", g.players[1].hp);
  ok(g.players[0].noDirectTurn === true, "gateClose: noDirectTurn");
  const m2 = mk(g, "M1");
  g.players[0].field.push(m2);
  g = reduce(g, { type: "attack", uid: m2.uid }).state;
  ok(g.players[1].hp === hp0, "gateClose: 후속 직접 공격도 봉쇄");
}
// lastBastion: 치명 공격 무효 + 턴 강제 종료 + 회복 + 다음 턴 4드로우
{
  let g = fresh();
  const m = mk(g, "GM10_0"); // 24/8
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT12_0") as never);
  g.players[1].hp = 10; g.players[1].maxHp = 60;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.cur === 1, "lastBastion: 턴 강제 종료 (상대 턴으로)");
  ok(g.players[1].hp === 40, "lastBastion: 절반 회복 10→40", g.players[1].hp);
  ok(g.players[1].bastionUses === 1, "lastBastion: 사용 횟수 기록");
  ok((g.players[1].removed ?? []).some((c) => c.id === "GT12_0"), "lastBastion: 게임에서 제외(공허)");
  ok(g.players[1].hand.length >= 7, "lastBastion: +4 드로우 (기본3+4)", g.players[1].hand.length);
}
// soulSwap: 공격 몬스터 탈취 + 최저코스트 반납
{
  let g = fresh();
  const att = mk(g, "GM10_0");
  g.players[0].field.push(att);
  const low = mk(g, "M1");
  g.players[1].field.push(low);
  g.players[1].traps.push(trap("GT9_3") as never);
  g = reduce(g, { type: "attack", uid: att.uid }).state; // 대상 선택 pending
  g = reduce(g, { type: "chooseTarget", uid: low.uid }).state;
  ok(g.players[1].field.some((x) => x.id === "GM10_0"), "soulSwap: 공격 몬스터 탈취");
  ok(g.players[0].field.some((x) => x.id === "M1"), "soulSwap: 최저코스트 반납");
  ok(g.players[0].field.find((x) => x.id === "M1")?.exhausted === true, "soulSwap: 반납 몬스터 행동 불가");
}
// counterOrder: 절반 + 일제 반격 (합계 > 방어 → 파괴 + 관통)
{
  let g = fresh();
  const att = mk(g, "M4"); // 4/1
  g.players[0].field.push(att);
  const big = mk(g, "GM10_0"); // 24/8 반격수
  g.players[1].field.push(big);
  g.players[1].traps.push(trap("GT10_0") as never);
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  g = reduce(g, { type: "chooseTarget", uid: big.uid }).state;
  ok(!g.players[0].field.some((x) => x.id === "M4"), "counterOrder: 공격 몬스터 파괴");
  ok(g.players[0].hp === hp0 - (24 - 1), "counterOrder: 관통 23", hp0 - g.players[0].hp);
}
// devourGuard: 무효 + 파괴 (주사위로 제외 여부)
{
  let g = fresh();
  const att = mk(g, "M4");
  g.players[0].field.push(att);
  g.players[1].traps.push(trap("GT5_4") as never);
  const hp0 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  ok(g.players[1].hp === hp0, "devourGuard: 공격 무효");
  const gone = !g.players[0].field.some((x) => x.id === "M4");
  const exiled = (g.players[0].removed ?? []).some((c) => c.id === "M4");
  const grave = g.players[0].discard.some((c) => c.id === "M4");
  ok(gone && (exiled || grave), "devourGuard: 파괴 (제외 또는 묘지)", { exiled, grave });
}
// infoDealer: 다회용 — 첫 발동 후 필드에 남는다
{
  let g = fresh();
  const att = mk(g, "M4");
  g.players[0].field.push(att);
  g.players[1].traps.push(trap("GT11_0") as never);
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  const ts = g.players[0 + 1].traps.find((t) => t.card.react === "infoDealer");
  ok(!!ts && (ts.cnt ?? 0) >= 1 && (ts.cnt ?? 0) <= 6, "infoDealer: 발동 후 잔존 + 카운터", ts?.cnt);
  ok(g.players[0].field.some((x) => x.id === "M4" && x.exhausted), "infoDealer: 공격 무효(행동 종료)");
}
// brandMagic + tick: 마법 사용 → 낙인, 다음 자기 턴 시작시 자해
{
  let g = fresh();
  g.players[1].traps.push(trap("GT8_5") as never);
  g.players[0].mana = 10;
  g.players[0].hand.unshift({ uid: "sp1", ...structuredClone(DB.S11) } as CardInst); // 파이어볼
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[0].brand === 1, "brandMagic: 낙인 카운터 1");
  const hpBefore = g.players[0].hp;
  g = reduce(g, { type: "endTurn" }).state; // → B턴
  g = reduce(g, { type: "endTurn" }).state; // → A턴 시작: 낙인 자해
  ok(g.players[0].hp < hpBefore, "brand tick: 턴 시작 자해", hpBefore - g.players[0].hp);
}
// secondNull: 이번 턴 2번째 마법 무효 + 최대 마나 -1
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_NULL6") as never);
  g.players[0].mana = 10;
  const mm0 = g.players[0].maxMana;
  const hp1 = g.players[1].hp;
  g.players[0].hand.unshift({ uid: "sp2", ...structuredClone(DB.S11) } as CardInst);
  g.players[0].hand.unshift({ uid: "sp3", ...structuredClone(DB.S11) } as CardInst);
  g = reduce(g, { type: "play", idx: 0 }).state; // 1번째: 통과 (4뎀)
  ok(g.players[1].hp === hp1 - 4, "secondNull: 1번째 마법은 통과");
  g = reduce(g, { type: "play", idx: 0 }).state; // 2번째: 무효
  ok(g.players[1].hp === hp1 - 4, "secondNull: 2번째 마법 무효", hp1 - g.players[1].hp);
  ok(g.players[0].maxMana === mm0 - 1, "secondNull: 최대 마나 -1");
}
// toll: 구매 반응 (트랩 소모 + 4+면 제외/데미지/최대체력)
{
  let g = fresh(11);
  g.players[1].traps.push(trap("GT6_1") as never);
  g.players[0].mana = 20;
  const bought = g.market[0];
  const hpMax1 = g.players[1].maxHp;
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "buyMarket", i: 0 }).state;
  ok(g.players[1].traps.length === 0, "toll: 함정 소모");
  const fired = (g.players[0].removed ?? []).some((c) => c.id === bought.id);
  if (fired) {
    ok(g.players[1].maxHp === hpMax1 + bought.cost, "toll: 최대 체력 +코스트");
    ok(g.players[0].hp === hp0 - bought.cost, "toll: 코스트만큼 데미지");
  } else {
    ok(g.players[0].discard.some((c) => c.id === bought.id), "toll: 실패시 구매 카드 유지");
  }
}
// doomsday: 3턴 후 자동 발동 — 필드 전체 청소
{
  let g = fresh();
  g.players[0].traps.push({ ...trap("GT12_1"), cnt: 3 } as never);
  g.players[0].field.push(mk(g, "M4"));
  g.players[1].field.push(mk(g, "M5"));
  g.players[1].traps.push(trap("T8") as never);
  const mm1 = g.players[1].maxMana;
  for (let i = 0; i < 6; i++) g = reduce(g, { type: "endTurn" }).state; // A→B→A→B→A→B→A (A 턴 시작 3회)
  ok(g.players[0].field.length === 0 && g.players[1].field.length === 0, "doomsday: 양측 몬스터 전멸");
  ok(g.players[1].traps.length === 0, "doomsday: 상대 함정 파괴");
  ok(g.players[0].discard.some((c) => c.id === "GT12_1"), "doomsday: 본체 묘지로");
  ok(g.players[1].maxMana === mm1 + 1, "doomsday: 상대 최대 마나 +1");
}
// snare: 함정 파괴 무효 + 10뎀 + 재세트 (SX2로 시험 — 대상 선택형)
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_SNARE") as never);
  const prot = trap("T8");
  g.players[1].traps.push(prot as never);
  g.players[0].mana = 10;
  g.players[0].hand.unshift({ uid: "sx", ...structuredClone(DB.SX2) } as CardInst);
  const hp0 = g.players[0].hp;
  let r = reduce(g, { type: "play", idx: 0 });
  g = r.state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: prot.card.uid }).state; // 상대 함정 지정
  ok(g.players[1].traps.length === 2, "snare: 함정 파괴 무효 (2장 잔존)", g.players[1].traps.length);
  ok(g.players[0].hp === hp0 - 10, "snare: 파괴 시도자에게 10뎀", hp0 - g.players[0].hp);
}

// ---- 봇 자가대전 크래시/행 체크 (전 함정 봇덱 주입) ----
{
  let done = 0, draws = 0;
  for (let s = 1; s <= 60; s++) {
    let st = createGame({ seed: s * 7919, mode: "bot", starting: (s % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
    // 새 함정을 강제로 세트해 실전 발화 커버리지 확보
    const newTraps = ["GT9_3", "GT10_0", "GT12_0", "GT5_4", "GT8_5", "GT6_1", "GT11_1", "GT12_1", "GT11_0", "NT_NULL6", "NT_SNARE"];
    st.players[0].traps.push(trap(newTraps[s % newTraps.length]) as never);
    st.players[1].traps.push(trap(newTraps[(s + 5) % newTraps.length]) as never);
    if (st.players[0].traps.find((t) => t.card.react === "doomsday")) st.players[0].traps.find((t) => t.card.react === "doomsday")!.cnt = 3;
    if (st.players[1].traps.find((t) => t.card.react === "doomsday")) st.players[1].traps.find((t) => t.card.react === "doomsday")!.cnt = 3;
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) { done++; if (st.winner === null) draws++; }
  }
  ok(done === 60, "봇 자가대전 60판 완주", done);
  console.log(`  (bot games: ${done}/60 finished, ${draws} draws)`);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
