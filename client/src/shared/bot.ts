// ============================================================
// LORE — bot AI. Pure: botDecide(state) -> single best Action.
// The controller applies it, then calls again until endTurn.
// Strategy: break traps first (they punish summons AND attacks),
// develop board + buff BEFORE swinging, spend removal only on real
// threats, count penetration (관통) damage, and push lethal ASAP.
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
    // don't waste heals at (near) full HP
    if (c.act === "heal" && p.maxHp - p.hp < Math.min(c.val || 0, 6)) return false;
    // blood magic hurts the caster — don't suicide
    if (c.id === "BLOOD1" && p.hp <= 6) return false;
    if (c.id === "BLOOD2" && p.hp <= 10) return false;
    if (c.id === "BLOOD3" && p.hp <= 14) return false;
    // forbidden ritual: needs HP to spare AND a non-시초 tribe monster to duplicate
    if (c.id === "FORBIDDEN" && (p.hp <= 17 || !p.field.some((m) => m.tribe && m.tribe !== "시초"))) return false;
    return true;
  };
  const spells = p.hand.map((c, i) => ({ c, i })).filter((x) => x.c.t === "spell" && playCost(x.c) <= p.mana && castable(x.c));

  const stFull = p.traps.length + p.enchants.length >= 9;
  // summonable monsters, best value first (respect the 9-monster zone cap)
  const monsters = p.field.length >= 9 ? [] : p.hand
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.t === "mon" && playCost(x.c) <= p.mana && !(oppNoLow && (x.c.cost ?? 0) <= 3) && summonReqMet(p, x.c))
    .sort((a, b) => cardValue(b.c) - cardValue(a.c));

  // 1) LETHAL: direct spells + attacks (with 관통 penetration) that kill THIS turn.
  //    Cast the guaranteed damage spells first, then swing.
  const plan = facePlan(p, o, ready, spells, noAtk);
  if (plan.total >= o.hp) {
    if (plan.spellIdx !== null) return { type: "play", idx: plan.spellIdx };
    if (plan.attackUid) return { type: "attack", uid: plan.attackUid };
  }

  // 1.5) removal-lethal: if clearing the biggest blocker makes the swing lethal, do it now
  const removal = spells.find((x) => (x.c.act === "destroyMon" || x.c.act === "weaken") && o.field.length > 0);
  if (removal && removal.c.act === "destroyMon" && !noAtk && o.field.length > 0) {
    const big = [...o.field].sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!))[0]; // autoTarget picks this one
    const after = facePlan(p, o, ready, spells.filter((x) => x.i !== removal.i), noAtk, big.uid);
    if (after.total >= o.hp) return { type: "play", idx: removal.i };
  }

  // 2) break traps BEFORE summoning/attacking (pitfall kills summons, counters kill attackers)
  const trapbreak = spells.find((x) => x.c.act === "destroyTrap" && o.traps.length > 0);
  if (trapbreak && (monsters.length > 0 || ready.length > 0)) return { type: "play", idx: trapbreak.i };

  // 3) removal on a blocker (clear the way before swinging)
  if (removal) return { type: "play", idx: removal.i };

  // 4) develop board — summon the strongest affordable monster
  if (monsters.length) return { type: "play", idx: monsters[0].i };

  // 5) buffs — only when there is a ready attacker to benefit
  const buff = spells.find((x) =>
    (x.c.act === "buffPerm" && p.field.length > 0) ||
    ((x.c.act === "buffTurn" || x.c.act === "buffAllTurn") && ready.length > 0));
  if (buff) return { type: "play", idx: buff.i };

  // 6) attack — assassins go face; otherwise attack when it kills (a blocked
  //    swing does nothing, so never chip into a bigger defense)
  if (!noAtk) {
    const assassin = ready.find((m) => m.directOnly);
    if (assassin) return { type: "attack", uid: assassin.uid };
    for (const m of ready) {
      if (o.field.length === 0) return { type: "attack", uid: m.uid };
      const a = effAtk(p, m);
      if (o.field.some((tm) => a > effDef(o, tm))) return { type: "attack", uid: m.uid };
    }
  }

  // 7) trap-break / wipe / direct damage
  if (trapbreak) return { type: "play", idx: trapbreak.i };
  const wipe = spells.find((x) => x.c.act === "wipeBack" && p.field.length === 0 && (o.traps.length + o.enchants.length) > 0);
  if (wipe) return { type: "play", idx: wipe.i };
  const direct = spells.find((x) => x.c.act === "dmg" || x.c.act === "siphon");
  if (direct) return { type: "play", idx: direct.i };

  // 8) utility spells (draw / ramp / disruption)
  const util = spells.find((x) => ["draw", "seek", "crash", "exile", "recall", "heal", "manaUp", "manaDown", "manaUpGain", "chestToMana"].includes(x.c.act || ""));
  if (util) return { type: "play", idx: util.i };

  // 8.5) 금단의 술식 — castable() already checked HP + a tribe monster on field
  const forb = spells.find((x) => x.c.id === "FORBIDDEN");
  if (forb) return { type: "play", idx: forb.i };

  // 9) persistent enchant magic (respect the spell/trap zone cap)
  const ench = stFull ? undefined : spells.find((x) => !!x.c.ench);
  if (ench) return { type: "play", idx: ench.i };

  // 10) set a trap (bot keeps a light footprint; also respect the zone cap)
  const trap = p.hand.map((c, i) => ({ c, i })).find((x) => x.c.t === "trap" && playCost(x.c) <= p.mana);
  if (trap && p.traps.length < 3 && !stFull) return { type: "play", idx: trap.i };

  // 11) Attune (max mana +1) — always good
  const attune = p.hand.findIndex((c) => c.star === "mana" && playCost(c) <= p.mana);
  if (attune >= 0) return { type: "play", idx: attune };

  // 12) buy from supply, then common market — attack-weighted scoring (races are
  //     won with face damage), and once the economy is online (maxMana>=5) stop
  //     buying chaff: weak buys dilute the deck and starve the late game.
  //     Early game also has a floor (11): cheap chaff bought on turns 1-4 is
  //     what clogs the deck at turn 15. Defense weighted 1.2 — walls soak
  //     penetration damage. (A/B: ~66% vs v1 bot, then +4% more in round 2.)
  const buyScore = (c: CardInst): number =>
    c.t === "mon" ? (c.atk || 0) * 2.0 + (c.def || 0) * 1.2 + c.cost * 0.7 : cardValue(c);
  const minBuy = p.maxMana >= 5 ? 13 : 11;
  let bi = -1, bs = minBuy;
  p.supply.forEach((c, i) => { if (c && buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > bs) { bs = s; bi = i; } } });
  if (bi >= 0) return { type: "buySupply", i: bi };
  let mbi = -1, mbs = minBuy;
  g.market.forEach((c, i) => { if (buyCost(p, c) <= p.mana) { const s = buyScore(c); if (s > mbs) { mbs = s; mbi = i; } } });
  if (mbi >= 0) return { type: "buyMarket", i: mbi };

  // 13) spare mana → Pry Chest
  const chest = p.hand.findIndex((c) => c.star === "chest" && playCost(c) <= p.mana);
  if (chest >= 0) return { type: "play", idx: chest };

  // 14) spare mana → Cull (deck thinning)
  const cull = p.hand.findIndex((c) => c.star === "trash" && playCost(c) <= p.mana);
  if (cull >= 0) return { type: "play", idx: cull };

  // 15) nothing left
  return { type: "endTurn" };
}

// ---- lethal planning: max guaranteed face damage this turn.
// Direct-damage spells (sequenced within the mana budget) + a greedy attack
// simulation where each attacker kills the toughest blocker it can (clearing
// the road for smaller attackers) and overkill penetrates to the player.
// `withoutUid` simulates the board after removing one enemy monster (removal spell).
interface FacePlan { total: number; spellIdx: number | null; attackUid: string | null }
function facePlan(p: PlayerState, o: PlayerState, ready: FieldMon[], spells: { c: CardInst; i: number }[], noAtk: boolean, withoutUid?: string): FacePlan {
  let total = 0;
  let spellIdx: number | null = null;
  let manaLeft = p.mana;
  const dmg = spells
    .filter((x) => (x.c.act === "dmg" || x.c.act === "siphon") && (x.c.val || 0) > 0)
    .sort((a, b) => (b.c.val || 0) - (a.c.val || 0));
  for (const s of dmg) {
    const cost = playCost(s.c);
    if (cost <= manaLeft) { manaLeft -= cost; total += s.c.val || 0; if (spellIdx === null) spellIdx = s.i; }
  }
  let attackUid: string | null = null;
  if (!noAtk) {
    const defs = o.field.filter((m) => m.uid !== withoutUid).map((m) => effDef(o, m)).sort((a, b) => b - a); // toughest first
    for (const m of [...ready].sort((a, b) => effAtk(p, b) - effAtk(p, a))) {
      const a = effAtk(p, m);
      if (a <= 0) continue;
      if (m.directOnly || defs.length === 0) { total += a; if (!attackUid) attackUid = m.uid; continue; }
      const k = defs.findIndex((d) => a > d); // toughest blocker this attacker still kills
      if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); if (!attackUid) attackUid = m.uid; }
    }
  }
  return { total, spellIdx, attackUid };
}

function autoTarget(g: GameState): Action {
  const pending = g.pending!;
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];

  if (pending.kind === "oppMon") {
    if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      const a = att ? effAtk(p, att) : 0;
      // among killable targets, take out the biggest THREAT (atk-weighted), not just the softest
      const killable = o.field
        .filter((tm) => a > effDef(o, tm))
        .sort((x, y) => (effAtk(o, y) * 2 + effDef(o, y)) - (effAtk(o, x) * 2 + effDef(o, x)));
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
