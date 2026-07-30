// v14 피의 마법 리워크 스모크 — npx tsx tmp/smoke_v14.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGame, reduce } from "../client/src/shared/engine";
import { DB, BALANCE_VERSION } from "../client/src/shared/cards";
import type { CardInst, GameState } from "../client/src/shared/types";

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown): void {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`, extra ?? ""); }
}
function mk(seed = 1): GameState {
  return createGame({ seed, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
}
function inst(g: GameState, id: string): CardInst {
  g.uidSeq++;
  return { uid: "t" + g.uidSeq, ...structuredClone(DB[id]) };
}
function red(g: GameState, a: any): GameState { return reduce(g, a).state; }

console.log(`BALANCE_VERSION = ${BALANCE_VERSION}`);
ok(BALANCE_VERSION === "v14", "version v14");
ok(DB.BLOOD1.name === "피의 마법 - 블러드 드로우" && DB.BLOOD2.name === "피의 마법 - 블러드 샤워", "이름 변경");
ok(DB.BLOOD1.name.startsWith("피의 마법") && DB.BLOOD2.name.startsWith("피의 마법"), "피의 마법 접두사 유지(흡혈귀 시너지)");
ok(DB.BLOOD2.play === 2, "블러드 샤워 시전 2 (DRAW_BUFF 제외)");

// --- BLOOD1: 15뎀 + 6드로우 ---
{
  let g = mk(7);
  const p = g.players[g.cur];
  p.mana = 10; p.playsTurn = 0; p.hp = 50;
  p.hand.push(inst(g, "BLOOD1"));
  const deckBefore = p.deck.length, handBefore = p.hand.length;
  g = red(g, { type: "play", idx: p.hand.length - 1 });
  const p2 = g.players[g.cur];
  ok(p2.hp === 35, "블러드 드로우: 자신 15뎀", p2.hp);
  ok(p2.hand.length === handBefore - 1 + Math.min(6, deckBefore + p.discard.length), "블러드 드로우: 6장 드로우", p2.hand.length);
}

// --- BLOOD2: 대상 없으면 시전 거부 ---
{
  let g = mk(8);
  const p = g.players[g.cur];
  p.mana = 10; p.playsTurn = 0; p.hp = 50;
  p.hand.push(inst(g, "BLOOD2"));
  const before = p.hp;
  g = red(g, { type: "play", idx: p.hand.length - 1 });
  ok(g.players[g.cur].hp === before && g.pending === null, "블러드 샤워: 대상 없음 → 거부(노 데미지)");
}

// --- BLOOD2: 영구마법+함정 2장 선택 파괴 ---
{
  let g = mk(9);
  const p = g.players[g.cur], o = g.players[1 - g.cur];
  p.mana = 10; p.playsTurn = 0; p.hp = 50;
  const e1 = inst(g, "KIN_CALL"), e2 = inst(g, "MULTI_CULTURE");
  o.enchants.push({ card: e1 }, { card: e2 } as any);
  const tr = inst(g, "COUNTER" in DB ? "COUNTER" : Object.keys(DB).find((k) => DB[k].t === "trap")!);
  o.traps.push({ card: tr } as any);
  const mIdx = p.hand.push(inst(g, "BLOOD2")) - 1;
  g = red(g, { type: "play", idx: mIdx });
  ok(g.players[g.cur].hp === 35, "블러드 샤워: 자신 15뎀", g.players[g.cur].hp);
  ok(g.pending?.kind === "oppBoard" && g.pending?.data?.noMon === true && g.pending?.data?.val === 2, "pending oppBoard noMon val2", g.pending);
  // 몬스터 소환 후 pick으로 몬스터 uid 시도 → noMon이라 무시돼야 함 (필드 몬스터 세팅)
  const om = { ...inst(g, "GOLEM1"), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0 } as any;
  g.players[1 - g.cur].field.push(om);
  const enchBefore = g.players[1 - g.cur].enchants.length;
  g = red(g, { type: "pick", uid: om.uid });
  ok(g.players[1 - g.cur].field.length === 1, "noMon: 몬스터 pick 무시(파괴 안 됨)");
  // 영구마법 1 pick
  g = red(g, { type: "pick", uid: e1.uid });
  ok(g.players[1 - g.cur].enchants.length === enchBefore - 1, "영구마법 1장 파괴");
  ok(g.pending?.kind === "oppBoard" && g.pending?.data?.val === 1 && g.pending?.data?.noMon === true, "재-pending val1 noMon 유지", g.pending?.data);
  // 함정 pick
  g = red(g, { type: "pick", uid: tr.uid });
  ok(g.players[1 - g.cur].traps.length === 0, "세트 함정 파괴");
  ok(g.pending === null, "선택 종료");
  ok(g.players[1 - g.cur].field.length === 1, "몬스터는 끝까지 생존");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
