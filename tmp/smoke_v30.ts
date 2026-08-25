/* eslint-disable */
// v30 smoke — 함정 리워크 포팅 (main/HP-combat 기반): 신규 react 17종 + DB 무결성 + 봇 자가대전
import { DB, BALANCE_VERSION, BUYABLE_POOL } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

// ---- DB 무결성 ----
ok(BALANCE_VERSION === "v30", "version v30", BALANCE_VERSION);
for (const id of ["GT10_2", "GT10_3", "GT6_4", "NT_NULL5", "GT8_0"]) ok(!DB[id], `${id} 삭제됨`);
const REACTS: Record<string, string> = {
  GT9_3: "soulSwap", GT10_0: "counterOrder", GT12_0: "lastBastion", GT5_4: "devourGuard",
  GT8_5: "brandMagic", GT6_1: "toll", GT11_1: "gateClose", GT12_1: "doomsday",
  GT11_0: "infoDealer", NT_NULL6: "secondNull", NT_SNARE: "snare",
  T8: "decaytrap", T9: "undertow", T6: "boltcost", GT5_1: "gateLockAll", NT_NULL4: "spellSteal", GT6_2: "omen",
};
for (const [id, r] of Object.entries(REACTS)) ok(DB[id]?.react === r, `${id} react=${r}`, DB[id]?.react);
ok(DB.GT11_0.name === "정보상" && DB.NT_NULL6.name === "마나 역류", "리워크 카드명");
ok(DB.T10.val === 4 && DB.GT10_1.cost === 5 && DB.GT9_2.cost === 5, "유지 카드 수치 조정");
ok(DB.GT12_0.exileOnDestroy === true && DB.NT_NULL4.cap === 4, "공허/캡 플래그");
for (const id of BUYABLE_POOL) { const c = DB[id]; if (c.t === "trap" && c.cost > 1) ok(c.play === 1, `${id} 함정 시전 1`, c.play); }

// ---- 엔진 시나리오 ----
const mk = (id: string): FieldMon => ({
  uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]),
  exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0,
}) as FieldMon;
const trap = (id: string): { card: CardInst } => ({ card: { uid: "tr" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst });
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const ATK = (id: string): number => DB[id].atk || 0;

// gateClose
{
  let g = fresh();
  const m = mk("M4");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT11_1") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[1].hp === hp1 && g.players[0].noDirectTurn === true, "gateClose: 무효 + 봉쇄");
  const m2 = mk("M1");
  g.players[0].field.push(m2);
  g = reduce(g, { type: "attack", uid: m2.uid }).state;
  ok(g.players[1].hp === hp1, "gateClose: 후속 직접 공격 봉쇄");
}
// lastBastion
{
  let g = fresh();
  const m = mk("GM10_0");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT12_0") as never);
  g.players[1].hp = 5; g.players[1].maxHp = 60;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.cur === 1, "lastBastion: 턴 강제 종료");
  ok(g.players[1].hp === 35, "lastBastion: 절반 회복 5→35", g.players[1].hp);
  ok((g.players[1].removed ?? []).some((c) => c.id === "GT12_0"), "lastBastion: 공허 제외");
  ok(g.players[1].hand.length >= 7, "lastBastion: +4 드로우", g.players[1].hand.length);
}
// soulSwap
{
  let g = fresh();
  const att = mk("GM10_0");
  g.players[0].field.push(att);
  const low = mk("M1");
  g.players[1].field.push(low);
  g.players[1].traps.push(trap("GT9_3") as never);
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: low.uid }).state;
  ok(g.players[1].field.some((x) => x.id === "GM10_0"), "soulSwap: 공격 몬스터 탈취");
  ok(g.players[0].field.some((x) => x.id === "M1" && x.exhausted), "soulSwap: 최저코스트 반납(행동 불가)");
}
// counterOrder — 치명: 반격 합계 >= 남은 체력 → 파괴 + 관통
{
  let g = fresh();
  const att = mk("M4");
  g.players[0].field.push(att);
  const big = mk("GM10_0");
  g.players[1].field.push(big);
  g.players[1].traps.push(trap("GT10_0") as never);
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: big.uid }).state;
  const attHp = (DB.M4.def || 0);
  const volley = ATK("GM10_0");
  ok(!g.players[0].field.some((x) => x.id === "M4"), "counterOrder: 공격 몬스터 파괴");
  ok(g.players[0].hp === hp0 - (volley - attHp), "counterOrder: 관통", { expected: volley - attHp, got: hp0 - g.players[0].hp });
}
// counterOrder — 비치명: 데미지 누적
{
  let g = fresh();
  const att = mk("GM10_0"); // 체력이 큰 공격측
  g.players[0].field.push(att);
  const small = mk("M1");
  g.players[1].field.push(small);
  g.players[1].traps.push(trap("GT10_0") as never);
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: small.uid }).state;
  const fm = g.players[0].field.find((x) => x.id === "GM10_0");
  const volley = ATK("M1");
  if (volley < (DB.GM10_0.def || 0)) ok(fm?.dmg === volley, "counterOrder: 비치명 데미지 누적", fm?.dmg);
  else ok(true, "counterOrder: (스탯상 치명 케이스로 스킵)");
}
// devourGuard
{
  let g = fresh();
  const att = mk("M4");
  g.players[0].field.push(att);
  g.players[1].traps.push(trap("GT5_4") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  ok(g.players[1].hp === hp1 && !g.players[0].field.some((x) => x.id === "M4"), "devourGuard: 무효 + 파괴");
}
// infoDealer
{
  let g = fresh();
  const att = mk("M4");
  g.players[0].field.push(att);
  g.players[1].traps.push(trap("GT11_0") as never);
  g = reduce(g, { type: "attack", uid: att.uid }).state;
  const ts = g.players[1].traps.find((t) => t.card.react === "infoDealer");
  ok(!!ts && (ts.cnt ?? 0) >= 1 && (ts.cnt ?? 0) <= 6, "infoDealer: 잔존 + 카운터", ts?.cnt);
}
// brandMagic + tick
{
  let g = fresh();
  g.players[1].traps.push(trap("GT8_5") as never);
  g.players[0].mana = 10;
  g.players[0].hand.unshift({ uid: "sp1", ...structuredClone(DB.S13) } as CardInst);
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[0].brand === 1, "brandMagic: 낙인 1");
  const hpB = g.players[0].hp;
  g = reduce(g, { type: "endTurn" }).state;
  g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].hp < hpB, "brand tick: 자해", hpB - g.players[0].hp);
}
// secondNull
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_NULL6") as never);
  g.players[0].mana = 10;
  const mm0 = g.players[0].maxMana, hp1 = g.players[1].hp, v = DB.S13.val || 0;
  g.players[0].hand.unshift({ uid: "sp2", ...structuredClone(DB.S13) } as CardInst);
  g.players[0].hand.unshift({ uid: "sp3", ...structuredClone(DB.S13) } as CardInst);
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].hp === hp1 - v, "secondNull: 1번째 통과");
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].hp === hp1 - v && g.players[0].maxMana === mm0 - 1, "secondNull: 2번째 무효 + 마나 -1");
}
// toll
{
  let g = fresh(11);
  g.players[1].traps.push(trap("GT6_1") as never);
  g.players[0].mana = 20;
  const bought = g.market[0];
  g = reduce(g, { type: "buyMarket", i: 0 }).state;
  ok(g.players[1].traps.length === 0, "toll: 함정 소모");
  const fired = (g.players[0].removed ?? []).some((c) => c.id === bought.id);
  ok(fired || g.players[0].discard.some((c) => c.id === bought.id), "toll: 제외 또는 유지");
}
// doomsday
{
  let g = fresh();
  g.players[0].traps.push({ ...trap("GT12_1"), cnt: 3 } as never);
  g.players[0].field.push(mk("M4"));
  g.players[1].field.push(mk("M5"));
  g.players[1].traps.push(trap("T13") as never);
  const mm1 = g.players[1].maxMana;
  for (let i = 0; i < 6; i++) g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].field.length === 0 && g.players[1].field.length === 0, "doomsday: 양측 몬스터 전멸");
  ok(g.players[1].traps.length === 0 && g.players[1].maxMana === mm1 + 1, "doomsday: 함정 파괴 + 마나 +1");
}
// snare (SX2 파훼술로 시험)
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_SNARE") as never);
  const prot = trap("T13");
  g.players[1].traps.push(prot as never);
  g.players[0].mana = 10;
  g.players[0].hand.unshift({ uid: "sx", ...structuredClone(DB.SX2) } as CardInst);
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "play", idx: 0 }).state;
  if (g.pending) g = reduce(g, { type: "chooseTarget", uid: prot.card.uid }).state;
  ok(g.players[1].traps.length === 2, "snare: 파괴 무효 (2장 잔존)", g.players[1].traps.length);
  ok(g.players[0].hp === hp0 - 10, "snare: 시도자 10뎀", hp0 - g.players[0].hp);
}
// decaytrap — 부패 2개 + 공격 통과, 3개째로 붕괴
{
  let g = fresh();
  const m = mk("M4");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T8") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  const fm = g.players[0].field.find((x) => x.id === "M4");
  ok(fm?.decayCnt === 2, "decaytrap: 부패 2", fm?.decayCnt);
  ok(g.players[1].hp === hp1 - ATK("M4"), "decaytrap: 공격 통과");
  g.players[1].traps.push(trap("T8") as never);
  g.players[0].field.forEach((x) => { x.exhausted = false; x.attacksUsed = 0; });
  const hp0 = g.players[0].hp, hp1b = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: fm!.uid }).state;
  ok(!g.players[0].field.some((x) => x.id === "M4") && g.players[0].hp === hp0 - 3 && g.players[1].hp === hp1b, "decaytrap: 붕괴 + 3뎀 + 공격 불발");
}
// undertow
{
  let g = fresh();
  const m = mk("GM10_0");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T9") as never);
  const hp1 = g.players[1].hp, hand0 = g.players[0].hand.length;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[1].hp === hp1 && g.players[0].field.length === 0 && g.players[0].hand.length === hand0 + 1, "undertow: 무효 + 바운스");
}
// boltcost
{
  let g = fresh();
  const m = mk("GM10_0");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T6") as never);
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[0].field.length === 0 && g.players[0].hp === hp0 - (DB.GM10_0.cost || 0), "boltcost: 파괴 + 코스트 데미지");
}
// gateLockAll
{
  let g = fresh();
  const m1 = mk("M4"), m2 = mk("M1");
  g.players[0].field.push(m1, m2);
  g.players[1].traps.push(trap("GT5_1") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m1.uid }).state;
  ok(g.players[1].hp === hp1 && g.players[0].field.every((x) => x.exhausted), "gateLockAll: 무효 + 전원 봉쇄");
}
// spellSteal
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_NULL4") as never);
  g.players[0].mana = 20;
  const hp1 = g.players[1].hp, oh = g.players[1].hand.length;
  g.players[0].hand.unshift({ uid: "sp4", ...structuredClone(DB.S13) } as CardInst);
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].hp === hp1 && g.players[1].hand.some((c) => c.id === "S13") && g.players[1].hand.length === oh + 1, "spellSteal: 무효 + 복제 강탈");
}
// omen
{
  let g = fresh();
  const m = mk("M4");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT6_2") as never);
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[0].field.length === 0 && g.players[0].drawPenaltyNext === 2, "omen: 파괴 + 페널티 예약");
  g = reduce(g, { type: "endTurn" }).state;
  g = reduce(g, { type: "endTurn" }).state;
  ok(g.players[0].hand.length === 1, "omen: 다음 턴 1장만 드로우", g.players[0].hand.length);
}

// ---- 봇 자가대전 (신 함정 전종 주입) ----
{
  let done = 0;
  const newTraps = Object.keys(REACTS);
  for (let s = 1; s <= 60; s++) {
    let st = createGame({ seed: s * 7919, mode: "bot", starting: (s % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
    st.players[0].traps.push(trap(newTraps[s % newTraps.length]) as never);
    st.players[1].traps.push(trap(newTraps[(s + 7) % newTraps.length]) as never);
    for (const pl of st.players) { const d = pl.traps.find((t) => t.card.react === "doomsday"); if (d) d.cnt = 3; }
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 60, "봇 자가대전 60판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
