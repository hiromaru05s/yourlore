// ============================================================
// LORE — bot AI. Pure: botDecide(state) -> single best Action.
// The controller applies it, then calls again until endTurn.
// Faithful port of the original heuristic ordering.
// ============================================================
import type { Action, CardInst, FieldMon, GameState } from "./types";
import { cardValue, effAtk, effDef, playCost } from "./engine";

export function botDecide(g: GameState): Action {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  // 0) resolve a pending target/pick automatically
  if (g.pending) return autoTarget(g);

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  const oppNoLow = o.enchants.some((e) => e.card.ench === "noSummonLow"); // blocks my cost<=3 summons

  // 1) attack — only productive attacks (direct, or a kill)
  if (!noAtk) {
    for (const m of p.field) {
      if (m.exhausted) continue;
      if (o.field.length === 0) return { type: "attack", uid: m.uid };
      const a = effAtk(p, m);
      if (o.field.some((tm) => a > effDef(tm))) return { type: "attack", uid: m.uid };
    }
  }

  // 2) summon strongest affordable monster (respect 봉쇄령)
  const monsters = p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3))
    .sort((a, b) => cardValue(b.c) - cardValue(a.c));
  if (monsters.length) return { type: "play", idx: monsters[0].i };

  // 3) removal / direct-damage / buff / utility spells
  //    Skip spells whose play would be REJECTED before paying (else the bot
  //    keeps reselecting an uncastable card and never ends its turn).
  const castable = (c: CardInst): boolean => {
    if (c.act === "wipeBack" && p.field.length > 0) return false;
    if (c.id === "S4" && (p.usesTurn?.["S4"] || 0) >= 1) return false;
    if (c.id === "GS9_0" && o.hp <= 21) return false;
    if (c.id === "GS10_0" && p.field.length > 1) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c) <= p.mana && castable(x.c));
  const removal = spells.find((x) => (x.c.act === "destroyMon" || x.c.act === "weaken") && o.field.length > 0);
  if (removal) return { type: "play", idx: removal.i };
  const trapbreak = spells.find((x) => x.c.act === "destroyTrap" && o.traps.length > 0);
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon");
  if (direct) return { type: "play", idx: direct.i };
  const ready = p.field.some((m) => !m.exhausted);
  const buff = spells.find((x) =>
    (x.c.act === "buffPerm" && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready)); // temp buffs only with a ready attacker
  if (buff) return { type: "play", idx: buff.i };
  const util = spells.find((x) => ["draw", "seek", "crash", "exile", "recall", "heal", "manaUp", "manaDown", "manaUpGain", "chestToMana"].includes(x.c.act || ""));
  if (util) return { type: "play", idx: util.i };
  const ench = spells.find((x) => !!x.c.ench);
  if (ench) return { type: "play", idx: ench.i };

  // 4) set a trap (max 3 face-down)
  const trap = p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c) <= p.mana);
  if (trap && p.traps.length < 3) return { type: "play", idx: trap.i };

  // 5) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c) <= p.mana);
  if (attune >= 0) return { type: "play", idx: attune };

  // 6) buy from supply, then common market (value-maximizing affordable)
  let bi = -1, bs = -1;
  p.supply.forEach((c, i) => { if (c && c.cost <= p.mana) { const s = cardValue(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = -1;
  g.market.forEach((c, i) => { if (c.cost <= p.mana) { const s = cardValue(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

  // 7) spare mana → Pry Chest
  const chest = p.hand.findIndex((c) => c.star === "chest" && playCost(c) <= p.mana);
  if (chest >= 0) return { type: "play", idx: chest };

  // 8) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c) <= p.mana);
  if (cull >= 0) return { type: "play", idx: cull };

  // 9) nothing left
  return { type: "endTurn" };
}

function autoTarget(g: GameState): Action {
  const pending = g.pending!;
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  if (pending.kind === "oppMon") {
    if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      const killable = o.field.filter((tm) => a > effDef(tm)).sort((x, y) => effDef(x) - effDef(y));
      const target = killable[0] ?? lowestDef(o.field);
      return { type: "chooseTarget", uid: target ? target.uid : null };
    }
    // destroy / debuff → hit the most valuable enemy monster
    const t = [...o.field].sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "myMon") {
    const t = [...p.field].sort((x, y) => effAtk(p, y) - effAtk(p, x))[0];
    return { type: "chooseTarget", uid: t ? t.uid : null };
  }
  if (pending.kind === "seek") {
    const best = bestOf(p.deck);
    return { type: "pick", uid: best ? best.uid : (p.deck[0]?.uid ?? null) };
  }
  if (pending.kind === "recall") {
    const best = bestOf(p.discard);
    return { type: "pick", uid: best ? best.uid : (p.discard[0]?.uid ?? null) };
  }
  return { type: "chooseTarget", uid: null };
}

function lowestDef(field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => effDef(a) - effDef(b))[0];
}
function bestOf(pool: CardInst[]): CardInst | undefined {
  return [...pool].sort((a, b) => cardValue(b) - cardValue(a))[0];
}
