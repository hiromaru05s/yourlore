// ============================================================
// LORE — value-net feature extractor (shared by training + inference).
// features(g, s) → fixed-length numeric vector describing the position from
// side s's point of view. The value net maps this to P(s eventually wins).
// The SAME function is used to generate self-play training data (Node) and to
// evaluate search leaves in the browser, so training and play stay in sync.
// ============================================================
import type { GameState, PlayerState, Side, CardInst, FieldMon } from "./types";
import { effAtk, effDef, cardValue } from "./engine";

export const NUM_FEATURES = 34;

function roughBuy(c: CardInst): number {
  return c.t === "mon" ? (c.atk || 0) * 2.0 + (c.def || 0) * 1.2 + c.cost * 0.7 : cardValue(c);
}

// bomb-weighted deck quality (only above-baseline cards count)
function deckQ(p: PlayerState): number {
  let t = 0;
  for (const pool of [p.hand, p.deck, p.discard]) for (const c of pool) t += Math.max(0, roughBuy(c) - 8);
  return t;
}

// o's potential face damage next swing into p's board (penetration included)
function threatFace(o: PlayerState, p: PlayerState): number {
  const defs = p.field.map((m) => effDef(p, m)).sort((a, b) => b - a);
  let total = 0;
  for (const m of [...o.field].sort((a, b) => effAtk(o, b) - effAtk(o, a))) {
    const a = effAtk(o, m);
    if (a <= 0) continue;
    if ((m as FieldMon).directOnly || defs.length === 0) { total += a; continue; }
    const k = defs.findIndex((d) => a > d);
    if (k >= 0) { total += a - defs[k]; defs.splice(k, 1); }
  }
  return total;
}

const boardAtk = (x: PlayerState) => x.field.reduce((t, m) => t + effAtk(x, m), 0);
const boardDef = (x: PlayerState) => x.field.reduce((t, m) => t + effDef(x, m), 0);

/** Extract the feature vector for side `s`. Length === NUM_FEATURES. */
export function features(g: GameState, s: Side): number[] {
  const p = g.players[s], o = g.players[1 - s];
  const aP = boardAtk(p), aO = boardAtk(o);
  const dP = boardDef(p), dO = boardDef(o);
  const qP = deckQ(p), qO = deckQ(o);
  const tIn = threatFace(o, p);   // danger to me
  const tOut = threatFace(p, o);  // pressure I apply
  return [
    p.hp / 45, o.hp / 45, (p.hp - o.hp) / 45,
    p.maxMana / 15, o.maxMana / 15, (p.maxMana - o.maxMana) / 15,
    p.mana / 15,
    p.field.length / 9, o.field.length / 9, (p.field.length - o.field.length) / 9,
    aP / 40, aO / 40, (aP - aO) / 40,
    dP / 40, dO / 40, (dP - dO) / 40,
    p.hand.length / 12, o.hand.length / 12,
    p.deck.length / 40, o.deck.length / 40,
    p.discard.length / 40, o.discard.length / 40,
    p.traps.length / 5, o.traps.length / 5,
    p.enchants.length / 5, o.enchants.length / 5,
    tIn / 45, tOut / 45,
    qP / 80, qO / 80, (qP - qO) / 80,
    g.turn / 40,
    g.cur === s ? 1 : 0,
    (p.bleed - o.bleed) / 10,
  ];
}
