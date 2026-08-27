/* eslint-disable */
// v35 smoke — 리프레시(패 제외) / 선택과 집중(덱·묘지 제외)
import { DB, BALANCE_VERSION, DECK_POOL } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

ok(BALANCE_VERSION === "v35", "version v35", BALANCE_VERSION);
ok(!!DB.REFRESH_HAND && !!DB.FOCUS, "카드 존재");
ok(DECK_POOL.includes("REFRESH_HAND") && DECK_POOL.includes("FOCUS"), "덱풀 포함");

const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play0 = (g: GameState, id: string): GameState => {
  g.players[0].hand.unshift(card(id));
  g.players[0].mana = Math.max(g.players[0].mana, 20);
  return reduce(g, { type: "play", idx: 0 }).state;
};

// 리프레시: 1드로우 + 패 2장까지 제외 (취소 가능)
{
  let g = fresh();
  const before = g.players[0].hand.length;
  g = play0(g, "REFRESH_HAND");
  ok(g.pending?.kind === "purge" && (g.pending.data?.zone as string) === "hand", "리프레시: 패 제외 pending");
  ok(g.players[0].hand.length === before + 1, "리프레시: 1드로우 (플레이 -1 + 드로우 +1... 순수 +1은 아님)", g.players[0].hand.length - before);
  const t1 = g.players[0].hand[0], t2 = g.players[0].hand[1];
  g = reduce(g, { type: "pick", uid: t1.uid }).state;
  g = reduce(g, { type: "pick", uid: t2.uid }).state;
  ok(!g.pending, "리프레시: 2장 제외로 종료");
  ok((g.players[0].removed ?? []).some((c) => c.uid === t1.uid) && (g.players[0].removed ?? []).some((c) => c.uid === t2.uid), "리프레시: 패 2장 제외됨");
  // 취소 케이스
  let g2 = fresh();
  g2 = play0(g2, "REFRESH_HAND");
  g2 = reduce(g2, { type: "pick", uid: null }).state;
  ok(!g2.pending, "리프레시: 제외 스킵 가능");
}
// 선택과 집중: 덱·묘지 3장까지 제외
{
  let g = fresh();
  g = play0(g, "FOCUS");
  ok(g.pending?.kind === "purge" && g.pending.data?.zone == null, "선택과 집중: 덱·묘지 pending");
  const d1 = g.players[0].deck[0], d2 = g.players[0].deck[1];
  const dc = g.players[0].discard[0];
  g = reduce(g, { type: "pick", uid: d1.uid }).state;
  g = reduce(g, { type: "pick", uid: d2.uid }).state;
  if (dc) g = reduce(g, { type: "pick", uid: dc.uid }).state;
  const rm = (g.players[0].removed ?? []);
  ok(rm.some((c) => c.uid === d1.uid) && rm.some((c) => c.uid === d2.uid), "선택과 집중: 덱에서 제외");
  ok(!g.pending, "선택과 집중: 3장 후 종료");
}
// 봇 자가대전
{
  let done = 0;
  for (let s = 1; s <= 30; s++) {
    const deck = ["REFRESH_HAND", "REFRESH_HAND", "FOCUS", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"];
    let st = createGame({ seed: s * 3307, mode: "bot", starting: (s % 2) as 0 | 1,
      p0: { id: "a", name: "A", isBot: true, deck }, p1: { id: "b", name: "B", isBot: true, deck } } as never).state;
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 30, "봇 자가대전 30판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
