/* eslint-disable */
// v41b smoke: 무상의 대가 · 노 페인 노 게인 · 기원의 탐구 · 초심 · 차원 술식 · 공간 술식 · 행운의 잔향 · 선별의 규율 · 매점 · 윤회 · 고행의 대가 · 무리의 본능 · 정신 방출술 · 부호의 습관
import { DB, STARTERS, hasPassive } from "../client/src/shared/cards";
import { createGame, reduce, effAtk, effDef, deckComp } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.maxMana = 30; p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };
const attack = (g: GameState, uid: string, target: string | null = null): GameState => { let r = reduce(g, { type: "attack", uid }); if (r.state.pending?.reason === "attack") r = reduce(r.state, { type: "chooseTarget", uid: target }); return r.state; };
const ench = (g: GameState, s: 0 | 1, id: string) => { g.players[s].enchants.push({ card: card(id), turns: DB[id].val || 1, bornTurn: g.turn }); };
const inHand = (g: GameState, s: 0 | 1, id: string) => g.players[s].hand.some((c) => c.id === id);
const cycle = (g: GameState): GameState => { g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; return g; };

ok(["FREE_REWARD", "NO_PAIN", "ORIGIN_QUEST", "BEGINNER_MIND", "VOID_RITE", "SPACE_RITE", "LUCKY_ECHO", "SORTER_LAW", "BUYOUT", "SAMSARA", "PENANCE", "PACK_INSTINCT", "MIND_BURST", "RICH_HABIT"].every((id) => DB[id] && DB[id].nameEn && DB[id].textEn && DB[id].nameJa), "all v41b cards defined");
ok(DB.FREE_REWARD.cost === 2 && DB.NO_PAIN.cost === 3 && DB.ORIGIN_QUEST.cost === 1 && DB.BEGINNER_MIND.cost === 1 && DB.VOID_RITE.cost === 3 && DB.SPACE_RITE.cost === 2 && DB.LUCKY_ECHO.cost === 1 && DB.SORTER_LAW.cost === 2 && DB.SORTER_LAW.play === 1 && DB.BUYOUT.cost === 1 && DB.SAMSARA.cost === 2 && DB.SAMSARA.play === 1 && DB.PENANCE.cost === 2 && DB.PACK_INSTINCT.cost === 2 && DB.MIND_BURST.cost === 2 && DB.RICH_HABIT.cost === 3, "costs");

// ---- 무상의 대가: 코스트 0 카드 플레이 → 1드로우 ----
{ let g = fresh(); ench(g, 0, "FREE_REWARD"); const p = g.players[0]; p.hand = [card("STARTER_TRASH")]; const dk = p.deck.length; g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[0].hand.length === 1 && g.players[0].deck.length === dk - 1, "free reward: cull play → draw 1", [g.players[0].hand.length, dk, g.players[0].deck.length]);
  g.players[0].hand = [card("M1")]; const dk2 = g.players[0].deck.length; g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[0].hand.length === 0 && g.players[0].deck.length === dk2, "free reward: cost-1 card → no draw"); }

// ---- 노 페인 노 게인: 피해마다 주사위, 6이면 최대 마나 +1 ----
{ let hit = 0, roll = 0;
  for (let seed = 1; seed <= 40; seed++) { let g = fresh(seed); ench(g, 0, "NO_PAIN"); g = reduce(g, { type: "endTurn" }).state; const mm = g.players[0].maxMana; const att = mk("M1"); g.players[1].field.push(att); const r = reduce(g, { type: "attack", uid: att.uid }); if (r.events.some((e) => e.type === "dice" && e.player === 0)) roll++; if (r.state.players[0].maxMana === mm + 1) hit++; }
  ok(roll === 40 && hit > 0 && hit < 40, "no pain no gain: rolls on damage, 6 → +1 mana", [roll, hit]); }

// ---- 기원의 탐구: 필드의 코스트 0 카드 1장당 1드로우 ----
{ let g = fresh(); g.players[0].field.push(mk("SOLDIER2"), mk("M1")); g.players[1].field.push(mk("SOLDIER2")); ench(g, 1, "WORLD_CARE"); const hn = g.players[0].hand.length; g = play(g, "ORIGIN_QUEST");
  ok(g.players[0].hand.length === hn + 3, "origin quest: 3 cost-0 cards → draw 3", g.players[0].hand.length - hn); }

// ---- 초심: 패 0장일 때만 · 4드로우 ----
{ let g = fresh(); g.players[0].hand = []; g = play(g, "BEGINNER_MIND"); ok(g.players[0].hand.length === 4 && !inHand(g, 0, "BEGINNER_MIND"), "beginner's mind: empty hand → draw 4", g.players[0].hand.length); }
{ let g = fresh(); g.players[0].hand = [card("M1")]; g = play(g, "BEGINNER_MIND"); ok(inHand(g, 0, "BEGINNER_MIND") && g.players[0].hand.length === 2, "beginner's mind: refused with cards in hand"); }

// ---- 차원 술식: 양 필드 모든 몬스터에 공허 ----
{ let g = fresh(); const a = mk("M1"), b = mk("M5"); g.players[0].field.push(a); g.players[1].field.push(b); g = play(g, "VOID_RITE");
  ok(hasPassive(g.players[0].field[0], "void") && hasPassive(g.players[1].field[0], "void"), "void rite: both sides gain Void");
  g = play(g, "S13"); // 메테오는 플레이어 대상 — 대신 직접 파괴로 확인
  g = attack(g, a.uid, b.uid); // M1(3) vs M5(5hp) → M5 survives; 대신 파괴 헬퍼로 확인
  const g2 = structuredClone(g); const m5 = g2.players[1].field[0]; m5.dmg = 99; const r = reduce(g2, { type: "endTurn" }).state;
  ok((r.players[1].removed ?? []).some((c) => c.id === "M5") && !r.players[1].discard.some((c) => c.id === "M5"), "void rite: destroyed monster is exiled", [(r.players[1].removed ?? []).map((c) => c.id)]); }

// ---- 공간 술식: 상대 필드 6장 이상일 때만 · 상대 3턴 소환/마법 불가 ----
{ let g = fresh(); for (let i = 0; i < 5; i++) g.players[1].field.push(mk("M2")); g = play(g, "SPACE_RITE"); ok(inHand(g, 0, "SPACE_RITE"), "space rite: refused with 5 enemy cards"); }
{ let g = fresh(); for (let i = 0; i < 4; i++) g.players[1].field.push(mk("M2")); ench(g, 1, "WORLD_CARE"); g.players[1].traps.push({ card: card("T4") }); g = play(g, "SPACE_RITE");
  ok(g.players[0].enchants.some((e) => e.card.ench === "spaceLock"), "space rite: cast with 6 enemy cards");
  const blocked: boolean[] = [];
  for (let t = 0; t < 4; t++) { g = reduce(g, { type: "endTurn" }).state; /* opp turn */ g.players[1].hand = []; const g1 = play(g, "M1"); const g2 = play(g1, "GRAPE"); blocked.push(g2.players[1].hand.length === 2); g = reduce(g2, { type: "endTurn" }).state; }
  ok(blocked[0] && blocked[1] && blocked[2] && !blocked[3], "space rite: enemy locked for exactly 3 turns", blocked);
  ok(!g.players[0].enchants.some((e) => e.card.ench === "spaceLock"), "space rite: expired"); }
{ let g = fresh(); ench(g, 1, "SPACE_RITE"); const g2 = play(g, "M1"); ok(inHand(g2, 0, "M1"), "space lock blocks summon"); const g3 = play(g, "STARTER_CHEST"); ok(inHand(g3, 0, "STARTER_CHEST"), "space lock blocks starters");
  const a = greedyDecide(g); ok(a.type !== "play" || !["mon", "spell", "starter"].includes(g.players[0].hand[(a as { idx: number }).idx]?.t ?? ""), "bot does not try locked plays", a); }

// ---- 행운의 잔향: 자신의 주사위 6마다 상대 6뎀 ----
{ let six = 0, dmg = 0;
  for (let seed = 1; seed <= 60; seed++) { let g = fresh(seed); ench(g, 0, "LUCKY_ECHO"); const oh = g.players[1].hp; const r = reduce(g, (() => { const p = g.players[0]; p.hand.push(card("BUDGET")); p.mana = 30; p.maxMana = 30; return { type: "play", idx: p.hand.length - 1 } as const; })()); const rolled6 = r.events.some((e) => e.type === "dice" && e.player === 0 && e.rolls.includes(6)); if (rolled6) six++; if (r.state.players[1].hp === oh - 6) dmg++; else if (rolled6) console.log("   echo miss", seed, r.state.players[1].hp, oh); }
  ok(six > 0 && six === dmg, "lucky echo: every own 6 → 6 damage", [six, dmg]); }

// ---- 선별의 규율: 덱 구성 8장 이하일 때 — 무효 + 상대 필드 카드 2장 파괴 ----
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  o.deck = []; o.hand = [card("M1")]; o.discard = []; o.traps.push({ card: card("SORTER_LAW") });
  const att = mk("M1"); p.field.push(att, mk("M4")); ench(g, 0, "WORLD_CARE"); const ohp = o.hp;
  ok(deckComp(g.players[1]).length <= 8, "sorter law precondition");
  g = attack(g, att.uid);
  ok(g.players[1].hp === ohp && g.players[0].field.length === 0 && g.players[0].enchants.length === 1, "sorter law: negated + 2 monsters destroyed", [g.players[1].hp, ohp, g.players[0].field.map((m) => m.id), g.players[0].enchants.length]); }
{ let g = fresh(); const p = g.players[0], o = g.players[1]; for (let i = 0; i < 10; i++) o.deck.push(card("M1")); o.traps.push({ card: card("SORTER_LAW") }); const att = mk("M1"); p.field.push(att);
  g = attack(g, att.uid); ok(g.players[1].traps.length === 1, "sorter law: needs deck ≤ 8"); }

// ---- 매점: 이번 턴 같은 카드 2장 구매 시 · 최대 마나 +1 ----
{ let g = fresh(); const p = g.players[0]; p.mana = 30; p.maxMana = 30; g.market[0] = card("S1"); g = reduce(g, { type: "buyMarket", i: 0 }).state; const g1 = play(g, "BUYOUT"); ok(inHand(g1, 0, "BUYOUT"), "buyout: refused after 1 copy");
  g.players[0].mana = 30; g = reduce(g, { type: "buyMarket", i: 0 }).state; ok((g.players[0].buysTurn?.S1 ?? 0) === 2, "buysTurn tracks", g.players[0].buysTurn); const mm = 10; g.players[0].hand.push(card("BUYOUT")); g.players[0].maxMana = 10; g.players[0].mana = 10; g = reduce(g, { type: "play", idx: g.players[0].hand.length - 1 }).state; ok(g.players[0].maxMana === mm + 1, "buyout: +1 max mana", g.players[0].maxMana);
  g = cycle(g); ok(!g.players[0].buysTurn || Object.keys(g.players[0].buysTurn).length === 0, "buysTurn resets"); }

// ---- 윤회: 직전 턴에 파괴된 자신 몬스터 1체를 턴 시작시 소환 ----
{ let g = fresh(); const p = g.players[0], o = g.players[1]; const m1 = mk("M1"); p.field.push(m1); p.traps.push({ card: card("SAMSARA") }); const big = mk("M12"); o.field.push(big);
  g = reduce(g, { type: "endTurn" }).state; g = attack(g, big.uid, m1.uid); ok(g.players[0].field.length === 0 && g.players[0].discard.some((c) => c.id === "M1"), "samsara setup: M1 destroyed on enemy turn");
  g = reduce(g, { type: "endTurn" }).state;
  ok(g.pending?.reason === "samsaraPick" && g.cur === 0 && g.players[0].traps.length === 0, "samsara: fires at own turn start", g.pending);
  const a = greedyDecide(g); ok(a.type === "pick" && (a as { uid: string }).uid === "M1", "bot picks", a);
  g = reduce(g, { type: "pick", uid: "M1" }).state;
  ok(g.players[0].field.some((m) => m.id === "M1" && !m.token) && !g.players[0].discard.some((c) => c.id === "M1"), "samsara: M1 back from graveyard (not a token)"); }
{ let g = fresh(); g.players[0].traps.push({ card: card("SAMSARA") }); g = cycle(g); ok(g.players[0].traps.length === 1 && !g.pending, "samsara: no destruction → stays set"); }

// ---- 고행의 대가 ----
{ let g = fresh(); g.players[0].brand = 2; const mm = 10, mh = g.players[0].maxHp; g.players[0].hand.push(card("PENANCE")); g.players[0].maxMana = 10; g.players[0].mana = 10; g = reduce(g, { type: "play", idx: g.players[0].hand.length - 1 }).state; ok(g.players[0].maxMana === mm + 4 && g.players[0].maxHp === mh + 20 && g.players[0].brand === 2, "penance: +4 mana +20 hp, brand stays", [g.players[0].maxMana, g.players[0].maxHp - mh]); }
{ let g = fresh(); g = play(g, "PENANCE"); ok(inHand(g, 0, "PENANCE"), "penance: refused without brand"); }

// ---- 무리의 본능 ----
{ let g = fresh(); g.players[0].field.push(mk("M1"), mk("M1"), mk("M2")); g = play(g, "PACK_INSTINCT"); const f = g.players[0].field;
  ok(effAtk(g.players[0], f[0]) === DB.M1.atk! + 2 && effDef(g.players[0], f[1]) === DB.M1.def! + 2 && effAtk(g.players[0], f[2]) === DB.M2.atk, "pack instinct: same-name pair +2/+2, others not"); }
{ let g = fresh(); g.players[0].field.push(mk("M1"), mk("M2")); g = play(g, "PACK_INSTINCT"); ok(inHand(g, 0, "PACK_INSTINCT"), "pack instinct: refused without a pair"); }

// ---- 정신 방출술 ----
{ let g = fresh(); g.players[0].field.push(mk("GOLEM1", { guts: 2 }), mk("GOLEM2", { guts: 1 })); const oh = g.players[1].hp; g = play(g, "MIND_BURST");
  ok(g.players[1].hp === oh - 12 && g.players[0].field.every((m) => !m.guts), "mind burst: 3 counters → 12 dmg, counters cleared", [oh - g.players[1].hp]); }
{ let g = fresh(); g.players[0].field.push(mk("M1")); g = play(g, "MIND_BURST"); ok(inHand(g, 0, "MIND_BURST"), "mind burst: refused without guts counters"); }

// ---- 부호의 습관 ----
{ let g = fresh(); ench(g, 0, "RICH_HABIT"); g.players[0].hand = [card("M1"), card("M1"), card("M1")]; const mh = g.players[0].maxHp, mm = g.players[0].maxMana; g = cycle(g); // 드로우 1 → 4장
  ok(g.players[0].maxHp === mh + 6 && g.players[0].maxMana === mm, "rich habit: 4 cards → +6 hp only", [g.players[0].hand.length, g.players[0].maxHp - mh, g.players[0].maxMana - mm]); }
{ let g = fresh(); ench(g, 0, "RICH_HABIT"); g.players[0].hand = Array.from({ length: 5 }, () => card("M1")); const mh = g.players[0].maxHp, mm = g.players[0].maxMana; g = cycle(g); // → 6장
  ok(g.players[0].maxHp === mh + 6 && g.players[0].maxMana === mm + 1, "rich habit: 6 cards → +6 hp +1 mana", [g.players[0].hand.length, g.players[0].maxHp - mh, g.players[0].maxMana - mm]); }
{ let g = fresh(); ench(g, 0, "RICH_HABIT"); g.players[0].hand = [card("M1")]; const mh = g.players[0].maxHp; g = cycle(g); ok(g.players[0].maxHp === mh, "rich habit: 2 cards → nothing"); }

// ---- self-play ----
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
