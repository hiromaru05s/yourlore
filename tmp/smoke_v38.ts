/* eslint-disable */
import { DB, STARTERS, BALANCE_VERSION } from "../client/src/shared/cards";
import { createGame, reduce, effMaxMana } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.maxMana = 30; p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };
ok(BALANCE_VERSION === "v38", "version", BALANCE_VERSION);
ok(DB.NGA3.nameJa === "戦士ゴーレム" && DB.NWL3.passive?.includes("guts") && DB.ASSASSIN4.passive?.includes("evade"), "renames/passives");
// 귀족 2종 → 상대 최대 마나 -2
{ let g = fresh(); g.players[1].maxMana = 8; g = play(g, "TAR1"); g = play(g, "TAR2"); ok(g.players[1].maxMana === 6, "aristocrat -2", g.players[1].maxMana); }
// 포식 2종 → 18뎀
{ let g = fresh(); const hp = g.players[1].hp; g = play(g, "TPO2"); g = play(g, "TPO3"); ok(g.players[1].hp === hp - 18, "devour 18", hp - g.players[1].hp); }
// 고독 2종 → 상대 소환 상한 2
{ let g = fresh(); g = play(g, "TSO2"); g = play(g, "TSO3"); ok(g.players[1].summonCap === 2, "solitary cap"); g.cur = 1; g.players[1].field.push(mk("M1"), mk("M2")); const n = g.players[1].hand.length; g = play(g, "M4"); ok(g.players[1].hand.length === n + 1, "cap blocks 3rd summon"); }
// 시초 2/3/4/6
{ let g = fresh(); const mh = g.players[0].maxHp; g = play(g, "TGE2"); g = play(g, "TGE3"); if (g.pending) g = reduce(g, { type: "chooseTarget", uid: g.players[0].field.find((m) => m.id === "TGE3")!.uid }).state; ok(g.players[0].maxHp === mh + 15, "origin 2 +15", g.players[0].maxHp - mh);
  g = play(g, "TGE6"); ok(g.players[0].maxHp === mh + 15 + 40, "origin 3 +40"); if (g.pending) g = reduce(g, { type: "pick", uid: null }).state;
  g = play(g, "TGE7"); ok(g.players[0].maxHp === mh + 15 + 40 + 70, "origin 4 +70", g.players[0].maxHp - mh);
  g = play(g, "TGE4"); g = play(g, "ORIGIN_MIMIC"); ok(g.over && g.winner === 0, "origin 6 wins", [g.over, g.winner, g.players[0].field.length]); }
// 마계
{ let g = fresh(); g = play(g, "DEMON_REALM"); const mm = g.players[0].maxMana; g = play(g, "TDE4"); ok(g.players[0].maxMana === mm, "demon realm negates manaSet4"); g = play(g, "TDE2"); ok(effMaxMana(g.players[0]) === Math.min(30, mm), "demon tax negated", effMaxMana(g.players[0])); }
// 살아있는 던전
{ let g = fresh(); g.players[1].field.push(mk("DUNGEON")); const a = mk("M4"); g.players[0].field.push(a); const hp = g.players[1].hp; g = reduce(g, { type: "attack", uid: a.uid }).state; g = reduce(g, { type: "chooseTarget", uid: g.players[1].field[0].uid }).state; ok((g.players[1].field[0]?.dmg || 0) === 1, "dungeon atk 1", g.players[1].field[0]?.dmg);
  const gt = mk("GOLEM1"); g.players[0].field.push(gt); g = reduce(g, { type: "attack", uid: gt.uid }).state; g = reduce(g, { type: "chooseTarget", uid: g.players[1].field[0].uid }).state; ok((g.players[1].field[0]?.dmg || 0) === 2, "guts monster unaffected", g.players[1].field[0]?.dmg); }
// AEM
{ let g = fresh(); g.players[0].discard.push(card("GOLEM1"), card("GOLEM2")); const g1 = mk("GOLEM1"), g2 = mk("M10"); g.players[0].field.push(g1, g2); g = play(g, "AEM"); ok(g.pending?.reason === "golemBuff", "aem pending"); g = reduce(g, { type: "chooseTarget", uid: g1.uid }).state; g = reduce(g, { type: "chooseTarget", uid: g2.uid }).state; ok(g.players[0].field.every((m) => m.atkMod === 7), "aem +7 x2", g.players[0].field.map((m) => m.atkMod)); }
// 기사의 가르침
{ let g = fresh(); g.players[0].field.push(mk("M1"), mk("GOLEM1", { guts: 1 })); g = play(g, "KNIGHT_TEACH"); ok(g.players[0].field[0].guts === 1 && g.players[0].field[0].passivesG?.includes("guts") && g.players[0].field[1].guts === 4, "knight teaching", g.players[0].field.map((m) => m.guts)); }
// 나이트로드의 비기
{ let g = fresh(); const as1 = mk("ASSASSIN1"), as2 = mk("ASSASSIN2"), m1 = mk("M1"); g.players[0].field.push(as1, as2, m1); g = play(g, "NL_SECRET"); ok(g.pending?.reason === "nlTarget", "nl target"); g = reduce(g, { type: "chooseTarget", uid: m1.uid }).state; ok(g.pending?.reason === "nlGrant", "nl grant"); g = reduce(g, { type: "pick", uid: "evade" }).state; ok(g.players[0].field.find((m) => m.uid === m1.uid)?.passivesG?.includes("evade") && g.players[0].field.filter((m) => m.atkMod === 3).length === 2, "nl grant + assassins +3"); }
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
