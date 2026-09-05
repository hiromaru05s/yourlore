/* eslint-disable */
// v40 rules smoke: HP 40/45 · opening 3 then 1 draw/turn · hand persists (cap 8) · max-mana floor 3 · 어튠 신기(relic) · fixed-market stock 3
import { DB, STARTERS, BALANCE_VERSION, PASSIVES, cardPassives } from "../client/src/shared/cards";
import { createGame, reduce, effMaxMana, MIN_MANA, HAND_MAX, MARKET_STOCK, marketStockOf } from "../client/src/shared/engine";
import { greedyDecide, botDecide } from "../client/src/shared/bot";
import type { GameState, CardInst } from "../client/src/shared/types";
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id] ?? STARTERS[id]) } as CardInst);
const fresh = (seed = 7, starting: 0 | 1 = 0): GameState => createGame({ seed, mode: "bot", starting, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const end = (g: GameState): GameState => reduce(g, { type: "endTurn" }).state;

ok(BALANCE_VERSION === "v41", "version", BALANCE_VERSION); // v41 smoke covers the newer cards; rule expectations below are still v40
// HP
{ const g = fresh(1, 0); ok(g.players[0].hp === 40 && g.players[0].maxHp === 40 && g.players[1].hp === 45 && g.players[1].maxHp === 45, "HP 40/45 (p0 first)", [g.players[0].hp, g.players[1].hp]); }
{ const g = fresh(1, 1); ok(g.players[1].hp === 40 && g.players[0].hp === 45, "HP 40/45 (p1 first)", [g.players[0].hp, g.players[1].hp]); }
// Draw: opening 3 for both, then 1; hand persists
{ let g = fresh(3); ok(g.players[0].hand.length === 3, "p0 opening hand 3", g.players[0].hand.length);
  g = end(g); ok(g.players[1].hand.length === 3, "p1 opening hand 3 (turn 2)", g.players[1].hand.length);
  const h0 = g.players[0].hand.length; g = end(g); // turn 3: p0 draws 1, kept hand
  ok(g.players[0].hand.length === h0 + 1, "p0 turn 3 draws 1 and keeps hand", [h0, g.players[0].hand.length]);
  const h1 = g.players[1].hand.length; g = end(g);
  ok(g.players[1].hand.length === h1 + 1, "p1 turn 4 draws 1 and keeps hand", [h1, g.players[1].hand.length]);
  ok(g.players[0].discard.length === 0 && g.players[1].discard.length === 0, "no end-turn hand discard", [g.players[0].discard.length, g.players[1].discard.length]); }
// Hand cap 8: overflow draw goes to discard
{ let g = fresh(5); const p = g.players[0]; while (p.hand.length < HAND_MAX) p.hand.push(card("GRAPE")); p.deck.push(card("M1"));
  g = end(g); g = end(g); // p0's next turn draws 1 → overflow
  const p2 = g.players[0]; ok(p2.hand.length === HAND_MAX && p2.discard.some((c) => c.id === "M1"), "hand cap 8: overflow to discard", [p2.hand.length, p2.discard.map((c) => c.id)]); }
// Mana floor 3
{ let g = fresh(2); g.players[0].maxMana = 1; g.players[1].maxMana = 0; g = end(g);
  ok(g.players[0].maxMana === MIN_MANA && g.players[1].maxMana === MIN_MANA, "maxMana normalized to floor 3", [g.players[0].maxMana, g.players[1].maxMana]);
  g.players[1].maxMana = 4; g.players[1].manaPenalty = 3; ok(effMaxMana(g.players[1]) === 3, "effMaxMana floor 3 under penalty", effMaxMana(g.players[1])); }
// Relic: attune never stays exiled
ok(PASSIVES.relic && cardPassives(STARTERS.STARTER_MANA).includes("relic"), "STARTER_MANA has relic passive", cardPassives(STARTERS.STARTER_MANA));
{ let g = fresh(4); const p = g.players[0]; const att = card("STARTER_MANA"); (p.removed ??= []).push(att, card("STARTER_TRASH"));
  g = end(g); const p2 = g.players[0];
  ok(!p2.removed!.some((c) => c.id === "STARTER_MANA") && p2.discard.some((c) => c.uid === att.uid) && p2.removed!.some((c) => c.id === "STARTER_TRASH"), "relic swept back to discard, cull stays exiled", [p2.removed!.map((c) => c.id), p2.discard.map((c) => c.id)]); }
{ // via a real exile effect: 용광로(FURNACE) exiles the lowest-cost graveyard card at turn start — attune alone in graveyard must survive
  let g = fresh(6); const p = g.players[0]; p.discard.length = 0; p.discard.push(card("STARTER_MANA")); p.enchants.push({ card: card("FURNACE"), turns: 99 });
  g = end(g); g = end(g); const p2 = g.players[0];
  ok(p2.discard.some((c) => c.id === "STARTER_MANA") && !(p2.removed ?? []).some((c) => c.id === "STARTER_MANA"), "furnace cannot exile attune", [p2.discard.map((c) => c.id), (p2.removed ?? []).map((c) => c.id)]); }
// Market stock: 3 buys → slot replaced by a new distinct card with stock 3
{ let g = fresh(8); ok(g.marketStock?.length === 8 && g.marketStock.every((n) => n === MARKET_STOCK), "market stock init 3×8", g.marketStock);
  const id0 = g.market[0].id; let restock = false;
  for (let k = 0; k < 3; k++) { g.players[g.cur].mana = 30; g.players[g.cur].maxMana = 30; const r = reduce(g, { type: "buyMarket", i: 0 }); g = r.state; if (r.events.some((e) => e.type === "marketRestock")) restock = true; }
  ok(restock && g.market[0].id !== id0 && marketStockOf(g, 0) === MARKET_STOCK && new Set(g.market.map((c) => c.id)).size === 8, "slot 0 restocked with distinct card", [id0, g.market[0].id, g.marketStock]);
  ok(g.players[0].buys[id0] === 3 && g.players[0].discard.filter((c) => c.id === id0).length === 3, "3 copies bought", g.players[0].buys); }
{ // stock 2 after one buy; other slots untouched
  let g = fresh(9); g.players[0].mana = 30; g = reduce(g, { type: "buyMarket", i: 3 }).state; ok(marketStockOf(g, 3) === 2 && marketStockOf(g, 0) === 3, "stock decrements per slot", g.marketStock); }
{ // legacy state without marketStock: buying still works and lazily creates the array
  let g = fresh(10); delete (g as Partial<GameState>).marketStock; g.players[0].mana = 30; g = reduce(g, { type: "buyMarket", i: 2 }).state; ok(g.marketStock?.[2] === 2 && g.marketStock.length === 8, "legacy state compat", g.marketStock); }
// self-play stability
let games = 0, errs = 0, turns = 0;
for (let seed = 1; seed <= 80; seed++) { let g = createGame({ seed, mode: "bot", starting: (seed % 2) as 0 | 1, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state; let steps = 0, last = "", rep = 0;
  try { while (!g.over && steps < 4000) { const a = seed % 3 === 0 ? botDecide(g, "hard") : greedyDecide(g); const k = JSON.stringify(a); if (k === last) rep++; else { rep = 0; last = k; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; } if (!g.over) { errs++; console.log("  ✗ hang", seed, last); } games++; turns += g.turn; } catch (e) { errs++; console.log("  ✗ crash", seed, e); } }
ok(errs === 0, `self-play ${games} clean (avg turns ${(turns / Math.max(1, games)).toFixed(1)})`, errs);
console.log(`\n${pass} pass / ${fail} fail`); if (fail) process.exit(1);
