import { DB, BALANCE_VERSION } from "../client/src/shared/cards";
import { createGame } from "../client/src/shared/engine";
import { BOT_DECKS } from "../client/src/shared/bot";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
ok(BALANCE_VERSION === "v20", "v20");
ok(DB.GM8_1.atk === 4 && DB.GM8_1.def === 11, "신성한 성벽 4/11", `${DB.GM8_1.atk}/${DB.GM8_1.def}`);
ok(BOT_DECKS.length === 5 && BOT_DECKS[3].name.includes("GAMBLER") && BOT_DECKS[4].name.includes("ELF"), "봇 덱 5종");
// 마켓 1~6코 검증 (여러 시드)
let has56 = false, bad = false;
for (let s = 1; s <= 30; s++) {
  const g = createGame({ seed: s, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
  for (const c of g.market) {
    if (c.cost < 1 || c.cost > 6) bad = true;
    if (c.cost === 5 || c.cost === 6) has56 = true;
  }
  ok(g.market.length === 10, `시드${s} 마켓 10장`, g.market.length);
  if (s > 3) break;
}
for (let s = 1; s <= 30; s++) {
  const g = createGame({ seed: s, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
  for (const c of g.market) { if (c.cost < 1 || c.cost > 6) bad = true; if (c.cost >= 5) has56 = true; }
}
ok(!bad, "마켓 전부 1~6코");
ok(has56, "5~6코 카드 실제 등장");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
