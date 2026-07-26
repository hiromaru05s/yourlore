import { DB, BALANCE_VERSION } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import type { CardInst, FieldMon, GameState } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
ok(BALANCE_VERSION === "v18", "v18");
ok(DB.GS8_0.val === 14, "GS8_0 14뎀", DB.GS8_0.val);
ok(DB.GS10_3.val === 6 && DB.GS10_3.val2 === 3 && (DB.GS10_3.play ?? 0) === 1, "GS10_3 6드로+3, 시전1");
ok(DB.S15.cap === 8, "S15 cap8");
ok(DB.MEDITATE.cost === 4 && DB.MEDITATE.play === 4, "명상 4/4");
ok(DB.BLOOD_SHIELD.cost === 3, "흡혈술식 3코");
ok(!DB.S7.text.includes("체력"), "오버로드 라이더 제거");
ok(DB.GS5_4.cost === 4 && DB.GS6_4.cost === 5 && DB.GS7_4.cost === 6, "예리함 -1코");
// S15 cap 동작: 9코 몬스터만 있으면 시전 거부, 8코 이하 있으면 그 대상만
const mk = (seed: number): GameState => createGame({ seed, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
const inst = (g: GameState, id: string): CardInst => { g.uidSeq++; return { uid: "t" + g.uidSeq, ...structuredClone(DB[id]) }; };
const mon = (g: GameState, id: string): FieldMon => ({ ...inst(g, id), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0 } as FieldMon);
{
  let g = mk(1); const p = g.players[g.cur], o = g.players[1 - g.cur];
  p.mana = 10; p.maxMana = 10; p.playsTurn = 0;
  o.field.push(mon(g, "GM9_0")); // 9코
  const i = p.hand.push(inst(g, "S15")) - 1;
  const before = p.mana;
  g = red(g, { type: "play", idx: i });
  ok(g.players[g.cur].mana === before && g.pending === null, "S15: 9코만 있으면 시전 거부(마나 보존)");
  const o2 = g.players[1 - g.cur];
  o2.field.push(mon(g, "GM5_0")); // 5코 추가
  const p2 = g.players[g.cur]; p2.mana = 10; p2.maxMana = 10;
  const i2 = p2.hand.push(inst(g, "S15")) - 1;
  g = red(g, { type: "play", idx: i2 });
  ok(g.pending?.kind === "oppMon" && g.pending?.data?.maxCost === 8, "S15: pending maxCost8");
  const big = g.players[1 - g.cur].field.find((m) => m.id === "GM9_0")!;
  g = red(g, { type: "chooseTarget", uid: big.uid });
  ok(g.players[1 - g.cur].field.some((m) => m.id === "GM9_0") && g.pending != null, "9코 pick 거부 + pending 유지");
  const small = g.players[1 - g.cur].field.find((m) => m.id === "GM5_0")!;
  g = red(g, { type: "chooseTarget", uid: small.uid });
  ok(!g.players[1 - g.cur].field.some((m) => m.id === "GM5_0") && g.pending === null, "5코 파괴 완료");
}
function red(g: GameState, a: unknown): GameState { return reduce(g, a as never).state; }
// GS10_3 효과
{
  let g = mk(2); const p = g.players[g.cur];
  p.mana = 10; p.maxMana = 10; p.playsTurn = 0; const mh = p.maxHp;
  const i = p.hand.push(inst(g, "GS10_3")) - 1;
  g = red(g, { type: "play", idx: i });
  ok(g.players[g.cur].maxHp === mh + 3, "GS10_3 최대체력+3");
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
