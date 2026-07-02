// ============================================================
// LORE — pure game engine. No DOM, no timers, no Math.random.
// reduce(state, action) -> { state, events }  (input never mutated)
// Effects are generalized: a card carries an effect KEY + numeric
// val/val2, and the engine applies it. This lets the card set grow
// (cost 1–12) without new engine code per card.
// Log lines + target hints are emitted in BOTH Korean and Japanese;
// the client renders whichever matches the player's chosen language
// (so two online players can each read the log in their own language).
// Card NAMES in the log are clickable spans keyed by card id; the UI
// localizes the displayed name, so cn() is reused in both languages.
// ============================================================
import type {
  Action, CardInst, FieldMon, GameEvent, GameState, PlayerState, ReduceResult, Side, TrapSet,
} from "./types";
import { ALL_IDS, DB, STARTERS, STARTER_DECK, TRIBES } from "./cards";

// ---------- deterministic PRNG (mulberry32) ----------
function rand(g: GameState): number {
  let t = (g.rng += 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(g: GameState, n: number): number {
  return Math.floor(rand(g) * n);
}
function shuffle<T>(g: GameState, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(g, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- instance helpers ----------
function newUID(g: GameState): string { return "u" + ++g.uidSeq; }
function inst(g: GameState, id: string): CardInst { return { uid: newUID(g), ...structuredClone(DB[id]) }; }
function starter(g: GameState, key: string): CardInst { return { uid: newUID(g), ...structuredClone(STARTERS[key]) }; }
// clickable card name for the battle log (UI zooms the card on click + localizes the name by id)
function cn(c: { id: string; name: string }): string { return `<b class="log-card" data-card="${c.id}">${c.name}</b>`; }
function tribeName(tribe: string, lang: "ko" | "ja"): string { return TRIBES[tribe]?.[lang]?.name ?? tribe; }

// ---------- pure read helpers (exported; used by UI + bot) ----------
export function effMaxMana(p: PlayerState): number {
  const aura = p.field.filter((m) => m.aura === "mana1").length; // Mana Golem etc.
  // 다양한 문화: while active, +1 max mana per non-시초 tribe monster you control
  const culture = p.enchants.some((e) => e.card.ench === "cultureMana")
    ? p.field.filter((m) => m.tribe && m.tribe !== "시초").length : 0;
  return Math.max(1, p.maxMana + aura + culture - p.manaPenalty);
}
export function effAtk(p: PlayerState, m: FieldMon): number {
  let a = m.atk! + (m.tempAtk || 0) + (m.atkMod || 0);
  if (m.condAtk === "twoPlus" && p.field.length >= 2) a += 2;
  return Math.max(0, a);
}
export function effDef(p: PlayerState, m: FieldMon): number {
  // 은빛 성벽(wallDef): +val to every friendly monster's defense while on field
  const wall = p.field.filter((x) => x.aura === "wallDef").reduce((s, x) => s + (x.val || 3), 0);
  return Math.max(0, m.def! + (m.defMod || 0) + wall);
}
/** Cost to BUY a card, after 동족의 부름(kinDiscount): tribe cards cost -2 (min 1) while you control a tribe monster. */
export function buyCost(p: PlayerState, c: CardInst): number {
  let cost = c.cost;
  if (c.tribe && p.field.some((m) => !!m.tribe) && p.enchants.some((e) => e.card.ench === "kinDiscount")) {
    cost = Math.max(1, cost - 2);
  }
  return cost;
}
/** 제시(supply) shows cards whose cost is in [1, maxMana]. */
export function supplyRange(p: PlayerState): [number, number] {
  return [1, effMaxMana(p)];
}
/** Cost to PLAY a card from hand (may be < its buy cost). */
export function playCost(c: CardInst): number {
  return c.play ?? c.cost;
}
export function cardValue(c: CardInst): number {
  // offense-weighted + cost factor so the bot favors bigger threats
  if (c.t === "mon") return (c.atk || 0) * 1.3 + (c.def || 0) * 0.8 + c.cost * 0.7;
  if (c.t === "spell") return 6 + (c.val || 0) * 0.6 + c.cost * 0.6;
  if (c.t === "trap") return 6 + (c.val || 0) * 0.5 + c.cost * 0.5;
  return 1;
}

// ---------- player / game construction ----------
function mkPlayer(g: GameState, id: string, name: string, isBot: boolean): PlayerState {
  const deck = STARTER_DECK.map((k) => starter(g, k));
  shuffle(g, deck);
  return {
    id, name, isBot,
    hp: 30, maxHp: 30, mana: 4, maxMana: 4,
    manaPenalty: 0, nextPenalty: 0,
    deck, hand: [], discard: [], exile: [],
    field: [], traps: [], supply: [],
    boughtCount: 0, taxFlag: false,
    enchants: [], tribesFired: [], bonusDrawPerm: 0, bleed: 0,
    uses: {}, usesTurn: {}, supplyShrink: 0, defendHeal: 0, manaGainNext: 0, skipNext: false,
  };
}

export interface CreateOpts {
  seed?: number;
  mode: "bot" | "online";
  p0: { id: string; name: string; isBot?: boolean };
  p1: { id: string; name: string; isBot?: boolean };
  starting?: Side;
}

export function createGame(opts: CreateOpts): ReduceResult {
  const g: GameState = {
    players: [null as never, null as never],
    cur: opts.starting ?? 0,
    turn: 1, phase: "main", pending: null, over: false, winner: null,
    market: [], dmgTally: [0, 0],
    rng: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0,
    uidSeq: 0, mode: opts.mode,
  };
  g.players[0] = mkPlayer(g, opts.p0.id, opts.p0.name, !!opts.p0.isBot);
  g.players[1] = mkPlayer(g, opts.p1.id, opts.p1.name, !!opts.p1.isBot);
  // starting player 35 HP, the player going second 45 HP (tempo compensation)
  const start = (opts.starting ?? 0) as Side;
  const second = (1 - start) as Side;
  g.players[start].hp = 35; g.players[start].maxHp = 35;
  g.players[second].hp = 45; g.players[second].maxHp = 45;
  // STANDARD market: 8 DISTINCT random cards of cost 1–4 (mixed types)
  const lowAvail = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= 4);
  g.market = [];
  while (g.market.length < 10 && lowAvail.length) g.market.push(inst(g, lowAvail.splice(randInt(g, lowAvail.length), 1)[0]));

  const ev: GameEvent[] = [];
  const ctx = makeCtx(g, ev);
  g.players.forEach((p) => rollSupply(g, p));
  ctx.drawN(g.players[g.cur], 3);
  ctx.log(
    '<span class="t">게임 시작.</span> 초기 덱 · 3장 드로우 · 마나 4.',
    '<span class="t">ゲーム開始。</span> 初期デッキ · 3枚ドロー · マナ4。',
  );
  beginTurn(g, ctx, true);
  return { state: g, events: ev };
}

function rollSupply(g: GameState, p: PlayerState): void {
  const hi = effMaxMana(p);
  const pool = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= hi && DB[id].cost > 0);
  const avail = pool.slice();
  const want = p.supplyShrink > 0 ? 2 : 3; // 마켓 크래시: shrink the opponent's next 제시 to 2
  if (p.supplyShrink > 0) p.supplyShrink--;
  const picks: (CardInst | null)[] = [];
  while (picks.length < want && avail.length) picks.push(inst(g, avail.splice(randInt(g, avail.length), 1)[0])); // distinct
  while (picks.length < want) picks.push(pool.length ? inst(g, pool[randInt(g, pool.length)]) : null);
  while (picks.length < 3) picks.push(null); // keep 3 slots; shrunk rolls leave an empty slot
  p.supply = picks;
}

// ============================================================
// mutation context
// ============================================================
interface Ctx {
  ev: GameEvent[];
  log(ko: string, ja?: string): void;
  drawN(p: PlayerState, n: number): number;
  heal(p: PlayerState, amt: number): void;
  dealDamage(target: PlayerState, amt: number, srcKo: string, srcJa?: string): void;
  destroyMonster(owner: PlayerState, m: FieldMon): void;
}
function side(g: GameState, p: PlayerState): Side { return (g.players[0] === p ? 0 : 1) as Side; }
function makeCtx(g: GameState, ev: GameEvent[]): Ctx {
  const log = (ko: string, ja?: string) => ev.push({ type: "log", html: ko, htmlJa: ja ?? ko });
  const drawN = (p: PlayerState, n: number): number => {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) { if (!p.discard.length) break; p.deck = shuffle(g, p.discard.splice(0)); }
      const c = p.deck.pop();
      if (c) { p.hand.push(c); drawn++; }
    }
    if (drawn > 0) ev.push({ type: "draw", player: side(g, p), count: drawn });
    return drawn;
  };
  const heal = (p: PlayerState, amt: number): void => {
    if (amt <= 0) return;
    p.hp = Math.min(p.maxHp, p.hp + amt);
    ev.push({ type: "heal", player: side(g, p), amount: amt });
  };
  const dealDamage = (target: PlayerState, amt: number, srcKo: string, srcJa?: string): void => {
    if (amt <= 0) return;
    // 살생의 극의(slayArt): +2 to every hit dealt to a player, per active copy (either side)
    const slay = g.players.reduce((s, pl) => s + pl.enchants.filter((e) => e.card.ench === "slayArt").length, 0);
    if (slay > 0) amt += 2 * slay;
    target.hp -= amt;
    const dealer: Side = (target === g.players[0] ? 1 : 0);
    g.dmgTally[dealer] += amt;
    const hp = Math.max(0, target.hp);
    log(
      `  └ <span class="dmg">${amt} 데미지</span> → ${target.name} (체력 ${hp}) <span class="muted">[${srcKo}]</span>`,
      `  └ <span class="dmg">${amt} ダメージ</span> → ${target.name} (体力 ${hp}) <span class="muted">[${srcJa ?? srcKo}]</span>`,
    );
    ev.push({ type: "damage", player: side(g, target), amount: amt });
    if (target.hp <= 0) handleDefeat(g, ctx, target, dealer);
  };
  const destroyMonster = (owner: PlayerState, m: FieldMon): void => {
    const i = owner.field.findIndex((x) => x.uid === m.uid);
    if (i >= 0) {
      const dead = owner.field.splice(i, 1)[0];
      // 폭풍의 광전사(drainMana): restore the opponent's max mana it was draining
      if (dead.aura === "drainMana") { const opp2 = g.players[0] === owner ? g.players[1] : g.players[0]; opp2.maxMana += (dead.val || 3); }
      if (dead.id !== "MIMIC") owner.discard.push(inst(g, dead.id)); // Mimic token is exiled
      ev.push({ type: "destroy", player: side(g, owner), uid: m.uid });
    }
  };
  const ctx: Ctx = { ev, log, drawN, heal, dealDamage, destroyMonster };
  return ctx;
}

// ============================================================
// turn flow
// ============================================================
function beginTurn(g: GameState, ctx: Ctx, first: boolean): void {
  const p = g.players[g.cur];
  if (!first && p.skipNext) { // 시공간 조작: skip this player's turn
    p.skipNext = false;
    ctx.log(`<span class="dmg">${p.name} 턴 스킵!</span>`, `<span class="dmg">${p.name} ターンスキップ!</span>`);
    endTurn(g, ctx);
    return;
  }
  if (p.manaGainNext) { p.maxMana += p.manaGainNext; p.manaGainNext = 0; } // E3 delayed mana
  p.usesTurn = {};
  p.manaPenalty = p.nextPenalty || 0; p.nextPenalty = 0;
  p.mana = effMaxMana(p);
  tickExile(ctx, p);
  if (!first) {
    rollSupply(g, p);
    const enchDraw = p.enchants.filter((e) => e.card.ench === "bonusDraw").reduce((s, e) => s + (e.card.val2 || 0), 0);
    ctx.drawN(p, 3 + p.bonusDrawPerm + enchDraw);
  }
  tickEnchants(g, ctx, p);
  if (!g.over) tickBleed(ctx, p);
  if (!g.over) tickTurnFx(g, ctx, p);
  g.phase = "main";
  ctx.ev.push({ type: "turnHeader", turn: g.turn, name: p.name, isBot: p.isBot });
}

/** Persistent bleed: damage at the start of this player's turn (GM8_3). */
function tickBleed(ctx: Ctx, p: PlayerState): void {
  if (p.bleed > 0) ctx.dealDamage(p, p.bleed, "출혈", "出血");
}

/** Per-turn field-monster effects (growth / burn / heal / ramp), on the owner's turn. */
function tickTurnFx(g: GameState, ctx: Ctx, p: PlayerState): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  for (const m of [...p.field]) {
    if (g.over) return;
    const v = m.val || 0, v2 = m.val2 || 0;
    switch (m.turnFx) {
      case "growAtk": m.atkMod = (m.atkMod || 0) + v; ctx.log(`  └ ${cn(m)} 공격 +${v}(영구)`, `  └ ${cn(m)} 攻撃+${v}(永続)`); break;
      case "growDef": m.defMod = (m.defMod || 0) + v; ctx.log(`  └ ${cn(m)} 방어 +${v}(영구)`, `  └ ${cn(m)} 防御+${v}(永続)`); break;
      case "turnBurn": ctx.log(`<span class="t">${cn(m)}</span> 매 턴 효과`, `<span class="t">${cn(m)}</span> 毎ターン効果`); ctx.dealDamage(o, v, cn(m), cn(m)); break;
      case "turnHeal": ctx.heal(p, v); ctx.log(`  └ ${cn(m)} 체력 +${v} 회복`, `  └ ${cn(m)} 体力+${v}回復`); break;
      case "payDefHeal":
        if (p.mana >= 1) { p.mana -= 1; m.defMod = (m.defMod || 0) + v; ctx.heal(p, v2); ctx.log(`  └ ${cn(m)} 마나1 → 방어 +${v}, 체력 +${v2}`, `  └ ${cn(m)} マナ1 → 防御+${v}, 体力+${v2}`); }
        break;
      case "chestDraw": {
        const ci = p.hand.findIndex((c) => c.star === "chest");
        if (ci >= 0) { const ch = p.hand.splice(ci, 1)[0]; p.discard.push(ch); const n = ctx.drawN(p, v2 || 4); ctx.log(`  └ ${cn(m)} 보물상자 → 묘지, ${n}장 드로우`, `  └ ${cn(m)} 宝箱 → 墓地, ${n}枚ドロー`); }
        break;
      }
    }
  }
}

/** Persistent-spell upkeep. noAttack ticks every turn; owner-scoped enchants tick on the owner's turn. */
function tickEnchants(g: GameState, ctx: Ctx, cur: PlayerState): void {
  for (const pl of g.players) {
    const opp = g.players[0] === pl ? g.players[1] : g.players[0];
    pl.enchants = pl.enchants.filter((e) => {
      const ownerTurn = pl === cur;
      const everyTurn = e.card.ench === "noAttack";
      // 지옥: each owner turn, self 6 / opp 5
      if (e.card.ench === "inferno" && ownerTurn && !g.over) {
        ctx.log(`<span class="t">${cn(e.card)}</span> 지옥: 자신 6 / 상대 5`, `<span class="t">${cn(e.card)}</span> 地獄: 自分6 / 相手5`);
        ctx.dealDamage(pl, 6, cn(e.card), cn(e.card));
        if (!g.over) ctx.dealDamage(opp, 5, cn(e.card), cn(e.card));
      }
      if (everyTurn || ownerTurn) {
        e.turns--;
        if (e.turns <= 0) {
          pl.discard.push(e.card);
          if (e.card.ench === "bonusDraw") pl.manaGainNext += 1; // E3: +1 max mana the turn after it ends
          ctx.log(`  └ ${cn(e.card)} 효과 종료`, `  └ ${cn(e.card)} 効果終了`);
          return false;
        }
      }
      return true;
    });
  }
}
function noAttackActive(g: GameState): boolean {
  return g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "noAttack"));
}
function summonBlockedLow(g: GameState, summoner: PlayerState, card: CardInst): boolean {
  if ((card.cost ?? 0) > 3) return false;
  const opp = g.players[0] === summoner ? g.players[1] : g.players[0];
  return opp.enchants.some((e) => e.card.ench === "noSummonLow");
}
function tickExile(ctx: Ctx, p: PlayerState): void {
  const back: CardInst[] = [];
  p.exile = p.exile.filter((e) => { e.turns--; if (e.turns <= 0) { back.push(e.card); return false; } return true; });
  back.forEach((c) => p.hand.push(c));
  if (back.length) ctx.log(`  └ 제외했던 ${back.length}장이 패로 복귀`, `  └ 除外していた${back.length}枚が手札に戻る`);
}
function endTurn(g: GameState, ctx: Ctx): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  // GM6_2: discarding cost-3+ cards at end of turn breaks enemy traps (1 each)
  if (p.field.some((m) => m.aura === "discardBreak")) {
    let broke = 0;
    const dump = p.hand.filter((c) => (c.cost ?? 0) >= 3).length;
    for (let i = 0; i < dump && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); broke++; }
    if (broke) ctx.log(`<span class="t">${p.name}</span> 고코스트 폐기 → 상대 함정 ${broke}장 파괴`, `<span class="t">${p.name}</span> 高コスト破棄 → 相手の罠${broke}枚を破壊`);
  }
  while (p.hand.length) p.discard.push(p.hand.pop()!);
  p.field.forEach((m) => { m.exhausted = false; m.tempAtk = 0; m.attacksUsed = 0; });
  g.turn++; g.cur = (1 - g.cur) as Side;
  beginTurn(g, ctx, false);
}

// ============================================================
// defeat / win
// ============================================================
function handleDefeat(g: GameState, ctx: Ctx, loser: PlayerState, _finisher: Side): void {
  if (g.over) return;
  const loserIdx = g.players.indexOf(loser) as Side;
  const winner = (1 - loserIdx) as Side;
  g.over = true; g.phase = "over"; g.winner = winner;
  ctx.ev.push({ type: "win", winner });
}

// ============================================================
// combat + trap reactions
// ============================================================
function takeTrap(g: GameState, ctx: Ctx, o: PlayerState, react: string): TrapSet["card"] | null {
  const i = o.traps.findIndex((t) => t.card.react === react);
  if (i < 0) return null;
  const t = o.traps.splice(i, 1)[0];
  o.discard.push(t.card);
  ctx.ev.push({ type: "trapReveal", player: side(g, o), id: t.card.id }); // flip → reveal → discard (UI)
  return t.card;
}

function resolveAttackCore(g: GameState, ctx: Ctx, att: FieldMon, targetUid: string | null): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  let atk = effAtk(p, att);
  let tc: CardInst | null;

  if (o.defendHeal > 0) ctx.heal(o, o.defendHeal); // GS7_2: heal the defender each time they're attacked

  // ---- terminal reactions ----
  if ((tc = takeTrap(g, ctx, o, "judgment"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 상대에게 ${tc.val}`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 相手に ${tc.val}`,
    );
    ctx.destroyMonster(p, att); ctx.dealDamage(p, tc.val || 0, cn(tc), cn(tc)); return;
  }
  if ((tc = takeTrap(g, ctx, o, "devour"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 체력 ${tc.val} 회복`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 体力 ${tc.val} 回復`,
    );
    ctx.destroyMonster(p, att); ctx.heal(o, tc.val || 0); return;
  }
  if ((tc = takeTrap(g, ctx, o, "counter"))) {
    const refl = Math.floor(atk / 2);
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + ${refl} 반사`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + ${refl} 反射`,
    );
    ctx.dealDamage(p, refl, cn(tc), cn(tc));
    if (!g.over) ctx.destroyMonster(p, att);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "bulwark"))) {
    att.defMod = (att.defMod || 0) - (tc.val || 0); att.exhausted = true;
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} 방어 -${tc.val}`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} 防御 -${tc.val}`,
    );
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "fullguard"))) {
    att.exhausted = true;
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효화`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効化`,
    );
    if (tc.val) ctx.dealDamage(p, tc.val, cn(tc), cn(tc));
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "wardheal"))) { // T9: negate + heal (+ optional draw)
    att.exhausted = true; ctx.heal(o, tc.val || 0); ctx.drawN(o, tc.val2 || 0);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 체력 ${tc.val} 회복${tc.val2 ? ` + ${tc.val2}장 드로우` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 体力${tc.val}回復${tc.val2 ? ` + ${tc.val2}枚ドロー` : ""}`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "counterFull"))) { // T4: destroy attacker + reflect its full atk to its owner
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + ${atk} 반사`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + ${atk} 反射`);
    ctx.destroyMonster(p, att); ctx.dealDamage(p, atk, cn(tc), cn(tc)); return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardbuff"))) { // T12 / GT8_0: negate + own field def buff (+ optional draw)
    att.exhausted = true; const tv = tc.val || 0;
    o.field.forEach((mm) => (mm.defMod = (mm.defMod || 0) + tv));
    if (tc.val2) ctx.drawN(o, tc.val2);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 자신 몬스터 전체 방어 +${tv}${tc.val2 ? ` + ${tc.val2}장 드로우` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 自分のモンスター全体の防御+${tv}${tc.val2 ? ` + ${tc.val2}枚ドロー` : ""}`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guarddraw"))) { // GT5_1 / GT6_1: negate + draw
    att.exhausted = true; const n = ctx.drawN(o, tc.val || 0);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${n}장 드로우`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${n}枚ドロー`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardBreakDraw"))) { // GT5_0: negate + break one attacker trap + draw 1
    att.exhausted = true; let broke = 0;
    if (p.traps.length) { const t2 = p.traps.splice(randInt(g, p.traps.length), 1)[0]; p.discard.push(t2.card); broke = 1; }
    ctx.drawN(o, 1);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 공격측 함정 ${broke}장 파괴 + 1장 드로우`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 攻撃側の罠${broke}枚破壊 + 1枚ドロー`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardMana"))) { // GT8_3: negate + max mana +val
    att.exhausted = true; const gm = tc.val || 1; o.maxMana += gm;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 최대 마나 +${gm}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 最大マナ+${gm}`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardEnemyDef"))) { // GT8_1: negate + all attacker-side def down
    att.exhausted = true; const tv = tc.val || 0; p.field.forEach((mm) => (mm.defMod = (mm.defMod || 0) - tv));
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 상대 몬스터 전체 방어 -${tv}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 敵モンスター全体の防御-${tv}`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardWipe"))) { // GT8_2: negate + destroy attacker traps/enchants
    att.exhausted = true; let k = 0; const lim = tc.val || 2;
    for (let i = 0; i < lim && p.traps.length; i++) { const t2 = p.traps.splice(randInt(g, p.traps.length), 1)[0]; p.discard.push(t2.card); k++; }
    for (let i = k; i < lim && p.enchants.length; i++) { const e2 = p.enchants.splice(randInt(g, p.enchants.length), 1)[0]; p.discard.push(e2.card); k++; }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 상대 함정·마법 ${k}장 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 相手の罠・魔法${k}枚破壊`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardPurge"))) { // GT6_0: negate + (-1 max mana) destroy up to 3 attacker monsters
    att.exhausted = true;
    if (p.field.length > 0) {
      o.maxMana = Math.max(1, o.maxMana - 1);
      let k = 0; const lim = tc.val || 3;
      for (const tm of [...p.field].sort((a2, b2) => (effAtk(p, b2) + b2.def!) - (effAtk(p, a2) + a2.def!))) { if (k >= lim) break; ctx.destroyMonster(p, tm); k++; }
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 최대 마나 -1, 상대 몬스터 ${k}체 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 最大マナ-1, 敵モンスター${k}体破壊`);
    } else ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slaughterHeal"))) { // GT5_2: destroy attacker + 30% heal its def
    const d = effDef(p, att);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊`);
    ctx.destroyMonster(p, att);
    if (randInt(g, 100) < 30) { ctx.heal(o, d); ctx.log(`  └ 30% 성공: 체력 ${d} 회복`, `  └ 30%成功: 体力${d}回復`); }
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slaughterRaise"))) { // GT5_3: destroy attacker + val% steal to own field
    if (randInt(g, 100) < (tc.val || 30)) {
      const i2 = p.field.findIndex((x) => x.uid === att.uid);
      if (i2 >= 0) { const stolen = p.field.splice(i2, 1)[0]; ctx.ev.push({ type: "destroy", player: side(g, p), uid: stolen.uid }); stolen.exhausted = true; stolen.attacksUsed = 0; o.field.push(stolen); ctx.ev.push({ type: "summon", player: side(g, o), uid: stolen.uid }); }
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 탈취(소생)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 奪取(蘇生)`);
    } else {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴(소생 실패)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊(蘇生失敗)`);
      ctx.destroyMonster(p, att);
    }
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slayWeakAll"))) { // GT6_2: destroy attacker + all attacker-side atk down this turn
    const tv = tc.val || 0;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 상대 전체 공격 -${tv}(이번 턴)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 敵全体の攻撃-${tv}(このターン)`);
    ctx.destroyMonster(p, att);
    p.field.forEach((mm) => (mm.tempAtk = (mm.tempAtk || 0) - tv));
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slayLowAll"))) { // GT6_3: destroy attacker + destroy all low-atk attacker monsters
    const tv = tc.val || 0;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 공격 ${tv} 이하 상대 몬스터 전멸`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 攻撃${tv}以下の敵モンスター全滅`);
    ctx.destroyMonster(p, att);
    for (const tm of [...p.field]) if (effAtk(p, tm) <= tv) ctx.destroyMonster(p, tm);
    return;
  }

  // ---- non-terminal reactions (attack still resolves) ----
  if ((tc = takeTrap(g, ctx, o, "spikes"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격측에 ${tc.val}`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃側に ${tc.val}`,
    );
    ctx.dealDamage(p, tc.val || 0, cn(tc), cn(tc));
    if (g.over) { att.exhausted = true; return; }
  }
  if ((tc = takeTrap(g, ctx, o, "drawtrap"))) {
    const n = ctx.drawN(o, tc.val || 0);
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${n}장 드로우`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${n}枚ドロー`,
    );
  }
  if ((tc = takeTrap(g, ctx, o, "thorns"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${tc.val} 반사`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${tc.val} 反射`,
    );
    ctx.dealDamage(p, tc.val || 0, cn(tc), cn(tc));
    if (g.over) { att.exhausted = true; return; }
  }
  if ((tc = takeTrap(g, ctx, o, "reflect"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${atk} 반사`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${atk} 反射`,
    );
    ctx.dealDamage(p, atk, cn(tc), cn(tc));
    if (g.over) { att.exhausted = true; return; }
  }
  if ((tc = takeTrap(g, ctx, o, "half"))) {
    atk = Math.floor(atk / 2);
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격이 ${atk}로 절반`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃が ${atk} に半減`,
    );
    if (tc.val) { ctx.dealDamage(p, tc.val, cn(tc), cn(tc)); if (g.over) { att.exhausted = true; return; } }
  }

  // ---- damage ----
  let faceDmg = false; // did this attack land damage on the opponent PLAYER?
  if (targetUid === null) {
    faceDmg = atk > 0;
    ctx.dealDamage(o, atk, `${cn(att)} 의 직접 공격`, `${cn(att)} の直接攻撃`);
  } else {
    const target = o.field.find((m) => m.uid === targetUid);
    if (target) {
      const d = effDef(o, target);
      ctx.ev.push({ type: "hit", uid: target.uid });
      if (atk > d) {
        const over = atk - d;
        ctx.log(
          `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)}(방${d}) 파괴 + <span class="dmg">${over} 관통</span>`,
          `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)}(防${d}) 破壊 + <span class="dmg">${over} 貫通</span>`,
        );
        ctx.destroyMonster(o, target);
        if (over > 0) { faceDmg = true; ctx.dealDamage(o, over, "관통", "貫通"); }
      } else {
        ctx.log(
          `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)}(방${d}) <span class="muted">통하지 않음</span>`,
          `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)}(防${d}) <span class="muted">通らない</span>`,
        );
      }
    }
  }
  // per-attack effect (e.g. GM8_0: lose attack permanently) + multi-attack accounting
  if (att.attackFx === "atkDownOnAttack") { att.atkMod = (att.atkMod || 0) - (att.val || 0); ctx.log(`  └ ${cn(att)} 공격 -${att.val}(영구)`, `  └ ${cn(att)} 攻撃-${att.val}(永続)`); }
  // 흑요석 광전사(rampFace): +2/+2 permanently each time it damages the opponent player
  if (att.attackFx === "rampFace" && faceDmg && !g.over) { att.atkMod = (att.atkMod || 0) + 2; att.defMod = (att.defMod || 0) + 2; ctx.log(`  └ ${cn(att)} +2/+2(영구)`, `  └ ${cn(att)} +2/+2(永続)`); }
  att.attacksUsed = (att.attacksUsed || 0) + 1;
  if (att.attacksUsed >= (att.mult || 1)) att.exhausted = true;
}

// ============================================================
// summon effects (generalized)
// ============================================================
function resolveOnSummon(g: GameState, ctx: Ctx, m: FieldMon): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = m.val || 0, v2 = m.val2 || 0;
  switch (m.onSummon) {
    case "draw": { const n = ctx.drawN(p, v); ctx.log(`  └ 소환 효과: ${n}장 드로우`, `  └ 召喚効果: ${n}枚ドロー`); break; }
    case "burn": ctx.dealDamage(o, v, `${cn(m)} 소환`, `${cn(m)} 召喚`); break;
    case "heal": ctx.heal(p, v); ctx.log(`  └ 체력 ${v} 회복 (${p.hp})`, `  └ 体力 ${v} 回復 (${p.hp})`); break;
    case "defDown":
      if (o.field.length) {
        g.pending = { kind: "oppMon", hint: `방어 -${v} 할 적 몬스터 선택`, hintJa: `防御 -${v} する敵モンスターを選択`, reason: "defDown", allowCancel: false, data: { val: v } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    case "refresh": rollSupply(g, p); ctx.log("  └ 제시를 무료 갱신", "  └ 提示を無料更新"); break;
    case "breaktrap":
      if (o.traps.length) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); ctx.log("  └ 상대의 세트 함정 1장 파괴", "  └ 相手のセットトラップを1枚破壊"); }
      else ctx.log("  └ 파괴할 함정 없음", "  └ 破壊するトラップなし");
      break;
    case "allEnemyAtkDown": // (구 M12 — 현재 미사용)
      o.field.forEach((tm) => (tm.atkMod = (tm.atkMod || 0) - v));
      ctx.log(`  └ 상대 몬스터 전체 공격 -${v}(영구)`, `  └ 敵モンスター全体の攻撃-${v}(永続)`);
      break;
    case "atkDown": // M12 타이탄 게이트: 적 1체 공격 -v (영구)
      if (o.field.length) {
        g.pending = { kind: "oppMon", hint: `공격 -${v} 할 적 몬스터 선택`, hintJa: `攻撃 -${v} する敵モンスターを選択`, reason: "atkDown", allowCancel: false, data: { val: v } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    case "maxHpMana": // GM7_2
      p.maxHp += v; p.hp += v; p.maxMana += v2;
      ctx.ev.push({ type: "heal", player: side(g, p), amount: v });
      ctx.log(`  └ 최대 체력 +${v}, 최대 마나 +${v2}`, `  └ 最大体力+${v}, 最大マナ+${v2}`);
      break;
    case "summonKnight": // GM6_7
      if (p.mana >= 3) { p.mana -= 3; spawnToken(g, ctx, p, "INFKNIGHT"); ctx.log("  └ 마나3 지불 → 무한의 기사(4/4) 소환", "  └ マナ3支払い → 無限の騎士(4/4)召喚"); }
      else ctx.log("  └ 마나가 부족해 기사를 소환하지 못함", "  └ マナ不足で騎士を召喚できない");
      break;
    case "breaktrapDraw": // GM6_8
      if (o.traps.length) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); const n = ctx.drawN(p, v); ctx.log(`  └ 상대 함정 1장 파괴 + ${n}장 드로우`, `  └ 相手の罠1枚破壊 + ${n}枚ドロー`); }
      else ctx.log("  └ 파괴할 함정 없음", "  └ 破壊するトラップなし");
      break;
    case "parity": // GM8_5
      if (o.hp % 2 === 1) { ctx.log("  └ 상대 체력 홀수 → 5 데미지", "  └ 相手の体力が奇数 → 5ダメージ"); ctx.dealDamage(o, 5, cn(m), cn(m)); }
      else { const n = ctx.drawN(p, 4); ctx.log(`  └ 상대 체력 짝수 → ${n}장 드로우`, `  └ 相手の体力が偶数 → ${n}枚ドロー`); }
      break;
    case "smite": // GM9_0
      for (const tm of [...o.field]) if (effAtk(o, tm) <= v) ctx.destroyMonster(o, tm);
      ctx.log(`  └ 공격 ${v} 이하 상대 몬스터 전멸`, `  └ 攻撃${v}以下の敵モンスターを全滅`);
      break;
    case "summonRandom": { // GM10_2
      const mons = p.deck.filter((c) => c.t === "mon");
      if (mons.length) { const pick = mons[randInt(g, mons.length)]; const di = p.deck.findIndex((c) => c.uid === pick.uid); p.deck.splice(di, 1); spawnToken(g, ctx, p, pick.id); ctx.log(`  └ 덱에서 ${cn(pick)} 무료 소환`, `  └ デッキから ${cn(pick)} を無料召喚`); }
      else ctx.log("  └ 덱에 몬스터 없음", "  └ デッキにモンスターなし");
      break;
    }
    case "burnBreak2": // GM10_3
      ctx.dealDamage(o, v, cn(m), cn(m));
      if (!g.over) { let k = 0; for (let i = 0; i < 2 && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); k++; } if (k) ctx.log(`  └ 상대 함정 ${k}장 파괴`, `  └ 相手の罠${k}枚破壊`); }
      break;
    case "burnBleed": // GM8_3
      ctx.dealDamage(o, v, cn(m), cn(m));
      if (o.bleed < 1) { o.bleed = 1; ctx.log("  └ 상대는 이후 매 턴 1 데미지(중첩 불가)", "  └ 相手は以降毎ターン1ダメージ(重複不可)"); }
      break;
    case "drakeRamp": // GM9_3
      ctx.dealDamage(o, v, cn(m), cn(m));
      if (!g.over) { p.maxMana += 1; ctx.log("  └ 최대 마나 +1", "  └ 最大マナ+1"); }
      break;
    case "cloneSelf": // GM8_2
      if (randInt(g, 2) === 0) { spawnToken(g, ctx, p, m.id); ctx.log("  └ 50% 성공 → 자신을 복제 소환", "  └ 50%成功 → 自身を複製召喚"); }
      else ctx.log("  └ 복제 실패", "  └ 複製失敗");
      break;
    case "maxHpAdd": { // 시초 종족: 최대 체력 증감
      const d = v; // signed (val may be negative)
      p.maxHp = Math.max(1, p.maxHp + d);
      p.hp = Math.max(1, Math.min(p.maxHp, p.hp + d));
      ctx.ev.push({ type: "heal", player: side(g, p), amount: Math.abs(d) });
      ctx.log(`  └ 최대 체력 ${d >= 0 ? "+" : ""}${d}`, `  └ 最大体力 ${d >= 0 ? "+" : ""}${d}`);
      break;
    }
    case "selfBurn": // 광폭한 검귀: 소환시 자신에게 데미지
      ctx.log(`  └ ${cn(m)} 소환 반동: 자신에게 ${v} 데미지`, `  └ ${cn(m)} 召喚の反動: 自分に${v}ダメージ`);
      ctx.dealDamage(p, v, cn(m), cn(m));
      break;
    case "creator": { // 창조신: 양측 덱/묘지에서 무작위 몬스터 3체를 자신 필드에 소환
      const pool = [...p.deck, ...p.discard, ...o.deck, ...o.discard].filter((c) => c.t === "mon");
      let summoned = 0;
      for (let i = 0; i < 3 && pool.length; i++) { const pick = pool.splice(randInt(g, pool.length), 1)[0]; spawnToken(g, ctx, p, pick.id); summoned++; }
      ctx.log(`  └ 덱/묘지에서 몬스터 ${summoned}체 소환`, `  └ デッキ/墓地からモンスター${summoned}体を召喚`);
      break;
    }
  }
}

/** Spawn a stat-only token monster (no summon effect / tribe / pitfall trigger). */
function spawnToken(g: GameState, ctx: Ctx, p: PlayerState, id: string): void {
  if (!DB[id]) return;
  if (p.field.length >= FIELD_MAX) return; // monster zone full — cannot spawn more

  const m: FieldMon = { uid: newUID(g), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn };
  m.onSummon = undefined; m.turnFx = undefined; // tokens don't re-trigger summon effects
  p.field.push(m);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid });
  applyEnterAura(g, ctx, p, m);
  applySummonBuff(ctx, p, m);
}

/** GM5_2: each monster YOU summon gains +val/+val from every summonBuff aura you control. */
function applySummonBuff(ctx: Ctx, p: PlayerState, m: FieldMon): void {
  const n = p.field.filter((x) => x.uid !== m.uid && x.aura === "summonBuff").reduce((s, x) => s + (x.val || 1), 0);
  if (n > 0) { m.atkMod = (m.atkMod || 0) + n; m.defMod = (m.defMod || 0) + n; ctx.log(`  └ 소환 강화: ${cn(m)} +${n}/+${n}`, `  └ 召喚強化: ${cn(m)} +${n}/+${n}`); }
}

// ============================================================
// spells (generalized)
// ============================================================
function tryNullSpell(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const p = g.players[g.cur];           // the caster
  const o = g.players[1 - g.cur];        // the trap owner
  // cost-capped null traps only trigger on spells they can afford to counter
  const i = o.traps.findIndex((tr) => tr.card.react === "nullspell" && (tr.card.cap === undefined || playCost(card) <= tr.card.cap));
  if (i < 0) return false;
  const t = o.traps.splice(i, 1)[0].card;
  o.discard.push(t);
  ctx.ev.push({ type: "trapReveal", player: side(g, o), id: t.id });
  ctx.log(
    `  └ <span class="dmg">상대 ${cn(t)} → ${cn(card)} 무효화</span>`,
    `  └ <span class="dmg">相手の ${cn(t)} → ${cn(card)} 無効化</span>`,
  );
  if (t.val) ctx.dealDamage(o, t.val, cn(t), cn(t));    // self-damage to the trap owner
  if (t.val2) ctx.dealDamage(p, t.val2, cn(t), cn(t));  // damage to the caster
  return true;
}
function applySpell(g: GameState, ctx: Ctx, card: CardInst): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = card.val || 0, v2 = card.val2 || 0;
  switch (card.act) {
    case "dmg": ctx.dealDamage(o, v, cn(card), cn(card)); break;
    case "heal": ctx.heal(p, v); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 체력 ${v} 회복`, `<span class="t">${p.name}</span> ${cn(card)} → 体力 ${v} 回復`); if (v2 > 0) ctx.drawN(p, v2); break;
    case "draw": { const n = ctx.drawN(p, v); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → ${n}장 드로우`, `<span class="t">${p.name}</span> ${cn(card)} → ${n}枚ドロー`); break; }
    case "buffAllTurn": p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + v)); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 아군 전체 공격 +${v}`, `<span class="t">${p.name}</span> ${cn(card)} → 味方全体の攻撃 +${v}`); break;
    case "siphon": ctx.dealDamage(o, v, cn(card), cn(card)); if (!g.over && v2 > 0) { ctx.heal(p, v2); ctx.log(`  └ 체력 ${v2} 회복`, `  └ 体力 ${v2} 回復`); } break;
    case "exile":
      if (o.hand.length) { const c = o.hand.splice(randInt(g, o.hand.length), 1)[0]; o.exile.push({ card: c, turns: 2 }); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 패 1장 2턴 제외`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の手札1枚を2ターン除外`); }
      else ctx.log("  └ 상대 패가 없음", "  └ 相手の手札がない");
      break;
    case "crash": rollSupply(g, o); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 제시 강제 갱신`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の提示を強制更新`); if (v2 > 0) ctx.drawN(p, v2); break;
    case "manaUp": p.maxMana += v; ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +${v}`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ +${v}`); break;
    case "destroyTrap": {
      const n = v || 1; let k = 0;
      for (let i = 0; i < n && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); k++; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 세트 함정 ${k}장 파괴`, `<span class="t">${p.name}</span> ${cn(card)} → 相手のセットトラップ ${k}枚破壊`);
      if (v2 > 0) ctx.drawN(p, v2);
      break;
    }
    case "manaDown": { // AHEUK 어튠-흑: extra -1 only when the caster controls NO monsters
      o.maxMana = Math.max(1, o.maxMana - 1);
      let extraKo = "", extraJa = "";
      if (p.field.length === 0) { o.maxMana = Math.max(1, o.maxMana - 1); extraKo = " (추가 -1)"; extraJa = " (追加 -1)"; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 최대 마나 감소${extraKo} (${o.maxMana})`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の最大マナ減少${extraJa} (${o.maxMana})`);
      break;
    }
    case "manaUpGain": { // AJIN 어튠-진: max mana +1, 50% add an Attune to discard
      p.maxMana += 1;
      const added = randInt(g, 100) < 50;
      if (added) p.discard.push(starter(g, "STARTER_MANA"));
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +1${added ? ", 묘지에 어튠 추가" : ""}`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ +1${added ? "、墓地にアチューン追加" : ""}`);
      break;
    }
    case "chestToMana": { // AMA 어튠-마: draw only if val2 set (no draw by default now)
      const ci = p.hand.findIndex((c) => c.star === "chest");
      if (ci >= 0) { const ch = p.hand.splice(ci, 1)[0]; p.discard.push(ch); p.maxMana += 1; if (v2 > 0) ctx.drawN(p, v2); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 보물상자 1장 묘지로, 최대 마나 +1${v2 > 0 ? `, ${v2}장 드로우` : ""}`, `<span class="t">${p.name}</span> ${cn(card)} → 宝箱1枚を墓地へ、最大マナ +1${v2 > 0 ? `、${v2}枚ドロー` : ""}`); }
      else ctx.log(`  └ 패에 보물상자가 없음`, `  └ 手札に宝箱がない`);
      break;
    }
    case "destroyEnch": { // 장치해제 / 장치분석: 상대 영구마법 파괴
      const n = v || 1; let k = 0;
      for (let i = 0; i < n && o.enchants.length; i++) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; o.discard.push(e.card); k++; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 영구마법 ${k}장 파괴`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の永続魔法 ${k}枚破壊`);
      break;
    }
    case "wipeBack": {
      let n = o.traps.length + o.enchants.length;
      o.traps.forEach((t) => o.discard.push(t.card)); o.traps = [];
      o.enchants.forEach((e) => o.discard.push(e.card)); o.enchants = [];
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 함정·마법 ${n}장 파괴`, `<span class="t">${p.name}</span> ${cn(card)} → 相手のトラップ・魔法 ${n}枚破壊`);
      ctx.dealDamage(p, card.val ?? 6, cn(card), cn(card));
      break;
    }
  }
}

// ============================================================
// custom (bespoke) spell effects — dispatched by card id
// ============================================================
const CUSTOM_SPELLS = new Set<string>([
  "S1", "S5", "S7", "AMA_KEEP", "ND2", "ND3", "ND5", "GS5_0", "GS5_2", "GS6_0", "GS6_2", "GS6_3",
  "GS7_0", "GS7_2", "GS8_0", "GS8_2", "GS8_3", "GS8_4", "GS8_5", "GS9_0", "GS9_2", "GS10_0", "GS10_1", "GS10_2",
  "HANDRESET", "TIMEWARP", "GAMBLE", "DICE8",
  "RUNE1", "RUNE2", "RUNE3", "GENESIS_SONG", "GENESIS_MAGIC",
  "BLOOD1", "BLOOD2", "BLOOD3", "DISARM3", "FORBIDDEN",
]);
const chance = (g: GameState, pct: number): boolean => randInt(g, 100) < pct;
function tag(p: PlayerState, card: CardInst): string { return `<span class="t">${p.name}</span> ${cn(card)} →`; }

function customSpell(g: GameState, ctx: Ctx, card: CardInst): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = card.val || 0, v2 = card.val2 || 0;
  switch (card.id) {
    case "S1": { // 퀵 잽: dmg2, and from the 3rd cast this turn → also draw 1
      ctx.dealDamage(o, v || 2, cn(card), cn(card));
      if ((p.usesTurn["S1"] || 0) >= 3) { ctx.drawN(p, 1); ctx.log(`  └ 3회+ 사용 → 1장 드로우`, `  └ 3回+使用 → 1枚ドロー`); }
      break;
    }
    case "S5": // 마켓 크래시: shrink the opponent's NEXT 제시 to 2 cards
      o.supplyShrink = 1;
      ctx.log(`${tag(p, card)} 다음 상대 제시 2장으로 축소`, `${tag(p, card)} 次の相手の提示を2枚に縮小`);
      break;
    case "S7": // 오버로드: team atk this turn + max hp +2
      p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + (v || 3)));
      p.maxHp += 2; p.hp += 2; ctx.ev.push({ type: "heal", player: side(g, p), amount: 2 });
      ctx.log(`${tag(p, card)} 아군 전체 공격 +${v || 3}, 최대 체력 +2`, `${tag(p, card)} 味方全体の攻撃+${v || 3}, 最大体力+2`);
      break;
    case "ND2": { const n = ctx.drawN(p, v || 2); ctx.heal(p, v2 || 2); ctx.log(`${tag(p, card)} ${n}장 드로우, 체력 +${v2 || 2}`, `${tag(p, card)} ${n}枚ドロー, 体力+${v2 || 2}`); break; }
    case "ND3": { let n = ctx.drawN(p, v || 3); if (chance(g, 30)) n += ctx.drawN(p, 2); ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); break; }
    case "ND5": { const n = ctx.drawN(p, v || 5); if (chance(g, 20)) { p.maxMana += 1; ctx.log(`  └ 20% 성공: 최대 마나 +1`, `  └ 20%成功: 最大マナ+1`); } ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); break; }
    case "GS5_0": ctx.dealDamage(o, v, cn(card), cn(card)); if (!g.over && chance(g, 10)) { o.maxMana = Math.max(1, o.maxMana - 1); ctx.log(`  └ 10% 성공: 상대 최대 마나 -1`, `  └ 10%成功: 相手の最大マナ-1`); } break;
    case "GS5_2": ctx.heal(p, 9); ctx.log(`${tag(p, card)} 체력 9 회복`, `${tag(p, card)} 体力9回復`); if (p.hp >= 20) { p.maxHp += 4; p.hp += 4; ctx.ev.push({ type: "heal", player: side(g, p), amount: 4 }); ctx.log(`  └ 체력 20+ → 최대 체력 +4`, `  └ 体力20+ → 最大体力+4`); } break;
    case "GS6_0": ctx.dealDamage(o, 12, cn(card), cn(card)); if (!g.over) { ctx.heal(p, 2); ctx.log(`${tag(p, card)} 12 데미지 + 체력 2 회복`, `${tag(p, card)} 12ダメージ + 体力2回復`); } break;
    case "GS6_2": ctx.heal(p, 13); ctx.log(`${tag(p, card)} 체력 13 회복`, `${tag(p, card)} 体力13回復`); if (chance(g, 20)) { p.maxHp += 5; p.hp += 5; ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 }); ctx.log(`  └ 20% 성공: 최대 체력 +5`, `  └ 20%成功: 最大体力+5`); } break;
    case "GS6_3": { let n = ctx.drawN(p, v || 4); if (p.maxHp >= 55) n += ctx.drawN(p, 2); ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); break; }
    case "GS7_0": ctx.dealDamage(o, 16, cn(card), cn(card)); if (chance(g, 20)) { p.maxMana = Math.max(1, p.maxMana - 1); ctx.log(`  └ 20%: 자신 최대 마나 -1`, `  └ 20%: 自分の最大マナ-1`); } break;
    case "GS7_2": ctx.heal(p, 13); ctx.log(`${tag(p, card)} 체력 13 회복`, `${tag(p, card)} 体力13回復`); if ((p.uses["GS7_2"] || 0) === 3) { p.defendHeal += 5; ctx.log(`  └ 3회째! 이후 피격 시마다 체력 +5`, `  └ 3回目! 以降 被攻撃ごとに体力+5`); } break;
    case "GS8_0": ctx.dealDamage(o, 11, cn(card), cn(card)); if (chance(g, 50) && o.deck.length) { const ex = o.deck.pop()!; o.exile.push({ card: ex, turns: 999 }); ctx.log(`  └ 50%: 상대 덱 맨 위 1장 제외`, `  └ 50%: 相手のデッキトップ1枚を除外`); } break;
    case "GS8_2": ctx.heal(p, 14); ctx.log(`${tag(p, card)} 체력 14 회복`, `${tag(p, card)} 体力14回復`); if (p.maxMana <= 10) { const before = p.hp; p.hp = p.maxHp; if (p.hp > before) ctx.ev.push({ type: "heal", player: side(g, p), amount: p.hp - before }); ctx.log(`  └ 최대 마나 10 이하 → 체력 완전 회복`, `  └ 最大マナ10以下 → 体力全回復`); } break;
    case "GS8_3": { const n = ctx.drawN(p, v || 5); ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); if (chance(g, 60)) destroyRandomEnemy(g, ctx, o); break; }
    case "GS8_4": p.field.forEach((m) => { m.tempAtk = (m.tempAtk || 0) + (v || 13); m.atkMod = (m.atkMod || 0) + 2; }); ctx.log(`${tag(p, card)} 아군 전체 공격 +${v || 13}(이번 턴) + 공격 +2(영구)`, `${tag(p, card)} 味方全体の攻撃+${v || 13}(今ターン) + 攻撃+2(永続)`); break;
    case "GS8_5": p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + (v || 7))); ctx.log(`${tag(p, card)} 아군 전체 공격 +${v || 7}`, `${tag(p, card)} 味方全体の攻撃+${v || 7}`); if (chance(g, 20)) summonRandomMon(g, ctx, p, 6); break;
    case "GS9_0": ctx.dealDamage(o, 21, cn(card), cn(card)); break; // precondition (opp hp>21) checked before play
    case "GS9_2": { ctx.heal(p, v || 16); ctx.log(`${tag(p, card)} 체력 ${v || 16} 회복`, `${tag(p, card)} 体力${v || 16}回復`); const i = p.hand.findIndex((c) => (c.name || "").includes("생명의 빛") || (c.nameJa || "").includes("生命の光")); if (i >= 0) { const dumped = p.hand.splice(i, 1)[0]; p.discard.push(dumped); p.maxHp += 15; p.hp += 15; ctx.ev.push({ type: "heal", player: side(g, p), amount: 15 }); ctx.log(`  └ '생명의 빛' 1장 묘지로 → 최대 체력 +15`, `  └ 「生命の光」1枚を墓地へ → 最大体力+15`); } break; }
    case "GS10_0": ctx.dealDamage(o, 23, cn(card), cn(card)); break; // precondition (own field<=1) checked before play
    case "GS10_1": ctx.dealDamage(o, 17, cn(card), cn(card)); if (!g.over) { ctx.drawN(p, 1); ctx.log(`${tag(p, card)} 17 데미지 + 1장 드로우`, `${tag(p, card)} 17ダメージ + 1枚ドロー`); } break;
    case "GS10_2": {
      ctx.heal(p, 19); ctx.log(`${tag(p, card)} 체력 19 회복`, `${tag(p, card)} 体力19回復`);
      const big = strongest(o.field); if (big) ctx.destroyMonster(o, big);
      const tn = o.traps.length + o.enchants.length;
      if (o.traps.length) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); }
      else if (o.enchants.length) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; o.discard.push(e.card); }
      ctx.log(`  └ 상대 몬스터 1체 + 마법/함정 ${tn ? 1 : 0}장 파괴`, `  └ 敵モンスター1体 + 魔法/罠${tn ? 1 : 0}枚破壊`);
      break;
    }
    case "HANDRESET": { // 핸드 리셋: discard whole hand, draw 4, max hp +1
      const dumped = p.hand.length; while (p.hand.length) p.discard.push(p.hand.pop()!);
      const n = ctx.drawN(p, 4); p.maxHp += 1; p.hp += 1; ctx.ev.push({ type: "heal", player: side(g, p), amount: 1 });
      ctx.log(`${tag(p, card)} 패 ${dumped}장 버리고 ${n}장 드로우, 최대 체력 +1`, `${tag(p, card)} 手札${dumped}枚を捨て${n}枚ドロー, 最大体力+1`);
      break;
    }
    case "TIMEWARP": // 시공간 조작: 70% skip the opponent's next turn
      if (chance(g, 70)) { o.skipNext = true; ctx.log(`${tag(p, card)} 70% 성공! 다음 상대 턴 스킵`, `${tag(p, card)} 70%成功! 次の相手ターンをスキップ`); }
      else ctx.log(`${tag(p, card)} 실패…`, `${tag(p, card)} 失敗…`);
      break;
    case "GAMBLE": { // 갬블: d6
      const r = randInt(g, 6) + 1;
      ctx.log(`${tag(p, card)} 🎲 ${r}`, `${tag(p, card)} 🎲 ${r}`);
      if (r <= 2) ctx.dealDamage(p, 8, cn(card), cn(card));
      else if (r <= 4) ctx.dealDamage(o, 5, cn(card), cn(card));
      else if (r === 5) spawnToken(g, ctx, p, "M10");
      else { spawnToken(g, ctx, p, "NGA3"); spawnToken(g, ctx, p, "NGA3"); spawnToken(g, ctx, p, "NGA3"); }
      break;
    }
    case "DICE8": { // 8코 도박: d6
      const r = randInt(g, 6) + 1;
      ctx.log(`${tag(p, card)} 🎲 ${r}`, `${tag(p, card)} 🎲 ${r}`);
      if (r <= 2) { p.maxMana = Math.max(1, p.maxMana - 4); ctx.log(`  └ 최대 마나 -4`, `  └ 最大マナ-4`); }
      else if (r <= 4) { o.maxMana = Math.max(1, o.maxMana - 1); ctx.dealDamage(o, 14, cn(card), cn(card)); }
      else if (r === 5) spawnToken(g, ctx, p, "GM9_2");
      else {
        o.traps.forEach((t) => o.discard.push(t.card)); o.traps = [];
        o.enchants.forEach((e) => o.discard.push(e.card)); o.enchants = [];
        spawnToken(g, ctx, p, "GM9_2"); spawnToken(g, ctx, p, "GM9_2");
        p.maxMana += 2; ctx.heal(p, 10);
        ctx.log(`  └ 대성공! 상대 마법/함정 전멸, 폭풍의 전사 2체, 최대 마나 +2, 체력 +10`, `  └ 大成功! 相手の魔法/罠全滅, 嵐の戦士2体, 最大マナ+2, 体力+10`);
      }
      break;
    }
    case "RUNE1": { // 룬 학문 - 초급: 코스트5 이상 상대 몬스터 1체 파괴 (강한 것부터)
      const targets = o.field.filter((m) => (m.cost ?? 0) >= 5).sort((a, b) => (effAtk(o, b) + b.def!) - (effAtk(o, a) + a.def!));
      if (targets[0]) { ctx.log(`${tag(p, card)} ${cn(targets[0])} 파괴`, `${tag(p, card)} ${cn(targets[0])} 破壊`); ctx.destroyMonster(o, targets[0]); }
      break;
    }
    case "RUNE2": { // 룬 학문 - 중급: 패의 '초급'을 버리면 최대 마나 +2
      const i = p.hand.findIndex((c) => c.id === "RUNE1");
      if (i >= 0) { const d = p.hand.splice(i, 1)[0]; p.discard.push(d); p.maxMana += 2; ctx.log(`${tag(p, card)} 초급 폐기 → 최대 마나 +2`, `${tag(p, card)} 初級を廃棄 → 最大マナ+2`); }
      break;
    }
    case "RUNE3": { // 룬 학문 - 상급: 패의 '초급'·'중급'을 버리면 최대 마나 +4
      const i1 = p.hand.findIndex((c) => c.id === "RUNE1");
      if (i1 >= 0) p.discard.push(p.hand.splice(i1, 1)[0]);
      const i2 = p.hand.findIndex((c) => c.id === "RUNE2");
      if (i2 >= 0) p.discard.push(p.hand.splice(i2, 1)[0]);
      p.maxMana += 4; ctx.log(`${tag(p, card)} 초급·중급 폐기 → 최대 마나 +4`, `${tag(p, card)} 初級・中級を廃棄 → 最大マナ+4`);
      break;
    }
    case "GENESIS_SONG": { // 시초의 노래: 덱/묘지의 '시초' 몬스터 1체 무작위 소환
      const fromDeck = p.deck.map((c, i) => ({ c, i, pile: "deck" as const })).filter((x) => x.c.tribe === "시초" && x.c.t === "mon");
      const fromDisc = p.discard.map((c, i) => ({ c, i, pile: "disc" as const })).filter((x) => x.c.tribe === "시초" && x.c.t === "mon");
      const cands = [...fromDeck, ...fromDisc];
      if (cands.length) {
        const pick = cands[randInt(g, cands.length)];
        if (pick.pile === "deck") p.deck.splice(pick.i, 1); else p.discard.splice(pick.i, 1);
        spawnToken(g, ctx, p, pick.c.id);
        ctx.log(`${tag(p, card)} ${cn(pick.c)} 소환`, `${tag(p, card)} ${cn(pick.c)} 召喚`);
      } else ctx.log(`${tag(p, card)} 소환할 시초 몬스터 없음`, `${tag(p, card)} 召喚できる始原モンスターなし`);
      break;
    }
    case "GENESIS_MAGIC": { // 시초의 마법: 필드의 '시초' 몬스터 모두 +4/+4
      let k = 0;
      p.field.forEach((m) => { if (m.tribe === "시초") { m.atkMod = (m.atkMod || 0) + 4; m.defMod = (m.defMod || 0) + 4; k++; } });
      ctx.log(`${tag(p, card)} 시초 몬스터 ${k}체 +4/+4`, `${tag(p, card)} 始原モンスター${k}体に+4/+4`);
      break;
    }
    case "BLOOD1": { const n = ctx.drawN(p, 3); ctx.log(`${tag(p, card)} 자신에게 4 데미지, ${n}장 드로우`, `${tag(p, card)} 自分に4ダメージ, ${n}枚ドロー`); ctx.dealDamage(p, 4, cn(card), cn(card)); break; }
    case "BLOOD2": { const n = ctx.drawN(p, 6); ctx.log(`${tag(p, card)} 자신에게 8 데미지, ${n}장 드로우`, `${tag(p, card)} 自分に8ダメージ, ${n}枚ドロー`); ctx.dealDamage(p, 8, cn(card), cn(card)); break; }
    case "BLOOD3": {
      ctx.dealDamage(o, 20, cn(card), cn(card));
      if (!g.over) ctx.dealDamage(p, 12, cn(card), cn(card));
      if (!g.over) { const n = ctx.drawN(p, 1); ctx.log(`${tag(p, card)} 상대 20 / 자신 12 데미지, ${n}장 드로우`, `${tag(p, card)} 相手20 / 自分12ダメージ, ${n}枚ドロー`); }
      break;
    }
    case "DISARM3": { // 마법연구기관: 상대 영구마법 1장 파괴 + 게임에서 제외
      if (o.enchants.length) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; ctx.log(`${tag(p, card)} ${cn(e.card)} 파괴 + 게임에서 제외`, `${tag(p, card)} ${cn(e.card)} 破壊 + ゲームから除外`); }
      break;
    }
    case "FORBIDDEN": { // 금단의 술식
      p.maxHp = Math.max(1, p.maxHp); p.hp -= 15; // pay 15 hp (may end the game)
      ctx.ev.push({ type: "damage", player: side(g, p), amount: 15 });
      ctx.log(`${tag(p, card)} 자신 체력 -15, 최대 마나 -2`, `${tag(p, card)} 自分の体力-15, 最大マナ-2`);
      p.maxMana = Math.max(1, p.maxMana - 2);
      if (p.hp <= 0) { handleDefeat(g, ctx, p, (1 - g.cur) as Side); break; }
      const r = randInt(g, 6) + 1;
      ctx.log(`  └ 🎲 ${r}`, `  └ 🎲 ${r}`);
      if (r >= 4) {
        const tribes = [...new Set(p.field.filter((m) => m.tribe && m.tribe !== "시초").map((m) => m.tribe!))];
        if (tribes.length) {
          const tribe = tribes[randInt(g, tribes.length)];
          const have = new Set(p.field.filter((m) => m.tribe === tribe).map((m) => m.id));
          const toSummon = ALL_IDS.filter((id) => DB[id].tribe === tribe && !have.has(id) && DB[id].t === "mon");
          toSummon.forEach((id) => spawnToken(g, ctx, p, id));
          ctx.log(`  └ 성공! [${tribeName(tribe, "ko")}] 나머지 ${toSummon.length}체 소환`, `  └ 成功! [${tribeName(tribe, "ja")}] 残り${toSummon.length}体を召喚`);
        } else ctx.log(`  └ 성공했지만 필드에 종족 몬스터가 없음`, `  └ 成功したが場に種族モンスターがいない`);
      } else ctx.log(`  └ 실패…`, `  └ 失敗…`);
      break;
    }
  }
}

/** Destroy one random enemy permanent (monster / trap / enchant). */
function destroyRandomEnemy(g: GameState, ctx: Ctx, o: PlayerState): void {
  const pool: Array<() => void> = [];
  o.field.forEach((m) => pool.push(() => ctx.destroyMonster(o, m)));
  o.traps.forEach((_t, i) => pool.push(() => { if (o.traps[i]) { o.discard.push(o.traps[i].card); o.traps.splice(i, 1); } }));
  o.enchants.forEach((_e, i) => pool.push(() => { if (o.enchants[i]) { o.discard.push(o.enchants[i].card); o.enchants.splice(i, 1); } }));
  if (!pool.length) return;
  pool[randInt(g, pool.length)]();
  ctx.log(`  └ 60% 성공: 상대 카드 1장 무작위 파괴`, `  └ 60%成功: 相手のカード1枚をランダム破壊`);
}

/** Summon a random buyable monster of cost <= maxCost as a stat-only token. */
function summonRandomMon(g: GameState, ctx: Ctx, p: PlayerState, maxCost: number): void {
  const pool = ALL_IDS.filter((id) => DB[id].t === "mon" && DB[id].cost >= 1 && DB[id].cost <= maxCost);
  if (!pool.length) return;
  const id = pool[randInt(g, pool.length)];
  spawnToken(g, ctx, p, id);
  ctx.log(`  └ 20% 성공: ${cn(DB[id])} 무작위 소환`, `  └ 20%成功: ${cn(DB[id])} をランダム召喚`);
}

// ============================================================
// treasure
// ============================================================
function openTreasure(g: GameState, ctx: Ctx, p: PlayerState): void {
  const roll = randInt(g, 4);
  let txt = "", txtJa = "", kind = "";
  if (roll === 0) { p.maxMana++; txt = "최대 마나 +1"; txtJa = "最大マナ +1"; kind = "mana"; }
  else if (roll === 1) { ctx.heal(p, 3); txt = "체력 +3"; txtJa = "体力 +3"; kind = "hp"; }
  else if (roll === 2) { p.maxHp += 5; p.hp += 5; txt = "최대 체력 +5"; txtJa = "最大体力 +5"; kind = "maxhp"; ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 }); }
  else {
    // 꽝(dud): spawn a Mimic (3/2) on the OPPONENT's field — the risk of cracking chests
    const o = g.players[0] === p ? g.players[1] : g.players[0];
    if (o.field.length < FIELD_MAX) {
      const m: FieldMon = { uid: newUID(g), ...structuredClone(DB.MIMIC), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn };
      o.field.push(m);
      ctx.ev.push({ type: "summon", player: side(g, o), uid: m.uid });
    }
    txt = "꽝! 상대 필드에 미믹(3/2) 소환"; txtJa = "ハズレ！相手の場にミミック(3/2)召喚"; kind = "mimic";
  }
  ctx.log(`<span class="t">${p.name}</span> 보물상자 → <span class="good">${txt}</span>`, `<span class="t">${p.name}</span> 宝箱 → <span class="good">${txtJa}</span>`);
  ctx.ev.push({ type: "treasure", player: side(g, p), kind, text: txt, textJa: txtJa, isBot: p.isBot });
}

// ============================================================
// play / buy
// ============================================================
function applyEnterAura(g: GameState, ctx: Ctx, p: PlayerState, m: FieldMon): void {
  // 폭풍의 광전사(drainMana): while on field, opponent's max mana -val
  if (m.aura === "drainMana") {
    const o = g.players[0] === p ? g.players[1] : g.players[0];
    o.maxMana = Math.max(1, o.maxMana - (m.val || 3));
    ctx.log(`  └ ${cn(m)}: 상대 최대 마나 -${m.val || 3}`, `  └ ${cn(m)}: 相手の最大マナ-${m.val || 3}`);
  }
}
function summonMonster(g: GameState, ctx: Ctx, p: PlayerState, card: CardInst): void {
  const m: FieldMon = { ...card, exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn };
  p.field.push(m);
  ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 소환 (공${card.atk}/방${card.def})`, `<span class="t">${p.name}</span> ${cn(card)} 召喚 (攻${card.atk}/防${card.def})`);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid });
  applyEnterAura(g, ctx, p, m);
  // GM5_2: summon-buff aura grants +1/+1 to each monster you summon
  applySummonBuff(ctx, p, m);
  // persistent "heal on summon" enchant (생명의 가호)
  p.enchants.forEach((e) => { if (e.card.ench === "healSummon") ctx.heal(p, e.card.val2 || 1); });
  // 1) the monster's own summon effect resolves first (draw / breaktrap / burn ...)
  resolveOnSummon(g, ctx, m);
  // 2) tribe synergy (also a summon-triggered effect)
  checkTribe(g, ctx, p, m);
  // 3) THEN the opponent's Pitfall reacts — so a summon effect gets its chance first
  const o = g.players[1 - g.cur];
  const pitIdx = o.traps.findIndex((t) => t.card.react === "pitfall");
  if (pitIdx >= 0 && p.field.some((x) => x.uid === m.uid) && (card.cost ?? 0) <= (o.traps[pitIdx].card.val ?? 99)) {
    const pit = o.traps.splice(pitIdx, 1)[0].card; o.discard.push(pit);
    ctx.ev.push({ type: "trapReveal", player: side(g, o), id: pit.id });
    ctx.log(`  └ <span class="dmg">함정 ${cn(pit)}!</span> ${cn(card)} 파괴`, `  └ <span class="dmg">トラップ ${cn(pit)}!</span> ${cn(card)} 破壊`);
    ctx.destroyMonster(p, m);
  }
}

// ---- tribe synergies (each threshold fires once per game per player) ----
function strongest(field: FieldMon[]): FieldMon | undefined {
  return [...field].sort((a, b) => (b.atk! + b.def!) - (a.atk! + a.def!))[0];
}
function checkTribe(g: GameState, ctx: Ctx, p: PlayerState, m: FieldMon): void {
  const tribe = m.tribe;
  if (!tribe) return;
  // count DISTINCT tribe cards (same card twice does not synergize)
  const count = new Set(p.field.filter((x) => x.tribe === tribe).map((x) => x.id)).size;
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  const fire = (n: number): boolean => { const k = `${tribe}:${n}`; if (p.tribesFired.includes(k)) return false; p.tribesFired.push(k); return true; };
  if (count >= 4 && fire(4)) applyTribe(g, ctx, p, o, tribe, 4);
  else if (count >= 3 && fire(3)) applyTribe(g, ctx, p, o, tribe, 3);
  else if (count >= 2 && fire(2)) applyTribe(g, ctx, p, o, tribe, 2);
}
function applyTribe(g: GameState, ctx: Ctx, p: PlayerState, o: PlayerState, tribe: string, n: number): void {
  ctx.log(`<span class="good">[${tribeName(tribe, "ko")}] 동족 ${n}마리 시너지!</span>`, `<span class="good">[${tribeName(tribe, "ja")}] 同族 ${n}体シナジー!</span>`);
  if (tribe === "고독") {
    const hp = n === 2 ? 10 : 30; p.maxHp += hp; p.hp += hp; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: hp });
    if (n === 3) p.maxMana += 1;
  } else if (tribe === "고귀") {
    p.maxMana += n === 2 ? 1 : 3;
    if (n === 3) for (let i = 0; i < 2 && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); }
  } else if (tribe === "포식") {
    const kills = n === 2 ? 1 : 2; for (let i = 0; i < kills; i++) { const t = strongest(o.field); if (t) ctx.destroyMonster(o, t); }
    ctx.dealDamage(o, n === 2 ? 4 : 10, "포식 시너지", "捕食シナジー");
  } else if (tribe === "귀족") {
    if (n === 2) p.maxMana = Math.max(1, p.maxMana - 1);
    else { p.maxMana += 5; p.bonusDrawPerm += 2; p.maxHp += 15; p.hp += 15; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: 15 }); }
  } else if (tribe === "시초") {
    if (n === 2) { p.maxHp += 6; p.hp += 6; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: 6 }); }
    else if (n === 3) {
      p.maxHp += 13; p.hp += 13; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: 13 });
      o.maxHp = Math.max(1, o.maxHp - 3); if (o.hp > o.maxHp) o.hp = o.maxHp;
    } else { // n === 4: the payoff
      p.maxMana += 10; p.maxHp += 20; p.hp += 20; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: 20 });
      ctx.drawN(p, 4);
      for (const tm of [...o.field]) ctx.destroyMonster(o, tm);
      o.traps.forEach((t) => o.discard.push(t.card)); o.traps = [];
      o.enchants.forEach((e) => o.discard.push(e.card)); o.enchants = [];
      ctx.dealDamage(o, 13, "시초 시너지", "始原シナジー");
    }
  }
}

// Zone capacity: at most 9 monsters, and 9 spell/trap (traps + enchants) cards.
export const FIELD_MAX = 9;
export const ST_MAX = 9;
const ASSASSIN_IDS = ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3"];
/** Summon precondition check (암살자 상급/특급). */
export function summonReqMet(p: PlayerState, card: CardInst): boolean {
  if (!card.summonReq) return true;
  if (card.summonReq === "assassinField") {
    return p.field.some((m) => m.id === "ASSASSIN1" || m.id === "ASSASSIN2" || m.id === "ASSASSIN3" || m.id === "ASSASSIN4");
  }
  if (card.summonReq === "assassinAll") {
    const pool = [...p.field, ...p.deck, ...p.discard]; // hand excluded on purpose
    return ASSASSIN_IDS.every((aid) => pool.some((c) => c.id === aid));
  }
  return true;
}

function playFromHand(g: GameState, ctx: Ctx, idx: number): void {
  const p = g.players[g.cur];
  const card = p.hand[idx];
  if (!card || p.mana < playCost(card)) return;

  if (card.t === "starter") {
    if (card.star === "trash") { p.mana -= playCost(card); p.hand.splice(idx, 1); ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "vanish" }); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 이 카드 폐기`, `<span class="t">${p.name}</span> ${cn(card)} → このカードを廃棄`); }
    else if (card.star === "chest") { p.mana -= playCost(card); p.hand.splice(idx, 1); p.discard.push(card); ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "discard" }); openTreasure(g, ctx, p); }
    else if (card.star === "mana") { p.mana -= playCost(card); p.hand.splice(idx, 1); p.discard.push(card); p.maxMana++; ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "discard" }); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +1 (${p.maxMana})`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ +1 (${p.maxMana})`); }
    return;
  }
  if (card.t === "mon") {
    if (summonBlockedLow(g, p, card)) { ctx.log(`  └ <span class="dmg">봉쇄령</span>: 코스트 ${card.cost} 몬스터 소환 불가`, `  └ <span class="dmg">封鎖令</span>: コスト ${card.cost} のモンスター召喚不可`); return; }
    if (!summonReqMet(p, card)) { ctx.log(`  └ <span class="dmg">소환 조건 미충족</span>: ${cn(card)}`, `  └ <span class="dmg">召喚条件を満たしていない</span>: ${cn(card)}`); return; }
    if (p.field.length >= FIELD_MAX) { ctx.log(`  └ <span class="dmg">몬스터 존이 가득 찼습니다 (최대 ${FIELD_MAX})</span>`, `  └ <span class="dmg">モンスターゾーンが満杯です (最大 ${FIELD_MAX})</span>`); return; }
    p.mana -= playCost(card); p.hand.splice(idx, 1); summonMonster(g, ctx, p, card); return;
  }
  if (card.t === "spell") {
    const o0 = g.players[1 - g.cur];
    // ---- conditional / usage-gated preconditions (checked BEFORE paying) ----
    if (card.act === "wipeBack" && p.field.length > 0) { ctx.log(`  └ 필드에 몬스터가 있어 사용 불가`, `  └ 場にモンスターがいるため使用不可`); return; }
    if (card.id === "S4" && (p.usesTurn["S4"] || 0) >= 1) { ctx.log("  └ 이번 턴에 이미 사용했습니다", "  └ このターンは既に使用済み"); return; }
    if (card.id === "GS9_0" && o0.hp <= 21) { ctx.log("  └ 상대 체력 21 이하라 사용 불가", "  └ 相手の体力が21以下のため使用不可"); return; }
    if (card.id === "GS10_0" && p.field.length > 1) { ctx.log("  └ 자신 필드 몬스터 2체 이상이라 사용 불가", "  └ 自分の場のモンスターが2体以上のため使用不可"); return; }
    if (card.id === "RUNE1" && !o0.field.some((m) => (m.cost ?? 0) >= 5)) { ctx.log("  └ 코스트 5 이상 상대 몬스터가 없습니다", "  └ コスト5以上の敵モンスターがいません"); return; }
    if (card.id === "RUNE2" && !p.hand.some((c) => c.id === "RUNE1")) { ctx.log("  └ 패에 '룬 학문 - 초급'이 없습니다", "  └ 手札に「ルーン学問 - 初級」がありません"); return; }
    if (card.id === "RUNE3" && !(p.hand.some((c) => c.id === "RUNE1") && p.hand.some((c) => c.id === "RUNE2"))) { ctx.log("  └ 패에 초급·중급 룬 학문이 필요합니다", "  └ 手札に初級・中級のルーン学問が必要です"); return; }
    if ((card.id === "DISARM1" || card.id === "DISARM2" || card.id === "DISARM3") && o0.enchants.length === 0) { ctx.log("  └ 파괴할 상대 영구마법이 없습니다", "  └ 破壊する相手の永続魔法がありません"); return; }
    if (card.ench && p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ <span class="dmg">마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})</span>`, `  └ <span class="dmg">魔法・罠ゾーンが満杯です (最大 ${ST_MAX})</span>`); return; }

    p.mana -= playCost(card); p.hand.splice(idx, 1); p.discard.push(card);
    if (tryNullSpell(g, ctx, card)) return;
    p.uses[card.id] = (p.uses[card.id] || 0) + 1;             // game-long usage count
    p.usesTurn[card.id] = (p.usesTurn[card.id] || 0) + 1;     // per-turn usage count
    if (card.ench) {
      p.discard.pop(); // stays on the field instead of going to discard
      p.enchants.push({ card, turns: card.val || 1 });
      const perm = (card.val || 0) >= 99;
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 발동 (지속 ${perm ? "영구" : `${card.val}턴`})`, `<span class="t">${p.name}</span> ${cn(card)} 発動 (${perm ? "永続" : `持続${card.val}ターン`})`);
      ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "field" });
      return;
    }
    ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "discard" }); // reveal animation
    if (CUSTOM_SPELLS.has(card.id)) { customSpell(g, ctx, card); return; }
    const a = card.act, v = card.val || 0, v2 = card.val2 || 0;
    if (a === "buffTurn" || a === "buffPerm") {
      if (!p.field.length) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
      g.pending = {
        kind: "myMon",
        hint: a === "buffTurn" ? `공격 +${v} 할 자신 몬스터 선택` : "강화할 자신 몬스터 선택",
        hintJa: a === "buffTurn" ? `攻撃 +${v} する自分のモンスターを選択` : "強化する自分のモンスターを選択",
        reason: a, allowCancel: false, data: { val: v, val2: v2 },
      };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "destroyMon" || a === "weaken") {
      const o = g.players[1 - g.cur];
      if (!o.field.length) { ctx.log("  └ 대상 적 몬스터 없음", "  └ 対象の敵モンスターなし"); return; }
      g.pending = {
        kind: "oppMon",
        hint: a === "destroyMon" ? "파괴할 적 몬스터 선택" : `방어 -${v} 할 적 몬스터 선택`,
        hintJa: a === "destroyMon" ? "破壊する敵モンスターを選択" : `防御 -${v} する敵モンスターを選択`,
        reason: a, allowCancel: false, data: { val: v },
      };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "seek") {
      if (!p.deck.length && !p.discard.length) { ctx.log("  └ 덱이 비어있음", "  └ デッキが空"); return; }
      g.pending = { kind: "seek", hint: "덱에서 1장 선택", hintJa: "デッキから1枚選択", reason: "seek", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "recall") {
      if (!p.discard.length) { ctx.log("  └ 버린 패가 없음", "  └ 捨て札がない"); return; }
      g.pending = { kind: "recall", hint: "버린 패에서 1장 선택", hintJa: "捨て札から1枚選択", reason: "recall", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    applySpell(g, ctx, card);
    return;
  }
  if (card.t === "trap") {
    if (p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ <span class="dmg">마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})</span>`, `  └ <span class="dmg">魔法・罠ゾーンが満杯です (最大 ${ST_MAX})</span>`); return; }
    p.mana -= playCost(card); p.hand.splice(idx, 1); p.traps.push({ card });
    ctx.log(`<span class="t">${p.name}</span> 함정을 세트 (정체는 비공개)`, `<span class="t">${p.name}</span> トラップをセット (正体は非公開)`);
    ctx.ev.push({ type: "trapSet", player: side(g, p) });
    return;
  }
}

// ============================================================
// pending resolution
// ============================================================
function resolveTarget(g: GameState, ctx: Ctx, uid: string | null): void {
  const pending = g.pending!;
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const d = (pending.data || {}) as { val?: number; val2?: number; attackerUid?: string };

  if (uid === null) { if (pending.allowCancel) g.pending = null; return; }
  g.pending = null;

  if (pending.kind === "oppMon") {
    const tm = o.field.find((m) => m.uid === uid);
    if (!tm) return;
    if (pending.reason === "defDown" || pending.reason === "weaken") { tm.defMod = (tm.defMod || 0) - (d.val || 0); ctx.log(`  └ ${cn(tm)} 의 방어 -${d.val}`, `  └ ${cn(tm)} の防御 -${d.val}`); }
    else if (pending.reason === "atkDown") { tm.atkMod = (tm.atkMod || 0) - (d.val || 0); ctx.log(`  └ ${cn(tm)} 의 공격 -${d.val}`, `  └ ${cn(tm)} の攻撃 -${d.val}`); }
    else if (pending.reason === "destroyMon") { ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 파괴`, `<span class="t">${p.name}</span> → ${cn(tm)} 破壊`); ctx.destroyMonster(o, tm); }
    else if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === d.attackerUid);
      if (att) { ctx.ev.push({ type: "attack", player: side(g, p), uid: att.uid, targetUid: tm.uid }); resolveAttackCore(g, ctx, att, tm.uid); }
    }
  } else if (pending.kind === "myMon") {
    const tm = p.field.find((m) => m.uid === uid);
    if (!tm) return;
    if (pending.reason === "buffTurn") { tm.tempAtk = (tm.tempAtk || 0) + (d.val || 0); ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 공격 +${d.val}`, `<span class="t">${p.name}</span> → ${cn(tm)} 攻撃 +${d.val}`); }
    else if (pending.reason === "buffPerm") { tm.atkMod = (tm.atkMod || 0) + (d.val || 0); tm.defMod = (tm.defMod || 0) + (d.val2 || 0); ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 공격+${d.val} / 방어+${d.val2}`, `<span class="t">${p.name}</span> → ${cn(tm)} 攻撃+${d.val} / 防御+${d.val2}`); }
  } else if (pending.kind === "seek") {
    const i = p.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) { p.hand.push(p.deck.splice(i, 1)[0]); shuffle(g, p.deck); ctx.log(`<span class="t">${p.name}</span> 시크 → 1장 서치`, `<span class="t">${p.name}</span> シーク → 1枚サーチ`); }
  } else if (pending.kind === "recall") {
    const i = p.discard.findIndex((c) => c.uid === uid);
    if (i >= 0) { p.hand.push(p.discard.splice(i, 1)[0]); ctx.log(`<span class="t">${p.name}</span> 리콜 → 1장 회수`, `<span class="t">${p.name}</span> リコール → 1枚回収`); }
  }
}

// ============================================================
// main reducer
// ============================================================
export function reduce(prev: GameState, action: Action): ReduceResult {
  const g: GameState = structuredClone(prev);
  const ev: GameEvent[] = [];
  const ctx = makeCtx(g, ev);

  if (action.type === "surrender") {
    if (!g.over) {
      const winner = (1 - action.player) as Side;
      g.over = true; g.phase = "over"; g.winner = winner;
      ctx.log(`<span class="dmg">${g.players[action.player].name} 기권</span>`, `<span class="dmg">${g.players[action.player].name} 降参</span>`);
      ev.push({ type: "win", winner });
    }
    return { state: g, events: ev };
  }
  if (g.over) return { state: g, events: ev };

  const p = g.players[g.cur];
  if (action.type === "chooseTarget") { if (g.pending) resolveTarget(g, ctx, action.uid); return { state: g, events: ev }; }
  if (action.type === "pick") { if (g.pending) resolveTarget(g, ctx, action.uid); return { state: g, events: ev }; }
  if (g.pending) return { state: g, events: ev };

  switch (action.type) {
    case "play": playFromHand(g, ctx, action.idx); break;
    case "buyMarket": {
      const card = g.market[action.i];
      const bc = card ? buyCost(p, card) : 0;
      if (card && p.mana >= bc) {
        p.mana -= bc; p.discard.push(inst(g, card.id)); p.boughtCount++; p.taxFlag = true;
        ctx.log(`<span class="t">${p.name}</span> 고정 마켓 ${cn(card)} 구매 (${bc}) <span class="muted">[묘지로]</span>`, `<span class="t">${p.name}</span> 固定マーケット ${cn(card)} 購入 (${bc}) <span class="muted">[墓地へ]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "market", i: action.i, id: card.id });
      }
      break;
    }
    case "buySupply": {
      const card = p.supply[action.i];
      const bc = card ? buyCost(p, card) : 0;
      if (card && p.mana >= bc) {
        p.mana -= bc; p.discard.push(inst(g, card.id)); p.supply[action.i] = null; p.boughtCount++; p.taxFlag = true;
        ctx.log(`<span class="t">${p.name}</span> 제시 마켓 ${cn(card)} 구매 (${bc}) <span class="muted">[묘지로]</span>`, `<span class="t">${p.name}</span> 提示マーケット ${cn(card)} 購入 (${bc}) <span class="muted">[墓地へ]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "supply", i: action.i, id: card.id });
      }
      break;
    }
    case "refresh":
      if (p.mana >= 1) { p.mana -= 1; rollSupply(g, p); ctx.log(`<span class="t">${p.name}</span> 제시 갱신 (1 마나)`, `<span class="t">${p.name}</span> 提示更新 (1マナ)`); }
      break;
    case "attack": {
      if (noAttackActive(g)) { ctx.log(`  └ <span class="dmg">평화 협정</span>: 공격 불가`, `  └ <span class="dmg">平和協定</span>: 攻撃不可`); break; }
      const m = p.field.find((x) => x.uid === action.uid);
      if (!m || m.exhausted) break;
      const o = g.players[1 - g.cur];
      // 암살자(directOnly): always attacks the opponent player directly, never a monster
      if (o.field.length === 0 || m.directOnly) { ev.push({ type: "attack", player: side(g, p), uid: m.uid, targetUid: null }); resolveAttackCore(g, ctx, m, null); }
      else { g.pending = { kind: "oppMon", hint: "공격할 적 몬스터 선택", hintJa: "攻撃する敵モンスターを選択", reason: "attack", allowCancel: true, data: { attackerUid: m.uid } }; ev.push({ type: "needTarget", pending: g.pending }); }
      break;
    }
    case "endTurn": endTurn(g, ctx); break;
  }
  return { state: g, events: ev };
}
