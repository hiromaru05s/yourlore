// ============================================================
// LORE — pure game engine. No DOM, no timers, no Math.random.
// reduce(state, action) -> { state, events }  (input never mutated)
// Deterministic given the seed, so the server can run it authoritatively.
// ============================================================
import type {
  Action, CardInst, FieldMon, GameEvent, GameState, PlayerState, ReduceResult, Side,
} from "./types";
import { BUYABLE_POOL, COSTS_FOR_STANDARD, DB, STARTERS, STARTER_DECK, idsOfCost } from "./cards";

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
function newUID(g: GameState): string {
  return "u" + ++g.uidSeq;
}
function inst(g: GameState, id: string): CardInst {
  return { uid: newUID(g), ...structuredClone(DB[id]) };
}
function starter(g: GameState, key: string): CardInst {
  return { uid: newUID(g), ...structuredClone(STARTERS[key]) };
}

// ---------- pure read helpers (exported; used by UI + bot) ----------
export function effMaxMana(p: PlayerState): number {
  const aura = p.field.filter((m) => m.aura === "mana1").length; // Mana Golem
  return Math.max(1, p.maxMana + aura - p.manaPenalty);
}
export function effAtk(p: PlayerState, m: FieldMon): number {
  let a = m.atk! + (m.tempAtk || 0) + (m.atkMod || 0);
  if (m.condAtk === "twoPlus" && p.field.length >= 2) a += 2;
  return Math.max(0, a);
}
export function effDef(m: FieldMon): number {
  return Math.max(0, m.def! + (m.defMod || 0));
}
export function supplyPrice(p: PlayerState): number {
  return Math.max(1, effMaxMana(p) - 2);
}
export function cardValue(c: CardInst): number {
  if (c.t === "mon") return (c.atk || 0) + (c.def || 0);
  if (c.t === "spell") return 6;
  if (c.t === "trap") return 5;
  return 1;
}

// ---------- player / game construction ----------
function mkPlayer(g: GameState, id: string, name: string, isBot: boolean): PlayerState {
  const deck = STARTER_DECK.map((k) => starter(g, k));
  shuffle(g, deck);
  return {
    id, name, isBot,
    hp: 100, maxHp: 100, mana: 4, maxMana: 4,
    manaPenalty: 0, nextPenalty: 0,
    deck, hand: [], discard: [], exile: [],
    field: [], traps: [], supply: [],
    boughtCount: 0, taxFlag: false,
  };
}

export interface CreateOpts {
  seed?: number;
  mode: "bot" | "online";
  p0: { id: string; name: string; isBot?: boolean };
  p1: { id: string; name: string; isBot?: boolean };
  starting?: Side;
}

/** Build a fresh game and run the opening (deal + first turn header). */
export function createGame(opts: CreateOpts): ReduceResult {
  const g: GameState = {
    players: [null as never, null as never],
    cur: opts.starting ?? 0,
    turn: 1,
    phase: "main",
    pending: null,
    over: false,
    winner: null,
    market: [],
    dmgTally: [0, 0],
    rng: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0,
    uidSeq: 0,
    mode: opts.mode,
  };
  g.players[0] = mkPlayer(g, opts.p0.id, opts.p0.name, !!opts.p0.isBot);
  g.players[1] = mkPlayer(g, opts.p1.id, opts.p1.name, !!opts.p1.isBot);
  // STANDARD market: one random card of each cost 1/2/3/4 from ALL types
  g.market = COSTS_FOR_STANDARD.map((c) => {
    const ids = idsOfCost(c);
    return inst(g, ids[randInt(g, ids.length)]);
  });

  const ev: GameEvent[] = [];
  const ctx = makeCtx(g, ev);
  g.players.forEach((p) => rollSupply(g, p));
  ctx.drawN(g.players[g.cur], 3);
  ctx.log('<span class="t">게임 시작.</span> 초기 덱 6장 · 3장 드로우 · 마나 4.');
  beginTurn(g, ctx, true);
  return { state: g, events: ev };
}

function rollSupply(g: GameState, p: PlayerState): void {
  p.supply = [pickBuy(g), pickBuy(g), pickBuy(g)];
}
function pickBuy(g: GameState): CardInst {
  return inst(g, BUYABLE_POOL[randInt(g, BUYABLE_POOL.length)]);
}

// ============================================================
// mutation context — collects events while mutating `g`
// ============================================================
interface Ctx {
  ev: GameEvent[];
  log(html: string): void;
  drawN(p: PlayerState, n: number): number;
  heal(p: PlayerState, amt: number): void;
  dealDamage(target: PlayerState, amt: number, src: string): void;
  destroyMonster(owner: PlayerState, m: FieldMon): void;
}
function side(g: GameState, p: PlayerState): Side {
  return (g.players[0] === p ? 0 : 1) as Side;
}
function makeCtx(g: GameState, ev: GameEvent[]): Ctx {
  const log = (html: string) => ev.push({ type: "log", html });

  const drawN = (p: PlayerState, n: number): number => {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) {
        if (!p.discard.length) break;
        p.deck = shuffle(g, p.discard.splice(0));
      }
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

  const dealDamage = (target: PlayerState, amt: number, src: string): void => {
    if (amt <= 0) return;
    target.hp -= amt;
    const dealer: Side = (target === g.players[0] ? 1 : 0);
    g.dmgTally[dealer] += amt;
    log(`  └ <span class="dmg">${amt} 데미지</span> → ${target.name} (체력 ${Math.max(0, target.hp)}) <span class="muted">[${src}]</span>`);
    ev.push({ type: "damage", player: side(g, target), amount: amt });
    if (target.hp <= 0) handleDefeat(g, ctx, target, dealer);
  };

  const destroyMonster = (owner: PlayerState, m: FieldMon): void => {
    const i = owner.field.findIndex((x) => x.uid === m.uid);
    if (i >= 0) {
      const dead = owner.field.splice(i, 1)[0];
      owner.discard.push(inst(g, dead.id));
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
  p.manaPenalty = p.nextPenalty || 0;
  p.nextPenalty = 0;
  p.mana = effMaxMana(p);
  tickExile(ctx, p);
  if (!first) {
    rollSupply(g, p);
    ctx.drawN(p, 3);
  }
  g.phase = "main";
  ctx.ev.push({ type: "turnHeader", turn: g.turn, name: p.name, isBot: p.isBot });
}

function tickExile(ctx: Ctx, p: PlayerState): void {
  const back: CardInst[] = [];
  p.exile = p.exile.filter((e) => {
    e.turns--;
    if (e.turns <= 0) { back.push(e.card); return false; }
    return true;
  });
  back.forEach((c) => p.hand.push(c));
  if (back.length) ctx.log(`  └ 제외했던 ${back.length}장이 패로 복귀`);
}

function endTurn(g: GameState, ctx: Ctx): void {
  const p = g.players[g.cur];
  while (p.hand.length) p.discard.push(p.hand.pop()!);
  p.field.forEach((m) => { m.exhausted = false; m.tempAtk = 0; });
  g.turn++;
  g.cur = (1 - g.cur) as Side;
  beginTurn(g, ctx, false);
}

// ============================================================
// defeat / win
// ============================================================
function handleDefeat(g: GameState, ctx: Ctx, loser: PlayerState, finisher: Side): void {
  if (g.over) return;
  const loserIdx = g.players.indexOf(loser) as Side;
  const winner = (1 - loserIdx) as Side;
  g.players[finisher].maxMana += 1;
  let topDmg: Side = winner;
  if (g.dmgTally[winner] >= g.dmgTally[finisher]) topDmg = winner;
  if (topDmg !== finisher) g.players[topDmg].maxMana += 1;
  ctx.log(`<span class="good">격파 보상: 최대 마나 +1</span>`);
  g.over = true;
  g.phase = "over";
  g.winner = winner;
  ctx.ev.push({ type: "win", winner });
}

// ============================================================
// combat
// ============================================================
function reactTrap(o: PlayerState, react: string): boolean {
  const i = o.traps.findIndex((t) => t.card.react === react);
  if (i < 0) return false;
  const t = o.traps.splice(i, 1)[0];
  o.discard.push(t.card);
  return true;
}

function resolveAttackCore(g: GameState, ctx: Ctx, att: FieldMon, targetUid: string | null): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  let atk = effAtk(p, att);

  // ---- terminal reactions: resolve the whole attack and stop ----
  if (reactTrap(o, "judgment")) {
    ctx.log(`  └ <span class="dmg">함정 천벌!</span> ${att.name} 파괴 + 상대에게 8`);
    ctx.destroyMonster(p, att); ctx.dealDamage(p, 8, "천벌"); return;
  }
  if (reactTrap(o, "devour")) {
    ctx.log(`  └ <span class="dmg">함정 영혼 포식!</span> ${att.name} 파괴 + 체력 6 회복`);
    ctx.destroyMonster(p, att); ctx.heal(o, 6); return;
  }
  if (reactTrap(o, "counter")) {
    const refl = Math.floor(atk / 2);
    ctx.log(`  └ <span class="dmg">함정 카운터 서지!</span> ${att.name} 파괴 + ${refl} 반사`);
    ctx.dealDamage(p, refl, "카운터 서지");
    if (!g.over) ctx.destroyMonster(p, att);
    return;
  }
  if (reactTrap(o, "bulwark")) {
    att.defMod = (att.defMod || 0) - 3; att.exhausted = true;
    ctx.log(`  └ <span class="dmg">함정 절대 방벽!</span> 공격 무효 + ${att.name} 방어 -3`);
    return;
  }
  if (reactTrap(o, "fullguard")) {
    att.exhausted = true;
    ctx.log(`  └ <span class="dmg">함정 역류!</span> 공격 무효화`);
    return;
  }

  // ---- non-terminal reactions: attack still resolves ----
  if (reactTrap(o, "spikes")) {
    ctx.log(`  └ <span class="dmg">함정 가시 덫!</span> 공격측에 4`);
    ctx.dealDamage(p, 4, "가시 덫");
    if (g.over) { att.exhausted = true; return; }
  }
  if (reactTrap(o, "drawtrap2")) {
    const n = ctx.drawN(o, 2);
    ctx.log(`  └ <span class="dmg">함정 시간 왜곡!</span> ${n}장 드로우`);
  }
  if (reactTrap(o, "reflect")) {
    ctx.log(`  └ <span class="dmg">함정 미러 손!</span> ${atk} 반사`);
    ctx.dealDamage(p, atk, "미러 손");
    if (g.over) { att.exhausted = true; return; }
  }
  if (reactTrap(o, "half")) {
    atk = Math.floor(atk / 2);
    ctx.log(`  └ <span class="dmg">함정 하프 가드!</span> 공격이 ${atk}로 절반`);
  }

  // ---- damage ----
  if (targetUid === null) {
    ctx.dealDamage(o, atk, `${att.name} 의 직접 공격`);
  } else {
    const target = o.field.find((m) => m.uid === targetUid);
    if (target) {
      const d = effDef(target);
      ctx.ev.push({ type: "hit", uid: target.uid });
      if (atk > d) {
        const over = atk - d;
        ctx.log(`<span class="t">${p.name}</span> ${att.name}(공${atk}) → ${target.name}(방${d}) 파괴 + <span class="dmg">${over} 관통</span>`);
        ctx.destroyMonster(o, target);
        if (over > 0) ctx.dealDamage(o, over, "관통");
      } else {
        ctx.log(`<span class="t">${p.name}</span> ${att.name}(공${atk}) → ${target.name}(방${d}) <span class="muted">통하지 않음</span>`);
      }
    }
  }
  att.exhausted = true;
}

// ============================================================
// summon effects
// ============================================================
function resolveOnSummon(g: GameState, ctx: Ctx, m: FieldMon): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  switch (m.onSummon) {
    case "draw1": { const n = ctx.drawN(p, 1); ctx.log(`  └ 소환 효과: ${n}장 드로우`); break; }
    case "def2":
      if (o.field.length) {
        g.pending = { kind: "oppMon", hint: "방어 -2 할 적 몬스터 선택", reason: "def2", allowCancel: false };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 없음");
      break;
    case "burn2": ctx.dealDamage(o, 2, "엠버 드레이크 소환"); break;
    case "heal6": ctx.heal(p, 6); ctx.log(`  └ 체력 6 회복 (${p.hp})`); break;
    case "refresh": rollSupply(g, p); ctx.log("  └ 제시를 무료 갱신"); break;
    case "breaktrap":
      if (o.traps.length) {
        const t = o.traps.splice(randInt(g, o.traps.length), 1)[0];
        o.discard.push(t.card);
        ctx.log("  └ 상대의 세트 함정 1장 파괴");
      } else ctx.log("  └ 파괴할 함정 없음");
      break;
  }
}

// ============================================================
// spells
// ============================================================
function tryNullSpell(g: GameState, ctx: Ctx, cardName: string): boolean {
  const o = g.players[1 - g.cur];
  const i = o.traps.findIndex((t) => t.card.react === "nullspell");
  if (i < 0) return false;
  const t = o.traps.splice(i, 1)[0];
  o.discard.push(t.card);
  ctx.log(`  └ <span class="dmg">상대 널 필드 → ${cardName} 무효화</span>`);
  return true;
}

function applySpell(g: GameState, ctx: Ctx, card: CardInst): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  switch (card.act) {
    case "dmg3": ctx.dealDamage(o, 3, card.name); break;
    case "dmg5": ctx.dealDamage(o, 5, card.name); break;
    case "dmg8": ctx.dealDamage(o, 8, card.name); break;
    case "exile":
      if (o.hand.length) {
        const c = o.hand.splice(randInt(g, o.hand.length), 1)[0];
        o.exile.push({ card: c, turns: 2 });
        ctx.log(`<span class="t">${p.name}</span> 마인드 플럭 → 상대 패 1장 2턴 제외`);
      } else ctx.log("  └ 상대 패가 없음");
      break;
    case "draw1": { const n = ctx.drawN(p, 1); ctx.log(`<span class="t">${p.name}</span> 마나 차지 → ${n}장 드로우`); break; }
    case "draw2": { const n = ctx.drawN(p, 2); ctx.log(`<span class="t">${p.name}</span> 더블 드로우 → ${n}장 드로우`); break; }
    case "crash": rollSupply(g, o); ctx.log(`<span class="t">${p.name}</span> 마켓 크래시 → 상대 제시 강제 갱신`); break;
    case "buffall": p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + 2)); ctx.log(`<span class="t">${p.name}</span> 오버로드 → 아군 전체 공격 +2`); break;
    case "siphon": ctx.dealDamage(o, 4, card.name); if (!g.over) { ctx.heal(p, 4); ctx.log(`  └ 체력 4 회복 (${p.hp})`); } break;
    case "blessing": ctx.heal(p, 12); ctx.log(`<span class="t">${p.name}</span> 대지의 축복 → 체력 12 회복`); ctx.drawN(p, 1); break;
  }
}

// ============================================================
// treasure
// ============================================================
function openTreasure(g: GameState, ctx: Ctx, p: PlayerState): void {
  const roll = randInt(g, 3);
  let txt = "", kind = "";
  if (roll === 0) { p.maxMana++; txt = "최대 마나 +1"; kind = "mana"; }
  else if (roll === 1) { ctx.heal(p, 10); txt = "체력 +10"; kind = "hp"; }
  else { p.maxHp += 5; p.hp += 5; txt = "최대 체력 +5"; kind = "maxhp"; ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 }); }
  ctx.log(`<span class="t">${p.name}</span> 보물상자 → <span class="good">${txt}</span>`);
  ctx.ev.push({ type: "treasure", player: side(g, p), kind, text: txt, isBot: p.isBot });
}

// ============================================================
// play / buy
// ============================================================
function summonMonster(g: GameState, ctx: Ctx, p: PlayerState, card: CardInst): void {
  const m: FieldMon = { ...card, exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn };
  p.field.push(m);
  ctx.log(`<span class="t">${p.name}</span> ${card.name} 소환 (공${card.atk}/방${card.def})`);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid });
  // Pitfall — opponent's trap destroys the summoned monster (effect doesn't resolve)
  const o = g.players[1 - g.cur];
  if (reactTrap(o, "pitfall")) {
    ctx.log(`  └ <span class="dmg">함정 함정 구덩이!</span> ${card.name} 파괴`);
    ctx.destroyMonster(p, m);
    return;
  }
  resolveOnSummon(g, ctx, m);
}

function playFromHand(g: GameState, ctx: Ctx, idx: number): void {
  const p = g.players[g.cur];
  const card = p.hand[idx];
  if (!card || p.mana < card.cost) return;

  if (card.t === "starter") {
    if (card.star === "trash") {
      p.mana -= card.cost; p.hand.splice(idx, 1);
      ctx.log(`<span class="t">${p.name}</span> ${card.name} → 이 카드 폐기`);
    } else if (card.star === "chest") {
      p.mana -= card.cost; p.hand.splice(idx, 1); p.discard.push(card);
      openTreasure(g, ctx, p);
    } else if (card.star === "mana") {
      p.mana -= card.cost; p.hand.splice(idx, 1); p.discard.push(card);
      p.maxMana++;
      ctx.log(`<span class="t">${p.name}</span> ${card.name} → 최대 마나 +1 (${p.maxMana})`);
    }
    return;
  }
  if (card.t === "mon") {
    p.mana -= card.cost; p.hand.splice(idx, 1);
    summonMonster(g, ctx, p, card);
    return;
  }
  if (card.t === "spell") {
    p.mana -= card.cost; p.hand.splice(idx, 1); p.discard.push(card);
    if (tryNullSpell(g, ctx, card.name)) return;
    if (card.act === "buff3" || card.act === "buff_perm") {
      if (!p.field.length) { ctx.log("  └ 대상 몬스터 없음"); return; }
      g.pending = { kind: "myMon", hint: card.act === "buff3" ? "공격 +3 할 자신 몬스터 선택" : "강화할 자신 몬스터 선택", reason: card.act, allowCancel: false };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      return;
    }
    if (card.act === "destroyMon") {
      const o = g.players[1 - g.cur];
      if (!o.field.length) { ctx.log("  └ 파괴할 적 몬스터 없음"); return; }
      g.pending = { kind: "oppMon", hint: "파괴할 적 몬스터 선택", reason: "destroyMon", allowCancel: false };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      return;
    }
    if (card.act === "seek") {
      if (!p.deck.length && !p.discard.length) { ctx.log("  └ 덱이 비어있음"); return; }
      g.pending = { kind: "seek", hint: "덱에서 1장 선택", reason: "seek", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      return;
    }
    if (card.act === "recall") {
      if (!p.discard.length) { ctx.log("  └ 버린 패가 없음"); return; }
      g.pending = { kind: "recall", hint: "버린 패에서 1장 선택", reason: "recall", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      return;
    }
    applySpell(g, ctx, card);
    return;
  }
  if (card.t === "trap") {
    p.mana -= card.cost; p.hand.splice(idx, 1);
    p.traps.push({ card });
    ctx.log(`<span class="t">${p.name}</span> 함정을 세트 (정체는 비공개)`);
    ctx.ev.push({ type: "trap", player: side(g, p), name: card.name });
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

  if (uid === null) {
    if (pending.allowCancel) g.pending = null;
    return;
  }
  g.pending = null;

  if (pending.kind === "oppMon") {
    const tm = o.field.find((m) => m.uid === uid);
    if (!tm) return;
    if (pending.reason === "def2") {
      tm.defMod = (tm.defMod || 0) - 2;
      ctx.log(`  └ ${tm.name} 의 방어 -2`);
    } else if (pending.reason === "destroyMon") {
      ctx.log(`<span class="t">${p.name}</span> 룬 파열 → ${tm.name} 파괴`);
      ctx.destroyMonster(o, tm);
    } else if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === (pending.data!.attackerUid as string));
      if (att) { ctx.ev.push({ type: "attack", player: side(g, p), uid: att.uid, targetUid: tm.uid }); resolveAttackCore(g, ctx, att, tm.uid); }
    }
  } else if (pending.kind === "myMon") {
    const tm = p.field.find((m) => m.uid === uid);
    if (!tm) return;
    if (pending.reason === "buff3") {
      tm.tempAtk = (tm.tempAtk || 0) + 3;
      ctx.log(`<span class="t">${p.name}</span> 샤픈 → ${tm.name} 공격 +3`);
    } else if (pending.reason === "buff_perm") {
      tm.atkMod = (tm.atkMod || 0) + 2;
      tm.defMod = (tm.defMod || 0) + 2;
      ctx.log(`<span class="t">${p.name}</span> 강화 주문 → ${tm.name} 공격+2 / 방어+2`);
    }
  } else if (pending.kind === "seek") {
    const i = p.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) { p.hand.push(p.deck.splice(i, 1)[0]); shuffle(g, p.deck); ctx.log(`<span class="t">${p.name}</span> 시크 → 1장 서치`); }
  } else if (pending.kind === "recall") {
    const i = p.discard.findIndex((c) => c.uid === uid);
    if (i >= 0) { p.hand.push(p.discard.splice(i, 1)[0]); ctx.log(`<span class="t">${p.name}</span> 리콜 → 1장 회수`); }
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
      ctx.log(`<span class="dmg">${g.players[action.player].name} 기권</span>`);
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
    case "play":
      playFromHand(g, ctx, action.idx);
      break;
    case "buyMarket": {
      const card = g.market[action.i];
      if (card && p.mana >= card.cost) {
        p.mana -= card.cost; p.discard.push(inst(g, card.id));
        p.boughtCount++; p.taxFlag = true;
        ctx.log(`<span class="t">${p.name}</span> 고정 마켓 ${card.name} 구매 (${card.cost}) <span class="muted">[비공개]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "market", i: action.i });
      }
      break;
    }
    case "buySupply": {
      const price = supplyPrice(p);
      const card = p.supply[action.i];
      if (card && p.mana >= price) {
        p.mana -= price; p.discard.push(inst(g, card.id));
        p.supply[action.i] = null; p.boughtCount++; p.taxFlag = true;
        ctx.log(`<span class="t">${p.name}</span> 제시 마켓 구매 (${price}) <span class="muted">[비공개]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "supply", i: action.i });
      }
      break;
    }
    case "refresh":
      if (p.mana >= 1) { p.mana -= 1; rollSupply(g, p); ctx.log(`<span class="t">${p.name}</span> 제시 갱신 (1 마나)`); }
      break;
    case "attack": {
      const m = p.field.find((x) => x.uid === action.uid);
      if (!m || m.exhausted) break;
      const o = g.players[1 - g.cur];
      if (o.field.length === 0) {
        ev.push({ type: "attack", player: side(g, p), uid: m.uid, targetUid: null });
        resolveAttackCore(g, ctx, m, null);
      } else {
        g.pending = { kind: "oppMon", hint: "공격할 적 몬스터 선택", reason: "attack", allowCancel: true, data: { attackerUid: m.uid } };
        ev.push({ type: "needTarget", pending: g.pending });
      }
      break;
    }
    case "endTurn":
      endTurn(g, ctx);
      break;
  }
  return { state: g, events: ev };
}
