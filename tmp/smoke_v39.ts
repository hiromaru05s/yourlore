/* eslint-disable */
import { DB, STARTERS, BALANCE_VERSION } from "../client/src/shared/cards";
import { createGame, reduce, effAtk } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.maxMana = 30; p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };
const curses = (g: GameState, side: 0 | 1) => g.players[side].discard.filter((c) => c.id === "CURSE").length;
const addSpells = (g: GameState, side: 0 | 1, n: number) => { for (let i = 0; i < n; i++) g.players[side].discard.push(card("GRAPE")); };
ok(BALANCE_VERSION === "v39", "version", BALANCE_VERSION);
ok(DB.NHEX.cost === 2 && DB.NHEX.name === "견습 주술사" && DB.NHEX.nameJa === "見習い呪術師" && DB.NHEX.nameEn === "Apprentice Hexer", "NHEX rename/cost", [DB.NHEX.cost, DB.NHEX.name, DB.NHEX.nameEn]);
ok(DB.HEXER1.cost === 3 && DB.HEXER1.atk === 2 && DB.HEXER1.def === 3 && DB.HEXER2.cost === 4 && DB.HEXER2.atk === 3 && DB.HEXER2.def === 5 && DB.HEXER3.cost === 5 && DB.HEXER3.atk === 3 && DB.HEXER3.def === 6 && DB.HEXER4.cost === 6 && DB.HEXER4.atk === 4 && DB.HEXER4.def === 10, "stats");
ok(DB.HEXER3.passive?.includes("aura") && ["aura", "majesty", "evade"].every((k) => DB.HEXER4.passive?.includes(k)), "passives");
// hexSummon: 조건 미달 → 주사위 없음
{ let g = fresh(); addSpells(g, 0, 7); const p = g.players[0]; p.hand.push(card("HEXER1")); p.maxMana = 30; p.mana = 30; const r = reduce(g, { type: "play", idx: p.hand.length - 1 }); g = r.state; ok(g.players[0].field.some((m) => m.id === "HEXER1") && curses(g, 1) === 0 && !r.events.some((e) => e.type === "dice"), "hexer1 below 8 spells: no roll"); }
// hexSummon: 초급 8장/5+ → 3장, 중급 10장/4+ → 4장, 상급 13장/3+ → 5장 (시드 순회로 성공/실패 모두 확인)
for (const [id, need, cnt] of [["HEXER1", 8, 3], ["HEXER2", 10, 4], ["HEXER3", 13, 5]] as const) {
  let hit = 0, miss = 0, bad = 0;
  for (let seed = 1; seed <= 40; seed++) { let g = fresh(seed); addSpells(g, 0, need); g = play(g, id); const c = curses(g, 1); if (c === cnt) hit++; else if (c === 0) miss++; else bad++; }
  ok(hit > 0 && miss > 0 && bad === 0, `${id} curses ${cnt} on success`, [hit, miss, bad]);
}
// 상급 주술사 상시: 상대 마법마다 상대 묘지에 저주 1장 (무효화 여부와 무관)
{ let g = fresh(); g.players[1].field.push(mk("HEXER3")); g = play(g, "GRAPE"); ok(curses(g, 0) === 1, "hexer3 curse on enemy spell", curses(g, 0)); g = play(g, "GRAPE"); ok(curses(g, 0) === 2, "hexer3 stacks per spell", curses(g, 0)); }
// 특급 소환 조건: 마법 15장 이상 + 덱 구성의 반 이상
{ let g = fresh(); addSpells(g, 0, 14); g = play(g, "HEXER4"); ok(g.players[0].hand.some((c) => c.id === "HEXER4"), "hexer4 blocked at 14 spells"); }
{ let g = fresh(); addSpells(g, 0, 15); for (let i = 0; i < 20; i++) g.players[0].discard.push(card("M1")); g = play(g, "HEXER4"); ok(g.players[0].hand.some((c) => c.id === "HEXER4"), "hexer4 blocked when spells < half"); }
{ let g = fresh(); addSpells(g, 0, 15); g = play(g, "HEXER4"); ok(g.players[0].field.some((m) => m.id === "HEXER4"), "hexer4 summons at 15 spells (half+)", [g.players[0].deck.length, g.players[0].hand.length, g.players[0].discard.length]); }
// 켈로이드 공격력 +5: 주술사 계열만
{ const g = fresh(); const boss = mk("HEXER4"), hx = mk("NHEX"), h1 = mk("HEXER1"), m1 = mk("M1"); g.players[0].field.push(boss, hx, h1, m1);
  ok(effAtk(g.players[0], hx) === 6 && effAtk(g.players[0], h1) === 7 && effAtk(g.players[0], boss) === 9 && effAtk(g.players[0], m1) === DB.M1.atk, "hexBoss +5 hexers only", [effAtk(g.players[0], hx), effAtk(g.players[0], h1), effAtk(g.players[0], boss), effAtk(g.players[0], m1)]); }
// 켈로이드 마법 무효: 주사위 3+ → 무효 (성공/실패 모두 관측)
{ let neg = 0, res = 0;
  for (let seed = 1; seed <= 40; seed++) { let g = fresh(seed); g.players[1].field.push(mk("HEXER4")); const mh = g.players[0].maxHp; g = play(g, "GRAPE2"); if (g.players[0].maxHp === mh) neg++; else if (g.players[0].maxHp === mh + 4) res++; }
  ok(neg > 0 && res > 0 && neg + res === 40, "hexBoss negates on 3+", [neg, res]); }
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
