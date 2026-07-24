// v15 도박꾼/엘프 스모크 — npx tsx tmp/smoke_v15.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGame, reduce, summonReqMet, playCost, buyCost } from "../client/src/shared/engine";
import { DB, DECK_POOL, BUYABLE_POOL, BALANCE_VERSION } from "../client/src/shared/cards";
import type { CardInst, FieldMon, GameState, PlayerState } from "../client/src/shared/types";

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown): void {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`, extra ?? ""); }
}
const mk = (seed = 1): GameState => createGame({ seed, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
function inst(g: GameState, id: string): CardInst { g.uidSeq++; return { uid: "t" + g.uidSeq, ...structuredClone(DB[id]) }; }
function mon(g: GameState, id: string): FieldMon { return { ...inst(g, id), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0 } as FieldMon; }
const red = (g: GameState, a: any): GameState => reduce(g, a).state;

console.log(`BALANCE_VERSION = ${BALANCE_VERSION}`);
ok(BALANCE_VERSION === "v15", "v15");
ok(DB.RUST_SHROOM.atk === 1 && DB.RUST_SHROOM.def === 0, "러스트 머쉬룸 1/0");
ok(DECK_POOL.includes("GAMBLER") && DECK_POOL.includes("ELF_HAVEN") && DECK_POOL.includes("HALF_ELF"), "스타팅 3종 덱풀 포함");
ok(!DECK_POOL.includes("WORLD_CARE") && !BUYABLE_POOL.includes("WORLD_CARE"), "보살핌 토큰 풀 제외");
ok(["LEGEND_GAMBLER","ELF","DARK_ELF","HIGH_ELF","ELDER_ELF_KING"].every((id) => BUYABLE_POOL.includes(id)), "마켓 5종 포함");

// --- summonReq ---
{
  const g = mk(2); const p = g.players[0];
  ok(!summonReqMet(p, inst(g, "ELF")), "엘프: maxHp30 → 불가");
  p.maxHp = 65;
  ok(summonReqMet(p, inst(g, "ELF")), "엘프: maxHp65 → 가능");
  ok(summonReqMet(p, inst(g, "DARK_ELF")), "다크엘프: 엘프 없음 → 가능");
  p.field.push(mon(g, "HALF_ELF"));
  ok(!summonReqMet(p, inst(g, "DARK_ELF")), "다크엘프: 하프엘프 있으면 불가");
  ok(!summonReqMet(p, inst(g, "HIGH_ELF")), "하이엘프: maxHp65 → 불가");
  p.maxHp = 99;
  ok(summonReqMet(p, inst(g, "HIGH_ELF")), "하이엘프: maxHp99 → 가능");
  ok(!summonReqMet(p, inst(g, "ELDER_ELF_KING")), "킹: 묘지에 하이엘프 없음 → 불가");
  p.discard.push(inst(g, "HIGH_ELF"));
  ok(summonReqMet(p, inst(g, "ELDER_ELF_KING")), "킹: 묘지 하이엘프+99 → 가능");
}

// --- elfHaven 코스트 0 ---
{
  const g = mk(3); const p = g.players[0];
  const wb = inst(g, "WORLD_BLESS");
  ok(playCost(wb, p) === 6 && buyCost(p, wb) === 7, "쉼터 없음: 축복 시전6/구매7");
  p.enchants.push({ card: inst(g, "ELF_HAVEN"), turns: 99 } as any);
  ok(playCost(wb, p) === 0 && buyCost(p, wb) === 0, "쉼터: 세계수 시전0/구매0");
  ok(playCost(inst(g, "ELF"), p) === 4, "쉼터: 엘프는 할인 없음");
}

// --- 엘더 킹 소환 효과 ---
{
  let g = mk(4); const p = g.players[g.cur];
  p.maxHp = 99; p.mana = 20; p.playsTurn = 0;
  p.discard.push(inst(g, "HIGH_ELF"));
  p.field.push(mon(g, "HIGH_ELF"));
  const ki = p.hand.push(inst(g, "ELDER_ELF_KING")) - 1;
  g = red(g, { type: "play", idx: ki });
  const f = g.players[g.cur].field;
  const highs = f.filter((m) => m.id === "HIGH_ELF");
  ok(f.some((m) => m.id === "ELDER_ELF_KING"), "킹 소환됨");
  ok(highs.length === 3, "하이엘프 2체 추가 소환(총 3)", highs.length);
  ok(highs.every((m) => (m.atkMod || 0) >= 15), "하이엘프 전체 공격 +15");
  ok(f.find((m) => m.id === "ELDER_ELF_KING")!.atkMod === 0 || f.find((m) => m.id === "ELDER_ELF_KING")!.atkMod === undefined, "킹 자신은 버프 제외");
}

// --- 하프 엘프 → 보살핌 전개 ---
{
  let g = mk(5); const p = g.players[g.cur];
  p.mana = 10; p.playsTurn = 0;
  let hi = p.hand.push(inst(g, "HALF_ELF")) - 1;
  g = red(g, { type: "play", idx: hi });
  ok(!g.players[g.cur].enchants.some((e) => e.card.id === "WORLD_CARE"), "세계수 없음 → 전개 안 됨");
  const p2 = g.players[g.cur];
  p2.enchants.push({ card: inst(g, "WORLD_SEED"), turns: 99 } as any);
  p2.mana = 10;
  hi = p2.hand.push(inst(g, "HALF_ELF")) - 1;
  g = red(g, { type: "play", idx: hi });
  ok(g.players[g.cur].enchants.some((e) => e.card.id === "WORLD_CARE"), "세계수 있음 → 보살핌 전개");
  // 보살핌 턴 틱: 최대 체력 +15
  const before = g.players[g.cur].maxHp; const owner = g.cur;
  g = red(g, { type: "endTurn" });          // 상대 턴
  g = red(g, { type: "endTurn" });          // 내 턴 시작(틱)
  ok(g.players[owner].maxHp >= before + 15, "보살핌: 턴 시작 최대 체력 +15", [before, g.players[owner].maxHp]);
}

// --- 도박꾼 턴 시작 주사위 (여러 시드로 성공/실패 관찰) ---
{
  let hit = 0, miss = 0;
  for (let seed = 10; seed < 30; seed++) {
    let g = mk(seed); const owner = g.cur;
    const p = g.players[owner];
    p.field.push(mon(g, "GAMBLER"));
    const mm = p.maxMana, mh = p.maxHp;
    g = red(g, { type: "endTurn" });
    g = red(g, { type: "endTurn" });
    const q = g.players[owner];
    if (q.maxMana >= mm + 1 && q.maxHp >= mh + 5) hit++;
    else if (q.maxMana === mm + (g.turn >= 2 ? 1 : 1) - 1 || true) miss++; // 마나 자연증가 여부 무관 카운트
  }
  ok(hit > 0 && miss > 0, `도박꾼 주사위 성공 ${hit} / 실패 ${miss} (20시드)`);
}

// --- 전설의 도박꾼: 도박꾼 덱에 있으면 3회 굴림 ---
{
  let jack1 = 0, jack3 = 0, n = 60;
  for (let seed = 100; seed < 100 + n; seed++) {
    for (const withG of [false, true]) {
      let g = mk(seed); const owner = g.cur; const p = g.players[owner];
      p.field.push(mon(g, "LEGEND_GAMBLER"));
      if (withG) p.discard.push(inst(g, "GAMBLER"));
      const mm = p.maxMana;
      g = red(g, { type: "endTurn" });
      g = red(g, { type: "endTurn" });
      const gained = g.players[owner].maxMana - mm;
      if (gained >= 10) { if (withG) jack3++; else jack1++; }
    }
  }
  console.log(`  (전설: 잭팟 1굴림 ${jack1}/${n}, 3굴림 ${jack3}/${n})`);
  ok(jack3 > jack1, "3굴림이 잭팟 확률 더 높음");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
