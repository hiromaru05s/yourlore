/* eslint-disable */
// v41 smoke: 컬 0코스트 · 세척 장치 · 선별자 · 콜로세움 휴게소 · 콜로세움 · 제인사 · 책략 · 무법지대 · 차원의 균열
import { DB, STARTERS, BALANCE_VERSION, DECK_POOL } from "../client/src/shared/cards";
import { createGame, reduce, effDef, cullExiled, playCost } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const mk = (id: string, extra: Partial<FieldMon> = {}): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, ...extra }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play = (g: GameState, id: string): GameState => { const p = g.players[g.cur]; const c = card(id); p.hand.push(c); p.maxMana = 30; p.mana = 30; return reduce(g, { type: "play", idx: p.hand.length - 1 }).state; };
const attack = (g: GameState, uid: string, target: string | null = null): GameState => { let r = reduce(g, { type: "attack", uid }); if (r.state.pending?.reason === "attack") r = reduce(r.state, { type: "chooseTarget", uid: target }); return r.state; };
const clearHandCulls = (g: GameState, s: 0 | 1) => { const p = g.players[s]; p.hand = p.hand.filter((c) => c.star !== "trash"); p.deck = p.deck.filter((c) => c.star !== "trash"); p.discard = p.discard.filter((c) => c.star !== "trash"); };
const addCulls = (g: GameState, s: 0 | 1, n: number, zone: "hand" | "deck" | "discard" = "deck") => { for (let i = 0; i < n; i++) g.players[s][zone].push(card("STARTER_TRASH")); };
const exiledCulls = (g: GameState, s: 0 | 1, n: number) => { for (let i = 0; i < n; i++) (g.players[s].removed ??= []).push(card("STARTER_TRASH")); };
/** 양쪽이 endTurn → 다시 0번 플레이어의 턴 시작 (턴 시작 효과 관측용) */
const cycle = (g: GameState): GameState => { g = reduce(g, { type: "endTurn" }).state; if (g.pending) g = reduce(g, { type: "pick", uid: null }).state; g = reduce(g, { type: "endTurn" }).state; return g; };

ok(BALANCE_VERSION === "v41", "version", BALANCE_VERSION);
ok(DECK_POOL.includes("RIFT") && DB.RIFT.noShop === true, "RIFT in deck pool / noShop");
ok(["WASH_DEVICE", "SORTER", "COLOSSEUM_REST", "COLOSSEUM", "UNBRANDER", "STRATAGEM", "LAWLESS", "RIFT"].every((id) => DB[id] && DB[id].nameEn && DB[id].textEn && DB[id].nameJa), "all v41 cards defined w/ ja+en");
ok(DB.SORTER.atk === 1 && DB.SORTER.def === 2 && DB.SORTER.cost === 2 && DB.UNBRANDER.atk === 1 && DB.UNBRANDER.def === 3 && DB.UNBRANDER.cost === 3, "stats");
ok(DB.COLOSSEUM.cost === 6 && DB.COLOSSEUM.play === 3 && DB.STRATAGEM.cost === 3 && DB.STRATAGEM.play === 1 && DB.WASH_DEVICE.cost === 3 && DB.LAWLESS.cost === 4 && DB.COLOSSEUM_REST.cost === 3 && DB.RIFT.cost === 4, "costs");

// ---- 컬 0코스트 ----
{ const g = fresh(); const p = g.players[0]; ok(STARTERS.STARTER_TRASH.cost === 0 && playCost(card("STARTER_TRASH"), p) === 0, "cull play cost 0");
  const idx = p.hand.findIndex((c) => c.star === "trash"); p.mana = 0; const before = cullExiled(p);
  if (idx >= 0) { const g2 = reduce(g, { type: "play", idx }).state; ok(cullExiled(g2.players[0]) === before + 1 && g2.players[0].mana === 0, "cull played at 0 mana", [cullExiled(g2.players[0]), g2.players[0].mana]); }
  else ok(false, "no cull in opening hand"); }

// ---- 선별자: 소환시 3장 + 상시(자기 제외 3장 → +3) = 6장 ----
{ let g = fresh(); clearHandCulls(g, 0); addCulls(g, 0, 10, "discard"); g = play(g, "SORTER");
  ok(g.players[0].field.some((m) => m.id === "SORTER") && cullExiled(g.players[0]) === 6, "sorter summon exiles 3 (+3 passive)", cullExiled(g.players[0]));
  // 이후 컬 1장 시전 → 본인 1 + 추가 1 = 2
  const n0 = cullExiled(g.players[0]); g = play(g, "STARTER_TRASH");
  ok(cullExiled(g.players[0]) === n0 + 2, "cull play w/ sorter → +2", cullExiled(g.players[0]) - n0); }
// 선별자 2체: 컬 1장 시전 → 1 + 2
{ let g = fresh(); clearHandCulls(g, 0); addCulls(g, 0, 10, "discard"); g.players[0].field.push(mk("SORTER"), mk("SORTER")); const n0 = cullExiled(g.players[0]); g = play(g, "STARTER_TRASH");
  ok(cullExiled(g.players[0]) === n0 + 3, "cull play w/ 2 sorters → +3", cullExiled(g.players[0]) - n0); }
// 제외할 컬이 없으면 아무 일도 없음(크래시 없음)
{ let g = fresh(); clearHandCulls(g, 0); g = play(g, "SORTER"); ok(g.players[0].field.some((m) => m.id === "SORTER") && cullExiled(g.players[0]) === 0, "sorter with no culls: no-op"); }
// 상대의 컬 제외는 발동하지 않음
{ let g = fresh(); clearHandCulls(g, 1); addCulls(g, 1, 5, "discard"); g.players[1].field.push(mk("SORTER")); g = reduce(g, { type: "endTurn" }).state; /* now cur=1 */ addCulls(g, 1, 1, "hand"); const p1 = g.players[1]; p1.mana = 5; const idx = p1.hand.findIndex((c) => c.star === "trash"); g = reduce(g, { type: "play", idx }).state;
  ok(cullExiled(g.players[1]) === 2 && cullExiled(g.players[0]) === 0, "sorter only triggers for its owner", [cullExiled(g.players[1]), cullExiled(g.players[0])]); }

// ---- 콜로세움 휴게소: 자신 턴 시작마다 제외된 컬 1장당 최대 체력 +1 ----
{ let g = fresh(); exiledCulls(g, 0, 5); g = play(g, "COLOSSEUM_REST"); const mh = g.players[0].maxHp; g = cycle(g);
  ok(g.players[0].maxHp >= mh + 5 && g.players[0].enchants.some((e) => e.card.id === "COLOSSEUM_REST"), "colosseum rest +5 at own turn start", g.players[0].maxHp - mh); }

// ---- 콜로세움: 제외된 컬 8장 이상이면 턴 시작시 선택받은 몬스터 선택 소환 ----
{ let g = fresh(); exiledCulls(g, 0, 7); g = play(g, "COLOSSEUM"); g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state;
  ok(!g.pending, "colosseum: 7 culls → no offer");
  exiledCulls(g, 0, 1); g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state;
  ok(g.pending?.reason === "colosseumPick" && g.cur === 0, "colosseum: 8 culls → offer at own turn start", g.pending);
  const g2 = reduce(g, { type: "pick", uid: "CHOSEN_ARCHER" }).state;
  ok(!g2.pending && g2.players[0].field.some((m) => m.id === "CHOSEN_ARCHER" && m.token), "colosseum: pick archer → token on field");
  const g3 = reduce(g, { type: "pick", uid: "M1" }).state; ok(g3.pending?.reason === "colosseumPick", "colosseum: invalid pick re-asks");
  const g4 = reduce(g, { type: "pick", uid: null }).state; ok(!g4.pending && !g4.players[0].field.some((m) => m.id.startsWith("CHOSEN")), "colosseum: cancel"); }
// 봇도 선택함
{ let g = fresh(); exiledCulls(g, 0, 8); g = play(g, "COLOSSEUM"); g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state;
  const a = greedyDecide(g); ok(a.type === "pick" && (a as { uid: string | null }).uid === "CHOSEN_ARCHER", "bot picks archer", [a, g.pending, g.cur, g.turn]); }

// ---- 제인사 ----
{ let g = fresh(); g.players[0].brand = 2; g = play(g, "UNBRANDER"); ok(g.players[0].brand === 1, "unbrander removes 1 brand", g.players[0].brand); }
{ let g = fresh(); g = play(g, "UNBRANDER"); ok((g.players[0].brand ?? 0) === 0 && g.players[0].field.some((m) => m.id === "UNBRANDER"), "unbrander with 0 brand: no-op"); }

// ---- 세척 장치 ----
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  const att = mk("M1"); p.field.push(att, mk("RUST_SHROOM"), mk("RUST_SHROOM")); o.traps.push({ card: card("WASH_DEVICE") }); const ohp = o.hp;
  g = attack(g, att.uid);
  ok(!g.players[0].field.some((m) => m.id === "RUST_SHROOM") && g.players[0].field.some((m) => m.uid === att.uid), "wash: both decay monsters destroyed, attacker (no decay) survives");
  ok(g.players[0].brand === 2, "wash: attacker gains 2 brand", g.players[0].brand);
  ok(g.players[1].hp === ohp - DB.M1.atk!, "wash: attack continues after (direct hit)", [ohp, g.players[1].hp]);
  ok(g.players[1].traps.length === 0, "wash: trap consumed"); }
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  const att = mk("RUST_SHROOM"); p.field.push(att); o.traps.push({ card: card("WASH_DEVICE") }); const ohp = o.hp;
  g = attack(g, att.uid);
  ok(g.players[0].field.length === 0 && g.players[1].hp === ohp && g.players[0].brand === 1, "wash: decay attacker destroyed → attack ends", [g.players[1].hp, g.players[0].brand]); }
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  const att = mk("M1"); p.field.push(att); o.traps.push({ card: card("WASH_DEVICE") });
  g = attack(g, att.uid);
  ok(g.players[1].traps.length === 1, "wash: no decay monster → trap stays set"); }

// ---- 책략 ----
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  for (let i = 0; i < 6; i++) o.field.push(mk("M2"));
  const att = mk("M4"); const big = mk("CHOSEN_KNIGHT"); p.field.push(att, mk("M7"), mk("M12"), mk("M5"), big); o.traps.push({ card: card("STRATAGEM") });
  const tgt = o.field[0].uid; const ohp = o.hp;
  g = attack(g, att.uid, tgt);
  ok(g.players[1].field.length === 6 && g.players[1].hp === ohp, "stratagem: attack negated");
  ok(g.players[0].field.length === 2 && g.players[0].field.some((m) => m.uid === big.uid), "stratagem: 3 destroyed (cost ≤6), cost-7 survives", g.players[0].field.map((m) => m.id)); }
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  for (let i = 0; i < 5; i++) o.field.push(mk("M2"));
  const att = mk("M4"); p.field.push(att, mk("M7")); o.traps.push({ card: card("STRATAGEM") });
  g = attack(g, att.uid, o.field[0].uid);
  ok(g.players[1].traps.length === 1 && g.players[0].field.length === 2, "stratagem: needs 6+ own monsters"); }

// ---- 무법지대 ----
{ let g = fresh(); const p = g.players[0], o = g.players[1];
  const a = mk("M12"), b = mk("M5"); p.field.push(a); o.field.push(b);
  g = play(g, "LAWLESS");
  ok(effDef(g.players[0], g.players[0].field[0]) === 1 && effDef(g.players[1], g.players[1].field[0]) === 1, "lawless: all field HP → 1", [effDef(g.players[0], g.players[0].field[0]), effDef(g.players[1], g.players[1].field[0])]);
  g = play(g, "M5"); const m12 = g.players[0].field.find((m) => m.id === "M5")!; // M5(2/5): 소환 효과 없음 (M12는 v3x 패치로 atkDown 선택이 붙어 pending이 생긴다)
  ok(!!m12 && effDef(g.players[0], m12) === 1 && !g.pending, "lawless: summoned monster HP → 1", m12 && effDef(g.players[0], m12));
  // 상대가 소환해도 1
  g = reduce(g, { type: "endTurn" }).state; g = play(g, "M5"); const m5 = g.players[1].field.find((m) => m.id === "M5" && m.uid !== b.uid)!;
  ok(!!m5 && effDef(g.players[1], m5) === 1, "lawless: opponent's summon HP → 1", [g.cur, g.players[1].field.map((m) => [m.id, effDef(g.players[1], m)]), g.players[1].hand.map((c) => c.id)]); }

// ---- 차원의 균열 ----
{ let g = fresh(); clearHandCulls(g, 0); g = play(g, "RIFT"); const mh = g.players[0].maxHp; g = play(g, "STARTER_TRASH");
  ok(g.players[0].maxHp === mh + 5, "rift: +5 per exiled card", g.players[0].maxHp - mh);
  // 선별자 + 균열: 컬 1장 시전 → 2장 제외 → +10
  addCulls(g, 0, 3, "discard"); g.players[0].field.push(mk("SORTER")); const mh2 = g.players[0].maxHp; g = play(g, "STARTER_TRASH");
  ok(g.players[0].maxHp === mh2 + 10, "rift + sorter: 2 exiled → +10", g.players[0].maxHp - mh2);
  // 상대의 제외는 무관
  g = reduce(g, { type: "endTurn" }).state; const mh3 = g.players[0].maxHp; addCulls(g, 1, 1, "hand"); const p1 = g.players[1]; p1.mana = 5; g = reduce(g, { type: "play", idx: p1.hand.findIndex((c) => c.star === "trash") }).state;
  ok(g.players[0].maxHp === mh3, "rift: opponent exile does not trigger"); }

// ---- self-play ----
let games = 0, errs = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
