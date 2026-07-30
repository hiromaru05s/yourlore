// v17 함정 리밸런스 스모크
import { DB, BALANCE_VERSION } from "../client/src/shared/cards";
import { playCost } from "../client/src/shared/engine";
import type { CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
ok(BALANCE_VERSION === "v17", "v17");
const traps = Object.values(DB).filter((c) => c.t === "trap");
console.log(`traps: ${traps.length}`);
for (const t of traps) {
  ok(playCost({ uid: "x", ...t } as CardInst) === 1, `${t.id} 시전 1`, t.play ?? t.cost);
  ok(!/\(시전 \d+\)/.test(t.text) && !/\(発動\d+\)/.test(t.textJa ?? ""), `${t.id} 텍스트 시전표기 제거`);
}
const want: Record<string, number> = { T1:1, T8:1, NT_NULL3:1, MIMIC_PARTY:1, T2:2, T3:2, T9:2, NT_NULL4:3, T10:3, T11:3, T12:3, T4:4, T6:4, T13:4, NT_NULL5:4, NT_NULL6:6, NT_NULL8:8, GT9_2:6, GT10_2:7, GT10_0:8, GT10_1:9, GT11_0:9, GT11_1:10, GT12_0:10, GT12_1:11, GT9_3:9, GT10_3:10 };
for (const [id, c] of Object.entries(want)) ok(DB[id].cost === c, `${id} 구매 ${c}`, DB[id].cost);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
