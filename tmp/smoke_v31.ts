/* eslint-disable */
// v31 smoke — 마켓 카운터(상회/암상인) + 와인 아키타입
import { DB, BALANCE_VERSION, BUYABLE_POOL, DECK_POOL } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

// ---- DB 무결성 ----
ok(BALANCE_VERSION === "v31", "version v31", BALANCE_VERSION);
for (const id of ["GUILD_CO", "SLUM", "GRAPE", "BREWING", "MERCH1", "MERCH2", "GRAPE2", "WINE", "DARK_MERCHANT"]) ok(!!DB[id], `${id} 존재`);
for (const id of ["GUILD_CO", "SLUM", "GRAPE", "BREWING"]) ok(DECK_POOL.includes(id), `${id} 덱풀 포함`);
for (const id of ["WINE", "DARK_MERCHANT"]) ok(!BUYABLE_POOL.includes(id), `${id} 마켓 제외`);
for (const id of ["MERCH1", "MERCH2", "GRAPE2"]) ok(BUYABLE_POOL.includes(id), `${id} 마켓 포함`);

const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play0 = (g: GameState, id: string): GameState => {
  g.players[0].hand.unshift(card(id));
  g.players[0].mana = Math.max(g.players[0].mana, 20);
  return reduce(g, { type: "play", idx: 0 }).state;
};

// 상회: 설치 + 턴마다 카운터 + 중복 금지
{
  let g = fresh();
  g = play0(g, "GUILD_CO");
  ok(g.players[0].enchants.some((e) => e.card.ench === "guild"), "상회 설치");
  const before = g.players[0].discard.length;
  g = play0(g, "GUILD_CO"); // 중복 → 거부 (패에 남음)
  ok(g.players[0].hand.some((c) => c.id === "GUILD_CO"), "상회 중복 거부");
  g = reduce(g, { type: "endTurn" }).state; // → B
  g = reduce(g, { type: "endTurn" }).state; // → A: +1
  const ge = g.players[0].enchants.find((e) => e.card.ench === "guild")!;
  ok(ge.cnt === 1, "상회: 턴 시작 카운터 +1", ge.cnt);
}
// 20개 도달 → 암상인 지급 → 전 풀 구매
{
  let g = fresh();
  g = play0(g, "GUILD_CO");
  const ge = g.players[0].enchants.find((e) => e.card.ench === "guild")!;
  ge.cnt = 19;
  g = reduce(g, { type: "endTurn" }).state;
  g = reduce(g, { type: "endTurn" }).state; // A 턴 시작: 20 도달
  ok(g.players[0].hand.some((c) => c.id === "DARK_MERCHANT"), "20개 → 암상인 지급");
  ok(g.players[0].enchants.find((e) => e.card.ench === "guild")!.cnt === 0, "카운터 리셋(이월 0)");
  // 암상인 사용 → 전 풀에서 M1 구매
  const di = g.players[0].hand.findIndex((c) => c.id === "DARK_MERCHANT");
  g.players[0].hand.unshift(g.players[0].hand.splice(di, 1)[0]);
  g.players[0].mana = 20;
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.pending?.kind === "giantShop" && g.pending.reason === "darkMarket", "암상인: 전 풀 상점 pending");
  ok(((g.pending?.data?.ids as string[]) ?? []).length === BUYABLE_POOL.length, "암상인: 풀 전체 노출");
  const mana0 = g.players[0].mana;
  g = reduce(g, { type: "chooseTarget", uid: "M1" }).state;
  ok(g.players[0].discard.some((c) => c.id === "M1"), "암상인: M1 구매(묘지로)");
  ok(g.players[0].mana === mana0 - DB.M1.cost, "암상인: 마나 지불");
  ok((g.players[0].removed ?? []).some((c) => c.id === "DARK_MERCHANT"), "암상인: 사용 후 제외(공허)");
}
// 슬럼가: 상회 없으면 거부, 있으면 주사위만큼
{
  let g = fresh();
  g = play0(g, "SLUM");
  ok(g.players[0].hand.some((c) => c.id === "SLUM"), "슬럼가: 상회 없으면 거부");
  g = play0(g, "GUILD_CO");
  g = reduce(g, { type: "play", idx: g.players[0].hand.findIndex((c) => c.id === "SLUM") }).state;
  const ge = g.players[0].enchants.find((e) => e.card.ench === "guild")!;
  ok((ge.cnt ?? 0) >= 1 && (ge.cnt ?? 0) <= 6, "슬럼가: 🎲만큼 카운터", ge.cnt);
}
// 상인 소환 효과
{
  let g = fresh();
  g = play0(g, "GUILD_CO");
  g = play0(g, "MERCH1");
  g = play0(g, "MERCH2");
  const ge = g.players[0].enchants.find((e) => e.card.ench === "guild")!;
  ok(ge.cnt === 11, "견습(3)+왕도(8) = 카운터 11", ge.cnt);
  ok(g.players[0].field.length === 2, "상인 2체 필드");
}
// 포도/고급 포도/와인
{
  let g = fresh();
  const mh = g.players[0].maxHp;
  g = play0(g, "GRAPE");
  ok(g.players[0].maxHp === mh + 3, "포도: 최대 체력 +3");
  g = play0(g, "GRAPE2");
  ok(g.players[0].maxHp === mh + 11, "고급 포도: +8");
  const hand0 = g.players[0].hand.length;
  g = play0(g, "WINE");
  ok(g.players[0].maxHp === mh + 29, "와인: +18");
  ok(g.players[0].hand.length === hand0 + 2, "와인: 2장 드로우", g.players[0].hand.length - hand0);
  ok((g.players[0].removed ?? []).some((c) => c.id === "WINE"), "와인: 사용 후 제외(공허)");
}
// 양조: 포도 변환 + 6턴 후 와인 지급
{
  let g = fresh();
  g = play0(g, "BREWING");
  // 턴 종료 시 패는 전부 버려지므로, 포도는 덱 맨 위에 심어 다음 자기 턴에 드로우시킨다
  g.players[0].deck.push(card("GRAPE"), card("GRAPE2"));
  let wineAt = -1;
  for (let i = 0; i < 10; i++) {
    g = reduce(g, { type: "endTurn" }).state;
    if (g.players[0].hand.some((c) => c.id === "WINE") && wineAt < 0) wineAt = g.turn;
    if (!g.players[0].enchants.some((e) => e.card.ench === "brewing")) break;
  }
  const wines = g.players[0].hand.filter((c) => c.id === "WINE").length
    + g.players[0].discard.filter((c) => c.id === "WINE").length;
  ok(wines >= 4, "양조: 포도(1)+고급(3) → 와인 4장 이상", wines);
  ok(!g.players[0].enchants.some((e) => e.card.ench === "brewing"), "양조: 만료 후 종료");
}
// 봇 자가대전 (신 스타터 덱 주입)
{
  let done = 0;
  for (let s = 1; s <= 40; s++) {
    const deck = ["GUILD_CO", "SLUM", "GRAPE", "GRAPE", "BREWING", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"];
    let st = createGame({ seed: s * 6151, mode: "bot", starting: (s % 2) as 0 | 1,
      p0: { id: "a", name: "A", isBot: true, deck }, p1: { id: "b", name: "B", isBot: true, deck } } as never).state;
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 40, "봇 자가대전 40판 완주 (와인/상회 덱)", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
