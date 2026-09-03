/* eslint-disable */
// v26 smoke — 함정 리워크 2차: decaytrap/undertow/boltcost/gateLockAll/spellSteal/omen
import { DB, BALANCE_VERSION } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

ok(BALANCE_VERSION === "v26", "version v26", BALANCE_VERSION);
const REACTS: Record<string, string> = { T8: "decaytrap", T9: "undertow", T6: "boltcost", GT5_1: "gateLockAll", NT_NULL4: "spellSteal", GT6_2: "omen" };
for (const [id, r] of Object.entries(REACTS)) ok(DB[id]?.react === r, `${id} react=${r}`, DB[id]?.react);
ok(DB.NT_NULL4.cap === 4, "NT_NULL4 cap 4");

const mk = (id: string): FieldMon => ({
  uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]),
  exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0,
}) as FieldMon;
const trap = (id: string): { card: CardInst } => ({ card: { uid: "tr" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst });
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;

// decaytrap: 부패 2개 부여 + 공격은 그대로 통과
{
  let g = fresh();
  const m = mk("M4"); // 4/1 c2
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T8") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  const fm = g.players[0].field.find((x) => x.id === "M4");
  ok(fm?.decayCnt === 2, "decaytrap: 부패 카운터 2", fm?.decayCnt);
  ok(g.players[1].hp === hp1 - 4, "decaytrap: 공격은 통과 (4뎀)", hp1 - g.players[1].hp);
  // 이미 2개인 몬스터가 다시 밟으면 붕괴 (파괴 + 주인 3뎀), 공격 불발
  g.players[1].traps.push(trap("T8") as never);
  g.players[0].field.forEach((x) => { x.exhausted = false; x.attacksUsed = 0; });
  const hp0 = g.players[0].hp, hp1b = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: fm!.uid }).state;
  ok(!g.players[0].field.some((x) => x.id === "M4"), "decaytrap: 3개째로 붕괴");
  ok(g.players[0].hp === hp0 - 3, "decaytrap: 주인 3뎀");
  ok(g.players[1].hp === hp1b, "decaytrap: 붕괴시 공격 불발");
}
// undertow: 무효 + 패로 바운스
{
  let g = fresh();
  const m = mk("GM10_0");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T9") as never);
  const hp1 = g.players[1].hp, hand0 = g.players[0].hand.length;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[1].hp === hp1, "undertow: 공격 무효");
  ok(g.players[0].field.length === 0, "undertow: 필드에서 제거");
  ok(g.players[0].hand.length === hand0 + 1 && g.players[0].hand.some((c) => c.id === "GM10_0"), "undertow: 패로 복귀");
}
// boltcost: 파괴 + 코스트만큼 데미지
{
  let g = fresh();
  const m = mk("GM10_0"); // c10
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("T6") as never);
  const hp0 = g.players[0].hp;
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[0].field.length === 0, "boltcost: 파괴");
  ok(g.players[0].hp === hp0 - 10, "boltcost: 코스트 10 데미지", hp0 - g.players[0].hp);
}
// gateLockAll: 무효 + 이번 턴 전원 공격 불가
{
  let g = fresh();
  const m1 = mk("M4"), m2 = mk("M1");
  g.players[0].field.push(m1, m2);
  g.players[1].traps.push(trap("GT5_1") as never);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: m1.uid }).state;
  ok(g.players[1].hp === hp1, "gateLockAll: 공격 무효");
  ok(g.players[0].field.every((x) => x.exhausted), "gateLockAll: 전원 행동 종료");
  g = reduce(g, { type: "attack", uid: m2.uid }).state;
  ok(g.players[1].hp === hp1, "gateLockAll: 후속 공격도 불가");
}
// spellSteal: 코스트 4 이하 무효 + 복제 강탈 / 5 이상은 통과
{
  let g = fresh();
  g.players[1].traps.push(trap("NT_NULL4") as never);
  g.players[0].mana = 20;
  const hp1 = g.players[1].hp, oh = g.players[1].hand.length;
  g.players[0].hand.unshift({ uid: "sp1", ...structuredClone(DB.S11) } as CardInst); // c2
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].hp === hp1, "spellSteal: 마법 무효");
  ok(g.players[1].hand.length === oh + 1 && g.players[1].hand.some((c) => c.id === "S11"), "spellSteal: 복제 강탈");
  ok(g.players[1].traps.length === 0, "spellSteal: 함정 소모");
  // cap 초과(코스트 5+)는 반응하지 않는다
  let g2 = fresh();
  g2.players[1].traps.push(trap("NT_NULL4") as never);
  g2.players[0].mana = 20;
  g2.players[0].hand.unshift({ uid: "sp2", ...structuredClone(DB.GS5_0) } as CardInst); // c5
  const hp1b = g2.players[1].hp;
  g2 = reduce(g2, { type: "play", idx: 0 }).state;
  ok(g2.players[1].hp < hp1b, "spellSteal: 코스트 5는 통과", hp1b - g2.players[1].hp);
  ok(g2.players[1].traps.length === 1, "spellSteal: 함정 미소모");
}
// omen: 파괴 + 다음 턴 드로우 -2
{
  let g = fresh();
  const m = mk("M4");
  g.players[0].field.push(m);
  g.players[1].traps.push(trap("GT6_2") as never);
  g = reduce(g, { type: "attack", uid: m.uid }).state;
  ok(g.players[0].field.length === 0, "omen: 파괴");
  ok(g.players[0].drawPenaltyNext === 2, "omen: 드로우 페널티 예약");
  g = reduce(g, { type: "endTurn" }).state; // → B
  g = reduce(g, { type: "endTurn" }).state; // → A: 3-2=1장 드로우
  ok(g.players[0].hand.length === 1, "omen: 다음 턴 1장만 드로우", g.players[0].hand.length);
  ok((g.players[0].drawPenaltyNext ?? 0) === 0, "omen: 페널티 소모");
}
// 봇 자가대전 크래시/행 체크 (신 함정 주입)
{
  let done = 0;
  const newTraps = ["T8", "T9", "T6", "GT5_1", "NT_NULL4", "GT6_2"];
  for (let s = 1; s <= 40; s++) {
    let st = createGame({ seed: s * 104729, mode: "bot", starting: (s % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
    st.players[0].traps.push(trap(newTraps[s % newTraps.length]) as never);
    st.players[1].traps.push(trap(newTraps[(s + 3) % newTraps.length]) as never);
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 40, "봇 자가대전 40판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
