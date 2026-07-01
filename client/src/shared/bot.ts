// ============================================================
// LORE — bot AI. Pure: botDecide(state) -> single best Action.
// The controller applies it, then calls again until endTurn.
// Strategy: develop board + buff BEFORE swinging, play removal on
// blockers, respect summon conditions, and push lethal when possible.
// ============================================================
import type { Action, CardInst, FieldMon, GameState, PlayerState } from "./types";
import { buyCost, cardValue, effAtk, effDef, playCost, summonReqMet } from "./engine";

export function botDecide(g: GameState): Action {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  // 0) resolve a pending target/pick automatically
  if (g.pending) return autoTarget(g);

  const noAtk = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
  const oppNoLow = o.enchants.some((e) => e.card.ench === "noSummonLow"); // blocks my cost<=3 summons

  const ready = p.field.filter((m) => !m.exhausted);

  // castable(): reject spells that would be refused before paying (avoids the bot
  // re-picking an uncastable card forever) OR that would be self-defeating.
  const castable = (c: CardInst): boolean => {
    if (c.act === "wipeBack" && p.field.length > 0) return false;
    if (c.id === "S4" && (p.usesTurn?.["S4"] || 0) >= 1) return false;
    if (c.id === "GS9_0" && o.hp <= 21) return false;
    if (c.id === "GS10_0" && p.field.length > 1) return false;
    if (c.id === "RUNE1" && !o.field.some((m) => (m.cost ?? 0) >= 5)) return false;
    if (c.id === "RUNE2" && !p.hand.some((h) => h.id === "RUNE1")) return false;
    if (c.id === "RUNE3" && !(p.hand.some((h) => h.id === "RUNE1") && p.hand.some((h) => h.id === "RUNE2"))) return false;
    if ((c.id === "DISARM1" || c.id === "DISARM2" || c.id === "DISARM3") && o.enchants.length === 0) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "BLOOD1" && p.hp <= 6) return false;
    if (c.id === "BLOOD2" && p.hp <= 10) return false;
    if (c.id === "BLOOD3" && p.hp <= 14) return false;
    if (c.id === "FORBIDDEN" && p.hp <= 22) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c) <= p.mana && castable(x.c));

  const stFull = p.traps.length + p.enchants.length >= 9;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 9 ? [] : p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3) && summonReqMet(p, x.c))
    .sort((a, b) => cardValue(b.c) - cardValue(a.c));

  // 1) LETHAL: if a face swing kills now, take it immediately
  if (!noAtk) {
    const faceNow = ready
      .filter((m) => o.field.length === 0 || m.directOnly)
      .reduce((s, m) => s + effAtk(p, m), 0);
    if (faceNow >= o.hp) {
      const m = ready.find((mm) => o.field.length === 0 || mm.directOnly);
      if (m) return { type: "attack", uid: m.uid };
    }
  }

  // 2) removal on a blocker (clear the way before swinging)
  const removal = spells.find((x) => (x.c.act === "destroyMon" || x.c.act === "weaken") && o.field.length > 0);
  if (removal) return { type: "play", idx: removal.i };

  // 3) develop board — summon the strongest affordable monster
  if (monsters.length) return { type: "play", idx: monsters[0].i };

  // 4) buffs — only when there is a ready attacker to benefit
  const buff = spells.find((x) =>
    (x.c.act === "buffPerm" && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready.length > 0));
  if (buff) return { type: "play", idx: buff.i };

  // 5) attack — assassins go face; otherwise attack when it kills or hits face
  if (!noAtk) {
    const assassin = ready.find((m) => m.directOnly);
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of ready) {
      if (o.field.length === 0) return { type: "attack", uid: m.uid };
      const a = effAtk(p, m);
      if (o.field.some((tm) => a > effDef(o, tm))) return { type: "attack", uid: m.uid };
    }
  }

  // 6) trap-break / wipe / direct damage
  const trapbreak = spells.find((x) => x.c.act === "destroyTrap" && o.traps.length > 0);
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon");
  if (direct) return { type: "play", idx: direct.i };

  // 7) utility spells (draw / ramp / disruption)
  const util = spells.find((x) => ["draw", "seek", "crash", "exile", "recall", "heal", "manaUp", "manaDown", "manaUpGain", "chestToMana"].includes(x.c.act || ""));
  if (util) return { type: "play", idx: util.i };

  // 8) persistent enchant magic (respect the spell/trap zone cap)
  const ench = stFull ? undefined : spells.find((x) => !!x.c.ench);
  if (ench) return { type: "play", idx: ench.i };

  // 9) set a trap (bot keeps a light footprint; also respect the zone cap)
  const trap = p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c) <= p.mana);
  if (trap && p.traps.length < 3 && !stFull) return { type: "play", idx: trap.i };

  // 10) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c) <= p.mana);
  if (attune >= 0) return { type: "play", idx: attune };

  // 11) buy from supply, then common market (value-maximizing affordable, discount-aware)
  let bi = -1, bs = -1;
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana) { const s = cardValue(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = -1;
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana) { const s = cardValue(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

  // 12) spare mana → Pry Chest
  const chest = p.hand.findIndex((c) => c.star === "chest" && playCost(c) <= p.mana);
  if (chest >= 0) return { type: "play", idx: chest };

  // 13) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c) <= p.mana);
  if (cull >= 0) return { type: "play", idx: cull };

  // 14) nothing left
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
      const killable = o.field.filter((tm) => a > effDef(o, tm)).sort((x, y) => effDef(o, x) - effDef(o, y));
      const target = killable[0] ?? lowestDef(o, o.field);
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

function lowestDef(p: PlayerState, field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => effDef(p, a) - effDef(p, b))[0];
}
function bestOf(pool: CardInst[]): CardInst | undefined {
  return [...pool].sort((a, b) => cardValue(b) - cardValue(a))[0];
}
