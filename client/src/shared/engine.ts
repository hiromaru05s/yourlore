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
  Action, CardDef, CardInst, Enchant, FieldMon, GameEvent, GameState, PlayerState, ReduceResult, Side, TrapSet,
} from "./types";
import { ALL_IDS, BUYABLE_POOL, DB, STARTERS, TRIBES, DEFAULT_DECK_8, RANDOM_CARDS, sanitizeDeck, hasPassive, PASSIVES , isChestCard } from "./cards";

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
/** Permanently-exiled zone (lazy init for states persisted before this field existed). */
function rmz(pl: PlayerState): CardInst[] { return (pl.removed ??= []); }
/** Reset a field card to its printed form without changing the physical card identity. */
function resetInst(card: CardInst): CardInst {
  const def = DB[card.id] ?? STARTERS[card.id];
  if (!def) return card;
  const reset = { uid: card.uid, ...structuredClone(def) } as CardInst & { token?: boolean };
  if ("token" in card) reset.token = (card as FieldMon).token;
  return reset;
}

/** Remember every real card that has entered a public zone. Knowledge lasts for the whole game. */
function rememberPublicCards(g: GameState): void {
  for (const p of g.players) {
    const known = (p.revealedCards ??= []);
    const knownUids = new Set(known.map((c) => c.uid));
    const publicCards: CardInst[] = [
      ...p.discard,
      ...(p.field as CardInst[]),
      ...p.enchants.map((e) => e.card),
      ...rmz(p),
    ];
    for (const card of publicCards) {
      if ((card as CardInst & { token?: boolean }).token || knownUids.has(card.uid)) continue;
      known.push({ uid: card.uid, id: card.id });
      knownUids.add(card.uid);
    }
  }
}
// 적룡(spellAmp): >0 이면 지금 마법 효과가 해결되는 중 — reduce()는 동기라 모듈 플래그로 충분
let spellDepth = 0;
let runeEchoDepth = 0; // 룬 학문 - 상급(v34) 재발동 가드
// 흡혈 술식(bloodShield): >0 이면 지금 "피의 마법" 효과가 해결되는 중
let bloodDepth = 0;
/** "피의 마법" 계열 판정 — 카드 이름 접두사 기준 (기본/응용/희로애락 전부 포함) */
function isBloodMagic(c: { name: string }): boolean { return (c.name || "").startsWith("피의 마법"); }
/** '흡혈귀' 계열 판정 — 이름 기준 + 명시적 편입 카드(뱀파이어 집사). 극의 보호/비술 파괴 대상 공용. */
export function isVampFamily(c: { name?: string; id?: string }): boolean {
  return (c.name || "").includes("흡혈귀") || c.id === "VAMP_BUTLER";
}
/** '골램' 계열 판정 — 이름 기준 (골램/골렘 표기 혼용). 골램 킹 조건 / 마나 골렘 / 자이언트 골램 / 특공부대 공용. */
export function isGolem(c: { name?: string }): boolean { const nm = c.name || ""; return nm.includes("골램") || nm.includes("골렘"); }
/** '병사' 계열 (병사 토큰 · 병사 골램) */
export function isSoldier(c: { id?: string }): boolean { return c.id === "SOLDIER2"; } // v37: 병사 토큰만 (병사 골램은 골램 계열)
/** 어튠 계열 (스타터 어튠 + 어튠 - 흑/진/마) — 어튠 무효 장치(T1) 대상 */
export function isAttuneCard(c: { star?: string; name?: string }): boolean { return c.star === "mana" || (c.name || "").includes("어튠"); }
/** 자신 필드의 '성' (v37) */
export function castleOf(p: PlayerState): FieldMon | undefined { return p.field.find((m) => m.id === "CASTLE"); }
/** '기사'(구 무한의 기사) 토큰 — id 기준 (몰락한 기사 등 이름 충돌 방지) */
export function isKnight(c: { id?: string }): boolean { return c.id === "INFKNIGHT"; }
/** '암살자' 계열 — 이름 기준 (암살자 4종 + 길드 지부/본부 + 길드 보물상자) */
export function isAssassinCard(c: { name?: string }): boolean { return (c.name || "").includes("암살자"); }
/** '주술사' 계열 (v39: 견습/초급/중급/상급/특급 주술사) — 특급 주술사 켈로이드(hexBoss) 공격력 +5 대상 */
export function isHexer(c: { name?: string }): boolean { return (c.name || "").includes("주술사"); }
/** 덱 구성(덱·패·묘지·필드) — "デッキ構成" 판정 공용 */
export function deckComp(p: PlayerState): CardInst[] { return [...p.deck, ...p.hand, ...p.discard, ...(p.field as CardInst[])]; }
const MIMIC_IDS = new Set(["MIMIC", "MIMIC2", "AWAKENED_MIMIC", "MIMIC_KING", "MIMIC_KING2", "ORIGIN_MIMIC", "MIMIC_LORD"]);
export const MAX_MANA = 30;
/** v40: 최대 마나 하한 — 어떤 효과(마족·경제 위기·카지노 ⑥ 등)로도 3 아래로 내려가지 않는다. */
export const MIN_MANA = 3;
/** v40: 손패 상한 — 손패는 턴 종료에 버리지 않고 유지되므로 초과 드로우는 묘지로 간다. */
export const HAND_MAX = 8;
/** v40: 고정 마켓 슬롯당 재고 — 다 팔리면 그 슬롯은 새 무작위 카드(1~6코)로 교체된다. */
export const MARKET_STOCK = 3;
/** 유리 병기 금지령: while active (either side), monsters with DEF<=1 cannot attack. */
export function glassBanActive(g: GameState): boolean {
  return g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "glassBan"));
}
// clickable card name for the battle log (UI zooms the card on click + localizes the name by id)
function cn(c: { id: string; name: string }): string { return `<b class="log-card" data-card="${c.id}">${c.name}</b>`; }
function tribeName(tribe: string, lang: "ko" | "ja"): string { return TRIBES[tribe]?.[lang]?.name ?? tribe; }

// ---------- pure read helpers (exported; used by UI + bot) ----------
export function effMaxMana(p: PlayerState): number {
  const aura = p.field.filter((m) => m.aura === "mana1").length
    + p.field.filter((m) => m.aura === "mana2").length * 2 // (구) 마나 골렘(+1) / 마나 수정 거인(+2)
    // 마나 골렘(v36 manaGolem): 자신 필드의 다른 '골램' 계열 1체당 최대 마나 +1
    + p.field.filter((m) => m.aura === "manaGolem").reduce((s2, m) => s2 + p.field.filter((x) => x.uid !== m.uid && isGolem(x)).length, 0);
  // 다양한 문화: while active, +1 max mana per non-시초 tribe monster you control
  const culture = p.enchants.some((e) => e.card.ench === "cultureMana")
    ? p.field.filter((m) => m.tribe && m.tribe !== "시초").length : 0;
  const heart = p.enchants.filter((e) => e.card.ench === "growHpMana").length * 2; // 세계수의 심장: 장당 -2
  let total = p.maxMana + aura + culture - heart - p.manaPenalty;
  // 마족 전사(demonTax2): 필드에 있는 동안 -2/장 — 단 이 차감으로 3 밑으로는 내려가지 않는다
  const demonTax = p.field.filter((m) => m.aura === "demonTax2").length * 2;
  if (demonTax > 0) total = Math.max(Math.min(total, 3), total - demonTax);
  return Math.min(MAX_MANA, Math.max(MIN_MANA, total));
}
/** 콜로세움(v41)이 소환할 수 있는 '선택받은' 시리즈. */
const CHOSEN_IDS = ["CHOSEN_KNIGHT", "CHOSEN_MAGE", "CHOSEN_ARCHER", "CHOSEN_ROGUE"];
/** 게임에서 제외된 자신의 '컬' 수 — 선택받은 시리즈/선택받은 영역 공용. */
export function cullExiled(p: PlayerState): number {
  return (p.removed ?? []).filter((c) => c.star === "trash").length;
}
/** '컬' n장을 게임에서 제외 (묘지 → 덱 → 패 순). 실제로 제외한 장수를 돌려준다. */
function exileCulls(p: PlayerState, n: number): number {
  let ex = 0;
  for (let i = 0; i < n; i++) {
    let done = false;
    for (const z of [p.discard, p.deck, p.hand]) { const ci = z.findIndex((c) => c.star === "trash"); if (ci >= 0) { rmz(p).push(z.splice(ci, 1)[0]); ex++; done = true; break; } }
    if (!done) break;
  }
  return ex;
}
/** 무법지대(v41 lawless): 몬스터의 체력(최대)을 1로 만든다 — 누적 데미지도 초기화. */
function setHpOne(p: PlayerState, m: FieldMon): void {
  m.defMod = (m.defMod || 0) - (effDef(p, m) - 1);
  m.dmg = 0;
}
/** 공간 술식(v41b spaceLock): 상대 필드에 있는 동안 자신은 몬스터 소환·마법(스타터 포함) 사용 불가. */
function spaceLocked(g: GameState, p: PlayerState): boolean {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  return o.enchants.some((e) => e.card.ench === "spaceLock");
}
/** 카드를 플레이(패에서 사용)할 때마다 — 무상의 대가(v41b freeReward): 코스트 0 카드면 장당 1드로우. */
function afterPlay(g: GameState, ctx: Ctx, p: PlayerState, card: CardInst): void {
  if ((card.cost ?? 0) !== 0 || g.over) return;
  for (const e of p.enchants) {
    if (e.card.ench !== "freeReward") continue;
    const n = ctx.drawN(p, 1);
    if (n > 0) ctx.log(`  └ ${cn(e.card)}: 코스트 0 카드 플레이 → 1장 드로우`, `  └ ${cn(e.card)}: コスト0カードをプレイ → 1枚ドロー`);
  }
}
function lawlessActive(g: GameState): boolean {
  return g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "lawless"));
}
export function effAtk(p: PlayerState, m: FieldMon): number {
  let a = m.atk! + (m.tempAtk || 0) + (m.atkMod || 0);
  if (m.condAtk === "twoPlus" && p.field.length >= 2) a += m.val ?? 2; // 보너스량 = val (기본 2)
  if (m.condAtk === "hp45" && p.hp >= 45) a += 1; // 혈기왕성: 체력 45+면 +1/+3
  // 선택받은 시리즈: 제외된 컬 2장당 스케일링 (반내림)
  if (m.condAtk === "cullPlus") a += Math.floor(cullExiled(p) / 2);
  if (m.condAtk === "cullAtk1") a += Math.floor(cullExiled(p) / 2);
  if (m.condAtk === "cullAtk2") a += Math.floor(cullExiled(p) / 2) * 2;
  // 시초의 군주(originLord): 자신 필드의 모든 시초 몬스터 +3/+3 (군주 1장당)
  if (m.tribe === "시초") a += p.field.filter((x) => x.aura === "originLord").reduce((s2, x) => s2 + (x.val || 3), 0);
  // 특급 주술사 켈로이드(v39 hexBoss): 자신 필드의 '주술사' 계열 전체 공격력 +5 (켈로이드 1체당)
  if (isHexer(m)) a += p.field.filter((x) => x.aura === "hexBoss").reduce((s2, x) => s2 + (x.val || 5), 0);
  return Math.max(0, a);
}
export function effDef(p: PlayerState, m: FieldMon): number {
  // 은빛 성벽(wallDef): +val to every friendly monster's defense while on field
  const wall = p.field.filter((x) => x.aura === "wallDef").reduce((s, x) => s + (x.val || 3), 0);
  const hpb = m.condAtk === "hp45" && p.hp >= 45 ? 3 : 0;
  const cull = m.condAtk === "cullPlus" ? Math.floor(cullExiled(p) / 2) : 0; // 선택받은 검사/마법사: 컬 2장당 +1/+1
  // 시초의 군주(originLord): 자신 필드의 모든 시초 몬스터 +3/+3 (군주 1장당)
  const lord = m.tribe === "시초" ? p.field.filter((x) => x.aura === "originLord").reduce((s2, x) => s2 + (x.val || 3), 0) : 0;
  return Math.max(1, m.def! + (m.defMod || 0) + wall + hpb + cull + lord);
}
/** v24 HP-combat: a monster's CURRENT HP - max HP (effDef) minus accumulated damage. */
export function curHp(p: PlayerState, m: FieldMon): number {
  return Math.max(0, effDef(p, m) - (m.dmg || 0));
}
/** Cost to BUY a card, after 동족의 부름(kinDiscount): tribe cards cost -2 (min 1) while you control a tribe monster. */
export function buyCost(p: PlayerState, c: CardInst): number {
  // 엘프의 쉼터(elfHaven): '세계수' 이름 카드는 구매 코스트 0
  if ((c.name || "").includes("세계수") && p.enchants.some((e) => e.card.ench === "elfHaven")) return 0;
  let cost = c.cost;
  if (c.tribe && p.field.some((m) => !!m.tribe) && p.enchants.some((e) => e.card.ench === "kinDiscount")) {
    cost = Math.max(1, cost - 2);
  }
  // 다종족 계약(v37 tribeContract): 종족 몬스터 구매 코스트 -1 (최소 1)
  if (c.tribe && p.enchants.some((e) => e.card.ench === "tribeContract")) cost = Math.max(1, cost - 1);
  // 함정 기술자(v36 trapDiscount): 필드에 있는 동안 함정 구매 코스트 -1
  if (c.t === "trap" && p.field.some((m) => m.aura === "trapDiscount")) cost = Math.max(0, cost - 1);
  return cost * (p.manaCostMult ?? 1); // 마족 4종: 소모 마나 3배
}
/** 0코스트 구매는 턴당 이 장수까지. 고정 마켓은 재고가 줄지 않으므로 상한이 없으면
 *  엘프의 쉼터(구매 코스트 0)로 한 턴에 무한 구매가 성립한다.
 *  bot.ts 의 buyableByBot 은 봇 전용 가드였고, 사람 플레이어에겐 상한이 없었다. */
export const FREE_BUY_MAX = 3;
/** 이번 턴 0코스트 구매 한도를 이미 소진했는가 (구매가 0일 때만 적용). */
export function freeBuyBlocked(p: PlayerState, c: CardInst): boolean {
  return buyCost(p, c) === 0 && (p.freeBuysTurn ?? 0) >= FREE_BUY_MAX;
}
/** 제시(supply) shows cards whose cost is in [1, maxMana]. */
export function supplyRange(p: PlayerState): [number, number] {
  return [1, effMaxMana(p)];
}
/** Cost to PLAY a card from hand (may be < its buy cost).
 *  p를 넘기면 플레이어 상태 의존 할인(엘프의 쉼터: '세계수' 카드 시전 0)을 반영한다. */
export function playCost(c: CardInst, p?: PlayerState): number {
  if (p && (c.name || "").includes("세계수") && p.enchants.some((e) => e.card.ench === "elfHaven")) return 0;
  let base = c.play ?? c.cost;
  // 대현자(v36 sageDiscount): 덱 구성에 마법이 13장 이상이면 마법 시전 코스트 -1
  if (p && c.t === "spell" && p.field.some((m) => m.aura === "sageDiscount") && deckComp(p).filter((x) => x.t === "spell").length >= 13) base = Math.max(0, base - 1);
  return base * (p?.manaCostMult ?? 1); // 마족 4종: 소모 마나 3배
}
export function cardValue(c: CardInst): number {
  // offense-weighted + cost factor so the bot favors bigger threats
  // val 캡: 영구마법류는 val>=99가 '지속시간'이라 효과 크기로 오인하면 안 됨
  if (c.t === "mon") return (c.atk || 0) * 1.3 + (c.def || 0) * 0.8 + c.cost * 0.7;
  if (c.t === "spell") return 6 + Math.min(c.val || 0, 10) * 0.6 + c.cost * 0.6;
  if (c.t === "trap") return 6 + Math.min(c.val || 0, 10) * 0.5 + c.cost * 0.5;
  return 1;
}

// ---------- player / game construction ----------
function mkPlayer(g: GameState, id: string, name: string, isBot: boolean, deckIds?: string[]): PlayerState {
  // 초기 덱 9장 = 어튠 1장 고정 + 자유 8장 (미지정 시 기본덱: 컬6 + 보물상자2)
  const ids = ["STARTER_MANA", ...sanitizeDeck(deckIds ?? DEFAULT_DECK_8)];
  const deck = ids.map((k) => (STARTERS[k] ? starter(g, k) : inst(g, k)));
  shuffle(g, deck);
  return {
    id, name, isBot,
    hp: 30, maxHp: 30, mana: 4, maxMana: 4,
    manaPenalty: 0, nextPenalty: 0,
    deck, hand: [], discard: [], exile: [],
    field: [], traps: [], supply: [],
    boughtCount: 0, taxFlag: false,
    enchants: [], tribesFired: [], bonusDrawPerm: 0, bleed: 0,
    uses: {}, buys: {}, usesTurn: {}, playsTurn: 0, freeBuysTurn: 0, removed: [], revealedCards: [], supplyShrink: 0, defendHeal: 0, manaGainNext: 0, skipNext: false, skipTurns: 0,
  };
}

function normalizeManaCaps(g: GameState): void {
  for (const p of g.players) {
    p.maxMana = Math.min(MAX_MANA, Math.max(MIN_MANA, p.maxMana));
    p.mana = Math.min(p.mana, effMaxMana(p));
    if ((p.skipTurns ?? 0) < 0) p.skipTurns = 0;
  }
}

export interface CreateOpts {
  seed?: number;
  mode: "bot" | "online";
  p0: { id: string; name: string; isBot?: boolean; deck?: string[] };
  p1: { id: string; name: string; isBot?: boolean; deck?: string[] };
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
  g.players[0] = mkPlayer(g, opts.p0.id, opts.p0.name, !!opts.p0.isBot, opts.p0.deck);
  g.players[1] = mkPlayer(g, opts.p1.id, opts.p1.name, !!opts.p1.isBot, opts.p1.deck);
  // v40: starting player 40 HP, the player going second 45 HP (tempo compensation; was 35/42)
  const start = (opts.starting ?? 0) as Side;
  const second = (1 - start) as Side;
  g.players[start].hp = 40; g.players[start].maxHp = 40;
  g.players[second].hp = 45; g.players[second].maxHp = 45;
  // STANDARD market: 8 DISTINCT random cards of cost 1–6 (mixed types, 스타팅 전용 제외)
  // v20: 1–4 → 1–6 — 저코만 나오면 구조적으로 어그로 판이 과다해져 상한 확대
  const lowAvail = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= 6 && !DB[id].noShop);
  g.market = [];
  while (g.market.length < MARKET_SIZE && lowAvail.length) g.market.push(inst(g, lowAvail.splice(randInt(g, lowAvail.length), 1)[0]));
  g.marketStock = g.market.map(() => MARKET_STOCK); // v40: 슬롯당 재고 3

  const ev: GameEvent[] = [];
  const ctx = makeCtx(g, ev);
  g.players.forEach((p) => rollSupply(g, p));
  ctx.drawN(g.players[g.cur], 3);
  ctx.log(
    '<span class="t">게임 시작.</span> 초기 덱 · 3장 드로우 · 마나 4.',
    '<span class="t">ゲーム開始。</span> 初期デッキ · 3枚ドロー · マナ4。',
  );
  beginTurn(g, ctx, true);
  normalizeManaCaps(g);
  rememberPublicCards(g);
  return { state: g, events: ev };
}

function rollSupply(g: GameState, p: PlayerState): void {
  const hi = effMaxMana(p);
  const inMarket = new Set(g.market.map((c) => c.id)); // 고정 마켓과 중복 금지
  const pool = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= hi && DB[id].cost > 0 && !DB[id].noShop && !inMarket.has(id));
  const avail = pool.slice();
  const want = p.supplyShrink > 0 ? Math.max(2, 4 - p.supplyShrink) : 4; // 마켓 크래시: 다음 제시 축소 (v34: 최대 2장까지)
  if (p.supplyShrink > 0) p.supplyShrink = 0;
  const picks: (CardInst | null)[] = [];
  while (picks.length < want && avail.length) picks.push(inst(g, avail.splice(randInt(g, avail.length), 1)[0])); // distinct
  while (picks.length < want) picks.push(pool.length ? inst(g, pool[randInt(g, pool.length)]) : null);
  while (picks.length < 4) picks.push(null); // keep 4 slots; shrunk rolls leave an empty slot
  p.supply = picks;
  // 기록자(v36): 제시 이력 기록 (갱신분 포함) — 최근 40회만 보관
  const hist = (p.supplyHist ??= []);
  hist.push({ turn: g.turn, ids: picks.filter((c): c is CardInst => !!c).map((c) => c.id) });
  if (hist.length > 40) hist.splice(0, hist.length - 40);
}

// ============================================================
// mutation context
// ============================================================
/** v40: 고정 마켓 슬롯 i의 남은 재고 (구 저장 상태 호환 — 필드가 없으면 기본 재고). */
export function marketStockOf(g: GameState, i: number): number {
  return g.marketStock?.[i] ?? MARKET_STOCK;
}
/** v40: 고정 마켓 구매 → 재고 -1. 0이 되면 그 슬롯을 현재 마켓에 없는 새 무작위 카드(1~6코, 스타팅 전용 제외)로 교체하고 재고를 채운다. */
function consumeMarketStock(g: GameState, ctx: Ctx, i: number): void {
  if (!g.marketStock || g.marketStock.length !== g.market.length) g.marketStock = g.market.map((_, k) => g.marketStock?.[k] ?? MARKET_STOCK);
  g.marketStock[i] = marketStockOf(g, i) - 1;
  if (g.marketStock[i] > 0) return;
  const inMarket = new Set(g.market.map((c) => c.id));
  const pool = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= 6 && !DB[id].noShop && !inMarket.has(id));
  const old = g.market[i];
  if (!pool.length) { g.marketStock[i] = MARKET_STOCK; return; }
  const next = inst(g, pool[randInt(g, pool.length)]);
  g.market[i] = next;
  g.marketStock[i] = MARKET_STOCK;
  ctx.log(`  └ 고정 마켓 ${cn(old)} 매진 → ${cn(next)} 입고 (재고 ${MARKET_STOCK})`, `  └ 固定マーケット ${cn(old)} 売り切れ → ${cn(next)} 入荷 (在庫${MARKET_STOCK})`);
  ctx.ev.push({ type: "marketRestock", i, id: next.id });
}
/** v40 신기(relic): 어떤 경로로 게임에서 제외되어도 제외 존에 머물지 않고 주인의 묘지로 돌아온다 (어튠). */
function sweepRelics(g: GameState, ctx: Ctx): void {
  for (const pl of g.players) {
    const rz = pl.removed;
    if (!rz?.length) continue;
    for (let k = rz.length - 1; k >= 0; k--) {
      const c = rz[k];
      if (!hasPassive(c, "relic")) continue;
      rz.splice(k, 1);
      pl.discard.push(c);
      ctx.log(`  └ <span class="good">신기</span>: ${cn(c)} 은(는) 게임에서 제외되지 않는다 — 묘지로`, `  └ <span class="good">神器</span>: ${cn(c)} はゲームから除外されない — 墓地へ`);
    }
  }
}

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
      if (!c) continue;
      if (p.hand.length >= HAND_MAX) { // v40: 손패 상한 — 초과분은 묘지로
        p.discard.push(c);
        log(`  └ <span class="muted">손패 상한(${HAND_MAX}) — ${cn(c)} 은(는) 묘지로</span>`, `  └ <span class="muted">手札上限(${HAND_MAX}) — ${cn(c)} は墓地へ</span>`);
        continue;
      }
      p.hand.push(c); drawn++;
    }
    if (drawn > 0) ev.push({ type: "draw", player: side(g, p), count: drawn });
    return drawn;
  };
  const heal = (p: PlayerState, amt: number): void => {
    if (amt <= 0) return;
    p.hp = Math.min(p.maxHp, p.hp + amt);
    ev.push({ type: "heal", player: side(g, p), amount: amt });
    // 유령 — v25: 상대가 체력을 회복할 때마다 필드의 모든 유령 공격력 +1 (지속)
    {
      const foe = g.players[1 - side(g, p)];
      let gh = 0;
      for (const m of foe.field) if (m.id === "GHOST") { m.atkMod = (m.atkMod || 0) + 1; gh++; }
      if (gh > 0) log(`  └ 유령의 원한: 유령 ${gh}체 공격력 +1`, `  └ 幽霊の怨念: 幽霊${gh}体の攻撃力+1`);
    }
    // 생명의 순환: 회복할 때마다 (장당) 주사위 6이면 최대 마나 +1
    for (const e of p.enchants) {
      if (e.card.ench === "healMana" && diceChanceRaw(g, ev, log, side(g, p), 50)) { // v34: 🎲 4+
        p.maxMana += 1;
        log(`  └ 생명의 순환: 최대 마나 +1 (${p.maxMana})`, `  └ 生命の循環: 最大マナ +1 (${p.maxMana})`);
      }
    }
  };
  const dealDamage = (target: PlayerState, amt: number, srcKo: string, srcJa?: string): void => {
    if (amt <= 0) return;
    // 살생의 극의(slayArt): +2 to every hit dealt to a player, per active copy (either side)
    const slay = g.players.reduce((s, pl) => s + pl.enchants.filter((e) => e.card.ench === "slayArt").length, 0);
    if (slay > 0) amt += 3 * slay; // v34: +2 → +3
    // 적룡(spellAmp): 자신의 마법이 상대에게 데미지를 줄 때마다 +3 (필드의 적룡 1마리당)
    if (spellDepth > 0 && target === g.players[1 - g.cur]) {
      const amp = g.players[g.cur].field.filter((m) => m.aura === "spellAmp").length * 3;
      if (amp > 0) { amt += amp; log(`  └ 적룡의 화염: 마법 데미지 +${amp}`, `  └ 赤竜の炎: 魔法ダメージ+${amp}`); }
    }
    // 혈귀술(spellHeal): 양 플레이어는 마법 데미지를 받지 않고 그만큼 회복 (어느 쪽 필드에 있든)
    if (spellDepth > 0 && g.players.some((pl) => pl.enchants.some((e2) => e2.card.ench === "spellHeal"))) {
      log(`  └ 혈귀술: ${amt} 데미지 → 회복으로 반전`, `  └ 血鬼術: ${amt} ダメージ → 回復に反転`);
      heal(target, amt);
      return;
    }
    // 흡혈 술식(bloodShield): 자신이 시전한 "피의 마법"의 자해 데미지 무효
    if (bloodDepth > 0 && target === g.players[g.cur] && target.enchants.some((e2) => e2.card.ench === "bloodShield")) {
      log(`  └ 흡혈 술식: 피의 마법 데미지 무효`, `  └ 吸血術式: 血の魔法のダメージ無効`);
      return;
    }
    target.hp -= amt;
    // 고통 수확: 상대(=target)가 데미지를 입을 때마다 컬 1장 획득
    for (const pl of g.players) {
      if (pl !== target && pl.enchants.some((e2) => e2.card.ench === "cullOnHit")) { rmz(pl).push(starter(g, "STARTER_TRASH"), starter(g, "STARTER_TRASH")); } // v34: 제외된 컬 2장
    }
    // 노 페인 노 게인(v41b painGain): 자신이 데미지를 받을 때마다 (장당) 🎲 6이면 최대 마나 +1
    for (const e of target.enchants) {
      if (e.card.ench !== "painGain" || target.hp <= 0) continue;
      const { rolls: pr } = diceRoll(g, ev, side(g, target), 1);
      if (pr[0] === 6) { target.maxMana += 1; log(`  └ ${cn(e.card)}: 🎲 6! 최대 마나 +1 (${target.maxMana})`, `  └ ${cn(e.card)}: 🎲 6！最大マナ+1 (${target.maxMana})`); }
      else log(`  └ ${cn(e.card)}: 🎲 ${pr[0]}`, `  └ ${cn(e.card)}: 🎲 ${pr[0]}`);
    }
    const dealer: Side = (target === g.players[0] ? 1 : 0);
    g.dmgTally[dealer] += amt;
    const hp = Math.max(0, target.hp);
    log(
      `  └ <span class="dmg">${amt} 데미지</span> → ${target.name} (체력 ${hp}) <span class="muted">[${srcKo}]</span>`,
      `  └ <span class="dmg">${amt} ダメージ</span> → ${target.name} (体力 ${hp}) <span class="muted">[${srcJa ?? srcKo}]</span>`,
    );
    ev.push({ type: "damage", player: side(g, target), amount: amt, srcKo, srcJa: srcJa ?? srcKo });
    if (target.hp <= 0) handleDefeat(g, ctx, target, dealer);
  };
  const destroyMonster = (owner: PlayerState, m: FieldMon): void => {
    destroyMonsterCore(owner, m);
    // 아우라(체력 공급원)가 사라지면 다른 몬스터의 누적 데미지가 최대 체력을 넘을 수 있다
    if (!g.over && (m.aura === "wallDef" || m.aura === "originLord" || m.aura === "summonBuff")) recheckDeaths(g, ctx as Ctx);
  };
  const destroyMonsterCore = (owner: PlayerState, m: FieldMon): void => {
    // 흡혈의 극의(vampWard): 필드에 있는 한 양 필드의 '흡혈귀'는 파괴되지 않는다
    if (isVampFamily(m) && g.players.some((pl) => pl.enchants.some((e2) => e2.card.ench === "vampWard"))) {
      log(`  └ 흡혈의 극의: ${cn(m)} 파괴되지 않음`, `  └ 吸血の極意: ${cn(m)} は破壊されない`);
      return;
    }
    const i = owner.field.findIndex((x) => x.uid === m.uid);
    if (i >= 0) {
      const dead = owner.field.splice(i, 1)[0];
      // 폭풍의 광전사(drainMana): restore the opponent's max mana it was draining
      if (dead.aura === "drainMana") { const opp2 = g.players[0] === owner ? g.players[1] : g.players[0]; opp2.maxMana += (dead.drained ?? (dead.val || 3)); }
      // 공허(void): 토큰·공허 패시브 몬스터는 죽으면 게임에서 제외 — 덱 순환에 들어가지 않는다
      if (dead.token || hasPassive(dead, "void")) rmz(owner).push(resetInst(dead));
      else owner.discard.push(resetInst(dead));
      ev.push({ type: "destroy", player: side(g, owner), uid: m.uid, id: dead.id });
      (owner.destroyedLog ??= []).push({ id: dead.id, turn: g.turn }); if (owner.destroyedLog.length > 20) owner.destroyedLog.shift(); // v41b 윤회
      // 리더 골램(v36 leaderGolem): 자신 필드의 몬스터가 쓰러질 때마다 기합 카운터 +1
      for (const lg of owner.field) if (lg.aura === "leaderGolem") { lg.guts = (lg.guts || 0) + 1; log(`  └ ${cn(lg)} 기합 카운터 +1 (${lg.guts})`, `  └ ${cn(lg)} 気合カウンター+1 (${lg.guts})`); }
      // 공허의 공성병(v36): 파괴되면 자신 필드에 병사 1체
      if (dead.id === "GM6_8" && !g.over) { spawnToken(g, ctx as Ctx, owner, "SOLDIER2"); log(`  └ ${cn(dead)} 최후의 명령 — 병사(2/2) 소환`, `  └ ${cn(dead)} 最後の号令 — 兵士(2/2)召喚`); }
      // 미믹의 은신처(mimicLair): 자신의 미믹 계열이 파괴되면 — 제외된 미믹 계열 ×2 데미지
      if (!g.over && MIMIC_IDS.has(dead.id)) {
        const li = owner.traps.findIndex((t) => t.card.react === "mimicLair");
        if (li >= 0) {
          const lt = owner.traps.splice(li, 1)[0].card;
          owner.discard.push(lt);
          ev.push({ type: "trapReveal", player: side(g, owner), id: lt.id });
          const oppL = g.players[0] === owner ? g.players[1] : g.players[0];
          const dmgL = rmz(owner).filter((c) => MIMIC_IDS.has(c.id)).length * 2;
          log(`  └ <span class="dmg">함정 ${cn(lt)}!</span> 제외된 미믹 계열 ×2 = ${dmgL} 데미지`, `  └ <span class="dmg">トラップ ${cn(lt)}!</span> 除外ミミック系×2 = ${dmgL}ダメージ`);
          if (dmgL > 0) dealDamage(oppL, dmgL, cn(lt), cn(lt));
        }
      }
      // 굶주린 추격자(scavenger): 상대 몬스터가 파괴될 때마다 🎲 5+면 그 복제를 자신 필드에 소환
      if (!g.over) {
        for (const pl of g.players) {
          if (pl === owner) continue;
          for (const sc of [...pl.field].filter((x) => x.aura === "scavenger")) {
            if (pl.field.length >= FIELD_MAX) break;
            const { rolls: scv } = diceRoll(g, ev, side(g, pl), 1, 5);
            if (scv[0] >= 5) {
              spawnToken(g, ctx as Ctx, pl, dead.id);
              log(`  └ <span class="good">${cn(sc)}</span> 🎲 ${scv[0]} → ${cn(dead)} 의 복제를 소환`, `  └ <span class="good">${cn(sc)}</span> 🎲 ${scv[0]} → ${cn(dead)} の複製を召喚`);
            } else log(`  └ ${cn(sc)} 🎲 ${scv[0]} — 복제 실패`, `  └ ${cn(sc)} 🎲 ${scv[0]} — 複製失敗`);
          }
        }
      }
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
  const skips = (p.skipTurns ?? 0) + (p.skipNext ? 1 : 0);
  if (!first && skips > 0) { // 시공간 조작: queued skips stack
    p.skipTurns = Math.max(0, skips - 1);
    p.skipNext = false;
    const left = p.skipTurns > 0 ? ` (${p.skipTurns}회 남음)` : "";
    const leftJa = p.skipTurns > 0 ? ` (残り${p.skipTurns}回)` : "";
    ctx.log(`<span class="dmg">${p.name} 턴 스킵!</span>${left}`, `<span class="dmg">${p.name} ターンスキップ!</span>${leftJa}`);
    endTurn(g, ctx);
    return;
  }
  // 고독 4종 시너지(soloCurse): 주사위 5 이상이어야만 턴을 진행할 수 있다
  if (!first && p.soloCurse && !g.over) {
    const { rolls: scr } = diceRoll(g, ctx.ev, g.cur, 1, 5);
    if (scr[0] < 5) {
      ctx.log(`<span class="dmg">고독의 저주</span> 🎲 ${scr[0]} — ${p.name} 의 턴이 넘어간다`, `<span class="dmg">孤独の呪い</span> 🎲 ${scr[0]} — ${p.name} のターンが飛ばされる`);
      endTurn(g, ctx);
      return;
    }
    ctx.log(`<span class="t">고독의 저주</span> 🎲 ${scr[0]} — 턴 진행`, `<span class="t">孤独の呪い</span> 🎲 ${scr[0]} — ターン続行`);
  }
  // 마족 척후(manaDebt5): 임시 최대 마나 차감의 기한 도래분 복구
  if (p.manaRegain?.length) {
    const due = p.manaRegain.filter((r) => r.at <= g.turn);
    if (due.length) {
      p.manaRegain = p.manaRegain.filter((r) => r.at > g.turn);
      const amt = due.reduce((a, b) => a + b.amt, 0);
      p.maxMana += amt;
      ctx.log(`  └ 마족 척후의 대가 종료 — 최대 마나 +${amt} (${p.maxMana})`, `  └ 魔族の斥候の代価終了 — 最大マナ+${amt} (${p.maxMana})`);
    }
  }
  if (p.manaGainNext) { p.maxMana += p.manaGainNext; p.manaGainNext = 0; } // E3 delayed mana
  p.usesTurn = {};
  p.buysTurn = {}; // v41b 매점
  p.playsTurn = 0;
  p.freeBuysTurn = 0;
  recheckDeaths(g, ctx); // v29: 조건부 최대 체력(활력·아우라)이 빠져 생긴 "체력 0 좀비" 정리
  p.spellSealTurn = false;
  p.wheelUsed = false; // 운명의 수레바퀴: 재굴림 매턴 1회
  p.trapBlockTurn = !!p.trapBlockNext || (p.trapBlockTurns ?? 0) > 0; p.trapBlockNext = false; // 협상: 함정 설치 불가 (v34: 다중 턴)
  if (p.trapBlockTurns) p.trapBlockTurns -= 1;
  p.lowSummonBanTurn = !!p.lowSummonBanNext; p.lowSummonBanNext = false; // 삼격의 불씨: 3코 이하 소환 봉쇄
  p.refreshBlockTurn = !!p.refreshBlockNext; p.refreshBlockNext = false; // 마켓 크래시: 제시 갱신 봉쇄
  p.spellsCastTurn = 0; // 마나 역류: 이번 턴 마법 사용 수
  p.noDirectTurn = false; // 천궁의 폐문 (방어적 리셋 — endTurn에서도 해제)
  p.noHighAtkTurn = false; // 폐문(v37)
  p.manaPenalty = p.nextPenalty || 0; p.nextPenalty = 0;
  p.mana = effMaxMana(p);
  tickExile(ctx, p);
  if (!first) {
    rollSupply(g, p);
    const enchDraw = p.enchants.filter((e) => e.card.ench === "bonusDraw").reduce((s, e) => s + (e.card.val2 || 0), 0);
    const dp = p.drawPenaltyNext || 0; p.drawPenaltyNext = 0; // 흉조: 이번 턴 드로우 차감 (1회성)
    if (dp > 0) ctx.log(`  └ <span class="dmg">흉조</span>: 드로우 -${dp}`, `  └ <span class="dmg">凶兆</span>: ドロー-${dp}`);
    const pageDraw = p.field.filter((m) => m.aura === "pageDraw").length; // 귀족의 집사
    // v40: 첫 손패만 3장(선공은 createGame에서, 후공은 자신의 첫 턴에), 이후 매 턴 1장. 손패는 턴 종료에 버리지 않는다.
    const baseDraw = g.turn <= 2 ? 3 : 1;
    ctx.drawN(p, Math.max(0, baseDraw + p.bonusDrawPerm + enchDraw + pageDraw - dp));
    if (p.bastionDraw) { // 최후의 보루: 다음 턴 시작시 1회성 추가 드로우
      const bn = ctx.drawN(p, p.bastionDraw);
      p.bastionDraw = 0;
      ctx.log(`  └ 최후의 보루: ${bn}장 추가 드로우`, `  └ 最後の砦: ${bn}枚追加ドロー`);
    }
  }
  tickEnchants(g, ctx, p);
  if (!g.over) tickBleed(ctx, p);
  if (!g.over) tickBrand(g, ctx, p);
  if (!g.over) tickTurnFx(g, ctx, p);
  if (!g.over) tickHatch(g, ctx);
  if (!g.over) tickDoomsday(g, ctx, p);
  if (!g.over) tickSamsara(g, ctx, p);
  // 트릭룸: 매 턴 시작마다 -1, 0이 되면 반전 해제 (반전 중 오른 스탯은 반대편으로 계승)
  if (!g.over && (g.trickLeft ?? 0) > 0) {
    g.trickLeft = (g.trickLeft ?? 1) - 1;
    if (g.trickLeft === 0) {
      g.players.forEach((pl) => pl.field.forEach((mm) => { if (mm.trickSwapped) trickSwapWithWeaken(g, mm); }));
      recheckDeaths(g, ctx); // v24: swap can drop max HP below accumulated damage
      ctx.log(`<span class="t">트릭룸</span> 종료 — 공/체 원위치 (반전 중 오른 스탯은 계승)`, `<span class="t">トリックルーム</span> 終了 — 攻/体が元に戻る (反転中の上昇は継承)`);
    }
  }
  // 선택받은 마법사: 턴 시작 선택 발동 (다른 턴 시작 pending이 없을 때만 — 시련의 영역 제외 후에는 체인으로 이어짐)
  if (!first && !g.over) offerChosenMage(g, ctx);
  g.phase = "main";
  ctx.ev.push({ type: "turnHeader", turn: g.turn, name: p.name, isBot: p.isBot, player: g.cur });
}

/** 선택받은 마법사(CHOSEN_MAGE): 턴 시작시 필드의 마법사를 클릭해 발동(취소 가능)하는 선택 pending 제공. */
function offerChosenMage(g: GameState, ctx: Ctx): void {
  if (g.over || g.pending) return;
  const p = g.players[g.cur];
  if (!p.field.some((m) => m.id === "CHOSEN_MAGE")) return;
  if (!rmz(p).some((c) => c.star === "trash")) return;
  g.pending = {
    kind: "myMon", reason: "chosenMage", allowCancel: true, data: { fired: [] },
    hint: "선택받은 마법사 — 발동할 마법사 선택 (제외된 컬 1장 → 묘지, 상대에게 8 데미지 · 취소 가능)",
    hintJa: "選ばれし魔法使い — 発動する魔法使いを選択 (除外されたカル1枚→墓地, 相手に8ダメージ · キャンセル可)",
  };
  ctx.ev.push({ type: "needTarget", pending: g.pending });
}

/** Persistent bleed: damage at the start of this player's turn (GM8_3). */
function tickBleed(ctx: Ctx, p: PlayerState): void {
  if (p.bleed > 0) ctx.dealDamage(p, p.bleed, "출혈", "出血");
}

/** 낙인(brandMagic): 낙인 카운터 1개당 매 턴 시작시 주사위 1개 — 나온 눈의 합만큼 자해. */
function tickBrand(g: GameState, ctx: Ctx, p: PlayerState): void {
  const n = p.brand || 0;
  if (!n) return;
  const { rolls } = diceRoll(g, ctx.ev, side(g, p), n);
  const dmg = rolls.reduce((a, b) => a + b, 0);
  ctx.log(
    `<span class="t">낙인</span> 카운터 ${n}개 — 🎲 [${rolls.join(", ")}] → ${p.name} 에게 ${dmg} 데미지`,
    `<span class="t">烙印</span> カウンター${n}個 — 🎲 [${rolls.join(", ")}] → ${p.name} に ${dmg} ダメージ`,
  );
  ctx.dealDamage(p, dmg, "낙인", "烙印");
}

/** 윤회(v41b samsara): 소유자의 턴 시작시, 직전 턴(상대 턴)에 자신의 몬스터가 파괴되었다면 발동 —
 *  파괴된 몬스터 중 1체를 골라 자신 필드에 소환 (묘지에 있으면 그 카드를, 없으면 토큰으로). */
function tickSamsara(g: GameState, ctx: Ctx, p: PlayerState): void {
  if (g.pending || p.field.length >= FIELD_MAX) return;
  const i = p.traps.findIndex((t) => t.card.react === "samsara");
  if (i < 0) return;
  const ids = [...new Set((p.destroyedLog ?? []).filter((d) => d.turn === g.turn - 1).map((d) => d.id))].filter((id) => !!DB[id]);
  if (!ids.length) return;
  const c = p.traps.splice(i, 1)[0].card;
  p.discard.push(c);
  ctx.ev.push({ type: "trapReveal", player: side(g, p), id: c.id });
  ctx.log(`<span class="dmg">함정 ${cn(c)} 발동!</span> 직전 턴에 파괴된 몬스터 ${ids.length}종 중 1체를 소환`, `<span class="dmg">トラップ ${cn(c)} 発動!</span> 直前のターンに破壊されたモンスター${ids.length}種から1体を召喚`);
  g.pending = { kind: "giantShop", hint: "윤회 — 소환할 몬스터 선택", hintJa: "輪廻 — 召喚するモンスターを選択", reason: "samsaraPick", allowCancel: false, data: { ids, free: true } };
  ctx.ev.push({ type: "needTarget", pending: g.pending });
}
/** 심판의 카운트다운(doomsday): 소유자의 턴 시작마다 카운터 -1, 0이 되면 자동 발동 —
 *  자신 5뎀 + 상대 최대 마나 +1 + 필드 위 모든 카드 파괴(몬스터·영구마법·세트 함정 양측). */
function tickDoomsday(g: GameState, ctx: Ctx, p: PlayerState): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  for (const t of p.traps) if (t.card.react === "doomsday" && t.cnt != null) t.cnt -= 1;
  for (;;) {
    if (g.over) break;
    const i = p.traps.findIndex((t) => t.card.react === "doomsday" && (t.cnt ?? 1) <= 0);
    if (i < 0) break;
    const c = p.traps.splice(i, 1)[0].card;
    p.discard.push(c);
    ctx.ev.push({ type: "trapReveal", player: side(g, p), id: c.id });
    ctx.log(
      `<span class="dmg">함정 ${cn(c)} 자동 발동!</span> 자신에게 5 데미지 + 상대 최대 마나 +1 + 필드의 모든 카드 파괴`,
      `<span class="dmg">トラップ ${cn(c)} 自動発動!</span> 自分に5ダメージ + 相手の最大マナ+1 + フィールドの全カードを破壊`,
    );
    ctx.dealDamage(p, 5, cn(c), cn(c));
    if (g.over) break;
    o.maxMana += 1;
    ctx.log(`  └ 상대 최대 마나 +1 (${o.maxMana})`, `  └ 相手の最大マナ+1 (${o.maxMana})`);
    for (const pl of g.players) {
      for (const m of [...pl.field]) {
        if (hasPassive(m, "trapmaster")) { ctx.log(`  └ ${cn(m)} 은(는) 함정으로 파괴되지 않는다`, `  └ ${cn(m)} は罠では破壊されない`); continue; }
        ctx.destroyMonster(pl, m);
      }
      for (const e of pl.enchants.splice(0)) binEnch(g, ctx, pl, e.card);
    }
    for (const t2 of p.traps.splice(0)) { // 자신의 다른 함정은 그대로 파괴
      if (t2.card.exileOnDestroy) rmz(p).push(t2.card); else p.discard.push(t2.card);
    }
    if (o.traps.length && !trySnare(g, ctx, o)) { // 상대 함정은 덫 속의 덫이 반응 가능
      for (const t2 of o.traps.splice(0)) {
        if (t2.card.exileOnDestroy) rmz(o).push(t2.card); else o.discard.push(t2.card);
      }
    }
  }
}

/** Per-turn field-monster effects (growth / burn / heal / ramp), on the owner's turn. */
function tickTurnFx(g: GameState, ctx: Ctx, p: PlayerState): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  for (const m of [...p.field]) {
    if (g.over) return;
    const v = m.val || 0, v2 = m.val2 || 0;
    switch (m.turnFx) {
      case "growAtk": m.atkMod = (m.atkMod || 0) + v; ctx.log(`  └ ${cn(m)} 공격력 +${v}(지속)`, `  └ ${cn(m)} 攻撃力+${v}(持続)`); break;
      case "growDef": m.defMod = (m.defMod || 0) + v; ctx.log(`  └ ${cn(m)} 체력 +${v}(지속)`, `  └ ${cn(m)} 体力+${v}(持続)`); break;
      case "turnBurn": ctx.log(`<span class="t">${cn(m)}</span> 매 턴 효과`, `<span class="t">${cn(m)}</span> 毎ターン効果`); ctx.dealDamage(o, v, cn(m), cn(m)); break;
      case "turnHeal": ctx.heal(p, v); ctx.log(`  └ ${cn(m)} 플레이어 체력 +${v} 회복`, `  └ ${cn(m)} プレイヤー体力+${v}回復`); break;
      case "payDefHeal":
        if (p.mana >= 1) { p.mana -= 1; m.defMod = (m.defMod || 0) + v; ctx.heal(p, v2); ctx.log(`  └ ${cn(m)} 마나1 → 체력 +${v} · 플레이어 체력 +${v2} 회복`, `  └ ${cn(m)} マナ1 → 体力+${v} · プレイヤー体力+${v2}回復`); }
        break;
      case "chestDraw": {
        const ci = p.hand.findIndex((c) => c.star === "chest");
        if (ci >= 0) { const ch = p.hand.splice(ci, 1)[0]; p.discard.push(ch); const n = ctx.drawN(p, v2 || 4); ctx.log(`  └ ${cn(m)} 보물상자 → 묘지, ${n}장 드로우`, `  └ ${cn(m)} 宝箱 → 墓地, ${n}枚ドロー`); }
        break;
      }
      case "growMaxHp": { // 청룡: 자신의 턴 시작마다 상대 필드 몬스터 수만큼 최대 체력 증가
        const gn = o.field.length;
        if (gn > 0) { p.maxHp += gn; ctx.log(`  └ ${cn(m)} 최대 체력 +${gn} (${p.maxHp})`, `  └ ${cn(m)} 最大体力+${gn} (${p.maxHp})`); }
        break;
      }
      case "voidRoll": { // 허무공간의 사도: 🎲 1이면 자신 10뎀 + 자괴
        const { rolls: vr } = diceRoll(g, ctx.ev, side(g, p), 1);
        if (vr[0] === 1) {
          ctx.log(`<span class="t">${cn(m)}</span> 🎲 1 — <span class="dmg">허무가 삼킨다</span>`, `<span class="t">${cn(m)}</span> 🎲 1 — <span class="dmg">虚無に呑まれる</span>`);
          ctx.dealDamage(p, 10, cn(m), cn(m));
          if (!g.over) ctx.destroyMonster(p, m);
        } else ctx.log(`<span class="t">${cn(m)}</span> 🎲 ${vr[0]} — 버틴다`, `<span class="t">${cn(m)}</span> 🎲 ${vr[0]} — 持ちこたえる`);
        break;
      }
      case "demonRoll": { // 마족 광전사: 🎲 1~3 → 최대 마나 -1, 4~6 → -2 (바닥 3)
        const { rolls: dr9 } = diceRoll(g, ctx.ev, side(g, p), 1);
        const cut = dr9[0] <= 3 ? 1 : 2;
        p.maxMana = Math.max(Math.min(p.maxMana, 3), p.maxMana - cut);
        ctx.log(`<span class="t">${cn(m)}</span> 🎲 ${dr9[0]} → 최대 마나 -${cut} (${p.maxMana})`, `<span class="t">${cn(m)}</span> 🎲 ${dr9[0]} → 最大マナ-${cut} (${p.maxMana})`);
        break;
      }
      case "gambler": { // 도박꾼: 주사위 4·5·6 → 최대 마나 +1 (v24: 최대 체력 +5 삭제)
        const { rolls: gr } = diceRoll(g, ctx.ev, side(g, p), 1, 4);
        const r = gr[0];
        if (r >= 4) { p.maxMana += 1; ctx.log(`  └ ${cn(m)} 🎲 ${r} → 최대 마나 +1 (${p.maxMana})`, `  └ ${cn(m)} 🎲 ${r} → 最大マナ+1 (${p.maxMana})`); }
        else ctx.log(`  └ ${cn(m)} 🎲 ${r}`, `  └ ${cn(m)} 🎲 ${r}`);
        break;
      }
      case "legendGambler": { // 전설의 도박꾼(v37): 플레이어가 눈을 예측 → 주사위 3개 → 적중 시 효과 선택(덱에 '도박꾼'이 있으면 전부)
        if (g.pending) break;
        g.pending = { kind: "giantShop", reason: "gamblerGuess", allowCancel: false, hint: "전설의 도박꾼 — 나올 눈을 예측", hintJa: "伝説のギャンブラー — 出目を予測",
          data: { ids: ["1", "2", "3", "4", "5", "6"], free: true, opts: [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), ko: `🎲 ${n}`, ja: `🎲 ${n}`, en: `🎲 ${n}` })), uid: m.uid } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
        break;
      }
      case "hexCurse": { // 꼬마 주술사(v36): 덱 구성에 마법 10장+ → 주사위 5+면 상대 묘지에 '저주' 3장
        const spells = deckComp(p).filter((c) => c.t === "spell").length;
        if (spells < 10) { ctx.log(`  └ ${cn(m)} 마법 ${spells}장 — 조건 미달(10장)`, `  └ ${cn(m)} 魔法${spells}枚 — 条件未達(10枚)`); break; }
        const { rolls: hr, ok: hok } = diceRoll(g, ctx.ev, side(g, p), 1, 5);
        if (hok) { for (let i = 0; i < 3; i++) o.discard.push(inst(g, "CURSE")); ctx.log(`  └ ${cn(m)} 🎲 ${hr[0]} → <span class="dmg">상대 묘지에 저주 3장</span>`, `  └ ${cn(m)} 🎲 ${hr[0]} → <span class="dmg">相手の墓地に呪い3枚</span>`); }
        else ctx.log(`  └ ${cn(m)} 🎲 ${hr[0]} → 실패`, `  └ ${cn(m)} 🎲 ${hr[0]} → 失敗`);
        break;
      }
      case "giantGolem": { // 자이언트 골램(v36): 덱 구성에 자신 외 골램 2종+ → 매 턴 최대 체력 +10
        const kinds = new Set(deckComp(p).filter((c) => c.t === "mon" && c.id !== m.id && isGolem(c)).map((c) => c.id)).size;
        if (kinds >= 2) { p.maxHp += 10; ctx.log(`  └ ${cn(m)} 골램 ${kinds}종 → 최대 체력 +10 (${p.maxHp})`, `  └ ${cn(m)} ゴーレム${kinds}種 → 最大体力+10 (${p.maxHp})`); }
        else ctx.log(`  └ ${cn(m)} 골램 ${kinds}종 — 조건 미달(2종)`, `  └ ${cn(m)} ゴーレム${kinds}種 — 条件未達(2種)`);
        break;
      }
      case "nightMarket": { // 암살자 길드 본부(v36): 턴 시작마다 '암살자' 카드 구매 가능한 나이트 마켓
        if (g.pending) break;
        const ids = ALL_IDS.filter((id) => DB[id].cost > 0 && isAssassinCard(DB[id]));
        if (!ids.length) break;
        g.pending = { kind: "giantShop", hint: "나이트 마켓 — 마나를 지불하고 구매할 '암살자' 카드 선택 (취소 가능)", hintJa: "ナイトマーケット — マナを払って購入する「アサシン」カードを選択 (キャンセル可)", reason: "nightMarket", allowCancel: true, data: { ids } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
        break;
      }
      case "worldTree": { // 세계수(v36): 카운터를 소모해 아군 몬스터 체력 전회복 + 자신 체력 80%까지 (매턴 1회, 선택)
        if (g.pending || (m.gcount || 0) <= 0) break;
        g.pending = { kind: "myMon", reason: "worldTree", allowCancel: true, data: {},
          hint: `세계수 — 카운터 1개를 소모해 발동하려면 세계수를 선택 (남은 카운터 ${m.gcount} · 취소 가능)`,
          hintJa: `世界樹 — カウンター1個を消費して発動するには世界樹を選択 (残り${m.gcount} · キャンセル可)` };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
        break;
      }
    }
  }
}

/** 알 부화 틱: 매 턴 시작마다 (양측 턴 포함) 모든 알의 부화 카운터 -1.
 *  카운터가 0이 된 알은 "주인의 턴 시작"에 부화한다 — 소환 효과의 대상 선택(pending)이
 *  현재 플레이어 기준으로 동작하기 때문. (턴이 번갈아 오므로 짝수 카운터는 자연히 주인 턴에 떨어진다) */
function tickHatch(g: GameState, ctx: Ctx): void {
  for (const pl of g.players) for (const m of pl.field) if (m.hatch != null && m.hatch > 0) m.hatch--;
  const p = g.players[g.cur];
  for (const m of [...p.field]) {
    if (g.over) return;
    if (m.hatch != null && m.hatch <= 0) hatchEgg(g, ctx, p, m);
  }
}

/** 알 → 부화 몬스터로 교체 (같은 슬롯). 알 껍질은 게임에서 제외. */
function hatchEgg(g: GameState, ctx: Ctx, p: PlayerState, egg: FieldMon): void {
  const i = p.field.findIndex((x) => x.uid === egg.uid);
  if (i < 0) return;
  const pool = egg.hatchInto ?? [];
  const outId = pool.length ? pool[randInt(g, pool.length)] : null;
  if (!outId || !DB[outId]) return;
  p.field.splice(i, 1);
  rmz(p).push(resetInst(egg)); // 껍질은 제외존으로 (재부화 루프 방지)
  ctx.ev.push({ type: "destroy", player: side(g, p), uid: egg.uid, id: egg.id });
  const m: FieldMon = { uid: newUID(g), ...structuredClone(DB[outId]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn, token: true };
  applyFieldGlobals(g, m);
  p.field.splice(i, 0, m);
  ctx.log(`<span class="dmg">${cn(egg)} 부화!</span> ${cn(m)} 등장 (공${m.atk}/방${m.def})`, `<span class="dmg">${cn(egg)} 孵化!</span> ${cn(m)} 登場 (攻${m.atk}/防${m.def})`);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid, id: m.id });
  applyEnterAura(g, ctx, p, m);
  applySummonBuff(ctx, p, m);
  resolveOnSummon(g, ctx, m); // 부화 몬스터의 소환 효과 발동 (흑룡 선택 pending 포함 — 주인 턴이라 안전)
  if (m.tribe && !g.over) checkTribe(g, ctx, p, m); // 시초의 알(v36): 부화한 시초 몬스터도 동족 시너지
}

function weakenAllCount(g: GameState): number {
  return g.players.reduce((s, pl) => s + pl.enchants.filter((e) => e.card.ench === "weakenAll").length, 0);
}

/** 트릭룸: 공/방 물리 스왑 (베이스+지속 mod 모두) — 반전 중 오른 스탯은 해제 시 반대편으로 계승된다. */
function trickSwap(m: FieldMon): void {
  const a = m.atk ?? 0, d = m.def ?? 0;
  m.atk = d; m.def = a;
  const am = m.atkMod || 0, dm = m.defMod || 0;
  m.atkMod = dm; m.defMod = am;
  m.trickSwapped = !m.trickSwapped;
}

/** Swap while keeping 약화술식 attached to the monster's current attack stat. */
function trickSwapWithWeaken(g: GameState, m: FieldMon): void {
  const weak = weakenAllCount(g) * 2;
  if (weak > 0) m.atkMod = (m.atkMod || 0) + weak;
  trickSwap(m);
  if (weak > 0) m.atkMod = (m.atkMod || 0) - weak;
}

/** 역산/기습 등 "사용 후 게임에서 제외" 스펠: 묘지에서 꺼내 제외존으로. */
function selfExile(ctx: Ctx, p: PlayerState, card: CardInst): void {
  const i = p.discard.findIndex((c) => c.uid === card.uid);
  if (i >= 0) p.discard.splice(i, 1);
  rmz(p).push(card);
  ctx.log(`  └ ${cn(card)} 은(는) 게임에서 제외된다`, `  └ ${cn(card)} はゲームから除外される`);
}

/** 약화술식 해제: 걸려 있던 전 몬스터 공격력 -2 를 복구. */
function unWeaken(g: GameState, ctx: Ctx): void {
  g.players.forEach((pl) => pl.field.forEach((mm) => (mm.atkMod = (mm.atkMod || 0) + 2)));
  ctx.log(`  └ 약화술식 해제: 모든 몬스터 공격력 +2 복구`, `  └ 弱化術式解除: 全モンスター攻撃力+2回復`);
}

/** 영구마법 파괴/제거의 공용 처리: 약화술식 복구 + exileOnDestroy(혈귀술 등)는 제외존으로. */
function binEnch(g: GameState, ctx: Ctx, owner: PlayerState, card: CardInst, forceExile = false): void {
  if (card.ench === "weakenAll") unWeaken(g, ctx);
  if (card.ench === "gemRain") { // 보석의 비 해제: 미믹 계열 공격력 +3 회수
    g.players.forEach((pl) => pl.field.forEach((mm) => { if (MIMIC_IDS.has(mm.id)) mm.atkMod = (mm.atkMod || 0) - 3; }));
    ctx.log(`  └ 보석의 비 해제: 미믹 계열 공격력 -3`, `  └ 宝石の雨解除: ミミック系の攻撃力-3`);
  }
  if (forceExile || card.exileOnDestroy) {
    rmz(owner).push(card);
    if (card.exileOnDestroy) ctx.log(`  └ ${cn(card)} 은(는) 게임에서 제외된다`, `  └ ${cn(card)} はゲームから除外される`);
  } else owner.discard.push(card);
}

/** 새로 필드에 등장하는 몬스터에 전역 효과 적용 (트릭룸 반전 → 약화술식 -2).
 *  순서 중요: 약화는 "현재 공격력"에 걸려야 하므로 반전을 먼저 적용한다. */
function applyFieldGlobals(g: GameState, m: FieldMon): void {
  if ((g.trickLeft ?? 0) > 0) trickSwap(m);
  const weak = weakenAllCount(g);
  if (weak > 0) m.atkMod = (m.atkMod || 0) - 2 * weak;
  // 보석의 비(gemRain): 미믹 계열은 활성 장수 × +3
  if (MIMIC_IDS.has(m.id)) {
    const gems = g.players.reduce((n2, pl) => n2 + pl.enchants.filter((e) => e.card.ench === "gemRain").length, 0);
    if (gems > 0) m.atkMod = (m.atkMod || 0) + 3 * gems;
  }
  // 기합(guts): 소환시 기합 토큰 1개 (소환 경로 무관 — summonMonster/spawnToken/spawnVampire/hatchEgg 전부 여기를 지난다)
  if (hasPassive(m, "guts") && m.guts == null) m.guts = 1;
}

/** 부패(decay) 카운터 부여 — 3개 쌓이면 파괴 + 주인에게 3 데미지. */
function addDecay(g: GameState, ctx: Ctx, owner: PlayerState, tm: FieldMon, n: number): void {
  tm.decayCnt = (tm.decayCnt || 0) + n;
  ctx.log(`  └ ${cn(tm)} 부패 카운터 ${tm.decayCnt}/3`, `  └ ${cn(tm)} 腐敗カウンター ${tm.decayCnt}/3`);
  if (tm.decayCnt >= 3) {
    ctx.log(`  └ <span class="dmg">부패 붕괴!</span> ${cn(tm)} 파괴`, `  └ <span class="dmg">腐敗崩壊！</span> ${cn(tm)} 破壊`);
    ctx.destroyMonster(owner, tm);
    if (!g.over && !owner.field.some((x) => x.uid === tm.uid)) {
      ctx.dealDamage(owner, 3, "부패", "腐敗");
      // 러스트 머쉬룸 — v25: 부패로 상대 몬스터가 파괴되면 자신의 최대 마나 +1
      const foe = g.players[1 - side(g, owner)];
      if (!g.over && foe.field.some((m) => m.id === "RUST_SHROOM")) {
        foe.maxMana = Math.min(MAX_MANA, foe.maxMana + 1);
        ctx.log(`  └ 러스트 머쉬룸: 최대 마나 +1 (${foe.maxMana})`, `  └ ラストマッシュルーム: 最大マナ+1 (${foe.maxMana})`);
      }
      // 산성비 / 강산성비(v37): 상대 몬스터가 부패로 파괴될 때마다 낙인 (+7 데미지)
      for (const e of foe.enchants) {
        if (g.over) break;
        if (e.card.ench === "acidRain") { owner.brand = (owner.brand || 0) + 1; ctx.log(`  └ ${cn(e.card)}: ${owner.name} 에게 낙인 카운터 +1 (합계 ${owner.brand})`, `  └ ${cn(e.card)}: ${owner.name} に烙印カウンター+1 (計${owner.brand})`); }
        if (e.card.ench === "strongAcid") { ctx.dealDamage(owner, 7, cn(e.card), cn(e.card)); if (!g.over) { owner.brand = (owner.brand || 0) + 1; ctx.log(`  └ ${cn(e.card)}: ${owner.name} 에게 낙인 카운터 +1 (합계 ${owner.brand})`, `  └ ${cn(e.card)}: ${owner.name} に烙印カウンター+1 (計${owner.brand})`); } }
      }
      // 러스트캡 슬러그(v36): 부패로 상대 몬스터를 파괴하면 최대 마나 +1, 최대 체력 +5
      if (!g.over && foe.field.some((m) => m.id === "RUST_SLUG")) {
        foe.maxMana += 1; foe.maxHp += 5; foe.hp += 5;
        ctx.ev.push({ type: "heal", player: side(g, foe), amount: 5 });
        ctx.log(`  └ 러스트캡 슬러그: 최대 마나 +1 (${foe.maxMana}), 최대 체력 +5 (${foe.maxHp})`, `  └ ラストキャップ・スラッグ: 最大マナ+1 (${foe.maxMana}), 最大体力+5 (${foe.maxHp})`);
      }
    }
  }
}

/** 흡혈귀 소환 (흡혈 계약 / 진화) — 토큰이지만 소환 효과(특급)는 발동한다. */
function spawnVampire(g: GameState, ctx: Ctx, p: PlayerState, id: string): void {
  if (!DB[id] || p.field.length >= FIELD_MAX) { ctx.log("  └ 몬스터 존이 가득 차 소환 실패", "  └ モンスターゾーンが満杯で召喚失敗"); return; }
  const m: FieldMon = { uid: newUID(g), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn, token: true };
  applyFieldGlobals(g, m);
  p.field.push(m);
  ctx.log(`  └ ${cn(m)} 소환 (공${m.atk}/방${m.def})`, `  └ ${cn(m)} 召喚 (攻${m.atk}/防${m.def})`);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid, id: m.id });
  applyEnterAura(g, ctx, p, m);
  applySummonBuff(ctx, p, m);
  resolveOnSummon(g, ctx, m); // 특급 흡혈귀의 소환시 효과도 발동
}

/** 피의 마법 - 비술: 자신 흡혈귀 1체 파괴 시도 → 실제로 파괴됐을 때만 최대 마나 +3 / 최대 체력 +10.
 *  (흡혈의 극의가 파괴를 막으면 보상 없음 — 파괴는 '대가'라서 공짜 버프 콤보 방지) */
function bloodSecretDestroy(g: GameState, ctx: Ctx, p: PlayerState, m: FieldMon): void {
  ctx.destroyMonster(p, m);
  if (p.field.some((x) => x.uid === m.uid)) { ctx.log("  └ 파괴 실패 — 대가 미지불로 효과 불발", "  └ 破壊失敗 — 代価未払いで効果不発"); return; }
  p.maxMana += 3;
  ctx.log(`  └ 최대 마나 +3 (${p.maxMana})`, `  └ 最大マナ+3 (${p.maxMana})`);
  p.maxHp += 10; p.hp += 10;
  ctx.ev.push({ type: "heal", player: side(g, p), amount: 10 });
  ctx.log(`  └ 최대 체력 +10 (${p.maxHp})`, `  └ 最大体力+10 (${p.maxHp})`);
}

/** 운명의 수레바퀴: 주사위 결과 확인 후 재굴림 여부를 묻는 pending 생성. */
function offerReroll(g: GameState, ctx: Ctx, card: CardInst): void {
  if (!g._wheelSnap) return;
  if (g.over || g.pending) { g._wheelSnap = null; return; } // 스펠이 자체 pending을 열었으면 재굴림 생략
  g.pending = { kind: "reroll", hint: `운명의 수레바퀴 — ${cn(card)} 의 결과를 다시 굴릴 수 있다`, hintJa: `運命の輪 — ${cn(card)} の結果を振り直せる`, reason: "reroll", allowCancel: true };
  ctx.ev.push({ type: "needTarget", pending: g.pending });
}

/** "피의 마법" 발동 후 트리거: 피의 축제(마나) + 흡혈귀 진화(각 1회). */
function bloodTriggers(g: GameState, ctx: Ctx, p: PlayerState): void {
  if (g.over) return;
  const fest = p.enchants.filter((e) => e.card.ench === "bloodFest").length;
  if (fest > 0) { p.maxMana += fest; ctx.log(`  └ 피의 축제: 최대 마나 +${fest} (${p.maxMana})`, `  └ 血の祝祭: 最大マナ+${fest} (${p.maxMana})`); }
  // 진화는 발동 시점의 필드 스냅샷 기준 — 이번 발동으로 새로 소환된 흡혈귀는 미반응
  for (const m of [...p.field]) {
    if (g.over) return;
    if (m.evolveTo && !m.evolvedUsed && DB[m.evolveTo]) {
      if (p.field.length >= FIELD_MAX) break; // 자리가 없으면 진화 보류 (1회 기회는 소모하지 않음)
      m.evolvedUsed = true;
      ctx.log(`  └ ${cn(m)} 이(가) 피에 이끌린다…`, `  └ ${cn(m)} が血に導かれる…`);
      spawnVampire(g, ctx, p, m.evolveTo);
    }
  }
}

/** Persistent-spell upkeep. noAttack ticks every turn; owner-scoped enchants tick on the owner's turn. */
/** 상회: 마켓 카운터 20개마다 '암상인'을 패에 지급 (초과분은 이월). */
function guildPayout(g: GameState, ctx: Ctx, pl: PlayerState, e: Enchant): void {
  while ((e.cnt ?? 0) >= 20) {
    e.cnt = (e.cnt ?? 0) - 20;
    pl.hand.push(inst(g, "DARK_MERCHANT"));
    ctx.log(`  └ <span class="good">마켓 카운터 20개 달성!</span> '암상인'을 패에 넣는다 (이월 ${e.cnt})`, `  └ <span class="good">マーケットカウンター20個達成！</span>「闇商人」を手札に加える (繰越${e.cnt})`);
  }
}

function tickEnchants(g: GameState, ctx: Ctx, cur: PlayerState): void {
  for (const pl of g.players) {
    const opp = g.players[0] === pl ? g.players[1] : g.players[0];
    pl.enchants = pl.enchants.filter((e) => {
      const ownerTurn = pl === cur;
      const everyTurn = e.card.ench === "noAttack";
      // 지옥: each owner turn, self 6 / opp 5
      if (e.card.ench === "inferno" && ownerTurn && !g.over) {
        ctx.log(`<span class="t">${cn(e.card)}</span> 지옥: 자신 5 / 상대 7`, `<span class="t">${cn(e.card)}</span> 地獄: 自分5 / 相手7`);
        ctx.dealDamage(pl, 5, cn(e.card), cn(e.card));
        if (!g.over) ctx.dealDamage(opp, 7, cn(e.card), cn(e.card));
      }
      // 세계수의 씨앗: 자신의 턴 시작마다 val2%로 최대 마나 +1
      if (e.card.ench === "seedMana" && ownerTurn && !g.over && diceChance(g, ctx, pl, e.card.val2 ?? 25)) {
        pl.maxMana += 1;
        ctx.log(`<span class="t">${cn(e.card)}</span> 발아! 최대 마나 +1 (${pl.maxMana})`, `<span class="t">${cn(e.card)}</span> 発芽！最大マナ +1 (${pl.maxMana})`);
      }
      // 세계수의 축복: 누구의 턴이든 시작 시 그 플레이어 최대 마나 +1, 시전자 턴이면 40%로 +2 추가
      if (e.card.ench === "worldBless" && !g.over) {
        // v34: 기본 +1 · 소유자 턴 + 덱에 '엘프' 계열이 있으면 +4
        const elfy = ownerTurn && [...pl.deck, ...pl.discard, ...pl.hand].some((c) => (c.name || "").includes("엘프") || (c.id || "").includes("ELF"));
        const gain = elfy ? 4 : 1;
        cur.maxMana += gain;
        ctx.log(`<span class="t">${cn(e.card)}</span> ${cur.name} 최대 마나 +${gain} (${cur.maxMana})`, `<span class="t">${cn(e.card)}</span> ${cur.name} 最大マナ +${gain} (${cur.maxMana})`);
      }
      // 상회(guild): 자신의 턴마다 마켓 카운터 +1 — 20개마다 '암상인' 지급
      if (e.card.ench === "guild" && ownerTurn && !g.over) {
        e.cnt = (e.cnt || 0) + 1;
        ctx.log(`<span class="t">${cn(e.card)}</span> 마켓 카운터 +1 (${e.cnt}/20)`, `<span class="t">${cn(e.card)}</span> マーケットカウンター+1 (${e.cnt}/20)`);
        guildPayout(g, ctx, pl, e);
      }
      // 양조(brewing): 자신의 턴 시작시 패의 포도류 → 와인 카운터 · 만료(6턴)시 카운터만큼 '와인' 지급 후 종료
      if (e.card.ench === "brewing" && ownerTurn && !g.over) {
        let added = 0;
        for (let i = pl.hand.length - 1; i >= 0; i--) {
          const hc = pl.hand[i];
          if (hc.id === "GRAPE" || hc.id === "GRAPE2") {
            pl.hand.splice(i, 1); pl.discard.push(hc);
            added += hc.id === "GRAPE2" ? 3 : 1;
          }
        }
        if (added > 0) {
          e.cnt = (e.cnt || 0) + added;
          ctx.log(`<span class="t">${cn(e.card)}</span> 패의 포도를 담근다 — 와인 카운터 +${added} (${e.cnt})`, `<span class="t">${cn(e.card)}</span> 手札のぶどうを仕込む — ワインカウンター+${added} (${e.cnt})`);
        }
        // 만료(자신의 6턴째 = e.turns 마지막 틱)에 와인 지급 — 카드 정리는 아래 공용 만료 처리가 담당
        if (e.turns <= 1) {
          const nWine = e.cnt ?? 0;
          for (let i = 0; i < nWine; i++) pl.hand.push(inst(g, "WINE"));
          ctx.log(`<span class="t">${cn(e.card)}</span> <span class="good">숙성 완료!</span> '와인' ${nWine}장을 패에 넣는다`, `<span class="t">${cn(e.card)}</span> <span class="good">熟成完了！</span>「ワイン」${nWine}枚を手札に加える`);
        }
      }
      // 생명의 성소(v34, sanctumField): 자신의 턴마다 자신 필드 모든 몬스터 체력 +2(지속)
      if (e.card.ench === "sanctumField" && ownerTurn && !g.over) {
        if (pl.field.length) { pl.field.forEach((mm) => (mm.defMod = (mm.defMod || 0) + 2)); ctx.log(`<span class="t">${cn(e.card)}</span> 자신 몬스터 전체 체력 +2`, `<span class="t">${cn(e.card)}</span> 自分のモンスター全体の体力+2`); }
      }
      // 허무의 과실(voidFruit): 자신의 턴 시작마다 제외 카드 수만큼 최대 체력 증가 (증가만 — 회복 없음)
      if (e.card.ench === "voidFruit" && ownerTurn && !g.over) {
        const nv = rmz(pl).length;
        if (nv > 0) { pl.maxHp += nv; ctx.log(`<span class="t">${cn(e.card)}</span> 최대 체력 +${nv} (${pl.maxHp})`, `<span class="t">${cn(e.card)}</span> 最大体力+${nv} (${pl.maxHp})`); }
      }
      // 부호의 습관(v41b richHabit): 자신의 턴 시작시 패 4장 이상 → 최대 체력 +6 · 6장 이상 → 최대 마나 +1도
      if (e.card.ench === "richHabit" && ownerTurn && !g.over) {
        const hn = pl.hand.length;
        if (hn >= 4) { pl.maxHp += 6; pl.hp += 6; ctx.ev.push({ type: "heal", player: side(g, pl), amount: 6 }); ctx.log(`<span class="t">${cn(e.card)}</span> 패 ${hn}장 → 최대 체력 +6 (${pl.maxHp})`, `<span class="t">${cn(e.card)}</span> 手札${hn}枚 → 最大体力+6 (${pl.maxHp})`); }
        if (hn >= 6) { pl.maxMana += 1; ctx.log(`<span class="t">${cn(e.card)}</span> 패 ${hn}장 → 최대 마나 +1 (${pl.maxMana})`, `<span class="t">${cn(e.card)}</span> 手札${hn}枚 → 最大マナ+1 (${pl.maxMana})`); }
      }
      // 콜로세움 휴게소(v41 colosseumRest): 자신의 턴 시작마다 제외된 컬 1장당 최대 체력 +1
      if (e.card.ench === "colosseumRest" && ownerTurn && !g.over) {
        const nc = cullExiled(pl);
        if (nc > 0) { pl.maxHp += nc; ctx.log(`<span class="t">${cn(e.card)}</span> 제외된 컬 ${nc}장 → 최대 체력 +${nc} (${pl.maxHp})`, `<span class="t">${cn(e.card)}</span> 除外されたカル${nc}枚 → 最大体力+${nc} (${pl.maxHp})`); }
      }
      // 콜로세움(v41 colosseum): 자신의 턴 시작시 제외된 컬 8장 이상이면 '선택받은' 몬스터 1체 선택 소환
      if (e.card.ench === "colosseum" && ownerTurn && !g.over && !g.pending && cullExiled(pl) >= 8 && pl.field.length < FIELD_MAX) {
        g.pending = { kind: "giantShop", hint: "콜로세움 — 소환할 '선택받은' 몬스터 선택 (취소 가능)", hintJa: "コロシアム — 召喚する「選ばれし」モンスターを選択 (キャンセル可)", reason: "colosseumPick", allowCancel: true, data: { ids: [...CHOSEN_IDS], free: true } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
      // 컬 재배: 자신의 턴 시작마다 패에 컬 1장
      if (e.card.ench === "cullTurn" && ownerTurn && !g.over) {
        pl.hand.push(starter(g, "STARTER_TRASH"));
        ctx.log(`<span class="t">${cn(e.card)}</span> 패에 컬 1장 추가`, `<span class="t">${cn(e.card)}</span> 手札にカル1枚追加`);
      }
      // 용광로: 자신의 턴 시작마다 묘지의 최저 코스트 카드 1장을 게임에서 제외 (자동 덱 압축)
      if (e.card.ench === "furnace" && ownerTurn && !g.over && pl.discard.length > 0) {
        let mi = 0;
        for (let i = 1; i < pl.discard.length; i++) if (pl.discard[i].cost < pl.discard[mi].cost) mi = i;
        const fc = pl.discard.splice(mi, 1)[0];
        rmz(pl).push(fc);
        ctx.log(`<span class="t">${cn(e.card)}</span> ${cn(fc)} 게임에서 제외`, `<span class="t">${cn(e.card)}</span> ${cn(fc)} をゲームから除外`);
      }
      // 생명의 성소 / 세계수의 심장: 자신의 턴마다 최대 체력 +val2 (회복 포함 → 생명의 순환과 시너지)
      if ((e.card.ench === "growHp" || e.card.ench === "growHpMana") && ownerTurn && !g.over) {
        const amt = e.card.val2 || 0;
        pl.maxHp += amt; ctx.heal(pl, amt);
        ctx.log(`<span class="t">${cn(e.card)}</span> 최대 체력 +${amt} (${pl.maxHp})`, `<span class="t">${cn(e.card)}</span> 最大体力 +${amt} (${pl.maxHp})`);
      }
      // 세계수의 보살핌(토큰): 자신의 턴 시작마다 최대 체력 +9 (증가만 — 회복 없음) (v19: 15→12, v26: 12→9)
      if (e.card.ench === "worldCare" && ownerTurn && !g.over) {
        pl.maxHp += 9;
        ctx.log(`<span class="t">${cn(e.card)}</span> 최대 체력 +9 (${pl.maxHp})`, `<span class="t">${cn(e.card)}</span> 最大体力 +9 (${pl.maxHp})`);
      }
      // 선견지명: 최대 마나 10 이상이 되면 +2 후 자괴 (필드를 떠나면 게임에서 제외) (v19: 9→10)
      if (e.card.ench === "foresight" && !g.over && pl.maxMana >= 10) {
        pl.maxMana += 2;
        ctx.log(`<span class="t">${cn(e.card)}</span> 발현! 최대 마나 +2 (${pl.maxMana}) — 이 카드는 게임에서 제외`, `<span class="t">${cn(e.card)}</span> 発現！最大マナ+2 (${pl.maxMana}) — このカードはゲームから除外`);
        rmz(pl).push(e.card);
        return false;
      }
      // 혈귀술: 발동 14턴 후 자동 파괴 (공허 — 게임에서 제외)
      if (e.card.ench === "spellHeal" && !g.over && g.turn >= (e.bornTurn ?? 0) + 14) {
        ctx.log(`<span class="t">${cn(e.card)}</span> 계약이 다했다 — 파괴된다`, `<span class="t">${cn(e.card)}</span> 契約が尽きた — 破壊される`);
        binEnch(g, ctx, pl, e.card);
        return false;
      }
      // 시련의 영역: 자신의 턴 시작마다 묘지에 컬 1장 → 묘지에서 2장까지 게임에서 제외
      if (e.card.ench === "trialArea" && ownerTurn && !g.over) {
        pl.discard.push(starter(g, "STARTER_TRASH"));
        ctx.log(`<span class="t">${cn(e.card)}</span> 묘지에 컬 1장 추가`, `<span class="t">${cn(e.card)}</span> 墓地にカル1枚追加`);
        if (!g.pending && pl.discard.length > 0) {
          g.pending = { kind: "purge", hint: "시련의 영역 — 묘지에서 게임에서 제외할 카드 선택 (2장까지)", hintJa: "試練の領域 — 墓地からゲームから除外するカードを選択 (2枚まで)", reason: "trialExile", allowCancel: true, data: { val: 2, zone: "discard" } };
          ctx.ev.push({ type: "needTarget", pending: g.pending });
        }
      }
      // 고대 문명: 발동 13턴 후 (자신의 턴에) 최대 마나 -1 → 알 선택 → 자괴
      if (e.card.ench === "ancientCiv" && ownerTurn && !g.over && g.turn >= (e.bornTurn ?? 0) + 13 && !g.pending) {
        pl.maxMana = Math.max(1, pl.maxMana - 1);
        ctx.log(`<span class="t">${cn(e.card)}</span> <span class="good">고대 문명이 깨어난다!</span> 최대 마나 -1 (${pl.maxMana})`, `<span class="t">${cn(e.card)}</span> <span class="good">古代文明が目覚める！</span> 最大マナ-1 (${pl.maxMana})`);
        g.pending = { kind: "giantShop", hint: "고대 문명 — 패에 넣을 알 선택", hintJa: "古代文明 — 手札に加える卵を選択", reason: "civChoice", allowCancel: false, data: { ids: ["DRAGON_EGG", "BEAST_EGG"] } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
        ctx.log(`  └ ${cn(e.card)} 은(는) 파괴된다`, `  └ ${cn(e.card)} は破壊される`);
        binEnch(g, ctx, pl, e.card);
        return false;
      }
      // 다종족 계약(v37): 45턴까지 종족 시너지를 발동하지 못하면 패배
      if (e.card.ench === "tribeContract" && ownerTurn && !g.over && g.turn >= 45 && pl.tribesFired.length === 0) {
        ctx.log(`<span class="t">${cn(e.card)}</span> <span class="dmg">계약 불이행! ${pl.name} 패배</span>`, `<span class="t">${cn(e.card)}</span> <span class="dmg">契約不履行！ ${pl.name} の敗北</span>`);
        handleDefeat(g, ctx, pl, side(g, opp));
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
/** Hard turn cap: at the end of turn MAX_TURNS the game is decided by
 *  remaining HP (higher HP wins); only an exact tie is a draw. */
export const MAX_TURNS = 60;

function endTurn(g: GameState, ctx: Ctx): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  // GM6_2: discarding cost-3+ cards at end of turn breaks enemy traps (1 each)
  if (p.field.some((m) => m.aura === "discardBreak")) {
    let broke = 0;
    const dump = p.hand.filter((c) => (c.cost ?? 0) >= 3).length;
    if (dump > 0 && o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
    else {
      for (let i = 0; i < dump && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); broke++; }
      if (broke) ctx.log(`<span class="t">${p.name}</span> 고코스트 폐기 → 상대 함정 ${broke}장 파괴`, `<span class="t">${p.name}</span> 高コスト破棄 → 相手の罠${broke}枚を破壊`);
    }
  }
  // v40: 손패는 유지된다 (구: 턴 종료시 전부 묘지로). 상한은 드로우 시점에 HAND_MAX로 관리.
  p.field.forEach((m) => { m.exhausted = false; m.tempAtk = 0; m.attacksUsed = 0; });
  p.noDirectTurn = false; // 천궁의 폐문: 턴 종료로 해제
  p.noHighAtkTurn = false; // 폐문(v37): 턴 종료로 해제
  // 60-turn limit: before a new turn would begin, judge the game by remaining HP
  // (higher HP wins; an exact tie is a draw).
  if (g.turn >= MAX_TURNS && !g.over) {
    g.over = true; g.phase = "over";
    const [pa, pb] = g.players;
    const winner: Side | null = pa.hp > pb.hp ? 0 : pb.hp > pa.hp ? 1 : null;
    g.winner = winner;
    if (winner != null) {
      const w = g.players[winner];
      ctx.log(
        `<span class="dmg">${MAX_TURNS}턴 경과 — 체력 판정으로 ${w.name} 승리! (${pa.hp} vs ${pb.hp})</span>`,
        `<span class="dmg">${MAX_TURNS}ターン経過 — 体力判定で ${w.name} の勝利！ (${pa.hp} vs ${pb.hp})</span>`,
      );
      ctx.ev.push({ type: "win", winner });
    } else {
      ctx.log(
        `<span class="dmg">${MAX_TURNS}턴 경과 — 체력 동률, 무승부!</span>`,
        `<span class="dmg">${MAX_TURNS}ターン経過 — 体力同点、引き分け！</span>`,
      );
      ctx.ev.push({ type: "matchDraw" });
    }
    return;
  }
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
  if (t.card.exileOnDestroy) rmz(o).push(t.card); // 공허 함정(최후의 보루): 사용 후 게임에서 제외
  else o.discard.push(t.card);
  ctx.ev.push({ type: "trapReveal", player: side(g, o), id: t.card.id }); // flip → reveal → discard (UI)
  return t.card;
}

/** 덫 속의 덫(snare): victim의 세트 함정이 "상대의 효과"로 파괴되려 할 때 그 파괴를 통째로 1회
 *  무효화하고 상대(파괴 시도자)에게 10 데미지. 함정은 소모되지 않고 그대로 세트 상태를 유지한다. */
function trySnare(g: GameState, ctx: Ctx, victim: PlayerState): boolean {
  const i = victim.traps.findIndex((t) => t.card.react === "snare");
  if (i < 0) return false;
  const c = victim.traps[i].card;
  const opp = g.players[0] === victim ? g.players[1] : g.players[0];
  ctx.ev.push({ type: "trapReveal", player: side(g, victim), id: c.id });
  ctx.log(
    `  └ <span class="dmg">함정 ${cn(c)}!</span> 함정 파괴를 무효화 + 상대에게 10 데미지 (다시 세트)`,
    `  └ <span class="dmg">トラップ ${cn(c)}!</span> 罠破壊を無効化 + 相手に10ダメージ (再セット)`,
  );
  ctx.dealDamage(opp, 10, cn(c), cn(c));
  return true;
}

function resolveAttackCore(g: GameState, ctx: Ctx, att: FieldMon, targetUid: string | null): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  let atk = effAtk(p, att);
  // 드래곤 라이더(v36 halfSecond): 2회째 공격은 공격력 절반(내림)
  if (att.attackFx === "halfSecond" && (att.attacksUsed || 0) >= 1) { atk = Math.floor(atk / 2); ctx.log(`  └ ${cn(att)} 2회째 공격 — 공격력 절반(${atk})`, `  └ ${cn(att)} 2回目の攻撃 — 攻撃力半分(${atk})`); }
  // 살아있는 던전(v38 dungeon): 기합·회피가 없는 몬스터는 공격 시 공격력 1
  if (atk > 1 && !hasPassive(att, "guts") && !hasPassive(att, "evade") && g.players.some((pl) => pl.field.some((x) => x.aura === "dungeon"))) { atk = 1; ctx.log(`  └ 살아있는 던전: ${cn(att)} 의 공격력이 1이 된다`, `  └ 生きているダンジョン: ${cn(att)} の攻撃力が1になる`); }
  let killed = false; // 이 공격으로 상대 몬스터를 파괴했는가 (엠버 드레이크 연속 공격)
  let tc: CardInst | null;
  // 특급 흡혈귀(trapImmune): 함정 반응에 의한 파괴만 무효 — 아래 함정 브랜치의 파괴는 전부 이 헬퍼를 거친다
  const trapKill = (owner: PlayerState, mm: FieldMon): void => {
    if (hasPassive(mm, "trapmaster")) { ctx.log(`  └ ${cn(mm)} 은(는) 함정으로 파괴되지 않는다`, `  └ ${cn(mm)} は罠では破壊されない`); return; }
    ctx.destroyMonster(owner, mm);
  };

  if (o.defendHeal > 0) ctx.heal(o, o.defendHeal); // GS7_2: heal the defender each time they're attacked

  // ---- 도발(taunt): 다른 아군 몬스터가 공격받을 때 50%로 도발 몬스터가 대신 맞는다 ----
  if (targetUid !== null) {
    const orig = o.field.find((m) => m.uid === targetUid);
    const taunts = o.field.filter((m) => m.uid !== targetUid && m.hatch == null && hasPassive(m, "taunt"));
    if (orig && !hasPassive(orig, "taunt") && taunts.length > 0 && diceChance(g, ctx, o, 50)) {
      const tnt = taunts[randInt(g, taunts.length)];
      targetUid = tnt.uid;
      ctx.log(`  └ <span class="dmg">도발!</span> ${cn(tnt)} 이(가) 대신 공격을 받는다`, `  └ <span class="dmg">挑発！</span> ${cn(tnt)} が代わりに攻撃を受ける`);
    }
  }
  // ---- 회피(evade): 공격받은 몬스터가 주사위 1~3이면 공격 무효 ----
  if (targetUid !== null) {
    const tgt = o.field.find((m) => m.uid === targetUid);
    if (tgt && hasPassive(tgt, "evade")) {
      const { rolls: er } = diceRoll(g, ctx.ev, side(g, o), 1, 4);
      const r = er[0];
      if (r >= 4) {
        ctx.log(`  └ <span class="good">회피!</span> 🎲 ${r} — ${cn(tgt)} 이(가) 공격을 무효화`, `  └ <span class="good">回避！</span> 🎲 ${r} — ${cn(tgt)} が攻撃を無効化`);
        att.attacksUsed = (att.attacksUsed || 0) + 1;
        if (att.attacksUsed >= (att.mult || 1)) att.exhausted = true;
        return;
      }
      ctx.log(`  └ 회피 실패 🎲 ${r}`, `  └ 回避失敗 🎲 ${r}`);
    }
  }
  // ---- 부패(decay): 상대 몬스터를 공격할 때마다 부패 카운터 부여 (알 제외) ----
  if (targetUid !== null && hasPassive(att, "decay")) {
    const tgt = o.field.find((m) => m.uid === targetUid);
    if (tgt && tgt.hatch == null) {
      addDecay(g, ctx, o, tgt, 1);
      if (g.over) { att.attacksUsed = (att.attacksUsed || 0) + 1; if (att.attacksUsed >= (att.mult || 1)) att.exhausted = true; return; }
    }
  }

  // ---- terminal reactions ----
  // 담합(collusion): 자신의 종족 몬스터가 공격받으면 — 무효 + 공격 몬스터 파괴 (+ 마나 -1로 동족 카드 획득)
  {
    const colTgt = targetUid !== null ? o.field.find((m2) => m2.uid === targetUid) : undefined;
    if (colTgt?.tribe && o.traps.some((t) => t.card.react === "collusion") && (tc = takeTrap(g, ctx, o, "collusion"))) {
      ctx.log(
        `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(colTgt)} 을(를) 지킨다 — 공격 무효 + ${cn(att)} 파괴`,
        `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(colTgt)} を守る — 攻撃無効 + ${cn(att)} 破壊`,
      );
      trapKill(p, att);
      if (o.maxMana >= 2) {
        const pool = BUYABLE_POOL.filter((cid) => DB[cid].tribe === colTgt.tribe && cid !== colTgt.id);
        if (pool.length) {
          o.maxMana -= 1;
          const pick = pool[randInt(g, pool.length)];
          o.discard.push(inst(g, pick));
          ctx.log(`  └ 최대 마나 -1 → ${cn(DB[pick])} 획득 (묘지로)`, `  └ 最大マナ-1 → ${cn(DB[pick])} を獲得 (墓地へ)`);
        }
      }
      return;
    }
  }
  // ---------------- v37 함정 리워크 (터미널) ----------------
  const tgt0 = targetUid !== null ? o.field.find((m2) => m2.uid === targetUid) : undefined;
  // 포식 함정(preyGuard): 자신의 '포식' 종족이 공격받으면 — 무효 + 공격 몬스터 파괴(코스트 5 이하면 제외)
  if (tgt0?.tribe === "포식" && o.traps.some((t) => t.card.react === "preyGuard") && (tc = takeTrap(g, ctx, o, "preyGuard"))) {
    att.exhausted = true;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} ${(att.cost ?? 0) <= 5 ? "파괴 후 게임에서 제외" : "파괴"}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} ${(att.cost ?? 0) <= 5 ? "を破壊後ゲームから除外" : "を破壊"}`);
    if (hasPassive(att, "trapmaster")) ctx.log(`  └ ${cn(att)} 은(는) 함정으로 파괴되지 않는다`, `  └ ${cn(att)} は罠では破壊されない`);
    else if ((att.cost ?? 0) <= 5) { const ai = p.field.findIndex((x) => x.uid === att.uid); if (ai >= 0) { const dead = p.field.splice(ai, 1)[0]; if (!dead.token) rmz(p).push(resetInst(dead)); ctx.ev.push({ type: "destroy", player: side(g, p), uid: dead.uid, id: dead.id }); } }
    else trapKill(p, att);
    return;
  }
  // 가시 방패(spiky): 무효 + 공격 몬스터에 3 데미지
  if ((tc = takeTrap(g, ctx, o, "spiky"))) {
    att.exhausted = true;
    att.dmg = (att.dmg || 0) + 3;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} 에 3 데미지 (체력 ${curHp(p, att)}/${effDef(p, att)})`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} に3ダメージ (体力${curHp(p, att)}/${effDef(p, att)})`);
    if ((att.dmg || 0) >= effDef(p, att)) trapKill(p, att);
    return;
  }
  // 약탈(plunder): 무효 + 상대 묘지의 코스트 2 이하 카드 1장을 자신 묘지로
  if ((tc = takeTrap(g, ctx, o, "plunder"))) {
    att.exhausted = true;
    const pick = [...p.discard].filter((c) => (c.cost ?? 0) <= 2).sort((a2, b2) => (b2.cost ?? 0) - (a2.cost ?? 0))[0];
    if (pick) { p.discard.splice(p.discard.findIndex((c) => c.uid === pick.uid), 1); o.discard.push(pick); }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효${pick ? ` + 상대 묘지의 ${cn(pick)} 을(를) 자신 묘지로` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効${pick ? ` + 相手の墓地の ${cn(pick)} を自分の墓地へ` : ""}`);
    return;
  }
  // 성벽 강화(rampart): 코스트 5 이하 공격자에만 — 무효 + 패로 되돌림 + 성 카운터 +5
  if ((att.cost ?? 0) <= 5 && o.traps.some((t) => t.card.react === "rampart") && (tc = takeTrap(g, ctx, o, "rampart"))) {
    const bi = p.field.findIndex((x) => x.uid === att.uid);
    if (bi >= 0) {
      const bounced = p.field.splice(bi, 1)[0];
      if (bounced.aura === "drainMana") o.maxMana += (bounced.drained ?? (bounced.val || 3));
      ctx.ev.push({ type: "destroy", player: side(g, p), uid: bounced.uid, id: bounced.id });
      if (bounced.token) rmz(p).push(resetInst(bounced)); else p.hand.push(resetInst(bounced));
    }
    const cs = castleOf(o);
    if (cs) cs.gcount = (cs.gcount || 0) + 5;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} 을(를) 패로${cs ? ` + 성 카운터 +5 (${cs.gcount})` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} を手札へ${cs ? ` + 城カウンター+5 (${cs.gcount})` : ""}`);
    return;
  }
  // 선별의 규율(v41b sorterLaw): 덱 구성 8장 이하일 때 — 무효 + 상대 필드의 카드 2장 파괴 (몬스터 → 영구마법 → 세트 함정 순)
  if (deckComp(o).length <= 8 && o.traps.some((t) => t.card.react === "sorterLaw") && (tc = takeTrap(g, ctx, o, "sorterLaw"))) {
    att.exhausted = true;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 상대 필드의 카드 2장 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 相手の場のカード2枚を破壊`);
    let left = 2;
    const mons = [...p.field].filter((x) => x.hatch == null).sort((a2, b2) => (effAtk(p, b2) + effDef(p, b2)) - (effAtk(p, a2) + effDef(p, a2)));
    for (const x of mons) { if (left <= 0 || g.over) break; if (!p.field.some((y) => y.uid === x.uid)) continue; if (hasPassive(x, "trapmaster")) continue; trapKill(p, x); left--; }
    while (left > 0 && !g.over && p.enchants.length > 0) { const ec = p.enchants.shift()!.card; ctx.log(`  └ 영구마법 ${cn(ec)} 파괴`, `  └ 永続魔法 ${cn(ec)} 破壊`); binEnch(g, ctx, p, ec); left--; }
    while (left > 0 && !g.over && p.traps.length > 0) { if (trySnare(g, ctx, p)) break; const tr = p.traps.shift()!; if (tr.card.exileOnDestroy) rmz(p).push(tr.card); else p.discard.push(tr.card); ctx.log(`  └ 세트 함정 파괴 (정체: ${cn(tr.card)})`, `  └ セットトラップ破壊 (正体: ${cn(tr.card)})`); left--; }
    return;
  }
  // 책략(v41 stratagem): 자신 필드 몬스터 6체 이상일 때 — 무효 + 코스트 6 이하 공격측 몬스터 최대 3체 파괴
  if (o.field.length >= 6 && o.traps.some((t) => t.card.react === "stratagem") && (tc = takeTrap(g, ctx, o, "stratagem"))) {
    att.exhausted = true;
    const picks = p.field.filter((x) => (x.cost ?? 0) <= 6 && x.hatch == null)
      .sort((a2, b2) => (effAtk(p, b2) + effDef(p, b2)) - (effAtk(p, a2) + effDef(p, a2))).slice(0, 3);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 코스트 6 이하 상대 몬스터 ${picks.length}체 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + コスト6以下の相手モンスター${picks.length}体を破壊`);
    for (const x of picks) { if (g.over) break; if (p.field.some((y) => y.uid === x.uid)) trapKill(p, x); }
    return;
  }
  // 매직 카운터(magicCounter): 무효 + 상대 낙인 +1
  if ((tc = takeTrap(g, ctx, o, "magicCounter"))) {
    att.exhausted = true; p.brand = (p.brand || 0) + 1;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${p.name} 에게 낙인 카운터 +1 (합계 ${p.brand})`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${p.name} に烙印カウンター+1 (計${p.brand})`);
    return;
  }
  // 심리전(mindGame): 무효 + 양측 예상(자동) · 주사위 1개
  if ((tc = takeTrap(g, ctx, o, "mindGame"))) {
    att.exhausted = true;
    const gP = randInt(g, 6) + 1, gO = randInt(g, 6) + 1;
    const { rolls: mr } = diceRoll(g, ctx.ev, side(g, o), 1);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 · 예상 ${p.name} ${gP} / ${o.name} ${gO} → 🎲 ${mr[0]}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 · 予想 ${p.name} ${gP} / ${o.name} ${gO} → 🎲 ${mr[0]}`);
    if (mr[0] === gP) { o.brand = (o.brand || 0) + 1; ctx.log(`  └ ${p.name} 적중 — ${o.name} 에게 낙인 카운터 +1 (합계 ${o.brand})`, `  └ ${p.name} 的中 — ${o.name} に烙印カウンター+1 (計${o.brand})`); }
    if (mr[0] === gO) { p.brand = (p.brand || 0) + 3; ctx.log(`  └ ${o.name} 적중 — ${p.name} 에게 낙인 카운터 +3 (합계 ${p.brand})`, `  └ ${o.name} 的中 — ${p.name} に烙印カウンター+3 (計${p.brand})`); }
    return;
  }
  // 낙뢰(lightning): 무효 + 상대 플레이어·상대 몬스터·자신 몬스터 중 무작위 3회, 각 12 데미지(관통 없음)
  if ((tc = takeTrap(g, ctx, o, "lightning"))) {
    att.exhausted = true;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 낙뢰 3회`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 落雷3回`);
    for (let i = 0; i < 3 && !g.over; i++) {
      const pool: Array<{ owner: PlayerState | null; m?: FieldMon }> = [{ owner: null }, ...p.field.map((m2) => ({ owner: p, m: m2 })), ...o.field.map((m2) => ({ owner: o, m: m2 }))];
      const pick = pool[randInt(g, pool.length)];
      if (!pick.owner || !pick.m) { ctx.log(`  └ ⚡ ${p.name} 에게 12 데미지`, `  └ ⚡ ${p.name} に12ダメージ`); ctx.dealDamage(p, 12, cn(tc), cn(tc)); continue; }
      const tm = pick.m; const own = pick.owner;
      if (!own.field.some((x) => x.uid === tm.uid) || tm.hatch != null) continue;
      const before = curHp(own, tm);
      if (12 >= before) {
        if ((tm.guts || 0) > 0) { tm.guts = (tm.guts || 1) - 1; tm.dmg = effDef(own, tm) - 1; ctx.log(`  └ ⚡ ${cn(tm)} — 기합! 체력 1로 버팀`, `  └ ⚡ ${cn(tm)} — 気合！体力1で耐えた`); }
        else { ctx.log(`  └ ⚡ ${cn(tm)} 파괴`, `  └ ⚡ ${cn(tm)} 破壊`); ctx.destroyMonster(own, tm); }
      } else { tm.dmg = (tm.dmg || 0) + 12; ctx.log(`  └ ⚡ ${cn(tm)} 에 12 데미지 (체력 ${before - 12})`, `  └ ⚡ ${cn(tm)} に12ダメージ (体力${before - 12})`); }
    }
    return;
  }
  // 폐문(gateShut): 무효 + 이번 턴 상대는 코스트 4 이상 몬스터로 공격 불가
  if ((tc = takeTrap(g, ctx, o, "gateShut"))) {
    att.exhausted = true; p.noHighAtkTurn = true;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 — ${p.name} 은(는) 이번 턴 코스트 4 이상 몬스터로 공격할 수 없다`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 — ${p.name} はこのターン コスト4以上のモンスターで攻撃できない`);
    return;
  }
  // 대역(decoy): 공격을 다른 상대(공격측) 몬스터에게 돌린다 (관통 적용)
  if (p.field.some((x) => x.uid !== att.uid && x.hatch == null) && o.traps.some((t) => t.card.react === "decoy") && (tc = takeTrap(g, ctx, o, "decoy"))) {
    const cands = p.field.filter((x) => x.uid !== att.uid && x.hatch == null);
    const killable = cands.filter((x) => atk >= curHp(p, x)).sort((a2, b2) => (effAtk(p, b2) + effDef(p, b2)) - (effAtk(p, a2) + effDef(p, a2)));
    const dec = killable[0] ?? [...cands].sort((a2, b2) => (effAtk(p, b2) + effDef(p, b2)) - (effAtk(p, a2) + effDef(p, a2)))[0];
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격이 ${cn(dec)} 에게 향한다`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃が ${cn(dec)} に向かう`);
    resolveFriendlyFire(g, ctx, att, dec, true);
    return;
  }
  // 용암 함정(lavaPit): 무효 + 파괴 · 공격력 4 이상이면 상대 낙인 +1
  if ((tc = takeTrap(g, ctx, o, "lavaPit"))) {
    att.exhausted = true;
    const big = effAtk(p, att) >= 4;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} 파괴${big ? ` + ${p.name} 에게 낙인 카운터 +1` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} 破壊${big ? ` + ${p.name} に烙印カウンター+1` : ""}`);
    trapKill(p, att);
    if (big) p.brand = (p.brand || 0) + 1;
    return;
  }
  // 식탐(gluttony): 무효 + 자신 몬스터 1체 체력 +12(지속)
  if ((tc = takeTrap(g, ctx, o, "gluttony"))) {
    att.exhausted = true;
    const fed = [...o.field].filter((x) => x.hatch == null).sort((a2, b2) => effAtk(o, b2) - effAtk(o, a2))[0];
    if (fed) fed.defMod = (fed.defMod || 0) + 12;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효${fed ? ` + ${cn(fed)} 체력 +12(지속)` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効${fed ? ` + ${cn(fed)} 体力+12(持続)` : ""}`);
    return;
  }
  // 복수(vengeance): 공격받은 자신 몬스터를 파괴하고 상대 몬스터 2체 파괴
  if (tgt0 && o.traps.some((t) => t.card.react === "vengeance") && (tc = takeTrap(g, ctx, o, "vengeance"))) {
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(tgt0)} 을(를) 제물로 상대 몬스터 2체 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(tgt0)} を生贄に相手モンスター2体を破壊`);
    ctx.destroyMonster(o, tgt0);
    trapKill(p, att);
    const other = [...p.field].filter((x) => x.uid !== att.uid).sort((a2, b2) => (effAtk(p, b2) + effDef(p, b2)) - (effAtk(p, a2) + effDef(p, a2)))[0];
    if (other && !g.over) trapKill(p, other);
    return;
  }
  // 반격 명령(rallyKnights): 무효 + 성이 있으면 기사를 가능한 한 소환
  if ((tc = takeTrap(g, ctx, o, "rallyKnights"))) {
    att.exhausted = true;
    let kn = 0;
    if (castleOf(o)) while (o.field.length < FIELD_MAX) { spawnToken(g, ctx, o, "INFKNIGHT"); kn++; }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효${kn ? ` + 기사 ${kn}체 소환` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効${kn ? ` + 騎士${kn}体を召喚` : ""}`);
    return;
  }
  // 정보상(informant): 무효 + '길드의 정보망' 전개
  if ((tc = takeTrap(g, ctx, o, "informant"))) {
    att.exhausted = true;
    const room = o.traps.length + o.enchants.length < ST_MAX;
    if (room) o.enchants.push({ card: inst(g, "GUILD_EYE"), turns: 99, bornTurn: g.turn });
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효${room ? " + 길드의 정보망 전개" : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効${room ? " + ギルドの情報網を展開" : ""}`);
    return;
  }
  // 천궁의 폐문(gateClose): 직접 공격에만 반응 — 무효 + 공격측은 이번 턴 직접 공격 불가
  if (targetUid === null && (tc = takeTrap(g, ctx, o, "gateClose"))) {
    att.exhausted = true;
    p.noDirectTurn = true;
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 — ${p.name} 은(는) 이번 턴 직접 공격할 수 없다`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 — ${p.name} はこのターン直接攻撃できない`,
    );
    return;
  }
  // 최후의 보루(lastBastion): 이 공격으로 체력이 0이 될 때만 — 무효 + 상대 턴 강제 종료
  {
    let lethal = false;
    if (targetUid === null) lethal = atk >= o.hp;
    else {
      const lt = o.field.find((m) => m.uid === targetUid);
      // v24 HP-combat: 관통 = 남은 체력 초과분
      if (lt && lt.hatch == null) { const rem = Math.max(0, effDef(o, lt) - (lt.dmg || 0)); lethal = atk >= rem && atk - rem >= o.hp; }
    }
    if (lethal && (tc = takeTrap(g, ctx, o, "lastBastion"))) {
      att.exhausted = true;
      const used = (o.bastionUses = (o.bastionUses || 0) + 1);
      ctx.log(
        `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${p.name} 의 턴을 강제 종료`,
        `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${p.name} のターンを強制終了`,
      );
      if (used <= 3) {
        const h = Math.floor(o.maxHp / 2);
        ctx.heal(o, h);
        ctx.log(`  └ 최대 체력의 절반(${h}) 회복 (${o.hp})`, `  └ 最大体力の半分(${h})を回復 (${o.hp})`);
      } else {
        ctx.log(`  └ 이미 3회 사용 — 회복은 발동하지 않는다`, `  └ 既に3回使用済み — 回復は発動しない`);
      }
      o.bastionDraw = (o.bastionDraw || 0) + 4;
      endTurn(g, ctx);
      return;
    }
  }
  // 영혼 교환(soulSwap): 자신 필드에 몬스터가 있을 때만 — 공격 몬스터 탈취 + 최저 코스트 몬스터 반납
  if (o.field.length > 0 && !hasPassive(att, "trapmaster")
    && o.traps.some((t) => t.card.react === "soulSwap") && (tc = takeTrap(g, ctx, o, "soulSwap"))) {
    const give = [...o.field].sort((a2, b2) => (a2.cost ?? 0) - (b2.cost ?? 0))[0];
    const gi = o.field.findIndex((x) => x.uid === give.uid);
    o.field.splice(gi, 1);
    give.exhausted = true; give.attacksUsed = 0;
    ctx.ev.push({ type: "destroy", player: side(g, o), uid: give.uid, id: give.id });
    p.field.push(give);
    ctx.ev.push({ type: "summon", player: side(g, p), uid: give.uid, id: give.id });
    const ai = p.field.findIndex((x) => x.uid === att.uid);
    if (ai >= 0) {
      const stolen = p.field.splice(ai, 1)[0];
      stolen.exhausted = true; stolen.attacksUsed = 0;
      ctx.ev.push({ type: "destroy", player: side(g, p), uid: stolen.uid, id: stolen.id });
      o.field.push(stolen);
      ctx.ev.push({ type: "summon", player: side(g, o), uid: stolen.uid, id: stolen.id });
    }
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 을(를) 빼앗고, 대신 ${cn(give)} 을(를) 상대 필드로 보낸다(이번 턴 행동 불가)`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} を奪い、代わりに ${cn(give)} を相手の場に送る(このターン行動不可)`,
    );
    return;
  }
  // 용암재판(magmaTrial): 주사위 5 이상이면 공격 몬스터를 파괴 후 게임에서 제외 (묘지로 가지 않음).
  // 실패하면 함정은 소모되고 아무 일도 일어나지 않는다.
  if ((tc = takeTrap(g, ctx, o, "magmaTrial"))) {
    const { rolls: mr } = diceRoll(g, ctx.ev, side(g, o), 1, 5);
    const roll = mr[0];
    if (roll < 5) {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 🎲 ${roll} → 실패`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 🎲 ${roll} → 失敗`);
      return;
    }
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 🎲 ${roll} → ${cn(att)} 파괴 후 게임에서 제외`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 🎲 ${roll} → ${cn(att)} を破壊後ゲームから除外`,
    );
    if (hasPassive(att, "trapmaster")) {
      ctx.log(`  └ ${cn(att)} 은(는) 함정으로 파괴되지 않는다`, `  └ ${cn(att)} は罠では破壊されない`);
      return;
    }
    const ai = p.field.findIndex((x) => x.uid === att.uid);
    if (ai >= 0) {
      const dead = p.field.splice(ai, 1)[0];
      if (dead.aura === "drainMana") o.maxMana += (dead.drained ?? (dead.val || 3));
      if (!dead.token) rmz(p).push(resetInst(dead)); // 파괴가 아니라 제외 — 덱 순환에서 영구히 빠진다
      ctx.ev.push({ type: "destroy", player: side(g, p), uid: dead.uid, id: dead.id });
    }
    return;
  }
  // 아귀의 식탐(devourGuard): 무효 + 파괴, 주사위 4+면 묘지 대신 게임에서 제외
  if ((tc = takeTrap(g, ctx, o, "devourGuard"))) {
    att.exhausted = true;
    const { rolls: dgr } = diceRoll(g, ctx.ev, side(g, o), 1, 4);
    const dr = dgr[0];
    if (hasPassive(att, "trapmaster")) {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 — ${cn(att)} 은(는) 함정으로 파괴되지 않는다`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 — ${cn(att)} は罠では破壊されない`);
    } else if (dr >= 4) {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 🎲 ${dr} → ${cn(att)} 파괴 후 게임에서 제외`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 🎲 ${dr} → ${cn(att)} を破壊後ゲームから除外`);
      const di = p.field.findIndex((x) => x.uid === att.uid);
      if (di >= 0) {
        const dead = p.field.splice(di, 1)[0];
        if (dead.aura === "drainMana") o.maxMana += (dead.val || 3);
        if (!dead.token) rmz(p).push(resetInst(dead));
        ctx.ev.push({ type: "destroy", player: side(g, p), uid: dead.uid, id: dead.id });
      }
    } else {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 🎲 ${dr} → ${cn(att)} 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 🎲 ${dr} → ${cn(att)} を破壊`);
      trapKill(p, att);
    }
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "judgment"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 상대에게 ${tc.val}`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 相手に ${tc.val}`,
    );
    trapKill(p, att); ctx.dealDamage(p, tc.val || 0, cn(tc), cn(tc)); return;
  }
  // 되받는 뇌광(boltcost): 파괴 + 그 몬스터의 코스트만큼 상대에게 데미지
  if ((tc = takeTrap(g, ctx, o, "boltcost"))) {
    const cdmg = att.cost || 0;
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 코스트만큼 ${cdmg} 데미지`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + コスト分 ${cdmg} ダメージ`,
    );
    trapKill(p, att);
    if (!g.over && cdmg > 0) ctx.dealDamage(p, cdmg, cn(tc), cn(tc));
    return;
  }
  // 흉조(omen): 파괴 + 상대는 다음 턴 드로우 -2
  if ((tc = takeTrap(g, ctx, o, "omen"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + ${p.name} 은(는) 다음 턴 드로우 -2`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + ${p.name} は次のターンのドロー-2`,
    );
    trapKill(p, att);
    p.drawPenaltyNext = (p.drawPenaltyNext || 0) + 2;
    return;
  }
  // 심해의 역조(undertow): 공격 무효 + 공격 몬스터를 소유자의 패로 되돌린다 (토큰은 제외)
  if ((tc = takeTrap(g, ctx, o, "undertow"))) {
    const bi = p.field.findIndex((x) => x.uid === att.uid);
    if (bi >= 0) {
      const bounced = p.field.splice(bi, 1)[0];
      if (bounced.aura === "drainMana") o.maxMana += (bounced.val || 3);
      ctx.ev.push({ type: "destroy", player: side(g, p), uid: bounced.uid, id: bounced.id });
      if (bounced.token) {
        rmz(p).push(resetInst(bounced));
        ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 — 토큰 ${cn(bounced)} 은(는) 게임에서 제외`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 — トークン ${cn(bounced)} はゲームから除外`);
      } else {
        p.hand.push(resetInst(bounced));
        ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(bounced)} 을(를) 패로 되돌린다`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(bounced)} を手札に戻す`);
      }
    }
    return;
  }
  // 용암문 폐쇄(gateLockAll): 공격 무효 + 이번 턴 상대 몬스터 전원 공격 불가
  if ((tc = takeTrap(g, ctx, o, "gateLockAll"))) {
    p.field.forEach((mm) => { mm.exhausted = true; mm.attacksUsed = mm.mult || 1; });
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 — 이번 턴 ${p.name} 의 몬스터는 공격할 수 없다`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 — このターン ${p.name} のモンスターは攻撃できない`,
    );
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "devour"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 체력 ${tc.val} 회복`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 体力 ${tc.val} 回復`,
    );
    trapKill(p, att); ctx.heal(o, tc.val || 0); return;
  }
  if ((tc = takeTrap(g, ctx, o, "counter"))) {
    const refl = Math.floor(atk / 2);
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + ${refl} 반사`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + ${refl} 反射`,
    );
    ctx.dealDamage(p, refl, cn(tc), cn(tc));
    if (!g.over) trapKill(p, att);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "bulwark"))) {
    att.defMod = (att.defMod || 0) - (tc.val || 0); att.exhausted = true;
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${cn(att)} 체력 -${tc.val}`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${cn(att)} 体力 -${tc.val}`,
    );
    recheckDeaths(g, ctx);
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
  if ((tc = takeTrap(g, ctx, o, "counterFull"))) { // T4: destroy attacker (+ val2% chance: reflect full atk)
    const refl = (tc.val2 ?? 100) >= 100 ? true : diceChance(g, ctx, o, tc.val2 ?? 100);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴${refl ? ` + ${atk} 반사` : " (반사 실패)"}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊${refl ? ` + ${atk} 反射` : " (反射失敗)"}`);
    trapKill(p, att); if (refl && !g.over) ctx.dealDamage(p, atk, cn(tc), cn(tc)); return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardbuff"))) { // T12 / GT8_0: negate + own field def buff (+ optional draw)
    att.exhausted = true; const tv = tc.val || 0;
    o.field.forEach((mm) => (mm.defMod = (mm.defMod || 0) + tv));
    if (tc.val2) ctx.drawN(o, tc.val2);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 자신 몬스터 전체 체력 +${tv}${tc.val2 ? ` + ${tc.val2}장 드로우` : ""}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 自分のモンスター全体の体力+${tv}${tc.val2 ? ` + ${tc.val2}枚ドロー` : ""}`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guarddraw"))) { // GT5_1 / GT6_1: negate + draw
    att.exhausted = true; const n = ctx.drawN(o, tc.val || 0);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + ${n}장 드로우`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + ${n}枚ドロー`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardBreakDraw"))) { // GT5_0: negate + break one attacker trap + draw 1
    att.exhausted = true; let broke = 0;
    if (p.traps.length && !trySnare(g, ctx, p)) { const t2 = p.traps.splice(randInt(g, p.traps.length), 1)[0]; p.discard.push(t2.card); broke = 1; }
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
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 상대 몬스터 전체 체력 -${tv}`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 敵モンスター全体の体力-${tv}`);
    recheckDeaths(g, ctx);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardWipe"))) { // GT8_2: negate + destroy attacker traps/enchants
    att.exhausted = true; let k = 0; const lim = tc.val || 2;
    if (p.traps.length && trySnare(g, ctx, p)) { /* 덫 속의 덫: 함정 파괴만 무효 — 영구마법은 그대로 */ }
    else for (let i = 0; i < lim && p.traps.length; i++) { const t2 = p.traps.splice(randInt(g, p.traps.length), 1)[0]; p.discard.push(t2.card); k++; }
    for (let i = k; i < lim && p.enchants.length; i++) { const e2 = p.enchants.splice(randInt(g, p.enchants.length), 1)[0]; binEnch(g, ctx, p, e2.card); k++; }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 상대 함정·마법 ${k}장 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 相手の罠・魔法${k}枚破壊`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "guardPurge"))) { // GT6_0: negate + (-1 max mana) destroy up to 3 attacker monsters
    att.exhausted = true;
    if (p.field.length > 0) {
      o.maxMana = Math.max(1, o.maxMana - 1);
      let k = 0; const lim = tc.val || 3;
      for (const tm of [...p.field].sort((a2, b2) => (effAtk(p, b2) + b2.def!) - (effAtk(p, a2) + a2.def!))) { if (k >= lim) break; trapKill(p, tm); k++; }
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효 + 최대 마나 -1, 상대 몬스터 ${k}체 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効 + 最大マナ-1, 敵モンスター${k}体破壊`);
    } else ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격 무효`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃無効`);
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slaughterHeal"))) { // GT5_2: destroy attacker + 30% heal its def
    const d = effDef(p, att);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊`);
    trapKill(p, att);
    if (diceChance(g, ctx, o, 30)) { ctx.heal(o, d); ctx.log(`  └ 체력 ${d} 회복`, `  └ 体力${d}回復`); }
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slaughterRaise"))) { // GT5_3: destroy attacker + val% steal to own field
    const canRaise = o.field.length < FIELD_MAX && !hasPassive(att, "trapmaster");
    if (canRaise && diceChance(g, ctx, o, tc.val || 30)) {
      const i2 = p.field.findIndex((x) => x.uid === att.uid);
      if (i2 >= 0) { const stolen = p.field.splice(i2, 1)[0]; ctx.ev.push({ type: "destroy", player: side(g, p), uid: stolen.uid, id: stolen.id }); stolen.exhausted = true; stolen.attacksUsed = 0; o.field.push(stolen); ctx.ev.push({ type: "summon", player: side(g, o), uid: stolen.uid, id: stolen.id }); }
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 탈취(소생)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 奪取(蘇生)`);
    } else {
      ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴(소생 실패)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊(蘇生失敗)`);
      trapKill(p, att);
    }
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slayWeakAll"))) { // GT6_2: destroy attacker + all attacker-side atk down this turn
    const tv = tc.val || 0;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 상대 전체 공격력 -${tv}(이번 턴)`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 敵全体の攻撃力-${tv}(このターン)`);
    trapKill(p, att);
    p.field.forEach((mm) => (mm.tempAtk = (mm.tempAtk || 0) - tv));
    return;
  }
  if ((tc = takeTrap(g, ctx, o, "slayLowAll"))) { // GT6_3: destroy attacker + destroy all low-atk attacker monsters
    const tv = tc.val || 0;
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 파괴 + 공격 ${tv} 이하 상대 몬스터 전멸`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} 破壊 + 攻撃${tv}以下の敵モンスター全滅`);
    trapKill(p, att);
    for (const tm of [...p.field]) if (effAtk(p, tm) <= tv) trapKill(p, tm);
    return;
  }

  // 정보상(infoDealer): 다회용 무효 — 첫 발동시 주사위로 잔여 사용 횟수가 정해져 필드에 남는다
  {
    const ii = o.traps.findIndex((t) => t.card.react === "infoDealer");
    if (ii >= 0) {
      const ts = o.traps[ii];
      const c0 = ts.card;
      ctx.ev.push({ type: "trapReveal", player: side(g, o), id: c0.id });
      att.exhausted = true;
      ctx.log(`  └ <span class="dmg">함정 ${cn(c0)}!</span> 공격 무효 + 자신에게 1 데미지`, `  └ <span class="dmg">トラップ ${cn(c0)}!</span> 攻撃無効 + 自分に1ダメージ`);
      ctx.dealDamage(o, 1, cn(c0), cn(c0));
      if (g.over) return;
      if (ts.cnt == null) {
        const { rolls: ir } = diceRoll(g, ctx.ev, side(g, o), 1);
        ts.cnt = ir[0];
        ctx.log(`  └ 🎲 ${ir[0]} → 카운터 ${ts.cnt}개를 얻고 필드에 남는다`, `  └ 🎲 ${ir[0]} → カウンター${ts.cnt}個を得て場に残る`);
      } else {
        ts.cnt -= 1;
        if (ts.cnt <= 0) {
          o.traps.splice(ii, 1); o.discard.push(c0);
          ctx.log(`  └ 카운터 소진 — ${cn(c0)} 은(는) 묘지로`, `  └ カウンターを使い切り ${cn(c0)} は墓地へ`);
        } else ctx.log(`  └ 남은 카운터 ${ts.cnt}개`, `  └ 残りカウンター${ts.cnt}個`);
      }
      return;
    }
  }

  // ---- non-terminal reactions (attack still resolves) ----
  // 선전포고(warDecl, v37): 자신의 '성'이 공격받으면 기사 3체
  if (tgt0?.id === "CASTLE" && o.traps.some((t) => t.card.react === "warDecl") && (tc = takeTrap(g, ctx, o, "warDecl"))) {
    let kn = 0; for (let i = 0; i < 3 && o.field.length < FIELD_MAX; i++) { spawnToken(g, ctx, o, "INFKNIGHT"); kn++; }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 기사(4/4) ${kn}체 소환`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 騎士(4/4)${kn}体を召喚`);
    if (g.over) { att.exhausted = true; return; }
  }
  // 징병(conscript, v37): 공격 몬스터의 코스트만큼 병사
  if ((tc = takeTrap(g, ctx, o, "conscript"))) {
    let sn = 0; for (let i = 0; i < (att.cost ?? 0) && o.field.length < FIELD_MAX; i++) { spawnToken(g, ctx, o, "SOLDIER2"); sn++; }
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 병사(2/2) ${sn}체 소환`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 兵士(2/2)${sn}体を召喚`);
    if (g.over) { att.exhausted = true; return; }
  }
  // 세척 장치(v41 washDevice): 공격측 필드의 '부패' 몬스터 전부 파괴 + 그 수만큼 공격측에 낙인 (공격 몬스터가 살아남으면 공격은 계속)
  if (p.field.some((x) => hasPassive(x, "decay") && x.hatch == null) && o.traps.some((t) => t.card.react === "washDevice") && (tc = takeTrap(g, ctx, o, "washDevice"))) {
    const rot = p.field.filter((x) => hasPassive(x, "decay") && x.hatch == null);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 상대의 '부패' 몬스터 ${rot.length}체 파괴`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 相手の「腐敗」モンスター${rot.length}体を破壊`);
    let nk = 0;
    for (const x of rot) { if (g.over) break; if (!p.field.some((y) => y.uid === x.uid)) continue; trapKill(p, x); if (!p.field.some((y) => y.uid === x.uid)) nk++; }
    if (nk > 0 && !g.over) { p.brand = (p.brand || 0) + nk; ctx.log(`  └ ${p.name} 에게 낙인 카운터 +${nk} (합계 ${p.brand})`, `  └ ${p.name} に烙印カウンター+${nk} (計${p.brand})`); }
    if (g.over) { att.exhausted = true; return; }
    if (!p.field.some((x) => x.uid === att.uid)) return; // 공격 몬스터가 파괴됨 — 공격 종료
  }
  // 독가시 마름쇠(caltrops, v37): 공격 몬스터 포함 상대 몬스터 최대 3체에 부패 2개씩
  if ((tc = takeTrap(g, ctx, o, "caltrops"))) {
    const others = [...p.field].filter((x) => x.uid !== att.uid && x.hatch == null).sort((a2, b2) => effAtk(p, b2) - effAtk(p, a2)).slice(0, 2);
    ctx.log(`  └ <span class="dmg">함정 ${cn(tc)}!</span> 상대 몬스터 ${1 + others.length}체에 부패 카운터 2개`, `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 相手モンスター${1 + others.length}体に腐敗カウンター2個`);
    for (const x of others) { if (g.over) break; if (p.field.some((y) => y.uid === x.uid)) addDecay(g, ctx, p, x, 2); }
    if (!g.over && att.hatch == null) addDecay(g, ctx, p, att, 2);
    if (g.over) { att.exhausted = true; return; }
    if (!p.field.some((x) => x.uid === att.uid)) return;
  }
  // 녹가시 매복진(decaytrap): 공격 몬스터에 부패 카운터 2개 (3개째면 그 자리에서 붕괴 → 공격 종료)
  if ((tc = takeTrap(g, ctx, o, "decaytrap"))) {
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> ${cn(att)} 에게 부패 카운터 2개`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> ${cn(att)} に腐敗カウンター2個`,
    );
    if (att.hatch == null) addDecay(g, ctx, p, att, 2);
    if (g.over) { att.exhausted = true; return; }
    if (!p.field.some((x) => x.uid === att.uid)) return; // 부패 붕괴로 파괴됨 — 공격 종료
  }
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
  // 반격 명령(counterOrder): 공격 절반 + 아군 전원이 공격 몬스터에 일제 반격(관통 적용)
  if ((tc = takeTrap(g, ctx, o, "counterOrder"))) {
    atk = Math.floor(atk / 2);
    ctx.log(
      `  └ <span class="dmg">함정 ${cn(tc)}!</span> 공격이 ${atk}로 절반 + 아군 전원 반격`,
      `  └ <span class="dmg">トラップ ${cn(tc)}!</span> 攻撃が ${atk} に半減 + 味方全員が反撃`,
    );
    const strikers = o.field.filter((m2) => m2.hatch == null);
    const volley = strikers.reduce((s2, m2) => s2 + effAtk(o, m2), 0);
    if (volley > 0) {
      // v24 HP-combat: 반격 데미지도 누적. 치명이면 파괴 + 초과분 관통 (기합은 체력 1로 생존)
      const maxHp2 = effDef(p, att);
      const before2 = Math.max(0, maxHp2 - (att.dmg || 0));
      if (volley >= before2) {
        const over2 = volley - before2;
        if ((att.guts || 0) > 0 && !hasPassive(att, "trapmaster")) {
          att.guts = (att.guts || 1) - 1;
          att.dmg = maxHp2 - 1;
          ctx.log(`  └ 반격 합계 ${volley} → ${cn(att)} — <span class="good">기합!</span> 체력 1로 버팀`, `  └ 反撃合計 ${volley} → ${cn(att)} — <span class="good">気合！</span> 体力1で耐えた`);
        } else {
          ctx.log(`  └ 반격 합계 ${volley} → ${cn(att)} 파괴${over2 > 0 ? ` + <span class="dmg">${over2} 관통</span>` : ""}`, `  └ 反撃合計 ${volley} → ${cn(att)} 破壊${over2 > 0 ? ` + <span class="dmg">${over2} 貫通</span>` : ""}`);
          trapKill(p, att);
        }
        if (over2 > 0 && !g.over) ctx.dealDamage(p, over2, cn(tc), cn(tc));
      } else {
        att.dmg = (att.dmg || 0) + volley;
        ctx.log(`  └ 반격 합계 ${volley} → ${cn(att)} (남은 체력 ${before2 - volley})`, `  └ 反撃合計 ${volley} → ${cn(att)} (残り体力 ${before2 - volley})`);
      }
    }
    if (g.over) { att.exhausted = true; return; }
    if (!p.field.some((x) => x.uid === att.uid)) return; // 공격 몬스터가 파괴됨 — 공격 종료
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
  let dealtFace = 0;   // actual damage landed on the opponent player (상급/특급 흡혈귀 흡수용)
  if (targetUid === null) {
    faceDmg = atk > 0;
    dealtFace = atk;
    ctx.dealDamage(o, atk, `${cn(att)} 의 직접 공격`, `${cn(att)} の直接攻撃`);
  } else {
    const target = o.field.find((m) => m.uid === targetUid);
    if (target && target.hatch != null) {
      // 알: 전투 데미지를 받지 않고 내구도 카운터만 소모 (관통 없음). 에그헌터는 val(4) 소모.
      const chomp = att.aura === "eggHunter" ? (att.val || 4) : 1;
      target.dur = (target.dur ?? 0) - chomp;
      ctx.ev.push({ type: "hit", uid: target.uid });
      ctx.log(
        `<span class="t">${p.name}</span> ${cn(att)} → ${cn(target)} 공격! 내구도 -${chomp} (남은 내구도 ${Math.max(0, target.dur)})`,
        `<span class="t">${p.name}</span> ${cn(att)} → ${cn(target)} 攻撃! 耐久-${chomp} (残り耐久${Math.max(0, target.dur)})`,
      );
      if (target.dur <= 0) {
        ctx.log(`  └ <span class="dmg">${cn(target)} 파괴 — 부화 실패</span>`, `  └ <span class="dmg">${cn(target)} 破壊 — 孵化失敗</span>`);
        ctx.destroyMonster(o, target);
      }
    } else if (target && target.id === "CASTLE" && atk >= 1 && (target.gcount || 0) > 0) {
      // 성(v37): 데미지 1 이상의 공격을 성 카운터 1개로 무효화
      target.gcount = (target.gcount || 1) - 1;
      ctx.ev.push({ type: "hit", uid: target.uid });
      ctx.log(`<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)} — <span class="good">성 카운터 1개 소모, 공격 무효</span> (남은 ${target.gcount})`, `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)} — <span class="good">城カウンター1個消費、攻撃無効</span> (残り${target.gcount})`);
    } else if (target && att.attackFx === "giantSlayer" && curHp(o, target) >= 15) {
      // 선택받은 궁수(v36): 체력 15 이상의 상대 몬스터는 무조건 파괴 (기합 무시 · 관통 없음)
      ctx.ev.push({ type: "hit", uid: target.uid });
      ctx.log(`<span class="t">${p.name}</span> ${cn(att)} → ${cn(target)}(체력 ${curHp(o, target)}) <span class="dmg">거인 사냥 — 무조건 파괴</span>`, `<span class="t">${p.name}</span> ${cn(att)} → ${cn(target)}(体力${curHp(o, target)}) <span class="dmg">巨人狩り — 無条件破壊</span>`);
      target.guts = 0;
      ctx.destroyMonster(o, target);
      killed = !o.field.some((x) => x.uid === target.uid);
    } else if (target) {
      // 가디언 골램(v36 gutsOnHit): 공격을 받을 때마다 기합 카운터 +1
      if (target.aura === "gutsOnHit") { target.guts = (target.guts || 0) + 1; ctx.log(`  └ ${cn(target)} 기합 카운터 +1 (${target.guts})`, `  └ ${cn(target)} 気合カウンター+1 (${target.guts})`); }
      // v24 HP-combat: damage ACCUMULATES on monsters (no bounce-off). The killing
      // blow's overflow pierces to the player, exactly like the old 관통.
      const maxHp = effDef(o, target);
      const before = Math.max(0, maxHp - (target.dmg || 0));
      ctx.ev.push({ type: "hit", uid: target.uid });
      if (atk <= 0) {
        ctx.log(
          `<span class="t">${p.name}</span> ${cn(att)}(공0) → ${cn(target)} <span class="muted">통하지 않음</span>`,
          `<span class="t">${p.name}</span> ${cn(att)}(攻0) → ${cn(target)} <span class="muted">通らない</span>`,
        );
      } else if (atk >= before) {
        const over = atk - before;
        // 기합(guts): 치명타를 토큰 1개로 버티고 체력 1로 생존 (관통은 그대로)
        if ((target.guts || 0) > 0) {
          target.guts = (target.guts || 1) - 1;
          target.dmg = maxHp - 1;
          ctx.log(
            `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)} — <span class="good">기합!</span> 체력 1로 버팀 (남은 기합 ${target.guts})`,
            `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)} — <span class="good">気合！</span> 体力1で耐えた (残り気合 ${target.guts})`,
          );
        } else {
          ctx.log(
            over > 0
              ? `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)}(체력 ${before}) 파괴 + <span class="dmg">${over} 관통</span>`
              : `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)}(체력 ${before}) <span class="dmg">파괴</span>`,
            over > 0
              ? `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)}(体力${before}) 破壊 + <span class="dmg">${over} 貫通</span>`
              : `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)}(体力${before}) <span class="dmg">破壊</span>`,
          );
          ctx.destroyMonster(o, target);
          killed = !o.field.some((x) => x.uid === target.uid);
          // 굶주린 짐승(devourGrow): 파괴한 몬스터의 코스트 1당 +1/+1
          if (att.aura === "devourGrow" && !g.over && p.field.some((x) => x.uid === att.uid)) {
            const dc = target.cost ?? 0;
            if (dc > 0) { att.atkMod = (att.atkMod || 0) + dc; att.defMod = (att.defMod || 0) + dc; ctx.log(`  └ ${cn(att)} 포식 성장 +${dc}/+${dc}`, `  └ ${cn(att)} 捕食成長+${dc}/+${dc}`); }
          }
        }
        if (over > 0) { faceDmg = true; dealtFace = over; ctx.dealDamage(o, over, "관통", "貫通"); }
      } else {
        target.dmg = (target.dmg || 0) + atk;
        ctx.log(
          `<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → ${cn(target)} 에 ${atk} 데미지 <span class="muted">(체력 ${before - atk}/${maxHp})</span>`,
          `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → ${cn(target)} に${atk}ダメージ <span class="muted">(体力${before - atk}/${maxHp})</span>`,
        );
      }
    }
  }
  // per-attack effect (e.g. GM8_0: lose attack permanently) + multi-attack accounting
  if (att.attackFx === "atkDownOnAttack") { att.atkMod = (att.atkMod || 0) - (att.val || 0); ctx.log(`  └ ${cn(att)} 공격력 -${att.val}(지속)`, `  └ ${cn(att)} 攻撃力-${att.val}(持続)`); }
  // 흑요석 광전사(rampFace): +2/+2 permanently each time it damages the opponent player
  if (att.attackFx === "rampFace" && faceDmg && !g.over) { att.atkMod = (att.atkMod || 0) + 2; att.defMod = (att.defMod || 0) + 2; ctx.log(`  └ ${cn(att)} +2/+2(지속)`, `  └ ${cn(att)} +2/+2(持続)`); }
  // 상급/특급 흡혈귀(vampDrain): 상대 플레이어에게 입힌 데미지의 val% 만큼 최대 체력 획득
  if (att.attackFx === "vampDrain" && dealtFace > 0 && !g.over) {
    const gain = Math.floor(dealtFace * (att.val || 100) / 100);
    if (gain > 0) { p.maxHp += gain; ctx.log(`  └ ${cn(att)} 흡혈: 최대 체력 +${gain} (${p.maxHp})`, `  └ ${cn(att)} 吸血: 最大体力+${gain} (${p.maxHp})`); }
  }
  // 선택받은 검사(cullOnFace): 상대 플레이어에게 데미지를 입힐 때마다 묘지에 컬 1장
  if (att.attackFx === "cullOnFace" && dealtFace > 0 && !g.over) {
    p.discard.push(starter(g, "STARTER_TRASH"));
    ctx.log(`  └ ${cn(att)} 묘지에 컬 1장 추가`, `  └ ${cn(att)} 墓地にカル1枚追加`);
  }
  // 선택받은 검사(v36 cullExile2): 공격할 때마다 컬 2장을 게임에서 제외 (묘지 → 덱 → 패 순)
  if (att.attackFx === "cullExile2" && !g.over) {
    const ex = exileCulls(p, 2);
    if (ex > 0) ctx.log(`  └ ${cn(att)} 컬 ${ex}장 게임에서 제외 (누적 ${cullExiled(p)})`, `  └ ${cn(att)} カル${ex}枚をゲームから除外 (累計${cullExiled(p)})`);
  }
  // 선택받은 도적(v36 rogueTrap): 직접 공격 성공 시 덱·묘지의 함정 1장을 코스트 없이 세트
  if (att.attackFx === "rogueTrap" && dealtFace > 0 && !g.over && !g.pending
    && p.traps.length + p.enchants.length < ST_MAX && [...p.deck, ...p.discard].some((c) => c.t === "trap")) {
    g.pending = { kind: "recall", reason: "rogueTrap", allowCancel: true, hint: "선택받은 도적 — 덱·묘지에서 세트할 함정 선택 (취소 가능)", hintJa: "選ばれし盗賊 — デッキ・墓地からセットする罠を選択 (キャンセル可)" };
    ctx.ev.push({ type: "needTarget", pending: g.pending });
  }
  // 뱀파이어 집사(vampButler · v36: 직접 공격도 포함): 공격할 때마다 흡혈 카운트 +1, 3카운트마다 견습 흡혈귀 소환
  if (att.aura === "vampButler" && !g.over && p.field.some((x) => x.uid === att.uid)) {
    att.gcount = (att.gcount || 0) + 1;
    ctx.log(`  └ ${cn(att)} 카운트 ${att.gcount}/3`, `  └ ${cn(att)} カウント ${att.gcount}/3`);
    if (att.gcount >= 3) {
      att.gcount = 0;
      ctx.log(`  └ <span class="good">${cn(att)} 발동! 견습 흡혈귀 소환</span>`, `  └ <span class="good">${cn(att)} 発動！見習い吸血鬼を召喚</span>`);
      spawnVampire(g, ctx, p, "VAMP1");
    }
  }
  // 암살자 길드: '암살자' 몬스터 또는 길드 자신이 상대에게 데미지를 줄 때마다 카운트 +1, 3카운트 → 14뎀
  if (dealtFace > 0 && !g.over && ((att.id || "").startsWith("ASSASSIN") || att.id === "GUILD_HALL" || (att.name || "").includes("암살자"))) {
    for (const gm of p.field) {
      if (g.over) break;
      // 암살자 길드 본부(v36 assassinHQ): 암살자가 상대에게 데미지를 줄 때마다 낙인 카운터 +1
      if (gm.aura === "assassinHQ") { o.brand = (o.brand || 0) + 1; ctx.log(`  └ ${cn(gm)}: ${o.name} 에게 낙인 카운터 +1 (합계 ${o.brand})`, `  └ ${cn(gm)}: ${o.name} に烙印カウンター+1 (計${o.brand})`); continue; }
      if (gm.aura !== "assassinGuild") continue;
      gm.gcount = (gm.gcount || 0) + 1;
      ctx.log(`  └ ${cn(gm)} 카운트 ${gm.gcount}/3`, `  └ ${cn(gm)} カウント ${gm.gcount}/3`);
      if (gm.gcount >= 3) {
        gm.gcount = 0;
        ctx.log(`  └ <span class="dmg">${cn(gm)} 발동! 상대에게 14 데미지</span>`, `  └ <span class="dmg">${cn(gm)} 発動！相手に14ダメージ</span>`);
        ctx.dealDamage(o, 14, cn(gm), cn(gm));
      }
    }
  }
  att.attacksUsed = (att.attacksUsed || 0) + 1;
  // 엠버 드레이크(v36 chainKill): 공격으로 상대 몬스터를 파괴하면 그 턴에 한 번 더 공격 가능 (최대 7회)
  const allowed = att.attackFx === "chainKill" && killed && !g.over ? 7 : (att.mult || 1);
  if (att.attackFx === "chainKill" && killed && att.attacksUsed < 7) ctx.log(`  └ ${cn(att)} 연속 공격! (${att.attacksUsed}/7)`, `  └ ${cn(att)} 連続攻撃！ (${att.attacksUsed}/7)`);
  if (att.attacksUsed >= allowed) att.exhausted = true;
}

/** 검귀(v36 berserk): 자신 필드의 몬스터를 공격 — HP 전투 규칙 그대로(누적·기합), 관통 없음. */
function resolveFriendlyFire(g: GameState, ctx: Ctx, att: FieldMon, target: FieldMon, pierce = false): void {
  const p = g.players[g.cur];
  const atk = effAtk(p, att);
  ctx.ev.push({ type: "attack", player: side(g, p), uid: att.uid, targetUid: target.uid });
  ctx.ev.push({ type: "hit", uid: target.uid });
  if (target.hatch != null) {
    target.dur = (target.dur ?? 0) - 1;
    ctx.log(`<span class="t">${p.name}</span> ${cn(att)} → 아군 ${cn(target)} 공격! 내구도 -1 (남은 ${Math.max(0, target.dur)})`, `<span class="t">${p.name}</span> ${cn(att)} → 味方 ${cn(target)} 攻撃! 耐久-1 (残り${Math.max(0, target.dur)})`);
    if (target.dur <= 0) ctx.destroyMonster(p, target);
  } else {
    const maxHp = effDef(p, target);
    const before = Math.max(0, maxHp - (target.dmg || 0));
    if (atk <= 0) ctx.log(`<span class="t">${p.name}</span> ${cn(att)}(공0) → 아군 ${cn(target)} <span class="muted">통하지 않음</span>`, `<span class="t">${p.name}</span> ${cn(att)}(攻0) → 味方 ${cn(target)} <span class="muted">通らない</span>`);
    else if (atk >= before) {
      if ((target.guts || 0) > 0) { target.guts = (target.guts || 1) - 1; target.dmg = maxHp - 1; ctx.log(`<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → 아군 ${cn(target)} — <span class="good">기합!</span> 체력 1로 버팀`, `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → 味方 ${cn(target)} — <span class="good">気合！</span> 体力1で耐えた`); }
      else { ctx.log(`<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → <span class="dmg">아군 ${cn(target)}(체력 ${before}) 파괴</span>`, `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → <span class="dmg">味方 ${cn(target)}(体力${before}) 破壊</span>`); ctx.destroyMonster(p, target); }
      if (pierce && atk - before > 0 && !g.over) ctx.dealDamage(p, atk - before, "관통", "貫通");
    } else {
      target.dmg = (target.dmg || 0) + atk;
      ctx.log(`<span class="t">${p.name}</span> ${cn(att)}(공${atk}) → 아군 ${cn(target)} 에 ${atk} 데미지 <span class="muted">(체력 ${before - atk}/${maxHp})</span>`, `<span class="t">${p.name}</span> ${cn(att)}(攻${atk}) → 味方 ${cn(target)} に${atk}ダメージ <span class="muted">(体力${before - atk}/${maxHp})</span>`);
    }
  }
  att.attacksUsed = (att.attacksUsed || 0) + 1;
  if (att.attacksUsed >= (att.mult || 1)) att.exhausted = true;
}

// ============================================================
// summon effects (generalized)
// ============================================================
/** 주술사(v39 hexSummon) 주사위 성공 눈: 초급 5+ / 중급 4+ / 상급 3+ */
const HEX_SUMMON_NEED: Record<string, number> = { HEXER1: 5, HEXER2: 4, HEXER3: 3 };
function resolveOnSummon(g: GameState, ctx: Ctx, m: FieldMon): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = m.val || 0, v2 = m.val2 || 0;
  switch (m.onSummon) {
    case "draw": { const n = ctx.drawN(p, v); ctx.log(`  └ 소환 효과: ${n}장 드로우`, `  └ 召喚効果: ${n}枚ドロー`); break; }
    case "burn": ctx.dealDamage(o, v, `${cn(m)} 소환`, `${cn(m)} 召喚`); break;
    case "sorterSummon": { // 선별자(v41): 컬 3장 제외 (상시 효과의 추가 제외는 reduce() 후처리)
      const ex = exileCulls(p, v || 3);
      if (ex > 0) ctx.log(`  └ 컬 ${ex}장 게임에서 제외 (누적 ${cullExiled(p)})`, `  └ カル${ex}枚をゲームから除外 (累計${cullExiled(p)})`);
      else ctx.log("  └ 제외할 컬이 없음", "  └ 除外するカルがない");
      break;
    }
    case "unbrand": { // 제인사(v41): 자신의 낙인 카운터 1개 제거
      if ((p.brand ?? 0) > 0) { p.brand = (p.brand ?? 0) - 1; ctx.log(`  └ 자신의 낙인 카운터 1개 제거 (남은 ${p.brand})`, `  └ 自分の烙印カウンター1個を取り除く (残り${p.brand})`); }
      else ctx.log("  └ 자신에게 낙인 카운터가 없음", "  └ 自分に烙印カウンターがない");
      break;
    }
    case "heal": ctx.heal(p, v); ctx.log(`  └ 체력 ${v} 회복 (${p.hp})`, `  └ 体力 ${v} 回復 (${p.hp})`); break;
    case "guildCnt": { // 견습/왕도 상인: 자신의 '상회'에 마켓 카운터 +v
      const ge = p.enchants.find((e) => e.card.ench === "guild");
      if (ge) {
        ge.cnt = (ge.cnt || 0) + v;
        ctx.log(`  └ 상회에 마켓 카운터 +${v} (${ge.cnt}/20)`, `  └ 商会にマーケットカウンター+${v} (${ge.cnt}/20)`);
        guildPayout(g, ctx, p, ge);
      } else ctx.log("  └ 자신 필드에 '상회'가 없음", "  └ 自分の場に「商会」がない");
      break;
    }
    case "preyBounce": { // 굶주린 새끼짐승: 상대 코스트 2 이하 1체를 패로 바운스 (선택)
      if (o.field.some((x) => (x.cost ?? 0) <= 2 && !hasPassive(x, "aura"))) {
        g.pending = { kind: "oppMon", hint: "패로 되돌릴 코스트 2 이하 몬스터 선택", hintJa: "手札に戻すコスト2以下のモンスターを選択", reason: "bounceLow", allowCancel: false, data: { maxCost: 2 } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    }
    case "preyExec": { // 포식자: 상대 3~4코 몬스터 1체 파괴 → 성공 시 최대 마나 +1
      const cand = o.field.filter((x) => ((x.cost ?? 0) === 3 || (x.cost ?? 0) === 4) && !hasPassive(x, "aura"));
      if (cand.length) {
        const tgt = cand.sort((a2, b2) => (effAtk(o, b2) + (b2.def ?? 0)) - (effAtk(o, a2) + (a2.def ?? 0)))[0];
        ctx.log(`  └ ${cn(tgt)} 을(를) 포식한다`, `  └ ${cn(tgt)} を捕食する`);
        ctx.destroyMonster(o, tgt);
        if (!o.field.some((x) => x.uid === tgt.uid)) {
          p.maxMana += 1;
          ctx.log(`  └ 포식 성공! 최대 마나 +1 (${p.maxMana})`, `  └ 捕食成功！最大マナ+1 (${p.maxMana})`);
        }
      } else ctx.log("  └ 코스트 3~4 대상 없음", "  └ コスト3~4の対象なし");
      break;
    }
    case "soloLock": { // 은둔자: 자신의 3턴 동안 다른 몬스터 소환 불가
      p.summonLockUntil = g.turn + 6;
      ctx.log("  └ 은둔: 자신의 3턴 동안 다른 몬스터 소환 불가", "  └ 隠遁: 自分の3ターンの間 他のモンスター召喚不可");
      break;
    }
    case "hermitBuff": { // 외로운 늑대: 이 카드 외 자신 필드 카드 1장 이하면 +3/+3
      const others = p.field.filter((x) => x.uid !== m.uid).length + p.traps.length + p.enchants.length;
      if (others <= 1) { m.atkMod = (m.atkMod || 0) + 3; m.defMod = (m.defMod || 0) + 3; ctx.log("  └ 고독 속에서 +3/+3", "  └ 孤独の中で+3/+3"); }
      else ctx.log(`  └ 필드 카드 ${others}장 — 불발`, `  └ 場のカード${others}枚 — 不発`);
      break;
    }
    case "gravePure": { // 고독한 사냥꾼: 묘지에 몬스터가 없으면 6드로우 (v36: 4→6)
      if (!p.discard.some((c) => c.t === "mon")) { const n2 = ctx.drawN(p, v || 6); ctx.log(`  └ 묘지가 고요하다 — ${n2}장 드로우`, `  └ 墓地が静かだ — ${n2}枚ドロー`); }
      else ctx.log("  └ 묘지에 몬스터가 있어 불발", "  └ 墓地にモンスターがいるため不発");
      break;
    }
    case "manaDebt5": { // 마족 척후: 자신의 5턴 동안 최대 마나 -1
      p.maxMana = Math.max(1, p.maxMana - 1);
      (p.manaRegain ??= []).push({ at: g.turn + 10, amt: 1 });
      ctx.log(`  └ 대가: 자신의 5턴 동안 최대 마나 -1 (${p.maxMana})`, `  └ 代価: 自分の5ターンの間 最大マナ-1 (${p.maxMana})`);
      break;
    }
    case "voidApostle": { // 허무공간의 사도: 자해 13 + 제외 카드당 +1/+1
      ctx.dealDamage(p, 13, cn(m), cn(m));
      if (!g.over) {
        const nv = rmz(p).length;
        if (nv > 0) { m.atkMod = (m.atkMod || 0) + nv; m.defMod = (m.defMod || 0) + nv; ctx.log(`  └ 제외 카드 ${nv}장 → +${nv}/+${nv}`, `  └ 除外カード${nv}枚 → +${nv}/+${nv}`); }
        else ctx.log("  └ 제외된 카드 없음", "  └ 除外されたカードなし");
      }
      break;
    }
    case "manaSet4": { // 마왕: 최대 마나가 4가 된다
      p.maxMana = 4;
      ctx.log(`  └ 마왕의 계약 — 최대 마나가 4가 된다`, `  └ 魔王の契約 — 最大マナが4になる`);
      break;
    }
    case "defDown":
      if (o.field.length) {
        // 이미 다른 선택이 대기 중이면 그 pending을 덮어쓰지(=유실) 않고 무작위 대상에 즉시 적용
        if (g.pending) {
          const tm = o.field[randInt(g, o.field.length)];
          tm.defMod = (tm.defMod || 0) - v; ctx.log(`  └ ${cn(tm)} 체력 -${v} (무작위)`, `  └ ${cn(tm)} 体力 -${v} (ランダム)`); recheckDeaths(g, ctx);
        } else if (o.field.some((tm) => !hasPassive(tm, "aura"))) { // 아우라뿐이면 pending을 만들지 않는다 (취소 불가 데드락 방지)
          g.pending = { kind: "oppMon", hint: `체력 -${v} 할 적 몬스터 선택`, hintJa: `体力 -${v} する敵モンスターを選択`, reason: "defDown", allowCancel: false, data: { val: v } };
          ctx.ev.push({ type: "needTarget", pending: g.pending });
        } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    case "refresh": rollSupply(g, p); ctx.log("  └ 제시를 무료 갱신", "  └ 提示を無料更新"); break;
    case "maxHpUp": { // 활력 계열: 최대 체력 +v
      p.maxHp += v; p.hp += v;
      ctx.ev.push({ type: "heal", player: side(g, p), amount: v });
      ctx.log(`  └ 최대 체력 +${v} (${p.maxHp})`, `  └ 最大体力 +${v} (${p.maxHp})`);
      break;
    }
    case "mimicLord": { // 미믹 리더: 자신을 제외한 양측 필드의 미믹 계열 1마리당 +3/+3
      const mc = g.players.reduce((t, pl) => t + pl.field.filter((x) => MIMIC_IDS.has(x.id) && x.uid !== m.uid).length, 0);
      if (mc > 0) { m.atkMod = (m.atkMod || 0) + mc * 3; m.defMod = (m.defMod || 0) + mc * 3; ctx.log(`  └ 미믹 ${mc}마리 → +${mc * 3}/+${mc * 3}`, `  └ ミミック${mc}体 → +${mc * 3}/+${mc * 3}`); }
      else ctx.log(`  └ 필드에 미믹 없음`, `  └ 場にミミックなし`);
      break;
    }
    case "cullTitan": { // 컬의 화신: 제외된 컬 1장당 +1/+1
      const ct = rmz(p).filter((c) => c.star === "trash").length;
      if (ct > 0) { m.atkMod = (m.atkMod || 0) + ct; m.defMod = (m.defMod || 0) + ct; ctx.log(`  └ 제외된 컬 ${ct}장 → +${ct}/+${ct}`, `  └ 除外されたカル${ct}枚 → +${ct}/+${ct}`); }
      else ctx.log(`  └ 제외된 컬 없음`, `  └ 除外されたカルなし`);
      break;
    }
    case "golemKing": { // 골램 킹: 필드·덱·패·묘지에 다른 '골램' 계열이 없으면 -4/-4
      const pool = [...p.field.filter((x) => x.uid !== m.uid), ...p.hand, ...p.deck, ...p.discard];
      const hasGolem = pool.some((c) => c.t === "mon" && (c.name || "").includes("골램"));
      if (!hasGolem) {
        m.atkMod = (m.atkMod || 0) - 4; m.defMod = (m.defMod || 0) - 4; recheckDeaths(g, ctx);
        ctx.log(`  └ <span class="dmg">골램 부재</span> — ${cn(m)} -4/-4`, `  └ <span class="dmg">ゴーレム不在</span> — ${cn(m)} -4/-4`);
      } else ctx.log(`  └ 골램 군단 결집 — 페널티 없음`, `  └ ゴーレム軍団結集 — ペナルティなし`);
      break;
    }
    case "decayMark": { // 러스트캡 슬러그: 상대 몬스터 1체에 부패 카운터 1개 (알 제외)
      if (o.field.some((x) => x.hatch == null)) {
        if (g.pending) { // 대기 중 pending 보호 — 무작위 대상(알 제외)에 즉시 적용
          const pool = o.field.filter((x) => x.hatch == null);
          addDecay(g, ctx, o, pool[randInt(g, pool.length)], 1);
        } else {
          g.pending = { kind: "oppMon", hint: "부패 카운터 1개를 부여할 적 몬스터 선택", hintJa: "腐敗カウンターを1個与える敵モンスターを選択", reason: "decayMark", allowCancel: false, data: { val: 1 } };
          ctx.ev.push({ type: "needTarget", pending: g.pending });
        }
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    }
    case "wipeTraps": { // 나이트로드: 상대 세트 함정 전부 파괴
      const wt = o.traps.length;
      if (wt > 0 && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
      else if (wt > 0) {
        for (const tr of o.traps.splice(0)) o.discard.push(tr.card);
        ctx.log(`  └ 상대 세트 함정 ${wt}장 전부 파괴`, `  └ 相手のセット罠${wt}枚を全て破壊`);
      } else ctx.log(`  └ 파괴할 함정 없음`, `  └ 破壊するトラップなし`);
      break;
    }
    case "awakenMimic": { // 각성한 미믹: 미믹 2마리 소환
      spawnToken(g, ctx, p, "MIMIC"); spawnToken(g, ctx, p, "MIMIC");
      ctx.log(`  └ 미믹(3/2) 2마리 소환`, `  └ ミミック(3/2)2体召喚`);
      break;
    }
    case "mimicKing": { // 미믹 킹: 제외된 미믹 계열 1장당 +1/+1, 6장+면 마스터 미믹 소환
      const km = rmz(p).filter((c) => MIMIC_IDS.has(c.id)).length;
      if (km > 0) { m.atkMod = (m.atkMod || 0) + km; m.defMod = (m.defMod || 0) + km; ctx.log(`  └ 제외된 미믹 ${km}장 → +${km}/+${km}`, `  └ 除外されたミミック${km}枚 → +${km}/+${km}`); }
      else ctx.log(`  └ 제외된 미믹 없음`, `  └ 除外されたミミックなし`);
      if (km >= 6) { spawnToken(g, ctx, p, "MIMIC2"); ctx.log(`  └ 👑 마스터 미믹(10/3) 강림!`, `  └ 👑 マスターミミック(10/3)降臨！`); }
      break;
    }
    case "mimicKing2": { // 미믹 킹 2세: 필드/묘지/제외 미믹 1장당 +1/+1, 제외 6장+면 마스터 미믹
      const k2 = [...p.field.filter((x) => x.uid !== m.uid), ...p.discard, ...rmz(p)].filter((c) => MIMIC_IDS.has(c.id)).length;
      if (k2 > 0) { m.atkMod = (m.atkMod || 0) + k2; m.defMod = (m.defMod || 0) + k2; ctx.log(`  └ 미믹 계열 ${k2}장 → +${k2}/+${k2}`, `  └ ミミック系${k2}枚 → +${k2}/+${k2}`); }
      else ctx.log(`  └ 미믹 계열 없음`, `  └ ミミック系なし`);
      if (rmz(p).filter((c) => MIMIC_IDS.has(c.id)).length >= 6) { spawnToken(g, ctx, p, "MIMIC2"); ctx.log(`  └ 👑 마스터 미믹(10/3) 강림!`, `  └ 👑 マスターミミック(10/3)降臨！`); }
      break;
    }
    case "originMimic": { // 시초의 미믹: 필드/묘지/제외 미믹 1장당 +2/+2, 제외 8장+면 상대 함정 2장 파괴
      const ko2 = [...p.field.filter((x) => x.uid !== m.uid), ...p.discard, ...rmz(p)].filter((c) => MIMIC_IDS.has(c.id)).length;
      if (ko2 > 0) { m.atkMod = (m.atkMod || 0) + ko2 * 2; m.defMod = (m.defMod || 0) + ko2 * 2; ctx.log(`  └ 미믹 계열 ${ko2}장 → +${ko2 * 2}/+${ko2 * 2}`, `  └ ミミック系${ko2}枚 → +${ko2 * 2}/+${ko2 * 2}`); }
      else ctx.log(`  └ 미믹 계열 없음`, `  └ ミミック系なし`);
      if (rmz(p).filter((c) => MIMIC_IDS.has(c.id)).length >= 8) {
        if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
        else {
          let bt = 0;
          for (let i2 = 0; i2 < 2 && o.traps.length; i2++) { const tr = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(tr.card); bt++; }
          ctx.log(`  └ 상대 세트 함정 ${bt}장 파괴`, `  └ 相手のセット罠${bt}枚を破壊`);
        }
      }
      break;
    }
    case "guardianDraw": { // 시초의 수호자: 1장 드로우 → 몬스터면 적 1체 공격력을 2로
      const gd = ctx.drawN(p, 1);
      const drew = gd > 0 ? p.hand[p.hand.length - 1] : null;
      const isMon = !!drew && drew.t === "mon";
      ctx.log(`  └ 1장 드로우 — ${isMon ? "몬스터다!" : "몬스터가 아니다"}`, `  └ 1枚ドロー — ${isMon ? "モンスターだ！" : "モンスターではない"}`);
      if (isMon && o.field.length && !g.pending) {
        g.pending = { kind: "oppMon", hint: "공격력을 2로 만들 적 몬스터 선택", hintJa: "攻撃力を2にする敵モンスターを選択", reason: "setAtk2", allowCancel: false, data: {} };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
      break;
    }
    case "giantDraw": { // 시초의 거인: 1장 드로우 → 몬스터면 코스트 5+ 시초 카드를 마나로 구매 가능
      const gd = ctx.drawN(p, 1);
      const drew = gd > 0 ? p.hand[p.hand.length - 1] : null;
      const isMon = !!drew && drew.t === "mon";
      ctx.log(`  └ 1장 드로우 — ${isMon ? "몬스터다!" : "몬스터가 아니다"}`, `  └ 1枚ドロー — ${isMon ? "モンスターだ！" : "モンスターではない"}`);
      if (isMon && !g.pending) {
        const ids = ALL_IDS.filter((id) => DB[id].tribe === "시초" && DB[id].cost >= 5);
        if (ids.length) {
          g.pending = { kind: "giantShop", hint: "거인의 교역 — 마나를 지불하고 구매할 코스트 5+ 시초 카드 선택", hintJa: "巨人の交易 — マナを払って購入するコスト5+の始原カードを選択", reason: "giantShop", allowCancel: true, data: { ids } };
          ctx.ev.push({ type: "needTarget", pending: g.pending });
        }
      }
      break;
    }
    case "eggMaster": { // 부화 마스터: 자신 필드의 모든 알 내구도 +v
      let ek = 0;
      p.field.forEach((mm) => { if (mm.hatch != null) { mm.dur = (mm.dur ?? 0) + (v || 1); ek++; } });
      if (ek > 0) ctx.log(`  └ 알 ${ek}개 내구도 +${v || 1}`, `  └ 卵${ek}個の耐久+${v || 1}`);
      else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    }
    case "vampLord": { // 특급 흡혈귀: 소환시 상대 15뎀 + 최대 체력 +30
      ctx.dealDamage(o, 15, cn(m), cn(m));
      if (!g.over) { p.maxHp += 30; ctx.log(`  └ ${cn(m)}: 최대 체력 +30 (${p.maxHp})`, `  └ ${cn(m)}: 最大体力+30 (${p.maxHp})`); }
      break;
    }
    case "blackDragon": { // 흑룡: 상대 제외존 최대 8장 선택 → 상대 묘지로 + 적 전체 방어 -3(지속)
      const dv = v || 3;
      if (o.field.length) {
        o.field.forEach((tm) => (tm.defMod = (tm.defMod || 0) - dv)); recheckDeaths(g, ctx);
        ctx.log(`  └ 흑룡의 위압: 상대 몬스터 전체 체력 -${dv}(지속)`, `  └ 黒竜の威圧: 敵モンスター全体の体力-${dv}(持続)`);
      }
      if ((o.removed?.length ?? 0) > 0 && !g.pending) { // 대기 중 pending이 있으면 이 선택은 생략 (취소 가능 효과)
        g.pending = { kind: "oppRmz", hint: "상대 묘지로 되돌릴 카드 선택 (상대의 제외존, 최대 8장)", hintJa: "相手の墓地に戻すカードを選択 (相手の除外ゾーン、最大8枚)", reason: "blackDragon", allowCancel: true, data: { val: 8 } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 상대의 제외된 카드가 없음", "  └ 相手の除外カードがない");
      break;
    }
    case "blueDragon": { // 청룡: 최대 체력 +v(20)
      p.maxHp += v || 20;
      ctx.log(`  └ 청룡의 축복: 최대 체력 +${v || 20} (${p.maxHp})`, `  └ 青竜の祝福: 最大体力+${v || 20} (${p.maxHp})`);
      break;
    }
    case "divine": { // 신수: 최대 마나 +15, 매 턴 드로우 +1(영구), 상대 필드 카드 3장 선택 파괴
      p.maxMana += 15;
      p.bonusDrawPerm += 1;
      ctx.log(`  └ 신수 강림: 최대 마나 +15 (${p.maxMana}), 매 턴 드로우 +1(영구)`, `  └ 神獣降臨: 最大マナ+15 (${p.maxMana}), 毎ターンドロー+1(永続)`);
      if (o.field.length + o.traps.length + o.enchants.length + p.field.length + p.traps.length + p.enchants.length > 0 && !g.pending) {
        // 대기 중 pending이 있으면 파괴 선택은 생략 (취소 가능 효과 — 덮어쓰면 앞의 선택이 유실된다)
        g.pending = { kind: "oppBoard", hint: "파괴할 카드 선택 (양쪽 필드 · 몬스터·세트 함정·영구마법, 3장)", hintJa: "破壊するカードを選択 (両フィールド · モンスター・セットトラップ・永続魔法、3枚)", reason: "divine", allowCancel: true, data: { val: 3, anySide: true } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
      break;
    }
    case "worldGuard": { // 세계수의 수호자: 최대체력 90+면 최대 마나 +1, 최대 체력 +15
      if (p.maxHp >= 90) {
        p.maxMana += 1; p.maxHp += 15; p.hp += 15;
        ctx.ev.push({ type: "heal", player: side(g, p), amount: 15 });
        ctx.log(`  └ 세계수의 가호: 최대 마나 +1 (${p.maxMana}), 최대 체력 +15 (${p.maxHp})`, `  └ 世界樹の加護: 最大マナ +1 (${p.maxMana}), 最大体力 +15 (${p.maxHp})`);
      } else ctx.log(`  └ 최대 체력 ${p.maxHp} — 조건 미달(90)`, `  └ 最大体力${p.maxHp} — 条件未達(90)`);
      break;
    }
    case "halfElf": { // 하프 엘프: 자신 필드에 '세계수' 이름 카드가 있으면 '세계수의 보살핌' 전개
      const hasTree = p.field.some((x) => (x.name || "").includes("세계수")) || p.enchants.some((e) => (e.card.name || "").includes("세계수"));
      if (!hasTree) { ctx.log(`  └ 필드에 '세계수' 카드 없음`, `  └ 場に「世界樹」カードなし`); break; }
      if (p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ 마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})`, `  └ 魔法・罠ゾーンが満杯です (最大${ST_MAX})`); break; }
      p.enchants.push({ card: inst(g, "WORLD_CARE"), turns: 99, bornTurn: g.turn });
      ctx.log(`  └ <span class="good">세계수의 보살핌 전개</span>`, `  └ <span class="good">世界樹の慈しみを展開</span>`);
      break;
    }
    case "elderKing": { // 엘더 하이엘프 킹: 하이엘프 2체 소환 후 자신 필드의 모든 하이엘프 공격력 +15
      spawnToken(g, ctx, p, "HIGH_ELF");
      spawnToken(g, ctx, p, "HIGH_ELF");
      let ek = 0;
      p.field.forEach((x) => { if (x.id === "HIGH_ELF") { x.atkMod = (x.atkMod || 0) + 15; ek++; } });
      if (ek > 0) ctx.log(`  └ 하이엘프 ${ek}체 공격력 +15`, `  └ ハイエルフ${ek}体の攻撃力+15`);
      break;
    }
    case "hordeBuff": { // 군단의 기수: 덱+묘지 20장 이상이면 +3/+3 (카드 텍스트 기준)
      const hn = p.deck.length + p.discard.length;
      if (hn >= 20) { m.atkMod = (m.atkMod || 0) + 3; m.defMod = (m.defMod || 0) + 3; ctx.log(`  └ 군단(${hn}장) 결집: +3/+3`, `  └ 軍団(${hn}枚)結集: +3/+3`); }
      else ctx.log(`  └ 덱+묘지 ${hn}장 — 군단 미달(20장)`, `  └ デッキ+墓地${hn}枚 — 軍団未達(20枚)`);
      break;
    }
    case "eliteBuff": { // 정예 기사단장: 덱+묘지 8장 이하면 공격력 +4 (카드 텍스트 기준)
      const en2 = p.deck.length + p.discard.length;
      if (en2 <= 8) { m.atkMod = (m.atkMod || 0) + 4; ctx.log(`  └ 정예(${en2}장) 편성: 공격력 +4`, `  └ 精鋭(${en2}枚)編成: 攻撃力+4`); }
      else ctx.log(`  └ 덱+묘지 ${en2}장 — 정예 초과(8장)`, `  └ デッキ+墓地${en2}枚 — 精鋭超過(8枚)`);
      break;
    }
    case "trapsmithBuff": { // 함정 기술자: 보유 함정 1장당 +2/+2 (v36)
      const tn = [...p.deck, ...p.discard].filter((c) => c.t === "trap").length + p.traps.length;
      if (tn > 0) { m.atkMod = (m.atkMod || 0) + tn * 2; m.defMod = (m.defMod || 0) + tn * 2; ctx.log(`  └ 함정 ${tn}장 → +${tn * 2}/+${tn * 2}`, `  └ 罠${tn}枚 → +${tn * 2}/+${tn * 2}`); }
      else ctx.log(`  └ 보유 함정 없음`, `  └ 罠なし`);
      break;
    }
    case "breaktrap":
      // v21: 파괴할 함정을 직접 선택 (양쪽 필드). 이미 다른 선택이 대기 중이면 예전처럼 상대 함정 무작위 파괴.
      if (g.pending) {
        if (o.traps.length && !trySnare(g, ctx, o)) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); ctx.log("  └ 상대의 세트 함정 1장 파괴", "  └ 相手のセットトラップを1枚破壊"); }
        else ctx.log("  └ 파괴할 함정 없음", "  └ 破壊するトラップなし");
      } else if (o.traps.length + p.traps.length > 0) {
        g.pending = { kind: "oppBoard", hint: "파괴할 세트 함정 선택 (양쪽 필드, 1장)", hintJa: "破壊するセットトラップを選択 (両フィールド、1枚)", reason: "breaktrap", allowCancel: true, data: { val: 1, anySide: true, trapOnly: true } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 파괴할 함정 없음", "  └ 破壊するトラップなし");
      break;
    case "allEnemyAtkDown": // (구 M12 — 현재 미사용)
      o.field.forEach((tm) => (tm.atkMod = (tm.atkMod || 0) - v));
      ctx.log(`  └ 상대 몬스터 전체 공격력 -${v}(지속)`, `  └ 敵モンスター全体の攻撃力-${v}(持続)`);
      break;
    case "atkDown": // M12 타이탄 게이트: 적 1체 공격 -v (지속)
      if (o.field.length) {
        if (g.pending) { // 대기 중 pending 보호 — 무작위 대상에 즉시 적용
          const tm = o.field[randInt(g, o.field.length)];
          tm.atkMod = (tm.atkMod || 0) - v; ctx.log(`  └ ${cn(tm)} 공격력 -${v} (무작위)`, `  └ ${cn(tm)} 攻撃 -${v} (ランダム)`);
        } else if (o.field.some((tm) => !hasPassive(tm, "aura"))) { // 아우라뿐이면 데드락 방지
          g.pending = { kind: "oppMon", hint: `공격력 -${v} 할 적 몬스터 선택`, hintJa: `攻撃 -${v} する敵モンスターを選択`, reason: "atkDown", allowCancel: false, data: { val: v } };
          ctx.ev.push({ type: "needTarget", pending: g.pending });
        } else ctx.log("  └ 대상 없음", "  └ 対象なし");
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
      if (o.traps.length && !trySnare(g, ctx, o)) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); const n = ctx.drawN(p, v); ctx.log(`  └ 상대 함정 1장 파괴 + ${n}장 드로우`, `  └ 相手の罠1枚破壊 + ${n}枚ドロー`); }
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
      if (mons.length) { const pick = mons[randInt(g, mons.length)]; const di = p.deck.findIndex((c) => c.uid === pick.uid); p.deck.splice(di, 1); spawnToken(g, ctx, p, pick.id, true); ctx.log(`  └ 덱에서 ${cn(pick)} 무료 소환`, `  └ デッキから ${cn(pick)} を無料召喚`); }
      else ctx.log("  └ 덱에 몬스터 없음", "  └ デッキにモンスターなし");
      break;
    }
    case "burnBreak2": // GM10_3
      ctx.dealDamage(o, v, cn(m), cn(m));
      if (!g.over && o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
      else if (!g.over) { let k = 0; for (let i = 0; i < 2 && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); k++; } if (k) ctx.log(`  └ 상대 함정 ${k}장 파괴`, `  └ 相手の罠${k}枚破壊`); }
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
      if (diceChance(g, ctx, p, 50)) { spawnToken(g, ctx, p, m.id); ctx.log("  └ 성공 → 자신을 복제 소환", "  └ 成功 → 自身を複製召喚"); }
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
    // ---------------- v36 몬스터 대개편 ----------------
    case "originEmber": { // 시초의 불씨: 자신 필드의 다른 시초 몬스터 1체 공격력 +2(지속)
      if (p.field.some((x) => x.uid !== m.uid && x.tribe === "시초") && !g.pending) {
        g.pending = { kind: "myMon", reason: "emberBuff", allowCancel: false, data: { val: 2, excl: [m.uid] }, hint: "공격력 +2 할 자신의 시초 몬스터 선택", hintJa: "攻撃力+2する自分の始原モンスターを選択" };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 없음", "  └ 対象なし");
      break;
    }
    case "refreshToken": { // 렐릭 헌터: 제시 무료 갱신 카운터 +1
      p.refreshTokens = (p.refreshTokens || 0) + 1;
      ctx.log(`  └ 제시 카운터 +1 (${p.refreshTokens}) — 이번 턴 중 마나 없이 제시 갱신 가능`, `  └ 提示カウンター+1 (${p.refreshTokens}) — このターン中マナなしで提示更新可能`);
      break;
    }
    case "golemSquad": { // 골램 특공부대: 다른 골램이 필드에 있으면 기합 카운터 +3
      if (p.field.some((x) => x.uid !== m.uid && isGolem(x))) { m.guts = (m.guts || 0) + 3; ctx.log(`  └ 골램 군단 합류 — 기합 카운터 +3 (${m.guts})`, `  └ ゴーレム軍団合流 — 気合カウンター+3 (${m.guts})`); }
      else ctx.log("  └ 필드에 다른 골램 없음", "  └ 場に他のゴーレムなし");
      break;
    }
    case "decayAll": { // 러스트캡 슬러그: 상대 몬스터 전체에 부패 카운터 1개 (알 제외)
      const ts = o.field.filter((x) => x.hatch == null);
      if (!ts.length) { ctx.log("  └ 대상 없음", "  └ 対象なし"); break; }
      for (const tm of ts) { if (g.over) break; if (o.field.some((x) => x.uid === tm.uid)) addDecay(g, ctx, o, tm, 1); }
      break;
    }
    case "hexSummon": { // 초급/중급/상급 주술사(v39): 덱 구성에 마법 val장+ → 주사위 need+면 상대 묘지에 '저주' val2장
      const need = HEX_SUMMON_NEED[m.id] ?? 5;
      const spells = deckComp(p).filter((c) => c.t === "spell").length;
      if (spells < v) { ctx.log(`  └ 마법 ${spells}장 — 조건 미달(${v}장)`, `  └ 魔法${spells}枚 — 条件未達(${v}枚)`); break; }
      const { rolls: hr, ok: hok } = diceRoll(g, ctx.ev, side(g, p), 1, need);
      if (hok) { for (let i = 0; i < v2; i++) o.discard.push(inst(g, "CURSE")); ctx.log(`  └ 🎲 ${hr[0]} → <span class="dmg">상대 묘지에 저주 ${v2}장</span>`, `  └ 🎲 ${hr[0]} → <span class="dmg">相手の墓地に呪い${v2}枚</span>`); }
      else ctx.log(`  └ 🎲 ${hr[0]} → 실패`, `  └ 🎲 ${hr[0]} → 失敗`);
      break;
    }
    case "castleInit": { // 성(v37): 성 카운터 +val (v38c: 2)
      m.gcount = (m.gcount || 0) + (v || 2);
      ctx.log(`  └ 성 카운터 +${v || 2} (${m.gcount})`, `  └ 城カウンター+${v || 2} (${m.gcount})`);
      break;
    }
    case "eliteSoldiers": { // 정예 기사단장: 덱 구성 10장 이하면 병사 2체 (v37: 덱 구성 = 덱·패·묘지·필드)
      const en2 = deckComp(p).length;
      if (en2 <= 10) { spawnToken(g, ctx, p, "SOLDIER2"); spawnToken(g, ctx, p, "SOLDIER2"); ctx.log(`  └ 정예(${en2}장) 편성: 병사(2/2) 2체 소환`, `  └ 精鋭(${en2}枚)編成: 兵士(2/2)2体召喚`); }
      else ctx.log(`  └ 덱+묘지 ${en2}장 — 정예 초과(10장)`, `  └ デッキ+墓地${en2}枚 — 精鋭超過(10枚)`);
      break;
    }
    case "hordeRally": { // 군단의 기수: 자신 필드의 병사·기사 전체 공격력 +4(지속)
      let hk = 0;
      p.field.forEach((x) => { if (x.uid !== m.uid && (isSoldier(x) || isKnight(x))) { x.atkMod = (x.atkMod || 0) + 4; hk++; } });
      ctx.log(hk ? `  └ 병사·기사 ${hk}체 공격력 +4(지속)` : "  └ 대상 없음", hk ? `  └ 兵士・騎士${hk}体の攻撃力+4(持続)` : "  └ 対象なし");
      break;
    }
    case "warlordKnight": { // 워로드: 아군 몬스터 2체 이상이면 기사 1체
      if (p.field.length >= 2) { spawnToken(g, ctx, p, "INFKNIGHT"); ctx.log("  └ 군세 결집 — 기사(4/4) 소환", "  └ 軍勢結集 — 騎士(4/4)召喚"); }
      else ctx.log("  └ 아군 몬스터 2체 미만 — 불발", "  └ 味方モンスター2体未満 — 不発");
      break;
    }
    case "chronicler": { // 기록자: 최근 5턴(자신 기준)의 제시 이력에서 원하는 카드를 마나로 구매
      const ids = [...new Set((p.supplyHist ?? []).filter((h) => g.turn - h.turn < 10).flatMap((h) => h.ids))].filter((id) => !!DB[id]);
      if (ids.length && !g.pending) {
        g.pending = { kind: "giantShop", reason: "chronicler", allowCancel: true, data: { ids }, hint: "기록자 — 최근 5턴의 제시 이력에서 마나를 지불하고 구매할 카드 선택 (취소 가능)", hintJa: "記録者 — 過去5ターンの提示リストからマナを払って購入するカードを選択 (キャンセル可)" };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 기록된 제시 없음", "  └ 記録された提示なし");
      break;
    }
    case "jailer": { // 차원 유폐자: 상대 제외존에서 최대 8장을 자신의 제외존으로
      if ((o.removed?.length ?? 0) > 0 && !g.pending) {
        g.pending = { kind: "oppRmz", reason: "jailer", allowCancel: true, data: { val: 8 }, hint: "차원 유폐자 — 자신의 제외존으로 옮길 카드 선택 (상대의 제외존, 최대 8장)", hintJa: "次元幽閉者 — 自分の除外ゾーンに移すカードを選択 (相手の除外ゾーン、最大8枚)" };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 상대의 제외된 카드가 없음", "  └ 相手の除外カードがない");
      break;
    }
    case "originArbiter": { // 시초의 재판관: 게임 중 1회 — 덱 구성의 시초 카드 1장당 상대 낙인 +1
      const once = (p.onceUsed ??= []);
      if (once.includes("TGE4")) { ctx.log("  └ 이 게임에서 이미 발동함", "  └ このゲームで既に発動済み"); break; }
      once.push("TGE4");
      const n = deckComp(p).filter((c) => c.tribe === "시초").length;
      if (n > 0) { o.brand = (o.brand || 0) + n; ctx.log(`  └ 시초 ${n}장 → ${o.name} 에게 낙인 카운터 +${n} (합계 ${o.brand})`, `  └ 始原${n}枚 → ${o.name} に烙印カウンター+${n} (計${o.brand})`); }
      else ctx.log("  └ 덱 구성에 시초 카드 없음", "  └ デッキ構成に始原カードなし");
      break;
    }
    case "originRite": { // 시초의 정령: '시초의 술식' 전개
      if (p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ 마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})`, `  └ 魔法・罠ゾーンが満杯です (最大${ST_MAX})`); break; }
      p.enchants.push({ card: inst(g, "ORIGIN_RITE"), turns: 99, bornTurn: g.turn });
      ctx.log(`  └ <span class="good">시초의 술식 전개</span>`, `  └ <span class="good">始原の術式を展開</span>`);
      break;
    }
    case "dragonFuse": { // 드래곤: 병사와 → 드래곤 라이더 / 기사와 → 앤티크 드래곤 나이트 · 둘 다 있으면 선택(v37)
      const soldier = p.field.find((x) => x.uid !== m.uid && isSoldier(x) && x.hatch == null);
      const knight = p.field.find((x) => x.uid !== m.uid && isKnight(x));
      if (!soldier && !knight) { ctx.log("  └ 필드에 병사·기사 없음 — 융합 불발", "  └ 場に兵士・騎士なし — 融合不発"); break; }
      if (soldier && knight && !g.pending) {
        g.pending = { kind: "giantShop", reason: "dragonFuse", allowCancel: false, hint: "드래곤 — 융합 결과 선택 (병사 → 드래곤 라이더 / 기사 → 앤티크 드래곤 나이트)", hintJa: "ドラゴン — 融合先を選択 (兵士 → ドラゴンライダー / 騎士 → アンティークドラゴンナイト)",
          data: { ids: ["DRAGON_RIDER", "ANTIQUE_DK"], free: true, dragonUid: m.uid, soldierUid: soldier.uid, knightUid: knight.uid } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
        break;
      }
      doDragonFuse(g, ctx, p, m.uid, (soldier ?? knight)!.uid, soldier ? "DRAGON_RIDER" : "ANTIQUE_DK");
      break;
    }
    case "generalKnight": { // 장군: 기사 1체
      spawnToken(g, ctx, p, "INFKNIGHT"); ctx.log("  └ 기사(4/4) 소환", "  └ 騎士(4/4)召喚");
      break;
    }
    case "siegeBreak2": { // 공허의 공성병: 상대 함정 2장 파괴, 2장 미만이면 자신 묘지 무작위 1장 제외
      let k = 0;
      if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
      else for (let i = 0; i < 2 && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); k++; }
      ctx.log(`  └ 상대 함정 ${k}장 파괴`, `  └ 相手の罠${k}枚破壊`);
      if (k < 2 && p.discard.length && !g.over) { const ex = p.discard.splice(randInt(g, p.discard.length), 1)[0]; rmz(p).push(ex); ctx.log(`  └ 2장 파괴 실패 — 묘지의 ${cn(ex)} 게임에서 제외`, `  └ 2枚破壊失敗 — 墓地の ${cn(ex)} をゲームから除外`); }
      break;
    }
    case "elderWipe": { // 엘더 하이엘프 킹: 상대 필드의 카드 전부 파괴
      for (const tm of [...o.field]) ctx.destroyMonster(o, tm);
      if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫 */ }
      else for (const t of o.traps.splice(0)) { if (t.card.exileOnDestroy) rmz(o).push(t.card); else o.discard.push(t.card); }
      for (const e of o.enchants.splice(0)) binEnch(g, ctx, o, e.card);
      ctx.log(`  └ <span class="dmg">상대 필드의 모든 카드 파괴</span>`, `  └ <span class="dmg">相手の場の全カードを破壊</span>`);
      break;
    }
    case "nightlord": { // 특급 암살자: 상대 낙인 +3 + 세트 함정 전부 파괴
      o.brand = (o.brand || 0) + 3;
      ctx.log(`  └ ${o.name} 에게 낙인 카운터 +3 (합계 ${o.brand})`, `  └ ${o.name} に烙印カウンター+3 (計${o.brand})`);
      const wt = o.traps.length;
      if (wt > 0 && trySnare(g, ctx, o)) { /* 덫 속의 덫 */ }
      else if (wt > 0) { for (const tr of o.traps.splice(0)) { if (tr.card.exileOnDestroy) rmz(o).push(tr.card); else o.discard.push(tr.card); } ctx.log(`  └ 상대 세트 함정 ${wt}장 전부 파괴`, `  └ 相手のセット罠${wt}枚を全て破壊`); }
      break;
    }
    case "creator": { // 창조신: 양측 덱/묘지에서 무작위 몬스터 3체를 자신 필드에 소환
      const pool = [...p.deck, ...p.discard, ...o.deck, ...o.discard].filter((c) => c.t === "mon");
      let summoned = 0;
      for (let i = 0; i < 3 && pool.length; i++) { const pick = pool.splice(randInt(g, pool.length), 1)[0]; spawnToken(g, ctx, p, pick.id); summoned++; }
      ctx.log(`  └ 덱/묘지에서 몬스터 ${summoned}체 소환`, `  └ デッキ/墓地からモンスター${summoned}体を召喚`);
      break;
    }
  }
}

/** 전설의 도박꾼(v37) 효과: 1=최대 마나 +4 · 2=최대 체력 +35 · 3=상대 필드 카드 2장 파괴 */
function gamblerEffect(g: GameState, ctx: Ctx, p: PlayerState, key: string): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  if (key === "1") { p.maxMana += 4; ctx.log(`  └ 최대 마나 +4 (${p.maxMana})`, `  └ 最大マナ+4 (${p.maxMana})`); }
  else if (key === "2") { p.maxHp += 35; p.hp += 35; ctx.ev.push({ type: "heal", player: side(g, p), amount: 35 }); ctx.log(`  └ 최대 체력 +35 (${p.maxHp})`, `  └ 最大体力+35 (${p.maxHp})`); }
  else { for (let i = 0; i < 2; i++) destroyRandomEnemy(g, ctx, o); }
}

/** 드래곤(v37) 융합 실행: 드래곤과 상대역을 묘지로 보내고 결과 토큰을 소환. */
function doDragonFuse(g: GameState, ctx: Ctx, p: PlayerState, dragonUid: string, mateUid: string, outId: string): void {
  const dragon = p.field.find((x) => x.uid === dragonUid), mate = p.field.find((x) => x.uid === mateUid);
  if (!dragon || !mate) { ctx.log("  └ 융합 불발", "  └ 融合不発"); return; }
  for (const x of [mate, dragon]) {
    const i = p.field.findIndex((y) => y.uid === x.uid);
    if (i < 0) continue;
    const gone = p.field.splice(i, 1)[0];
    if (gone.token || hasPassive(gone, "void")) rmz(p).push(resetInst(gone)); else p.discard.push(resetInst(gone));
    ctx.ev.push({ type: "destroy", player: side(g, p), uid: gone.uid, id: gone.id });
  }
  ctx.log(`  └ <span class="good">${cn(dragon)} + ${cn(mate)} → 묘지로 · ${cn(DB[outId])} 소환!</span>`, `  └ <span class="good">${cn(dragon)} + ${cn(mate)} → 墓地へ · ${cn(DB[outId])} 召喚！</span>`);
  spawnToken(g, ctx, p, outId);
}

/** Spawn a stat-only token monster (no summon effect / pitfall trigger).
 *  `fromDeck`: the summon CONSUMED a real deck card (e.g. GM10_2) — that copy
 *  still dies to the graveyard so the player keeps the card. Everything else
 *  is a conjured token: exiled on death (see destroyMonster).
 *  종족 시너지는 발동한다 — 시초의 노래/금단의 술식처럼 토큰 소환으로 동족을
 *  완성하는 카드가 시너지를 못 터뜨리던 버그 수정 (2026-07-09). */
function spawnToken(g: GameState, ctx: Ctx, p: PlayerState, id: string, fromDeck = false): void {
  if (!DB[id]) return;
  if (p.field.length >= FIELD_MAX) return; // monster zone full — cannot spawn more

  const m: FieldMon = { uid: newUID(g), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn, token: !fromDeck };
  m.onSummon = undefined; m.turnFx = undefined; // tokens don't re-trigger summon effects
  if (m.hatchTurns) { m.hatch = m.hatchTurns; m.dur = m.hatchDur ?? 4; } // 덱에서 소환된 알도 카운터 시작
  applyFieldGlobals(g, m);
  p.field.push(m);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid, id: m.id });
  applyEnterAura(g, ctx, p, m);
  applySummonBuff(ctx, p, m);
  if (m.tribe && !g.over) checkTribe(g, ctx, p, m); // 동족 시너지는 소환 경로와 무관하게 판정
}

/** GM5_2: each monster YOU summon gains +val ATK from every summonBuff aura you control. */
function applySummonBuff(ctx: Ctx, p: PlayerState, m: FieldMon): void {
  // v36: 강철의 전사 — 소환되는 몬스터의 체력 +val(지속)
  const n = p.field.filter((x) => x.uid !== m.uid && x.aura === "summonBuff").reduce((s, x) => s + (x.val || 1), 0);
  if (n > 0) { m.defMod = (m.defMod || 0) + n; ctx.log(`  └ 소환 강화: ${cn(m)} 체력 +${n}`, `  └ 召喚強化: ${cn(m)} 体力+${n}`); }
}

// ============================================================
// spells (generalized)
// ============================================================
function tryNullSpell(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const p = g.players[g.cur];           // the caster
  const o = g.players[1 - g.cur];        // the trap owner
  // cost-capped null traps only trigger on spells they can afford to counter
  // 중급 마력 차단(T2, v37): 보물상자·어튠에는 무효 · 덱 구성에 초급 마력 차단이 있으면 캡 5
  const capOf = (tr: TrapSet): number | undefined => tr.card.id === "T2" ? (deckComp(o).some((c) => c.id === "NT_NULL3") ? 5 : 4) : tr.card.cap;
  const i = o.traps.findIndex((tr) => tr.card.react === "nullspell" && !(tr.card.id === "T2" && (isChestCard(card) || isAttuneCard(card))) && (capOf(tr) === undefined || playCost(card, p) <= capOf(tr)!));
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
  if (t.lockSpell) { // 침묵의 심판: caster cannot cast spells for the rest of this turn
    p.spellSealTurn = true;
    ctx.log(`  └ <span class="dmg">${p.name}은(는) 이번 턴 동안 마법을 사용할 수 없다</span>`, `  └ <span class="dmg">${p.name}はこのターン魔法を使用できない</span>`);
  }
  return true;
}

/** 어튠 무효 장치(T1, v37): 상대가 어튠 계열을 사용하면 — 주사위 3+로 무효화 + 그 상대(시전자) 최대 체력 +5 */
function tryAttuneJam(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  if (!isAttuneCard(card)) return false;
  const t = takeTrap(g, ctx, o, "attuneJam");
  if (!t) return false;
  const { rolls: ar, ok } = diceRoll(g, ctx.ev, side(g, o), 1, 3);
  if (!ok) { ctx.log(`  └ <span class="dmg">함정 ${cn(t)}!</span> 🎲 ${ar[0]} → 실패`, `  └ <span class="dmg">トラップ ${cn(t)}!</span> 🎲 ${ar[0]} → 失敗`); return false; }
  p.maxHp += 5; p.hp += 5; ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 });
  ctx.log(`  └ <span class="dmg">함정 ${cn(t)}!</span> 🎲 ${ar[0]} → ${cn(card)} 무효화 + ${p.name} 최대 체력 +5 (${p.maxHp})`, `  └ <span class="dmg">トラップ ${cn(t)}!</span> 🎲 ${ar[0]} → ${cn(card)} 無効化 + ${p.name} の最大体力+5 (${p.maxHp})`);
  return true;
}

/** 주문 파쇄(spellSteal): 코스트 cap 이하의 마법을 무효화하고, 그 카드의 복제를 함정 주인의 패에 넣는다. */
function trySpellSteal(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const p = g.players[g.cur];           // the caster
  const o = g.players[1 - g.cur];        // the trap owner
  const i = o.traps.findIndex((tr) => tr.card.react === "spellSteal" && playCost(card, p) <= (tr.card.cap ?? 4));
  if (i < 0) return false;
  const t = o.traps.splice(i, 1)[0].card;
  o.discard.push(t);
  ctx.ev.push({ type: "trapReveal", player: side(g, o), id: t.id });
  o.hand.push(inst(g, card.id));
  ctx.log(
    `  └ <span class="dmg">상대 ${cn(t)} → ${cn(card)} 무효화</span> + 복제를 ${o.name} 의 패에 추가`,
    `  └ <span class="dmg">相手の ${cn(t)} → ${cn(card)} 無効化</span> + 複製を ${o.name} の手札に追加`,
  );
  return true;
}

/** 낙인(brandMagic): 상대가 마법(t==="spell")을 사용하면 낙인 카운터 +1 — 마법 자체는 그대로 발동. */
function tryBrandMagic(g: GameState, ctx: Ctx): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const t = takeTrap(g, ctx, o, "brandMagic");
  if (!t) return;
  p.brand = (p.brand || 0) + 1;
  ctx.log(
    `  └ <span class="dmg">함정 ${cn(t)}!</span> ${p.name} 에게 낙인 카운터 +1 (합계 ${p.brand}) — 매 턴 시작시 카운터당 🎲 1개만큼 자해`,
    `  └ <span class="dmg">トラップ ${cn(t)}!</span> ${p.name} に烙印カウンター+1 (計${p.brand}) — 毎ターン開始時カウンターごとに🎲1個分の自傷`,
  );
}

/** 상급 주술사(v39 hexCurseOnSpell): 상대가 마법(t==="spell")을 사용하면 상급 주술사 1체당 상대(시전자) 묘지에 '저주' 1장. */
function tryHexCurseOnSpell(g: GameState, ctx: Ctx): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const n = o.field.filter((m) => m.aura === "hexCurseOnSpell").length;
  if (!n) return;
  for (let i = 0; i < n; i++) p.discard.push(inst(g, "CURSE"));
  ctx.log(`  └ ${cn(DB.HEXER3)}: <span class="dmg">${p.name} 묘지에 저주 ${n}장</span>`, `  └ ${cn(DB.HEXER3)}: <span class="dmg">${p.name} の墓地に呪い${n}枚</span>`);
}
/** 특급 주술사 켈로이드(v39 hexBoss): 상대가 마법을 발동하면 주사위 1개 — 3 이상이면 무효화 (켈로이드 1체당 1회). */
function tryHexBossNull(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const o = g.players[1 - g.cur];
  for (const m of o.field) {
    if (m.aura !== "hexBoss") continue;
    const { rolls, ok } = diceRoll(g, ctx.ev, side(g, o), 1, 3);
    if (ok) { ctx.log(`  └ ${cn(m)} 🎲 ${rolls[0]} → <span class="dmg">${cn(card)} 무효화</span>`, `  └ ${cn(m)} 🎲 ${rolls[0]} → <span class="dmg">${cn(card)} 無効化</span>`); return true; }
    ctx.log(`  └ ${cn(m)} 🎲 ${rolls[0]} → 실패`, `  └ ${cn(m)} 🎲 ${rolls[0]} → 失敗`);
  }
  return false;
}
/** 마나 역류(secondNull): 이번 턴 2번째로 사용된 마법을 무효화 + 시전자 최대 마나 -1. */
function trySecondNull(g: GameState, ctx: Ctx, card: CardInst): boolean {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  if ((p.spellsCastTurn || 0) !== 2) return false;
  const t = takeTrap(g, ctx, o, "secondNull");
  if (!t) return false;
  p.maxMana = Math.max(1, p.maxMana - 1);
  ctx.log(
    `  └ <span class="dmg">상대 ${cn(t)} → 2번째 마법 ${cn(card)} 무효화</span> + 최대 마나 -1 (${p.maxMana})`,
    `  └ <span class="dmg">相手の ${cn(t)} → 2枚目の魔法 ${cn(card)} を無効化</span> + 最大マナ-1 (${p.maxMana})`,
  );
  return true;
}

/** 통행세(toll): 상대가 마켓/제시에서 카드를 구매하면 발동 — 주사위 4+로 구매 카드 제외 + 코스트만큼 데미지/최대 체력. */
function tryToll(g: GameState, ctx: Ctx, buyer: PlayerState, bought: CardInst): void {
  if (g.over) return;
  const o = g.players[0] === buyer ? g.players[1] : g.players[0];
  const t = takeTrap(g, ctx, o, "toll");
  if (!t) return;
  // v37: 주사위 5+ (자신 필드에 '성'이 있으면 3+)면 구매 카드를 게임에서 제외
  const need = castleOf(o) ? 3 : 5;
  const { rolls } = diceRoll(g, ctx.ev, side(g, o), 1, need);
  const r = rolls[0];
  if (r < need) {
    ctx.log(`  └ <span class="dmg">함정 ${cn(t)}!</span> 🎲 ${r} → 실패 (${need}+ 필요)`, `  └ <span class="dmg">トラップ ${cn(t)}!</span> 🎲 ${r} → 失敗 (${need}+が必要)`);
    return;
  }
  const bi = buyer.discard.findIndex((c) => c.uid === bought.uid);
  if (bi >= 0) { buyer.discard.splice(bi, 1); rmz(buyer).push(bought); }
  ctx.log(
    `  └ <span class="dmg">함정 ${cn(t)}!</span> 🎲 ${r} → 구매한 ${cn(bought)} 을(를) 게임에서 제외`,
    `  └ <span class="dmg">トラップ ${cn(t)}!</span> 🎲 ${r} → 購入した ${cn(bought)} をゲームから除外`,
  );
}
function applySpell(g: GameState, ctx: Ctx, card: CardInst): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = card.val || 0, v2 = card.val2 || 0;
  switch (card.act) {
    case "dmg": ctx.dealDamage(o, v, cn(card), cn(card)); break;
    case "originQuest": { // 기원의 탐구(v41b): 필드의 코스트 0 카드(양측 몬스터·영구마법 + 자신 세트 함정) 1장당 1드로우
      const n0 = g.players.reduce((s2, pl) => s2 + pl.field.filter((m) => (m.cost ?? 0) === 0).length + pl.enchants.filter((e) => (e.card.cost ?? 0) === 0).length, 0) + p.traps.filter((t) => (t.card.cost ?? 0) === 0).length;
      const dn = n0 > 0 ? ctx.drawN(p, n0) : 0;
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 코스트 0 카드 ${n0}장 → ${dn}장 드로우`, `<span class="t">${p.name}</span> ${cn(card)} → コスト0カード${n0}枚 → ${dn}枚ドロー`);
      break;
    }
    case "beginnerMind": { const dn = ctx.drawN(p, v || 4); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → ${dn}장 드로우`, `<span class="t">${p.name}</span> ${cn(card)} → ${dn}枚ドロー`); break; }
    case "voidAll": { // 차원 술식(v41b): 양 필드 모든 몬스터에 '공허' 부여
      let nv = 0;
      for (const pl of g.players) for (const m of pl.field) { if (m.hatch != null || hasPassive(m, "void")) continue; (m.passivesG ??= []).push("void"); nv++; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 필드의 몬스터 ${nv}체에 '공허' 부여`, `<span class="t">${p.name}</span> ${cn(card)} → 場のモンスター${nv}体に「虚無」を付与`);
      break;
    }
    case "buyout": p.maxMana += 1; ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +1 (${p.maxMana})`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ+1 (${p.maxMana})`); break;
    case "penance": { // 고행의 대가(v41b): 낙인 1개당 최대 마나 +2, 최대 체력 +10
      const nb = p.brand ?? 0;
      p.maxMana += 2 * nb; p.maxHp += 10 * nb; p.hp += 10 * nb;
      ctx.ev.push({ type: "heal", player: side(g, p), amount: 10 * nb });
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 낙인 ${nb}개 → 최대 마나 +${2 * nb} (${p.maxMana}), 최대 체력 +${10 * nb} (${p.maxHp})`, `<span class="t">${p.name}</span> ${cn(card)} → 烙印${nb}個 → 最大マナ+${2 * nb} (${p.maxMana})、最大体力+${10 * nb} (${p.maxHp})`);
      break;
    }
    case "packInstinct": { // 무리의 본능(v41b): 같은 이름 2체 이상인 몬스터 전부 +2/+2
      const pack = p.field.filter((m) => p.field.filter((x) => x.id === m.id).length >= 2);
      for (const m of pack) { m.atkMod = (m.atkMod || 0) + 2; m.defMod = (m.defMod || 0) + 2; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 같은 이름의 몬스터 ${pack.length}체 +2/+2`, `<span class="t">${p.name}</span> ${cn(card)} → 同名モンスター${pack.length}体 +2/+2`);
      break;
    }
    case "mindBurst": { // 정신 방출술(v41b): 자신 필드의 기합 카운터 전부 제거 → ×4 데미지
      let ng = 0;
      for (const m of p.field) { ng += m.guts || 0; m.guts = 0; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 기합 카운터 ${ng}개 제거 → ${ng * 4} 데미지`, `<span class="t">${p.name}</span> ${cn(card)} → 気合カウンター${ng}個を取り除く → ${ng * 4}ダメージ`);
      if (ng > 0) ctx.dealDamage(o, ng * 4, cn(card), cn(card));
      break;
    }
    case "heal": ctx.heal(p, v); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 체력 ${v} 회복`, `<span class="t">${p.name}</span> ${cn(card)} → 体力 ${v} 回復`); if (v2 > 0) ctx.drawN(p, v2); break;
    case "maxHpUp": { // 포도/고급 포도/와인: 자신 최대 체력 +v (+v2 드로우)
      p.maxHp += v; p.hp += v;
      ctx.ev.push({ type: "heal", player: side(g, p), amount: v });
      const mhDn = v2 > 0 ? ctx.drawN(p, v2) : 0;
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 체력 +${v}${mhDn ? `, ${mhDn}장 드로우` : ""} (${p.maxHp})`, `<span class="t">${p.name}</span> ${cn(card)} → 最大体力+${v}${mhDn ? `、${mhDn}枚ドロー` : ""} (${p.maxHp})`);
      break;
    }
    case "draw": { const n = ctx.drawN(p, v); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → ${n}장 드로우`, `<span class="t">${p.name}</span> ${cn(card)} → ${n}枚ドロー`); break; }
    case "buffAllDef": { // 수호의 맹세: 자신 몬스터 전체 체력 +v(지속)
      if (!p.field.length) { ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 대상 몬스터 없음`, `<span class="t">${p.name}</span> ${cn(card)} → 対象モンスターなし`); break; }
      p.field.forEach((m) => (m.defMod = (m.defMod || 0) + v));
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 자신 몬스터 전체 체력 +${v}`, `<span class="t">${p.name}</span> ${cn(card)} → 自分のモンスター全体の体力 +${v}`);
      break;
    }
    case "buffAllTurn": p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + v)); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 아군 전체 공격력 +${v}`, `<span class="t">${p.name}</span> ${cn(card)} → 味方全体の攻撃 +${v}`); break;
    case "siphon": ctx.dealDamage(o, v, cn(card), cn(card)); if (!g.over && v2 > 0) { ctx.heal(p, v2); ctx.log(`  └ 체력 ${v2} 회복`, `  └ 体力 ${v2} 回復`); } break;
    case "exile":
      if (o.hand.length) { const c = o.hand.splice(randInt(g, o.hand.length), 1)[0]; o.exile.push({ card: c, turns: 2 }); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 패 1장 2턴 제외`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の手札1枚を2ターン除外`); }
      else ctx.log("  └ 상대 패가 없음", "  └ 相手の手札がない");
      break;
    case "crash": rollSupply(g, o); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 제시 강제 갱신`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の提示を強制更新`); if (v2 > 0) ctx.drawN(p, v2); break;
    case "manaUp": { p.maxMana += v; const dn = v2 > 0 ? ctx.drawN(p, v2) : 0; ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +${v}${dn ? `, ${dn}장 드로우` : ""}`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ +${v}${dn ? `、${dn}枚ドロー` : ""}`); break; }
    case "destroyTrap": {
      const n = v || 1; let k = 0;
      if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
      else for (let i = 0; i < n && o.traps.length; i++) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); k++; }
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
      const added = diceChance(g, ctx, p, 50);
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
      for (let i = 0; i < n && o.enchants.length; i++) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; binEnch(g, ctx, o, e.card); k++; }
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 상대 영구마법 ${k}장 파괴`, `<span class="t">${p.name}</span> ${cn(card)} → 相手の永続魔法 ${k}枚破壊`);
      break;
    }
    case "wipeBack": {
      const snared = o.traps.length > 0 && trySnare(g, ctx, o); // 덫 속의 덫: 함정 파괴만 무효
      let n = (snared ? 0 : o.traps.length) + o.enchants.length;
      if (!snared) { o.traps.forEach((t) => o.discard.push(t.card)); o.traps = []; }
      const wipedEnch = o.enchants.splice(0);
      wipedEnch.forEach((e) => binEnch(g, ctx, o, e.card));
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
  "S1", "S5", "S7", "AMA_KEEP", "ND2", "ND3", "ND5", "GS5_0", "GS5_2", "GS6_0", "GS6_2", "GS6_3", "GS10_3",
  "GS7_0", "GS7_2", "GS8_0", "GS8_2", "GS8_3", "GS8_4", "GS8_5", "GS9_0", "GS9_2", "GS10_0", "GS10_1", "GS10_2",
  "HANDRESET", "TIMEWARP", "GAMBLE", "DICE8",
  "RUNE1", "RUNE2", "RUNE3", "GENESIS_SONG", "GENESIS_MAGIC",
  "BLOOD1", "BLOOD2", "BLOOD_JOY", "BLOOD_ANGER", "BLOOD_SORROW", "BLOOD_PLEASURE", "VAMP_PACT", "VAMP_PACT2", "BLOOD_SECRET",
  "FLAME", "NEGOTIATE", "COUNTERCALC", "AMBUSH", "TRUMPET", "TRICKROOM", "SLUM", "DARK_MERCHANT", "DUNGEON_FLOOR", "DISARM3", "FORBIDDEN", "S12", "S14", "MULTI_CULTURE", "GS5_3", "GS6_4", "REFRESH_HAND", "FOCUS", "CATALYST", "MEDITATE", "PRAYER", "HERMIT", "LUCKY_CHEST", "GUILD_CHEST", "SCRAPPER", "WALLBREAK1", "WALLBREAK2", "SNIPE1", "SNIPE2", "SHATTER", "INQUISITION", "SCARECROW", "LEVY", "CULL_FLOOD", "PURGE_ALL", "EXILE_NUKE1", "EXILE_NUKE2", "GREED_PRICE", "MARKET_CRISIS", "GOLIATH_HUNT", "MASSACRE",
  "DECAY_CRAFT", "MAJESTY_RITE", "CROSSROADS", "CHOSEN_AREA",
  "CURSE", "EXPANSION", "LAND_GRANT", "TREASON", "UNBRAND", "BUDGET", "AEM", "KNIGHT_TEACH", "NL_SECRET",
]);
// ============================================================
// dice — every former %-chance is now a visible die roll.
// 1d6 thresholds give 16.7% steps; 2d6 sum thresholds fill the
// gaps (8.3 / 27.8 / 41.7 / 58.3 / 72.2 …). The pct→spec table
// below pins the approved approximations; anything else falls
// back to the closest candidate (ties prefer the single die).
// ============================================================
export interface DiceSpec { n: number; need: number }
const DICE_SPEC_TABLE: Record<number, DiceSpec> = {
  10: { n: 2, need: 11 }, // 8.3%
  15: { n: 1, need: 6 },  // 16.7%
  20: { n: 1, need: 6 },  // 16.7%
  25: { n: 2, need: 9 },  // 27.8%
  30: { n: 1, need: 5 },  // 33.3%
  33: { n: 1, need: 5 },  // 33.3%
  40: { n: 2, need: 8 },  // 41.7%
  50: { n: 1, need: 4 },  // 50%
  60: { n: 2, need: 7 },  // 58.3%
  70: { n: 2, need: 6 },  // 72.2%
};
/** P(2d6 sum >= s) in percent. */
function p2d6(s: number): number {
  const ways: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  let n = 0; for (let t = s; t <= 12; t++) n += ways[t] ?? 0;
  return (n / 36) * 100;
}
export function diceSpecFor(pct: number): DiceSpec {
  const hit = DICE_SPEC_TABLE[pct];
  if (hit) return hit;
  let best: DiceSpec = { n: 1, need: 4 }, bestD = Infinity;
  for (let k = 2; k <= 6; k++) { const d = Math.abs(((7 - k) / 6) * 100 - pct); if (d < bestD) { bestD = d; best = { n: 1, need: k }; } }
  for (let s = 3; s <= 12; s++) { const d = Math.abs(p2d6(s) - pct); if (d < bestD - 0.01) { bestD = d; best = { n: 2, need: s }; } }
  return best;
}
/** Roll n d6, emit a dice event (drives the 3D dice animation), return rolls+sum. */
/** 카지노 전용 주사위 (리치한 전용 연출 — variant "casino"). 카운터 적립 대상에서 제외된다. */
function diceRollCasino(g: GameState, ev: GameEvent[], pl: Side): { rolls: number[]; sum: number; ok: boolean } {
  return diceRoll(g, ev, pl, 1, undefined, "casino");
}
function diceRoll(g: GameState, ev: GameEvent[], pl: Side, n: number, need?: number, variant?: "casino"): { rolls: number[]; sum: number; ok: boolean } {
  const rolls: number[] = [];
  for (let i = 0; i < n; i++) rolls.push(randInt(g, 6) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const ok = need != null ? sum >= need : true;
  ev.push({ type: "dice", player: pl, rolls, need, success: need != null ? ok : undefined, variant });
  // 카지노: 주사위를 굴릴 때마다 (카지노 주사위 자신은 제외) 필드의 카지노에 다이스 카운터 +1
  if (variant !== "casino") {
    for (const pl2 of g.players) for (const cas of pl2.field) if (cas.aura === "casino") cas.gcount = (cas.gcount || 0) + n;
  }
  // 행운의 잔향(v41b luckyEcho): 자신이 굴린 주사위의 6 1개당 (장당) 상대에게 6 데미지
  const sixes = rolls.filter((r) => r === 6).length;
  const echoes = g.players[pl].enchants.filter((e) => e.card.ench === "luckyEcho").length;
  if (sixes > 0 && echoes > 0 && !g.over) {
    const c2 = makeCtx(g, ev);
    const opp2 = g.players[1 - pl];
    c2.log(`  └ <span class="t">행운의 잔향</span>: 🎲 6 ×${sixes} → ${opp2.name} 에게 ${6 * sixes * echoes} 데미지`, `  └ <span class="t">幸運の残響</span>: 🎲 6 ×${sixes} → ${opp2.name} に${6 * sixes * echoes}ダメージ`);
    c2.dealDamage(opp2, 6 * sixes * echoes, "행운의 잔향", "幸運の残響");
  }
  return { rolls, sum, ok };
}
/** Former chance(pct): roll dice with the mapped threshold, log 🎲, return success. */
function diceChanceRaw(g: GameState, ev: GameEvent[], logFn: (ko: string, ja?: string) => void, pl: Side, pct: number): boolean {
  const spec = diceSpecFor(pct);
  const { rolls, sum, ok } = diceRoll(g, ev, pl, spec.n, spec.need);
  const dtxt = spec.n > 1 ? `${rolls.join("·")}=${sum}` : `${sum}`;
  logFn(
    `  └ 🎲 ${dtxt} (${spec.need}+ ${ok ? `<span class="good">성공</span>` : "실패"})`,
    `  └ 🎲 ${dtxt} (${spec.need}+ ${ok ? `<span class="good">成功</span>` : "失敗"})`,
  );
  return ok;
}
const diceChance = (g: GameState, ctx: Ctx, p: PlayerState, pct: number): boolean => diceChanceRaw(g, ctx.ev, ctx.log, side(g, p), pct);

/** v24: after any max-HP-reducing stat change, monsters whose accumulated damage
 *  now meets their max HP die (eggs excluded — they use durability, not HP). */
let deathCheckDepth = 0;
function recheckDeaths(g: GameState, ctx: Ctx): void {
  if (deathCheckDepth >= 8) return; // 안전장치: 조건부 체력 연쇄가 무한히 깊어지지 않게
  deathCheckDepth++;
  try { recheckDeathsInner(g, ctx); } finally { deathCheckDepth--; }
}
function recheckDeathsInner(g: GameState, ctx: Ctx): void {
  for (const pl of g.players) {
    for (const m of [...pl.field]) {
      if (g.over) return;
      if (m.hatch == null && (m.dmg || 0) >= effDef(pl, m)) {
        ctx.log(`  └ <span class="dmg">${cn(m)} 파괴</span> — 체력이 0이 되었다`, `  └ <span class="dmg">${cn(m)} 破壊</span> — 体力が0になった`);
        ctx.destroyMonster(pl, m);
      }
    }
  }
}

function tag(p: PlayerState, card: CardInst): string { return `<span class="t">${p.name}</span> ${cn(card)} →`; }

function customSpell(g: GameState, ctx: Ctx, card: CardInst): void {
  const p = g.players[g.cur];
  const o = g.players[1 - g.cur];
  const v = card.val || 0, v2 = card.val2 || 0;
  switch (card.id) {
    case "CURSE": { // 저주(v36 토큰): 자신에게 1 데미지 · 공허(사용 후 게임에서 제외 — void 패시브가 처리)
      ctx.log(`${tag(p, card)} 자신에게 1 데미지`, `${tag(p, card)} 自分に1ダメージ`);
      ctx.dealDamage(p, 1, cn(card), cn(card));
      break;
    }
    case "S1": { // 삼격의 불씨(v34): 🎲 ①② 3뎀 / ③④ 다음 턴 마나 -1 / ⑤⑥ 다음 턴 3코 이하 소환 봉쇄
      const { rolls: s1r } = diceRoll(g, ctx.ev, side(g, p), 1);
      const r1 = s1r[0];
      if (r1 <= 2) ctx.dealDamage(o, 3, cn(card), cn(card));
      else if (r1 <= 4) { o.nextPenalty = (o.nextPenalty || 0) + 1; ctx.log(`${tag(p, card)} 🎲 ${r1} → 상대의 다음 턴 마나 -1`, `${tag(p, card)} 🎲 ${r1} → 相手の次のターンのマナ-1`); }
      else { o.lowSummonBanNext = true; ctx.log(`${tag(p, card)} 🎲 ${r1} → 상대는 다음 턴 코스트 3 이하 소환 불가`, `${tag(p, card)} 🎲 ${r1} → 相手は次のターン コスト3以下を召喚不可`); }
      break;
    }
    case "S5": // 마켓 크래시(v34): 다음 상대 턴 제시 최대 2장 + 제시 갱신 봉쇄
      o.supplyShrink = 2;
      o.refreshBlockNext = true;
      ctx.log(`${tag(p, card)} 다음 상대 제시를 2장으로 축소 + 제시 갱신 봉쇄`, `${tag(p, card)} 次の相手の提示を2枚に縮小 + 提示更新を封鎖`);
      break;
    case "S7": // 오버로드: team atk this turn (v18: 최대 체력 +2 라이더 제거)
      p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + (v || 3)));
      ctx.log(`${tag(p, card)} 아군 전체 공격력 +${v || 3}`, `${tag(p, card)} 味方全体の攻撃力+${v || 3}`);
      break;
    case "ND2": { const n = ctx.drawN(p, v || 2); ctx.heal(p, v2 || 3); ctx.log(`${tag(p, card)} ${n}장 드로우, 체력 +${v2 || 3}`, `${tag(p, card)} ${n}枚ドロー, 体力+${v2 || 3}`); break; }
    case "ND3": { // 현자의 예언(v34): 상대 예측(자동) 1눈 + 🎲2개 — 예측이 둘 다 빗나가면 최대 마나 +4
      const { rolls: guess } = diceRoll(g, ctx.ev, side(g, o), 1);
      const { rolls: nd3 } = diceRoll(g, ctx.ev, side(g, p), 2);
      const miss = guess[0] !== nd3[0] && guess[0] !== nd3[1];
      ctx.log(`${tag(p, card)} 상대 예측 🎲 ${guess[0]} vs [${nd3.join(", ")}] — ${miss ? `<span class="good">빗나감! 최대 마나 +4</span>` : "적중"}`,
        `${tag(p, card)} 相手の予測 🎲 ${guess[0]} vs [${nd3.join(", ")}] — ${miss ? `<span class="good">外れ！最大マナ+4</span>` : "的中"}`);
      if (miss) p.maxMana += 4;
      break;
    }
    case "ND5": { // 고대의 지식(v34): 자신 필드 전원에 '아우라' 부여
      let na = 0;
      p.field.forEach((mm) => { if (!hasPassive(mm, "aura")) { (mm.passivesG ??= []).push("aura"); na++; } });
      ctx.log(`${tag(p, card)} 자신 몬스터 ${na}체에 '아우라' 부여`, `${tag(p, card)} 自分のモンスター${na}体に「オーラ」を付与`);
      break;
    }
    case "GS5_0": ctx.dealDamage(o, v, cn(card), cn(card)); if (!g.over && diceChance(g, ctx, p, 10)) { o.maxMana = Math.max(1, o.maxMana - 1); ctx.log(`  └ 상대 최대 마나 -1`, `  └ 相手の最大マナ-1`); } break;
    case "GS5_2": ctx.heal(p, 9); ctx.log(`${tag(p, card)} 체력 9 회복`, `${tag(p, card)} 体力9回復`); if (p.hp >= 20) { p.maxHp += 4; p.hp += 4; ctx.ev.push({ type: "heal", player: side(g, p), amount: 4 }); ctx.log(`  └ 체력 20+ → 최대 체력 +4`, `  └ 体力20+ → 最大体力+4`); } break;
    case "GS6_0": ctx.dealDamage(o, 12, cn(card), cn(card)); if (!g.over) { ctx.heal(p, 2); ctx.log(`${tag(p, card)} 12 데미지 + 체력 2 회복`, `${tag(p, card)} 12ダメージ + 体力2回復`); } break;
    case "GS6_2": ctx.heal(p, 13); ctx.log(`${tag(p, card)} 체력 13 회복`, `${tag(p, card)} 体力13回復`); if (diceChance(g, ctx, p, 20)) { p.maxHp += 5; p.hp += 5; ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 }); ctx.log(`  └ 최대 체력 +5`, `  └ 最大体力+5`); } break;
    case "GS6_3": { let n = ctx.drawN(p, v || 4); if (p.maxHp >= 55) n += ctx.drawN(p, 2); ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); break; }
    case "GS7_0": ctx.dealDamage(o, 16, cn(card), cn(card)); if (diceChance(g, ctx, p, 20)) { p.maxMana = Math.max(1, p.maxMana - 1); ctx.log(`  └ 자신 최대 마나 -1`, `  └ 自分の最大マナ-1`); } break;
    case "GS7_2": ctx.heal(p, 13); ctx.log(`${tag(p, card)} 체력 13 회복`, `${tag(p, card)} 体力13回復`); if ((p.uses["GS7_2"] || 0) === 3) { p.defendHeal += 5; ctx.log(`  └ 3회째! 이후 피격 시마다 체력 +5`, `  └ 3回目! 以降 被攻撃ごとに体力+5`); } break;
    case "GS8_0": { // 은월포(v34): 상대 덱에서 원하는 카드 1장을 게임에서 제외
      const def8 = (id: string): CardDef => DB[id] ?? (STARTERS as Record<string, CardDef>)[id];
      const ids8 = [...new Set(o.deck.map((c) => c.id))].sort((a, b) => (def8(a)?.cost ?? 0) - (def8(b)?.cost ?? 0) || a.localeCompare(b));
      if (ids8.length) {
        g.pending = { kind: "giantShop", hint: "은월포 — 상대 덱에서 제외할 카드 선택", hintJa: "銀月砲 — 相手のデッキから除外するカードを選択", reason: "exileOppDeck", allowCancel: true, data: { ids: ids8 } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log(`${tag(p, card)} 상대 덱이 비어 있음`, `${tag(p, card)} 相手のデッキが空`);
      break;
    }
    case "GS10_3": { const n = ctx.drawN(p, v || 6); p.maxHp += v2 || 3; ctx.log(`${tag(p, card)} ${n}장 드로우, 최대 체력 +${v2 || 3} (${p.maxHp})`, `${tag(p, card)} ${n}枚ドロー, 最大体力+${v2 || 3} (${p.maxHp})`); break; }
    case "GS8_2": ctx.heal(p, 14); ctx.log(`${tag(p, card)} 체력 14 회복`, `${tag(p, card)} 体力14回復`); if (p.maxMana <= 10) { const before = p.hp; p.hp = p.maxHp; if (p.hp > before) ctx.ev.push({ type: "heal", player: side(g, p), amount: p.hp - before }); ctx.log(`  └ 최대 마나 10 이하 → 체력 완전 회복`, `  └ 最大マナ10以下 → 体力全回復`); } break;
    case "GS8_3": { const n = ctx.drawN(p, v || 5); ctx.log(`${tag(p, card)} ${n}장 드로우`, `${tag(p, card)} ${n}枚ドロー`); if (diceChance(g, ctx, p, 60)) destroyRandomEnemy(g, ctx, o); break; }
    case "GS8_4": p.field.forEach((m) => { m.tempAtk = (m.tempAtk || 0) + (v || 13); m.atkMod = (m.atkMod || 0) + 2; }); ctx.log(`${tag(p, card)} 아군 전체 공격력 +${v || 13}(이번 턴) + 공격력 +2(지속)`, `${tag(p, card)} 味方全体の攻撃力+${v || 13}(今ターン) + 攻撃力+2(持続)`); break;
    case "GS8_5": p.field.forEach((m) => (m.tempAtk = (m.tempAtk || 0) + (v || 7))); ctx.log(`${tag(p, card)} 아군 전체 공격력 +${v || 7}`, `${tag(p, card)} 味方全体の攻撃力+${v || 7}`); if (diceChance(g, ctx, p, 20)) summonRandomMon(g, ctx, p, 6); break;
    case "GS9_0": ctx.dealDamage(o, 21, cn(card), cn(card)); break; // precondition (opp hp>21) checked before play
    case "GS9_2": { ctx.heal(p, v || 16); ctx.log(`${tag(p, card)} 체력 ${v || 16} 회복`, `${tag(p, card)} 体力${v || 16}回復`); const lifeLightIds = new Set(["GS5_2", "GS6_2", "GS7_2", "GS8_2", "GS10_2"]); const i = p.hand.findIndex((c) => lifeLightIds.has(c.id)); if (i >= 0) { const dumped = p.hand.splice(i, 1)[0]; p.discard.push(dumped); p.maxHp += 15; p.hp += 15; ctx.ev.push({ type: "heal", player: side(g, p), amount: 15 }); ctx.log(`  └ 생명 계열 주문 1장 묘지로 → 자신 최대 체력 +15`, `  └ 生命系の呪文1枚を墓地へ → 自分の最大体力+15`); } break; }
    case "GS10_0": ctx.dealDamage(o, 23, cn(card), cn(card)); break; // precondition (own field<=1) checked before play
    case "GS10_1": ctx.dealDamage(o, 17, cn(card), cn(card)); if (!g.over) { ctx.drawN(p, 1); ctx.log(`${tag(p, card)} 17 데미지 + 1장 드로우`, `${tag(p, card)} 17ダメージ + 1枚ドロー`); } break;
    case "GS10_2": {
      ctx.heal(p, 19); ctx.log(`${tag(p, card)} 체력 19 회복`, `${tag(p, card)} 体力19回復`);
      const big = strongest(o.field); if (big) ctx.destroyMonster(o, big);
      const tn = o.traps.length + o.enchants.length;
      if (o.traps.length && !trySnare(g, ctx, o)) { const t = o.traps.splice(randInt(g, o.traps.length), 1)[0]; o.discard.push(t.card); }
      else if (!o.traps.length && o.enchants.length) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; binEnch(g, ctx, o, e.card); }
      ctx.log(`  └ 상대 몬스터 1체 + 마법/함정 ${tn ? 1 : 0}장 파괴`, `  └ 敵モンスター1体 + 魔法/罠${tn ? 1 : 0}枚破壊`);
      break;
    }
    case "HANDRESET": { // 핸드 리셋(v34): 패 전부 버리고 5드로우
      const dumped = p.hand.length; while (p.hand.length) p.discard.push(p.hand.pop()!);
      const n = ctx.drawN(p, 5);
      ctx.log(`${tag(p, card)} 패 ${dumped}장 버리고 ${n}장 드로우`, `${tag(p, card)} 手札${dumped}枚を捨て${n}枚ドロー`);
      break;
    }
    case "TIMEWARP": { // 시공간 조작(v34): 🎲 4+면 다음 상대 턴 스킵
      const { rolls: twr } = diceRoll(g, ctx.ev, side(g, p), 1, 4);
      if (twr[0] >= 4) { o.skipTurns = (o.skipTurns ?? 0) + 1; o.skipNext = false; ctx.log(`${tag(p, card)} 🎲 ${twr[0]} <span class="good">성공!</span> 다음 상대 턴 스킵 예약 (${o.skipTurns}회)`, `${tag(p, card)} 🎲 ${twr[0]} <span class="good">成功!</span> 次の相手ターンスキップ予約 (${o.skipTurns}回)`); }
      else ctx.log(`${tag(p, card)} 🎲 ${twr[0]} 실패…`, `${tag(p, card)} 🎲 ${twr[0]} 失敗…`);
      break;
    }
    case "GAMBLE": { // 육면의 변덕(v37): 주사위 10개 합계 40 이상이면 최대 마나 +3
      const { rolls: gbr, sum: gsum } = diceRoll(g, ctx.ev, side(g, p), 10, 40);
      if (gsum >= 40) { p.maxMana += 3; ctx.log(`${tag(p, card)} 🎲 [${gbr.join(",")}] = ${gsum} → <span class="good">최대 마나 +3 (${p.maxMana})</span>`, `${tag(p, card)} 🎲 [${gbr.join(",")}] = ${gsum} → <span class="good">最大マナ+3 (${p.maxMana})</span>`); }
      else ctx.log(`${tag(p, card)} 🎲 [${gbr.join(",")}] = ${gsum} → 실패 (40 미만)`, `${tag(p, card)} 🎲 [${gbr.join(",")}] = ${gsum} → 失敗 (40未満)`);
      break;
    }
    case "EXPANSION": { // 증축(v37): 자신의 성에 성 카운터 +5
      const cs = castleOf(p);
      if (cs) { cs.gcount = (cs.gcount || 0) + 5; ctx.log(`${tag(p, card)} ${cn(cs)} 성 카운터 +5 (${cs.gcount})`, `${tag(p, card)} ${cn(cs)} 城カウンター+5 (${cs.gcount})`); }
      break;
    }
    case "LAND_GRANT": { // 영토 하사(v37): 코스트 3 이하 귀족 종족 카드 1장 소환 (선택)
      const ids = ALL_IDS.filter((id) => DB[id].t === "mon" && DB[id].tribe === "귀족" && DB[id].cost <= 3);
      if (!ids.length || p.field.length >= FIELD_MAX) { ctx.log(`${tag(p, card)} 소환할 수 없음`, `${tag(p, card)} 召喚できない`); break; }
      g.pending = { kind: "giantShop", reason: "landGrant", allowCancel: true, data: { ids, free: true }, hint: "영토 하사 — 소환할 코스트 3 이하 귀족 카드 선택", hintJa: "領土付与 — 召喚するコスト3以下の貴族カードを選択" };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "TREASON": { // 반역죄(v37): 상대 필드 전부 파괴 + 낙인 3
      for (const tm of [...o.field]) ctx.destroyMonster(o, tm);
      if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫 */ }
      else for (const t of o.traps.splice(0)) { if (t.card.exileOnDestroy) rmz(o).push(t.card); else o.discard.push(t.card); }
      for (const e of o.enchants.splice(0)) binEnch(g, ctx, o, e.card);
      o.brand = (o.brand || 0) + 3;
      ctx.log(`${tag(p, card)} <span class="dmg">상대 필드의 모든 카드 파괴</span> + ${o.name} 에게 낙인 카운터 +3 (합계 ${o.brand})`, `${tag(p, card)} <span class="dmg">相手の場の全カードを破壊</span> + ${o.name} に烙印カウンター+3 (計${o.brand})`);
      break;
    }
    case "UNBRAND": { // 제인(v37): 양측 낙인 카운터 전부 제거
      ctx.log(`${tag(p, card)} 낙인 카운터 전부 제거 (${p.name} ${p.brand || 0} / ${o.name} ${o.brand || 0})`, `${tag(p, card)} 烙印カウンターを全て除去 (${p.name} ${p.brand || 0} / ${o.name} ${o.brand || 0})`);
      p.brand = 0; o.brand = 0;
      break;
    }
    case "AEM": { // 앤티크 인핸스 매직(v38): 필드의 골램 2체 공격력 +7(지속) — 선택
      g.pending = { kind: "myMon", reason: "golemBuff", allowCancel: false, data: { val: 7, count: 2, excl: [] }, hint: "공격력 +7 할 자신의 골램 선택 (2체)", hintJa: "攻撃力+7する自分のゴーレムを選択 (2体)" };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "KNIGHT_TEACH": { // 기사의 가르침(v38): 전 아군 기합 부여 / 이미 있으면 기합 카운터 +3
      for (const km of p.field) {
        if (hasPassive(km, "guts")) { km.guts = (km.guts || 0) + 3; ctx.log(`  └ ${cn(km)} 기합 카운터 +3 (${km.guts})`, `  └ ${cn(km)} 気合カウンター+3 (${km.guts})`); }
        else { (km.passivesG ??= []).push("guts"); km.guts = (km.guts || 0) + 1; ctx.log(`  └ ${cn(km)} 이(가) '기합'을 얻는다`, `  └ ${cn(km)} が「気合」を得る`); }
      }
      break;
    }
    case "NL_SECRET": { // 나이트로드의 비기(v38): 아군 1체에 패시브 1개 부여 + 암살자 2체 공격력 +3
      g.pending = { kind: "myMon", reason: "nlTarget", allowCancel: false, data: {}, hint: "나이트로드의 비기 — 패시브를 부여할 자신 몬스터 선택", hintJa: "ナイトロードの秘技 — パッシブを与える自分のモンスターを選択" };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "BUDGET": { // 운영 예산(v37): 주사위 2+면 병사 1체
      const { rolls: bdr, ok: bok } = diceRoll(g, ctx.ev, side(g, p), 1, 2);
      if (bok) { spawnToken(g, ctx, p, "SOLDIER2"); ctx.log(`${tag(p, card)} 🎲 ${bdr[0]} → 병사(2/2) 소환`, `${tag(p, card)} 🎲 ${bdr[0]} → 兵士(2/2)召喚`); }
      else ctx.log(`${tag(p, card)} 🎲 ${bdr[0]} → 실패`, `${tag(p, card)} 🎲 ${bdr[0]} → 失敗`);
      break;
    }
    case "DICE8": { // 8코 도박: d6
      const { rolls: d8r } = diceRoll(g, ctx.ev, side(g, p), 1);
      const r = d8r[0];
      ctx.log(`${tag(p, card)} 🎲 ${r}`, `${tag(p, card)} 🎲 ${r}`);
      if (r <= 2) { p.maxMana = Math.max(1, p.maxMana - 4); ctx.log(`  └ 최대 마나 -4`, `  └ 最大マナ-4`); }
      else if (r <= 4) { o.maxMana = Math.max(1, o.maxMana - 1); ctx.dealDamage(o, 14, cn(card), cn(card)); }
      else if (r === 5) spawnToken(g, ctx, p, "GM9_2");
      else {
        if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 함정 파괴만 무효 */ }
        else { o.traps.forEach((t) => o.discard.push(t.card)); o.traps = []; }
        // binEnch: 약화술식(unWeaken)·제외 대상(exileOnDestroy) 처리 — 맨손 discard.push는
        // 전체 -2 공격 디버프를 영구히 남기고 공허 카드를 덱 순환에 되돌렸다
        const wiped = o.enchants; o.enchants = [];
        wiped.forEach((e) => binEnch(g, ctx, o, e.card));
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
    case "RUNE2": { // 룬 학문 - 중급(v34): 덱 절반 이상 마법이면 최대 마나 +8 (조건은 시전 전 검사)
      p.maxMana += 8;
      ctx.log(`${tag(p, card)} 최대 마나 +8 (${p.maxMana})`, `${tag(p, card)} 最大マナ+8 (${p.maxMana})`);
      break;
    }

    case "GENESIS_SONG": { // 시초의 노래: 덱/묘지의 '시초' 몬스터 1체 무작위 소환
      const fromDeck = p.deck.map((c, i) => ({ c, i, pile: "deck" as const })).filter((x) => x.c.tribe === "시초" && x.c.t === "mon");
      const fromDisc = p.discard.map((c, i) => ({ c, i, pile: "disc" as const })).filter((x) => x.c.tribe === "시초" && x.c.t === "mon");
      const cands = [...fromDeck, ...fromDisc];
      let gsn = 0;
      for (let k2 = 0; k2 < 2 && cands.length; k2++) { // v34: 2체
        const ci2 = randInt(g, cands.length);
        const pick = cands.splice(ci2, 1)[0];
        const arr = pick.pile === "deck" ? p.deck : p.discard;
        const idx2 = arr.findIndex((c) => c.uid === pick.c.uid);
        if (idx2 >= 0) arr.splice(idx2, 1);
        spawnToken(g, ctx, p, pick.c.id);
        ctx.log(`${tag(p, card)} ${cn(pick.c)} 소환`, `${tag(p, card)} ${cn(pick.c)} 召喚`);
        gsn++;
      }
      if (!gsn) ctx.log(`${tag(p, card)} 소환할 시초 몬스터 없음`, `${tag(p, card)} 召喚できる始原モンスターなし`);
      break;
    }
    case "GENESIS_MAGIC": { // 시초의 마법: 필드의 '시초' 몬스터 모두 +4/+4
      let k = 0;
      p.field.forEach((m) => { if (m.tribe === "시초") { m.atkMod = (m.atkMod || 0) + 4; m.defMod = (m.defMod || 0) + 4; k++; } });
      ctx.log(`${tag(p, card)} 시초 몬스터 ${k}체 +4/+4`, `${tag(p, card)} 始原モンスター${k}体に+4/+4`);
      break;
    }
    case "BLOOD1": { const n = ctx.drawN(p, 6); ctx.log(`${tag(p, card)} 자신에게 15 데미지, ${n}장 드로우`, `${tag(p, card)} 自分に15ダメージ, ${n}枚ドロー`); ctx.dealDamage(p, 15, cn(card), cn(card)); break; }
    case "BLOOD2": { // 블러드 샤워: 자신 15뎀 · 상대 영구마법·세트 함정 2장 선택 파괴
      ctx.log(`${tag(p, card)} 자신에게 15 데미지`, `${tag(p, card)} 自分に15ダメージ`);
      ctx.dealDamage(p, 15, cn(card), cn(card));
      if (!g.over && o.traps.length + o.enchants.length + p.traps.length + p.enchants.length > 0) {
        g.pending = { kind: "oppBoard", hint: "파괴할 카드 선택 (양쪽 필드 · 세트 함정·영구마법, 2장)", hintJa: "破壊するカードを選択 (両フィールド · セットトラップ・永続魔法、2枚)", reason: "bloodShower", allowCancel: true, data: { val: 2, noMon: true, anySide: true } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
      break;
    }
    case "BLOOD_JOY": { // 희: 자신 6뎀, 양측 최대 체력 +12
      ctx.log(`${tag(p, card)} 자신에게 6 데미지, 양측 최대 체력 +12`, `${tag(p, card)} 自分に6ダメージ, 両者の最大体力+12`);
      ctx.dealDamage(p, 6, cn(card), cn(card));
      if (!g.over) { p.maxHp += 12; o.maxHp += 12; }
      break;
    }
    case "BLOOD_ANGER": { // 노: 자신 10뎀, 필드의 모든 몬스터 공격력 +3(지속)
      ctx.log(`${tag(p, card)} 자신에게 10 데미지, 필드의 모든 몬스터 공격력 +3(지속)`, `${tag(p, card)} 自分に10ダメージ, 場の全モンスター攻撃力+3(持続)`);
      ctx.dealDamage(p, 10, cn(card), cn(card));
      if (!g.over) g.players.forEach((pl) => pl.field.forEach((mm) => (mm.atkMod = (mm.atkMod || 0) + 3)));
      break;
    }
    case "BLOOD_SORROW": { // 애: 자신 12뎀, 묘지 최고 코스트 카드 1장 게임에서 제외
      ctx.log(`${tag(p, card)} 자신에게 12 데미지`, `${tag(p, card)} 自分に12ダメージ`);
      ctx.dealDamage(p, 12, cn(card), cn(card));
      if (!g.over && p.discard.length) {
        const top = [...p.discard].sort((a, b) => b.cost - a.cost)[0];
        const i = p.discard.findIndex((c2) => c2.uid === top.uid);
        rmz(p).push(p.discard.splice(i, 1)[0]);
        ctx.log(`  └ ${cn(top)} 게임에서 제외`, `  └ ${cn(top)} をゲームから除外`);
      }
      break;
    }
    case "BLOOD_PLEASURE": { // 락: 자신 14뎀, 최대 마나 +1
      ctx.log(`${tag(p, card)} 자신에게 14 데미지`, `${tag(p, card)} 自分に14ダメージ`);
      ctx.dealDamage(p, 14, cn(card), cn(card));
      if (!g.over) { p.maxMana += 1; ctx.log(`  └ 최대 마나 +1 (${p.maxMana})`, `  └ 最大マナ+1 (${p.maxMana})`); }
      break;
    }
    case "VAMP_PACT": { // 흡혈 계약: 자신 6뎀 + 견습 흡혈귀 소환
      ctx.log(`${tag(p, card)} 자신에게 6 데미지`, `${tag(p, card)} 自分に6ダメージ`);
      ctx.dealDamage(p, 6, cn(card), cn(card));
      if (!g.over) spawnVampire(g, ctx, p, "VAMP1");
      break;
    }
    case "VAMP_PACT2": { // 흡혈 각인 계약: 자신 15뎀 + 초급 흡혈귀 소환
      ctx.log(`${tag(p, card)} 자신에게 15 데미지`, `${tag(p, card)} 自分に15ダメージ`);
      ctx.dealDamage(p, 15, cn(card), cn(card));
      if (!g.over) spawnVampire(g, ctx, p, "VAMP2");
      break;
    }
    case "BLOOD_SECRET": { // 피의 마법 - 비술: 자신 9뎀 + 자신 흡혈귀 1체 파괴 → 성공 시 최대 마나 +3, 최대 체력 +10
      ctx.log(`${tag(p, card)} 자신에게 9 데미지`, `${tag(p, card)} 自分に9ダメージ`);
      ctx.dealDamage(p, 9, cn(card), cn(card));
      if (g.over) break;
      const vamps = p.field.filter((m) => isVampFamily(m));
      if (vamps.length === 0) { ctx.log("  └ 파괴할 흡혈귀가 없어 불발", "  └ 破壊する吸血鬼がおらず不発"); break; }
      if (vamps.length === 1) { bloodSecretDestroy(g, ctx, p, vamps[0]); break; }
      g.pending = { kind: "myMon", hint: "파괴할 자신의 '흡혈귀' 선택", hintJa: "破壊する自分の「吸血鬼」を選択", reason: "bloodSecret", allowCancel: false };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "FLAME": { // 불꽃: 상대 2 / 자신 1
      ctx.log(`${tag(p, card)} 상대 2 / 자신 1 데미지`, `${tag(p, card)} 相手2 / 自分1ダメージ`);
      ctx.dealDamage(o, 2, cn(card), cn(card));
      if (!g.over) ctx.dealDamage(p, 1, cn(card), cn(card));
      break;
    }
    case "NEGOTIATE": { // 협상(v34): 상대 최대 마나 +1 + 2턴 동안 함정 설치 불가
      o.maxMana += 1;
      o.trapBlockTurns = 2;
      ctx.log(`${tag(p, card)} 상대 최대 마나 +1 (${o.maxMana}) · 상대는 2턴 동안 함정 설치 불가`, `${tag(p, card)} 相手の最大マナ+1 (${o.maxMana}) · 相手は2ターンの間 罠設置不可`);
      break;
    }
    case "COUNTERCALC": { // 역산: 상대 영구마법 1장 파괴 — v25: '사용 후 제외' 삭제 (묘지로)
      if (o.enchants.length) {
        const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0];
        ctx.log(`${tag(p, card)} 상대의 영구마법 ${cn(e.card)} 파괴`, `${tag(p, card)} 相手の永続魔法 ${cn(e.card)} 破壊`);
        binEnch(g, ctx, o, e.card);
      }
      break;
    }
    case "DUNGEON_FLOOR": { // 던전 최하층: 최대 마나 -1(바닥 3) + 🎲 눈만큼 미믹 소환
      if (p.maxMana > 3) { p.maxMana -= 1; ctx.log(`  └ 대가: 최대 마나 -1 (${p.maxMana})`, `  └ 代価: 最大マナ-1 (${p.maxMana})`); }
      const { rolls: df } = diceRoll(g, ctx.ev, side(g, p), 1);
      let dn = 0;
      for (let i = 0; i < df[0] && p.field.length < FIELD_MAX; i++) { spawnToken(g, ctx, p, "MIMIC"); dn++; }
      ctx.log(`${tag(p, card)} 🎲 ${df[0]} → 미믹 ${dn}마리 소환`, `${tag(p, card)} 🎲 ${df[0]} → ミミック${dn}体召喚`);
      break;
    }
    case "REFRESH_HAND": { // 리프레시(v35): 1드로우 → 패에서 2장까지 제외 (선택)
      const rn = ctx.drawN(p, 1);
      ctx.log(`${tag(p, card)} ${rn}장 드로우`, `${tag(p, card)} ${rn}枚ドロー`);
      if (p.hand.length) {
        g.pending = { kind: "purge", hint: "리프레시 — 패에서 게임에서 제외할 카드 선택 (2장까지)", hintJa: "リフレッシュ — 手札からゲームから除外するカードを選択 (2枚まで)", reason: "purge", allowCancel: true, data: { val: 2, zone: "hand" } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
      break;
    }
    case "FOCUS": { // 선택과 집중(v35): 덱·묘지에서 3장까지 제외 (선택)
      ctx.log(`${tag(p, card)} 발동`, `${tag(p, card)} 発動`);
      g.pending = { kind: "purge", hint: "선택과 집중 — 게임에서 제외할 카드 선택 (3장까지)", hintJa: "選択と集中 — ゲームから除外するカードを選択 (3枚まで)", reason: "purge", allowCancel: true, data: { val: 3 } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "SLUM": { // 슬럼가: 주사위 눈만큼 상회에 마켓 카운터 (상회 존재는 시전 전 검사됨)
      const ge = p.enchants.find((e) => e.card.ench === "guild");
      const { rolls: sr } = diceRoll(g, ctx.ev, side(g, p), 1);
      if (ge) {
        ge.cnt = (ge.cnt || 0) + sr[0];
        ctx.log(`${tag(p, card)} 🎲 ${sr[0]} → 상회에 마켓 카운터 +${sr[0]} (${ge.cnt}/20)`, `${tag(p, card)} 🎲 ${sr[0]} → 商会にマーケットカウンター+${sr[0]} (${ge.cnt}/20)`);
        guildPayout(g, ctx, p, ge);
      }
      break;
    }
    case "DARK_MERCHANT": { // 암상인: 전 카드 풀에서 1장 구매 (마나 지불)
      const ids = BUYABLE_POOL.slice().sort((a, b) => DB[a].cost - DB[b].cost || a.localeCompare(b));
      g.pending = { kind: "giantShop", hint: "암상인 — 마나를 지불하고 구매할 카드 선택", hintJa: "闇商人 — マナを払って購入するカードを選択", reason: "darkMarket", allowCancel: true, data: { ids } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "AMBUSH": { // 기습(v34): 상대 8 / 자신 3 + 자기 제외
      ctx.log(`${tag(p, card)} 상대 8 / 자신 3 데미지`, `${tag(p, card)} 相手8 / 自分3ダメージ`);
      ctx.dealDamage(o, 8, cn(card), cn(card));
      if (!g.over) ctx.dealDamage(p, 3, cn(card), cn(card));
      if (!g.over) selfExile(ctx, p, card);
      break;
    }
    case "TRUMPET": { // 지원 나팔: 자신 몬스터 2체 공격력 +1 (이번 턴)
      ctx.log(`${tag(p, card)} 발동`, `${tag(p, card)} 発動`);
      g.pending = { kind: "myMon", hint: "공격력 +1 할 자신 몬스터 선택 (최대 3체)", hintJa: "攻撃力+1する自分のモンスターを選択 (最大3体)", reason: "buffTurn", allowCancel: true, data: { val: 1, count: 3, excl: [] } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "TRICKROOM": { // 트릭룸: 2턴 동안 전 몬스터 공/체 반전
      if ((g.trickLeft ?? 0) > 0) {
        g.trickLeft = 2;
        ctx.log(`${tag(p, card)} 반전 지속 연장 (2턴)`, `${tag(p, card)} 反転を延長 (2ターン)`);
        break;
      }
      g.trickLeft = 2;
      g.players.forEach((pl) => pl.field.forEach((mm) => trickSwapWithWeaken(g, mm)));
      recheckDeaths(g, ctx); // v24: swap can drop max HP below accumulated damage
      ctx.log(`${tag(p, card)} <span class="dmg">필드의 모든 몬스터 공/체 반전!</span> (2턴)`, `${tag(p, card)} <span class="dmg">場の全モンスターの攻/体が反転！</span> (2ターン)`);
      break;
    }
    case "DISARM3": { // 마법연구기관: 상대 영구마법 1장 파괴 + 게임에서 제외
      if (o.enchants.length) { const e = o.enchants.splice(randInt(g, o.enchants.length), 1)[0]; binEnch(g, ctx, o, e.card, true); ctx.log(`${tag(p, card)} ${cn(e.card)} 파괴 + 게임에서 제외`, `${tag(p, card)} ${cn(e.card)} 破壊 + ゲームから除外`); }
      break;
    }
    case "GOLIATH_HUNT": { // 자이언트 킬링(v34): 최대 체력 10+ 몬스터 중 최고가치 1체 파괴
      const gts = o.field.filter((mm) => effDef(o, mm) >= 10)
        .sort((a2, b2) => (effAtk(o, b2) + effDef(o, b2)) - (effAtk(o, a2) + effDef(o, a2)));
      if (gts.length) { ctx.log(`${tag(p, card)} 거벽 ${cn(gts[0])} 파괴!`, `${tag(p, card)} 巨壁 ${cn(gts[0])} を破壊！`); ctx.destroyMonster(o, gts[0]); }
      break;
    }
    case "MASSACRE": { // 대학살(v34): 자신 최대 마나 -1 + 상대 몬스터 전멸
      p.maxMana = Math.max(1, p.maxMana - 1);
      ctx.log(`${tag(p, card)} 대가: 최대 마나 -1 (${p.maxMana})`, `${tag(p, card)} 代価: 最大マナ-1 (${p.maxMana})`);
      const mk2 = o.field.length;
      for (const mm of [...o.field]) ctx.destroyMonster(o, mm);
      ctx.log(`  └ 상대 몬스터 ${mk2}체 전멸`, `  └ 相手モンスター${mk2}体を全滅`);
      break;
    }
    case "GREED_PRICE": { // 탐욕의 대가(v34): 미믹 2마리 소환 + 미믹 5장 제외
      spawnToken(g, ctx, p, "MIMIC"); spawnToken(g, ctx, p, "MIMIC");
      for (let gi = 0; gi < 5; gi++) rmz(p).push(inst(g, "MIMIC"));
      ctx.log(`${tag(p, card)} 미믹(3/2) 2마리 소환 + 미믹 5장 게임에서 제외`, `${tag(p, card)} ミミック(3/2)2体召喚 + ミミック5枚をゲームから除外`);
      break;
    }
    case "MARKET_CRISIS": { // 경제 위기: 고정 마켓 전체 갱신 (v20: 1–6코)
      const lowAvail = ALL_IDS.filter((id) => DB[id].cost >= 1 && DB[id].cost <= 6 && !DB[id].noShop);
      const nextMk: CardInst[] = [];
      const availMk = lowAvail.slice();
      while (nextMk.length < MARKET_SIZE && availMk.length) nextMk.push(inst(g, availMk.splice(randInt(g, availMk.length), 1)[0]));
      g.market = nextMk;
      g.marketStock = nextMk.map(() => MARKET_STOCK); // v40: 재고도 초기화
      ctx.log(`${tag(p, card)} <span class="dmg">경제 위기!</span> 고정 마켓 8장 전부 갱신`, `${tag(p, card)} <span class="dmg">経済危機！</span> 固定マーケット8枚を全て更新`);
      break;
    }
    case "SHATTER": { // 붕괴 진동(v26): 자신 5뎀, 양측 모든 몬스터의 체력을 1로 (최대체력 1 + 누적 데미지 초기화 — 즉사 없음, 전원 유리몸)
      ctx.dealDamage(p, 5, cn(card), cn(card));
      if (!g.over) {
        let k = 0;
        for (const pl of g.players) for (const mm of pl.field) {
          if (mm.hatch != null) continue; // 알은 내구도 시스템 — 제외
          mm.defMod = (mm.defMod || 0) - (effDef(pl, mm) - 1); // effDef 플로어가 1이므로 정확히 1로
          mm.dmg = 0;
          k++;
        }
        ctx.log(`${tag(p, card)} 몬스터 ${k}체의 체력이 1이 되었다`, `${tag(p, card)} モンスター${k}体の体力が1になった`);
      }
      break;
    }
    case "S12": { // 강철맥 각인(v34): 🎲 5+면 상대에게 낙인 1개
      const { rolls: s12r } = diceRoll(g, ctx.ev, side(g, p), 1, 5);
      if (s12r[0] >= 5) { o.brand = (o.brand || 0) + 1; ctx.log(`${tag(p, card)} 🎲 ${s12r[0]} → 상대에게 낙인 카운터 +1 (${o.brand})`, `${tag(p, card)} 🎲 ${s12r[0]} → 相手に烙印カウンター+1 (${o.brand})`); }
      else ctx.log(`${tag(p, card)} 🎲 ${s12r[0]} 실패`, `${tag(p, card)} 🎲 ${s12r[0]} 失敗`);
      break;
    }
    case "S14": { // 대지의 축복(v34): 필드 전 몬스터 체력 완전 회복 + 자신 5 회복
      let healed = 0;
      g.players.forEach((pl) => pl.field.forEach((mm) => { if ((mm.dmg ?? 0) > 0 && mm.hatch == null) { mm.dmg = 0; healed++; } }));
      ctx.heal(p, 5);
      ctx.log(`${tag(p, card)} 몬스터 ${healed}체의 체력 완전 회복 + 자신 체력 5 회복`, `${tag(p, card)} モンスター${healed}体の体力を全回復 + 自分の体力5回復`);
      break;
    }
    case "MULTI_CULTURE": { // 다양한 문화(v34): 자신의 모든 종족 몬스터 공격력 +6(지속) — 조건은 시전 전 검사
      let mcN = 0;
      p.field.forEach((mm) => { if (mm.tribe) { mm.atkMod = (mm.atkMod || 0) + 6; mcN++; } });
      ctx.log(`${tag(p, card)} 종족 몬스터 ${mcN}체 공격력 +6(지속)`, `${tag(p, card)} 種族モンスター${mcN}体の攻撃力+6(持続)`);
      break;
    }
    case "GS5_3": { // 주문서 독해(v34): 상대의 '마족' 1체당 16뎀
      const dn5 = [...o.deck, ...o.discard, ...o.field].filter((c2) => c2.t === "mon" && c2.tribe === "마족").length;
      ctx.log(`${tag(p, card)} 상대 마족 ${dn5}체 → ${dn5 * 16} 데미지`, `${tag(p, card)} 相手の魔族${dn5}体 → ${dn5 * 16}ダメージ`);
      if (dn5 > 0) ctx.dealDamage(o, dn5 * 16, cn(card), cn(card));
      break;
    }
    case "GS6_4": { // 화맥 점화(v34): 낙인 보유 상대에게 낙인 3개 추가 — 조건은 시전 전 검사
      o.brand = (o.brand || 0) + 3;
      ctx.log(`${tag(p, card)} 상대에게 낙인 카운터 +3 (${o.brand})`, `${tag(p, card)} 相手に烙印カウンター+3 (${o.brand})`);
      break;
    }
    case "INQUISITION": { // 이단 심문(v34): 상대 종족몹 1장당 6뎀
      const tn2 = [...o.deck, ...o.discard, ...o.field].filter((c2) => c2.t === "mon" && c2.tribe).length;
      ctx.log(`${tag(p, card)} 상대 종족 몬스터 ${tn2}장 → ${tn2 * 6} 데미지`, `${tag(p, card)} 相手の種族モンスター${tn2}枚 → ${tn2 * 6}ダメージ`);
      ctx.dealDamage(o, tn2 * 6, cn(card), cn(card));
      break;
    }
    case "SCARECROW": { // 허수아비 소집: 0/1 x3
      for (let i2 = 0; i2 < 3; i2++) spawnToken(g, ctx, p, "TOKEN00");
      ctx.log(`${tag(p, card)} 허수아비(0/1) 3체 소환`, `${tag(p, card)} かかし(0/1)3体召喚`);
      break;
    }
    case "LEVY": { // 병력 소집: 2/2 x3
      for (let i2 = 0; i2 < 3; i2++) spawnToken(g, ctx, p, "SOLDIER2");
      ctx.log(`${tag(p, card)} 병사(2/2) 3체 소환`, `${tag(p, card)} 兵士(2/2)3体召喚`);
      break;
    }
    case "CULL_FLOOD": { // 컬 세례: 묘지에 컬 4장 추가 → 3장 골라 제외
      for (let i2 = 0; i2 < 4; i2++) p.discard.push(starter(g, "STARTER_TRASH"));
      ctx.log(`${tag(p, card)} 묘지에 컬 4장 추가`, `${tag(p, card)} 墓地にカル4枚追加`);
      g.pending = { kind: "purge", hint: "게임에서 제외할 카드 선택 (3장)", hintJa: "ゲームから除外するカードを選択 (3枚)", reason: "purge", allowCancel: true, data: { val: 3 } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "PURGE_ALL": { // 대숙청: 원하는 만큼 제외
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 발동`, `<span class="t">${p.name}</span> ${cn(card)} 発動`);
      g.pending = { kind: "purge", hint: "게임에서 제외할 카드 선택 (원하는 만큼)", hintJa: "ゲームから除外するカードを選択 (何枚でも)", reason: "purge", allowCancel: true, data: { val: 99 } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "EXILE_NUKE1": case "EXILE_NUKE2": { // 공허 포격/대붕괴: 제외 수 x1/x2 뎀 (v11 너프)
      const mult2 = card.id === "EXILE_NUKE1" ? 1 : 2;
      const dmg2 = rmz(p).length * mult2;
      ctx.log(`${tag(p, card)} 제외된 카드 ${rmz(p).length}장 × ${mult2} = ${dmg2} 데미지`, `${tag(p, card)} 除外されたカード${rmz(p).length}枚 × ${mult2} = ${dmg2}ダメージ`);
      ctx.dealDamage(o, dmg2, cn(card), cn(card));
      break;
    }
    case "DECAY_CRAFT": { // 암기 제조(v34): 자신 2체에 '부패' 부여 + 상대 전 몬스터에 부패 카운터 1
      ctx.log(`${tag(p, card)} 발동`, `${tag(p, card)} 発動`);
      for (const dm of [...o.field]) { if (g.over) break; if (dm.hatch == null) addDecay(g, ctx, o, dm, 1); }
      if (g.over) break;
      g.pending = { kind: "myMon", hint: "'부패'를 부여할 자신 몬스터 선택 (2체)", hintJa: "「腐敗」を与える自分のモンスターを選択 (2体)", reason: "grantDecay", allowCancel: true, data: { count: 2 } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      break;
    }
    case "MAJESTY_RITE": { // 각인 비술(v34): 최대 마나 -1 → 자신 몬스터 1체에 '위엄' 부여
      ctx.log(`${tag(p, card)} 최대 마나 -1`, `${tag(p, card)} 最大マナ-1`);
      p.maxMana = Math.max(1, p.maxMana - 1);
      if (p.field.length) {
        g.pending = { kind: "myMon", hint: "'위엄'을 부여할 자신 몬스터 선택", hintJa: "「威厳」を与える自分のモンスターを選択", reason: "grantMajesty", allowCancel: false };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし");
      break;
    }
    case "CROSSROADS": { // 선택의 기로: 묘지에 컬 2장 추가
      p.discard.push(starter(g, "STARTER_TRASH"), starter(g, "STARTER_TRASH"));
      ctx.log(`${tag(p, card)} 묘지에 컬 2장 추가`, `${tag(p, card)} 墓地にカル2枚追加`);
      break;
    }
    case "CHOSEN_AREA": { // 선택받은 영역: 제외된 컬 25장+ → 즉시 승리 (조건은 시전 전 체크)
      ctx.log(`${tag(p, card)} <span class="good">선택이 완성되었다 — 게임에서 승리한다!</span>`, `${tag(p, card)} <span class="good">選択が完成した — ゲームに勝利する！</span>`);
      g.over = true; g.phase = "over"; g.winner = g.cur;
      ctx.ev.push({ type: "win", winner: g.cur });
      break;
    }
    case "WALLBREAK1": case "SNIPE1": { // 조건부 단일 제거(v34): 성벽 파쇄=공격력 2 이하 · 저격=체력 3 이하
      const cond = card.id === "WALLBREAK1"
        ? (mm: FieldMon, ow: PlayerState) => effAtk(ow, mm) <= 2
        : (mm: FieldMon, ow: PlayerState) => curHp(ow, mm) <= 3;
      const cands2: Array<{ mm: FieldMon; ow: PlayerState }> = [];
      for (const ow of [o, p]) for (const mm of ow.field) if (cond(mm, ow) && !(ow !== p && hasPassive(mm, "aura"))) cands2.push({ mm, ow });
      const best = cands2.sort((a2, b2) => (effAtk(b2.ow, b2.mm) + effDef(b2.ow, b2.mm)) - (effAtk(a2.ow, a2.mm) + effDef(a2.ow, a2.mm)))[0];
      if (best) { ctx.log(`${tag(p, card)} ${cn(best.mm)} 파괴`, `${tag(p, card)} ${cn(best.mm)} 破壊`); ctx.destroyMonster(best.ow, best.mm); }
      break;
    }
    case "WALLBREAK2": case "SNIPE2": { // 조건부 전체 제거
      const isAtk = card.id === "WALLBREAK2";
      const lim = 2;
      let k = 0;
      for (const mm of [...o.field]) if ((isAtk ? effAtk(o, mm) : curHp(o, mm)) <= lim) { ctx.destroyMonster(o, mm); k++; }
      ctx.log(`${tag(p, card)} ${isAtk ? "공격력" : "체력"} ${lim} 이하 몬스터 ${k}체 파괴`, `${tag(p, card)} ${isAtk ? "攻撃力" : "体力"}${lim}以下のモンスター${k}体を破壊`);
      break;
    }
    case "SCRAPPER": { // 고철 수집상: 코스트 1 이하 2장 제외 → 최대 마나 +1
      let removed = 0;
      for (const pool of [p.discard, p.deck]) {
        while (removed < 2) {
          const i = pool.findIndex((c) => c.cost <= 1);
          if (i < 0) break;
          rmz(p).push(pool.splice(i, 1)[0]); removed++;
        }
      }
      p.maxMana += 1;
      ctx.log(`${tag(p, card)} 저코스트 카드 ${removed}장 제외 → 최대 마나 +1 (${p.maxMana})`, `${tag(p, card)} 低コストカード${removed}枚を除外 → 最大マナ +1 (${p.maxMana})`);
      break;
    }
    case "LUCKY_CHEST": luckyChest(g, ctx, p); break; // 행운의 보물상자 복권
    case "GUILD_CHEST": { // 암살자 길드의 보물상자 (2d6 합계표)
      const { rolls: gcr, sum: gcs } = diceRoll(g, ctx.ev, side(g, p), 2);
      ctx.log(`${tag(p, card)} 🎲 ${gcr.join("·")}=${gcs}`, `${tag(p, card)} 🎲 ${gcr.join("·")}=${gcs}`);
      if (gcs <= 3) { p.maxMana += 3; ctx.log(`  └ 🎰 최대 마나 +3`, `  └ 🎰 最大マナ +3`); }
      else if (gcs === 4) {
        if (p.traps.length + p.enchants.length < ST_MAX) {
          p.enchants.push({ card: inst(g, "GUILD_EYE"), turns: 99 });
          ctx.log(`  └ 🎰 길드의 정보망 획득 — 턴 시작시 드로우 +1 (영구)`, `  └ 🎰 ギルドの情報網 — ターン開始時ドロー+1 (永続)`);
        } else ctx.log(`  └ 마법·함정 존이 가득 차 정보망을 놓쳤다`, `  └ 魔法・罠ゾーンが満杯で情報網を逃した`);
      }
      else if (gcs <= 6) { p.maxMana += 2; ctx.log(`  └ 최대 마나 +2`, `  └ 最大マナ +2`); }
      else if (gcs === 7) { p.maxMana += 1; ctx.log(`  └ 최대 마나 +1`, `  └ 最大マナ +1`); }
      else if (gcs === 8) { p.maxHp += 10; p.hp += 10; ctx.ev.push({ type: "heal", player: side(g, p), amount: 10 }); ctx.log(`  └ 최대 체력 +10`, `  └ 最大体力 +10`); }
      else if (gcs <= 10) {
        spawnToken(g, ctx, o, "ASSASSIN1"); spawnToken(g, ctx, o, "ASSASSIN2");
        ctx.log(`  └ <span class="dmg">경보! 상대 필드에 초급·중급 암살자 소환</span>`, `  └ <span class="dmg">警報！相手の場に初級・中級アサシン召喚</span>`);
      }
      else {
        spawnToken(g, ctx, o, "ASSASSIN1"); spawnToken(g, ctx, o, "ASSASSIN2"); spawnToken(g, ctx, o, "ASSASSIN3");
        ctx.log(`  └ <span class="dmg">대참사! 상대 필드에 초급·중급·상급 암살자 소환</span>`, `  └ <span class="dmg">大惨事！相手の場に初級・中級・上級アサシン召喚</span>`);
        if (!g.over) ctx.dealDamage(p, 10, cn(card), cn(card));
      }
      break;
    }
    case "MEDITATE": { // 명상(v34): 완전 회복 + 자신에게 낙인 1개
      const amt = p.maxHp - p.hp;
      ctx.heal(p, amt);
      p.brand = (p.brand || 0) + 1;
      ctx.log(`${tag(p, card)} 체력 ${amt} 회복 (${p.hp}/${p.maxHp}) · 자신에게 낙인 카운터 +1 (${p.brand})`, `${tag(p, card)} 体力${amt}回復 (${p.hp}/${p.maxHp}) · 自分に烙印カウンター+1 (${p.brand})`);
      break;
    }

    case "HERMIT": { // 은둔의 안식: 완전 회복 + 최대 체력 +15
      p.maxHp += 15;
      const amt = p.maxHp - p.hp;
      ctx.heal(p, amt);
      ctx.log(`${tag(p, card)} 체력 ${amt} 회복 + 최대 체력 +15 (${p.hp}/${p.maxHp})`, `${tag(p, card)} 体力${amt}回復 + 最大体力+15 (${p.hp}/${p.maxHp})`);
      break;
    }
    case "CATALYST": { // 균열의 촉매: 자신 4 데미지, 최대 마나 +1
      ctx.dealDamage(p, 4, cn(card), cn(card));
      if (!g.over) { p.maxMana += 1; ctx.log(`${tag(p, card)} 자신 4 데미지, 최대 마나 +1 (${p.maxMana})`, `${tag(p, card)} 自分に4ダメージ、最大マナ +1 (${p.maxMana})`); }
      break;
    }
    case "FORBIDDEN": { // 금단의 술식(v34): 체력이 1이 된다 + 🎲 5+면 한 종족의 나머지 전부 소환 (조건은 시전 전 검사)
      const paid = p.hp - 1;
      if (paid > 0) { p.hp = 1; ctx.ev.push({ type: "damage", player: side(g, p), amount: paid, srcKo: cn(card), srcJa: cn(card) }); }
      ctx.log(`${tag(p, card)} 자신의 체력이 1이 된다`, `${tag(p, card)} 自分の体力が1になる`);
      const { rolls: fbr } = diceRoll(g, ctx.ev, side(g, p), 1, 5);
      const r = fbr[0];
      ctx.log(`  └ 🎲 ${r} (5+ ${r >= 5 ? `<span class="good">성공</span>` : "실패"})`, `  └ 🎲 ${r} (5+ ${r >= 5 ? `<span class="good">成功</span>` : "失敗"})`);
      if (r >= 5) {
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

/** 룬 학문(v34): 순환 덱(덱+묘지+패)의 절반 이상이 마법(스타터 포함)인가. */
export function spellDeckHalf(p: PlayerState): boolean {
  const pool = [...p.deck, ...p.discard, ...p.hand];
  if (!pool.length) return false;
  const magic = pool.filter((c) => c.t === "spell" || c.t === "starter").length;
  return magic * 2 >= pool.length;
}

/** Destroy one random enemy permanent (monster / trap / enchant). */
function destroyRandomEnemy(g: GameState, ctx: Ctx, o: PlayerState): void {
  const pool: Array<() => void> = [];
  o.field.forEach((m) => pool.push(() => ctx.destroyMonster(o, m)));
  o.traps.forEach((_t, i) => pool.push(() => { if (o.traps[i] && !trySnare(g, ctx, o)) { o.discard.push(o.traps[i].card); o.traps.splice(i, 1); } }));
  o.enchants.forEach((_e, i) => pool.push(() => { if (o.enchants[i]) { const ec = o.enchants[i].card; o.enchants.splice(i, 1); binEnch(g, ctx, o, ec); } }));
  if (!pool.length) return;
  pool[randInt(g, pool.length)]();
  ctx.log(`  └ 상대 카드 1장 무작위 파괴`, `  └ 相手のカード1枚をランダム破壊`);
}

/** Summon a random buyable monster of cost <= maxCost as a stat-only token. */
function summonRandomMon(g: GameState, ctx: Ctx, p: PlayerState, maxCost: number): void {
  const pool = ALL_IDS.filter((id) => DB[id].t === "mon" && DB[id].cost >= 1 && DB[id].cost <= maxCost);
  if (!pool.length) return;
  const id = pool[randInt(g, pool.length)];
  spawnToken(g, ctx, p, id);
  ctx.log(`  └ ${cn(DB[id])} 무작위 소환`, `  └ ${cn(DB[id])} をランダム召喚`);
}

// ============================================================
// treasure
// ============================================================
/** 마스터 미믹(chestLock 오라)이 어느 쪽 필드에든 있으면 양측 보물상자 사용 금지 */
export function chestLocked(g: GameState): boolean {
  return g.players.some((pl) => pl.field.some((m) => m.aura === "chestLock"));
}

/** 행운의 보물상자 발동 복권 (10/40/30/5/15%) */
function luckyChest(g: GameState, ctx: Ctx, p: PlayerState): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  const { rolls, sum } = diceRoll(g, ctx.ev, side(g, p), 2);
  ctx.log(`  └ 🎲 ${rolls.join("·")}=${sum}`, `  └ 🎲 ${rolls.join("·")}=${sum}`);
  if (sum <= 3) {
    p.maxMana += 3; const n = ctx.drawN(p, 2);
    ctx.log(`  └ 🎰 잭팟! 최대 마나 +3, ${n}장 드로우`, `  └ 🎰 ジャックポット！最大マナ +3, ${n}枚ドロー`);
  } else if (sum <= 5) {
    // spawnToken 경유 필수: 인라인으로 field.push 하면 약화술식·트릭룸(applyFieldGlobals)과
    // 등장 오라(applyEnterAura)가 통째로 빠진다 — 마스터 미믹에 弱化術式이 안 걸리던 원인.
    spawnToken(g, ctx, o, "MIMIC2");
    ctx.log(`  └ <span class="dmg">꽝! 상대 필드에 마스터 미믹(10/3) 소환</span>`, `  └ <span class="dmg">ハズレ！相手の場にマスターミミック(10/3)召喚</span>`);
  } else if (sum <= 8) {
    p.maxMana += 1;
    ctx.log(`  └ 최대 마나 +1`, `  └ 最大マナ +1`);
  } else if (sum <= 11) {
    p.maxHp += 8; p.hp += 8; ctx.ev.push({ type: "heal", player: side(g, p), amount: 8 });
    ctx.log(`  └ 최대 체력 +8`, `  └ 最大体力 +8`);
  } else {
    p.maxHp += 12; p.hp += 12; ctx.ev.push({ type: "heal", player: side(g, p), amount: 12 });
    ctx.log(`  └ ✨ 더블 6! 최대 체력 +12`, `  └ ✨ ダブル6！最大体力 +12`);
  }
}

function openTreasure(g: GameState, ctx: Ctx, p: PlayerState): void {
  const { rolls: tr } = diceRoll(g, ctx.ev, side(g, p), 1);
  const roll = tr[0]; // v24: 1·2 꽝 / 3·4 최대 체력+7 / 5·6 최대 마나+1
  let txt = "", txtJa = "", kind = "";
  if (roll >= 5) { p.maxMana++; txt = "🎲 " + roll + " → 최대 마나 +1"; txtJa = "🎲 " + roll + " → 最大マナ +1"; kind = "mana"; }
  else if (roll >= 3) { p.maxHp += 7; p.hp += 7; txt = "🎲 " + roll + " → 최대 체력 +7"; txtJa = "🎲 " + roll + " → 最大体力 +7"; kind = "maxhp"; ctx.ev.push({ type: "heal", player: side(g, p), amount: 7 }); }
  else {
    // 꽝(dud): spawn a Mimic (3/2) on the OPPONENT's field — the risk of cracking chests
    const o = g.players[0] === p ? g.players[1] : g.players[0];
    spawnToken(g, ctx, o, "MIMIC"); // 위와 동일 — 전역 효과/오라를 타야 한다
    txt = "🎲 " + roll + " → 꽝! 상대 필드에 미믹(3/2) 소환"; txtJa = "🎲 " + roll + " → ハズレ！相手の場にミミック(3/2)召喚"; kind = "mimic";
  }
  ctx.log(`<span class="t">${p.name}</span> 보물상자 → <span class="good">${txt}</span>`, `<span class="t">${p.name}</span> 宝箱 → <span class="good">${txtJa}</span>`);
  ctx.ev.push({ type: "treasure", player: side(g, p), kind, text: txt, textJa: txtJa, isBot: p.isBot });
}

// ============================================================
// play / buy
// ============================================================
function applyEnterAura(g: GameState, ctx: Ctx, p: PlayerState, m: FieldMon): void {
  const o = g.players[0] === p ? g.players[1] : g.players[0];
  // 폭풍의 광전사(drainMana): while on field, opponent's max mana -val
  if (m.aura === "drainMana") {
    const before = o.maxMana;
    o.maxMana = Math.max(1, o.maxMana - (m.val || 3));
    m.drained = before - o.maxMana; // 바닥(1) 클램프로 덜 깎였으면 그만큼만 복원해야 한다
    ctx.log(`  └ ${cn(m)}: 상대 최대 마나 -${m.val || 3}`, `  └ ${cn(m)}: 相手の最大マナ-${m.val || 3}`);
  }
  // 고무왕(v36 rallyGuts): 자신 필드의 병사·기사에 '기합' 부여 (기존 + 이후 소환분)
  const grantGuts = (x: FieldMon): void => { if (hasPassive(x, "guts")) return; (x.passivesG ??= []).push("guts"); x.guts = (x.guts || 0) + 1; ctx.log(`  └ 고무왕: ${cn(x)} 이(가) '기합'을 얻는다`, `  └ 鼓舞王: ${cn(x)} が「気合」を得る`); };
  if (m.aura === "rallyGuts") p.field.forEach((x) => { if (x.uid !== m.uid && (isSoldier(x) || isKnight(x))) grantGuts(x); });
  else if ((isSoldier(m) || isKnight(m)) && p.field.some((x) => x.uid !== m.uid && x.aura === "rallyGuts")) grantGuts(m);
  // 마계(v38 demonRealm): 자신이 소환하는 '마족' 몬스터의 효과를 전부 무효화
  if (m.tribe === "마족" && p.enchants.some((e) => e.card.ench === "demonRealm") && (m.onSummon || m.turnFx || m.aura)) {
    m.onSummon = undefined; m.turnFx = undefined; m.aura = undefined;
    ctx.log(`  └ 마계: ${cn(m)} 의 효과 무효화`, `  └ 魔界: ${cn(m)} の効果を無効化`);
  }
  // 성(v37): 자신 필드에 병사·기사가 소환될 때마다 성 카운터 +1
  if (isSoldier(m) || isKnight(m)) for (const cs of p.field) if (cs.id === "CASTLE" && cs.uid !== m.uid) { cs.gcount = (cs.gcount || 0) + 1; ctx.log(`  └ ${cn(cs)} 성 카운터 +1 (${cs.gcount})`, `  └ ${cn(cs)} 城カウンター+1 (${cs.gcount})`); }
  // 무법지대(v41 lawless): 필드에 소환되는 모든 몬스터의 체력이 1 (알 제외)
  if (m.hatch == null && lawlessActive(g) && p.field.some((x) => x.uid === m.uid) && effDef(p, m) > 1) { setHpOne(p, m); ctx.log(`  └ 무법지대: ${cn(m)} 의 체력이 1이 된다`, `  └ 不法地帯: ${cn(m)} の体力が1になる`); }
  // 부패한 땅(v37 rottenGround): 필드에 소환되는 모든 몬스터에 부패 카운터 2개 (알 제외)
  if (m.hatch == null && !g.over && g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "rottenGround")) && p.field.some((x) => x.uid === m.uid)) addDecay(g, ctx, p, m, 2);
  // 시초의 술식(v36 originRite): '시초의 수호자'를 제외한 시초 몬스터를 소환할 때마다 상대 필드 카드 1장 파괴 (없으면 낙인 +1)
  if (m.tribe === "시초" && m.id !== "TGE3" && !g.over) {
    for (const e of p.enchants) {
      if (e.card.ench !== "originRite" || g.over) continue;
      const pool: Array<() => void> = [];
      o.field.filter((x) => !hasPassive(x, "aura")).forEach((x) => pool.push(() => { ctx.log(`  └ ${cn(e.card)}: ${cn(x)} 파괴`, `  └ ${cn(e.card)}: ${cn(x)} 破壊`); ctx.destroyMonster(o, x); }));
      o.traps.forEach((_t, i) => pool.push(() => { if (o.traps[i] && !trySnare(g, ctx, o)) { const tr = o.traps.splice(i, 1)[0]; if (tr.card.exileOnDestroy) rmz(o).push(tr.card); else o.discard.push(tr.card); ctx.log(`  └ ${cn(e.card)}: 세트 함정 파괴 (정체: ${cn(tr.card)})`, `  └ ${cn(e.card)}: セットトラップ破壊 (正体: ${cn(tr.card)})`); } }));
      o.enchants.forEach((_e, i) => pool.push(() => { if (o.enchants[i]) { const ec = o.enchants[i].card; o.enchants.splice(i, 1); ctx.log(`  └ ${cn(e.card)}: 영구마법 ${cn(ec)} 파괴`, `  └ ${cn(e.card)}: 永続魔法 ${cn(ec)} 破壊`); binEnch(g, ctx, o, ec); } }));
      if (pool.length) pool[randInt(g, pool.length)]();
      else { o.brand = (o.brand || 0) + 1; ctx.log(`  └ ${cn(e.card)}: 파괴할 카드 없음 → ${o.name} 에게 낙인 카운터 +1 (합계 ${o.brand})`, `  └ ${cn(e.card)}: 破壊するカードなし → ${o.name} に烙印カウンター+1 (計${o.brand})`); }
    }
  }
}
function summonMonster(g: GameState, ctx: Ctx, p: PlayerState, card: CardInst): void {
  const m: FieldMon = { ...card, exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: g.turn };
  if (card.hatchTurns) { m.hatch = card.hatchTurns; m.dur = card.hatchDur ?? 4; } // 알: 부화/내구도 카운터 시작
  applyFieldGlobals(g, m); // 약화술식/트릭룸 반영
  p.field.push(m);
  if (m.hatch != null)
    ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 소환 (부화 ${m.hatch}턴 / 내구도 ${m.dur})`, `<span class="t">${p.name}</span> ${cn(card)} 召喚 (孵化${m.hatch}ターン / 耐久${m.dur})`);
  else
    ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 소환 (공${effAtk(p, m)}/체${effDef(p, m)})`, `<span class="t">${p.name}</span> ${cn(card)} 召喚 (攻${effAtk(p, m)}/体${effDef(p, m)})`);
  ctx.ev.push({ type: "summon", player: side(g, p), uid: m.uid, id: m.id });
  applyEnterAura(g, ctx, p, m);
  // GM5_2: summon-buff aura grants +1/+1 to each monster you summon
  applySummonBuff(ctx, p, m);
  // persistent "heal on summon" enchant (생명의 가호)
  // 생명의 가호(v34): 누구든 소환할 때마다 — 가호 주인 최대 체력 +8, 상대 +4
  for (const pl of g.players) {
    for (const e of pl.enchants.filter((e2) => e2.card.ench === "healSummon")) {
      const oth = g.players[0] === pl ? g.players[1] : g.players[0];
      pl.maxHp += 8; oth.maxHp += 4;
      ctx.log(`<span class="t">${cn(e.card)}</span> 소환 반응 — 자신 최대 체력 +8 (${pl.maxHp}), 상대 +4 (${oth.maxHp})`, `<span class="t">${cn(e.card)}</span> 召喚反応 — 自分の最大体力+8 (${pl.maxHp}), 相手+4 (${oth.maxHp})`);
    }
  }
  // 생명의 토양(soilHp): 자신이 소환한 몬스터의 체력 +val2 (여러 장이면 중첩)
  {
    const soil = p.enchants.filter((e) => e.card.ench === "soilHp").reduce((s2, e) => s2 + (e.card.val2 || 2), 0);
    if (soil > 0) { m.defMod = (m.defMod || 0) + soil; ctx.log(`  └ 생명의 토양: ${cn(m)} 체력 +${soil}`, `  └ 生命の土壌: ${cn(m)} 体力+${soil}`); }
  }
  // 1) the monster's own summon effect resolves first (draw / breaktrap / burn ...)
  resolveOnSummon(g, ctx, m);
  // 2) tribe synergy (also a summon-triggered effect)
  checkTribe(g, ctx, p, m);
  // 3) THEN the opponent's Pitfall reacts — so a summon effect gets its chance first
  const o = g.players[1 - g.cur];
  const pitIdx = o.traps.findIndex((t) => t.card.react === "pitfall");
  if (pitIdx >= 0 && p.field.some((x) => x.uid === m.uid) && (card.cost ?? 0) <= (o.traps[pitIdx].card.val ?? 99) && curHp(p, m) <= (o.traps[pitIdx].card.val2 ?? 999)) {
    const pit = o.traps.splice(pitIdx, 1)[0].card; o.discard.push(pit);
    ctx.ev.push({ type: "trapReveal", player: side(g, o), id: pit.id });
    ctx.log(`  └ <span class="dmg">함정 ${cn(pit)}!</span> ${cn(card)} 파괴`, `  └ <span class="dmg">トラップ ${cn(pit)}!</span> ${cn(card)} 破壊`);
    ctx.destroyMonster(p, m);
  }
  // 장군(v36 general): 상대가 몬스터를 소환할 때마다 주사위 4+면 기사 1체
  for (const gen of [...o.field]) {
    if (g.over || gen.aura !== "general") continue;
    const { rolls: gr, ok } = diceRoll(g, ctx.ev, side(g, o), 1, 4);
    if (ok) { ctx.log(`  └ ${cn(gen)} 🎲 ${gr[0]} → 기사(4/4) 소환`, `  └ ${cn(gen)} 🎲 ${gr[0]} → 騎士(4/4)召喚`); spawnToken(g, ctx, o, "INFKNIGHT"); }
    else ctx.log(`  └ ${cn(gen)} 🎲 ${gr[0]} → 실패`, `  └ ${cn(gen)} 🎲 ${gr[0]} → 失敗`);
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
  // 다종족 계약: 시너지 효과 2배 — 계약이 필드에 몇 장이든 2배는 1번만 (중첩 금지)
  const mult = 1; // v37: 다종족 계약은 더 이상 시너지를 2배로 하지 않는다
  // 각 티어는 게임당 1회씩, 2종/3종(/4종) 보상을 "따로" 지급 — 티어를 건너뛰어 도달해도 낮은 티어부터 순서대로
  const thresholds = tribe === "시초" ? [2, 3, 4, 6] : tribe === "마족" ? [2, 3, 4] : [2]; // v38: 시초 2/3/4/6 · 마족 2/3/4 · 고독/포식/귀족 2종
  for (const n of thresholds) {
    if (g.over) return;
    if (count >= n && fire(n)) {
      applyTribe(g, ctx, p, o, tribe, n, mult);
    }
  }
}
function applyTribe(g: GameState, ctx: Ctx, p: PlayerState, o: PlayerState, tribe: string, n: number, mult = 1): void {
  ctx.log(`<span class="good">[${tribeName(tribe, "ko")}] 동족 ${n}마리 시너지!</span>`, `<span class="good">[${tribeName(tribe, "ja")}] 同族 ${n}体シナジー!</span>`);
  const gainHp = (v: number): void => { p.maxHp += v; p.hp += v; ctx.ev.push({ type: "heal", player: g.players.indexOf(p) as Side, amount: v }); ctx.log(`  └ 최대 체력 +${v} (${p.maxHp})`, `  └ 最大体力+${v} (${p.maxHp})`); };
  const gainMana = (v: number): void => { p.maxMana += v; ctx.log(`  └ 최대 마나 +${v} (${p.maxMana})`, `  └ 最大マナ+${v} (${p.maxMana})`); };
  if (tribe === "고독") {
    // v38 2종: 이 게임 동안 상대는 몬스터를 3체 이상 소환할 수 없다
    o.summonCap = 2;
    ctx.log(`  └ <span class="dmg">고독의 저주</span>: ${o.name} 은(는) 이 게임 동안 몬스터를 3체 이상 소환할 수 없다`, `  └ <span class="dmg">孤独の呪い</span>: ${o.name} はこのゲームの間モンスターを3体以上召喚できない`);
  } else if (tribe === "포식") {
    // v38 2종: 상대에게 18 데미지
    ctx.dealDamage(o, 18 * mult, "포식 시너지", "捕食シナジー");
  } else if (tribe === "귀족") {
    // v38 2종: 상대 최대 마나 -2
    o.maxMana = Math.max(1, o.maxMana - 2);
    ctx.log(`  └ <span class="dmg">귀족의 명령</span>: ${o.name} 의 최대 마나 -2 (${o.maxMana})`, `  └ <span class="dmg">貴族の命令</span>: ${o.name} の最大マナ-2 (${o.maxMana})`);
  } else if (tribe === "마족") {
    if (n === 2) {
      o.spellCastCap = Math.min(o.spellCastCap ?? 99, 2);
      ctx.log(`  └ <span class="dmg">마족의 계약</span>: ${o.name} 은(는) 턴당 마법을 2장까지만 사용할 수 있다`, `  └ <span class="dmg">魔族の契約</span>: ${o.name} はターンに魔法を2枚までしか使えない`);
    } else if (n === 3) {
      o.spellCastCap = 0;
      ctx.log(`  └ <span class="dmg">마족의 침묵</span>: ${o.name} 은(는) 자신의 턴에 마법을 사용할 수 없다`, `  └ <span class="dmg">魔族の沈黙</span>: ${o.name} は自分のターンに魔法を使えない`);
    } else if (n === 4) {
      o.manaCostMult = 3;
      ctx.log(`  └ <span class="dmg">마왕의 지배</span>: ${o.name} 이(가) 소모하는 모든 마나가 3배가 된다`, `  └ <span class="dmg">魔王の支配</span>: ${o.name} が消費する全てのマナが3倍になる`);
    }
  } else if (tribe === "시초") {
    // v38: 2종 +15 · 3종 +40 · 4종 +70 · 6종 승리
    if (n === 2) gainHp(15 * mult);
    else if (n === 3) gainHp(40 * mult);
    else if (n === 4) gainHp(70 * mult);
    else if (n === 6) {
      ctx.log(`  └ <span class="good">시초 6종 집결 — ${p.name} 승리!</span>`, `  └ <span class="good">始原6種集結 — ${p.name} の勝利！</span>`);
      handleDefeat(g, ctx, o, side(g, p));
    } else { // (구 4종 페이오프 — v38부터 미사용)
      gainMana(10 * mult); gainHp(25 * mult);
      ctx.drawN(p, 5 * mult);
      ctx.log(`  └ ${5 * mult}장 드로우`, `  └ ${5 * mult}枚ドロー`);
      // 상대 필드의 모든 카드를 파괴하고 게임에서 제외 (흡혈의 극의가 지키는 흡혈귀는 예외)
      const ward = g.players.some((pl) => pl.enchants.some((e) => e.card.ench === "vampWard"));
      for (const tm of [...o.field]) {
        if (ward && isVampFamily(tm)) { ctx.log(`  └ 흡혈의 극의: ${cn(tm)} 파괴되지 않음`, `  └ 吸血の極意: ${cn(tm)} は破壊されない`); continue; }
        const fi = o.field.findIndex((x) => x.uid === tm.uid);
        if (fi >= 0) { o.field.splice(fi, 1); rmz(o).push(resetInst(tm)); ctx.ev.push({ type: "destroy", player: side(g, o), uid: tm.uid, id: tm.id }); }
      }
      if (o.traps.length && trySnare(g, ctx, o)) { /* 덫 속의 덫: 파괴 무효 */ }
      else o.traps.splice(0).forEach((t) => rmz(o).push(t.card));
      o.enchants.splice(0).forEach((e) => binEnch(g, ctx, o, e.card, true));
      if ((g.pending?.kind === "oppMon" || g.pending?.kind === "oppBoard")
        && o.field.length + o.traps.length + o.enchants.length === 0
        && !(g.pending?.data as { anySide?: boolean } | undefined)?.anySide) g.pending = null;
      ctx.log(`  └ <span class="dmg">상대 필드의 모든 카드 파괴 + 게임에서 제외</span>`, `  └ <span class="dmg">相手の場の全カードを破壊 + ゲームから除外</span>`);
      ctx.dealDamage(o, 10 * mult, "시초 시너지", "始原シナジー");
    }
  }
}

// Zone capacity: at most 9 monsters, and 9 spell/trap (traps + enchants) cards.
export const FIELD_MAX = 7;
export /** 고정 마켓 슬롯 수 (v28: 10 → 8). 경제 위기(MARKET_CRISIS)의 재구성도 이 값을 쓴다. */
const MARKET_SIZE = 8;
const ST_MAX = 7;
const ASSASSIN_IDS = ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3"];
/** 침묵의 파수꾼/거신(sealLow, v36): 필드의 봉인 몬스터 중 가장 높은 코스트 상한 (없으면 -1). */
export function sealLowCap(g: GameState): number {
  let cap = -1;
  for (const pl of g.players) for (const m of pl.field) if (m.aura === "sealLow") cap = Math.max(cap, m.val ?? 5);
  return cap;
}
export function sealLowBlocks(g: GameState, cost: number): boolean { return cost <= sealLowCap(g); }
/** 세계수의 파수꾼(v36 treeKeeper): '세계수'·'엘프' 계열 카드를 사용할 때마다 최대 체력 +5 (파수꾼 1체당). */
function treeKeeperTrigger(g: GameState, ctx: Ctx, p: PlayerState, card: CardInst, exceptUid?: string): void {
  const nm = card.name || "";
  if (!(nm.includes("세계수") || nm.includes("엘프"))) return;
  const n = p.field.filter((m) => m.aura === "treeKeeper" && m.uid !== exceptUid).length;
  if (!n) return;
  p.maxHp += 5 * n; p.hp += 5 * n;
  ctx.ev.push({ type: "heal", player: side(g, p), amount: 5 * n });
  ctx.log(`  └ 세계수의 파수꾼: 최대 체력 +${5 * n} (${p.maxHp})`, `  └ 世界樹の守り人: 最大体力+${5 * n} (${p.maxHp})`);
}
/** Summon precondition check (암살자 상급/특급). */
export function summonReqMet(p: PlayerState, card: CardInst, o?: PlayerState): boolean {
  if (!card.summonReq) return true;
  // ---- v32 종족 조건 ----
  if (card.summonReq === "preyLow2") return !!o && o.field.some((m) => (m.cost ?? 0) <= 2); // 굶주린 새끼짐승
  if (card.summonReq === "soloOnly") return !p.field.some((m) => m.tribe !== "고독");        // 고독한 방랑자
  if (card.summonReq === "mm5") return effMaxMana(p) >= 5;                                    // 마족 척후
  if (card.summonReq === "assassinField") {
    return p.field.some((m) => m.id === "ASSASSIN1" || m.id === "ASSASSIN2" || m.id === "ASSASSIN3" || m.id === "ASSASSIN4");
  }
  if (card.summonReq === "assassinAll") {
    const pool = [...p.field, ...p.deck, ...p.discard]; // hand excluded on purpose
    return ASSASSIN_IDS.every((aid) => pool.some((c) => c.id === aid));
  }
  // ---- v15 엘프/엘더 킹 소환 조건 ----
  if (card.summonReq === "maxHp65") return p.maxHp >= 65;
  if (card.summonReq === "darkElf") return p.maxHp >= 65 && !p.field.some((m) => (m.name || "").includes("엘프"));
  if (card.summonReq === "maxHp99") return p.maxHp >= 99;
  // v36: 엘더 킹 — 덱 구성에 엘프/하이엘프/다크 엘프 중 1장 + 최대 체력 99+
  if (card.summonReq === "elderKing") return p.maxHp >= 99 && deckComp(p).some((c) => c.id === "ELF" || c.id === "HIGH_ELF" || c.id === "DARK_ELF");
  // v36: 골램 킹 — 필드·덱·패·묘지에 다른 골램 계열이 있어야 소환 가능
  if (card.summonReq === "golemKin") return deckComp(p).some((c) => c.t === "mon" && c.id !== card.id && isGolem(c));
  // v36: 상급 암살자 — 덱 구성에 자신 외 '암살자' 카드가 있어야 소환 가능
  if (card.summonReq === "assassinKin") return deckComp(p).some((c) => c.id !== card.id && isAssassinCard(c));
  // v36: 특급 암살자 — 덱 구성에 자신 외 서로 다른 '암살자' 카드 3종 이상
  if (card.summonReq === "assassinTrio") return new Set(deckComp(p).filter((c) => c.id !== card.id && isAssassinCard(c)).map((c) => c.id)).size >= 3;
  // v39: 특급 주술사 켈로이드 — 덱 구성의 반 이상이 마법이고 마법이 15장 이상
  if (card.summonReq === "hexBoss") { const dc = deckComp(p); const sp = dc.filter((c) => c.t === "spell").length; return sp >= 15 && sp * 2 >= dc.length; }
  return true;
}

function playFromHand(g: GameState, ctx: Ctx, idx: number): void {
  const p = g.players[g.cur];
  const card = p.hand[idx];
  if (!card || p.mana < playCost(card, p)) return;
  // 운명의 수레바퀴: 주사위·확률 카드 시전 직전 스냅샷 (재굴림용, 매턴 1회)
  if (card.t === "spell" && RANDOM_CARDS.has(card.id) && !p.wheelUsed && p.enchants.some((e) => e.card.ench === "fateWheel")) {
    const snap = structuredClone(g);
    snap._wheelSnap = null;
    g._wheelSnap = { state: snap, idx };
  }

  if (card.t === "starter") {
    // Starters (컬/보물상자/어튠) are spell-type cards played from hand → they are subject to
    // the same spell seals (침묵) and null-spell trap (마법 무효화) as regular spells.
    if (g.players.some((pl) => pl.field.some((m) => m.aura === "sealAll"))) { ctx.log(`  └ <span class="dmg">침묵의 거신</span>이 필드에 있어 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の巨神</span>が場にいるため魔法を使用できません`); return; }
    if (sealLowBlocks(g, playCost(card, p))) { ctx.log(`  └ <span class="dmg">침묵의 파수꾼</span>이 필드에 있어 코스트 ${sealLowCap(g)} 이하 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の番人</span>が場にいるためコスト${sealLowCap(g)}以下の魔法を使用できません`); return; }
    if (p.spellSealTurn) { ctx.log(`  └ <span class="dmg">침묵의 심판</span>: 이번 턴 동안 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の審判</span>: このターン中は魔法を使用できません`); return; }
    if (spaceLocked(g, p)) { ctx.log(`  └ <span class="dmg">공간 술식</span>: 마법을 사용할 수 없다`, `  └ <span class="dmg">空間術式</span>: 魔法を使用できない`); return; }
    if (isChestCard(card) && chestLocked(g)) { ctx.log(`  └ <span class="dmg">${cn(DB.MIMIC2)}</span>: 보물상자 사용 봉인 중`, `  └ <span class="dmg">${cn(DB.MIMIC2)}</span>: 宝箱の使用は封印中`); return; }
    p.playsTurn = (p.playsTurn || 0) + 1; p.mana -= playCost(card, p); p.hand.splice(idx, 1);
    ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: card.star === "trash" ? "vanish" : "discard" });
    afterPlay(g, ctx, p, card);
    if (tryNullSpell(g, ctx, card)) { p.discard.push(card); return; } // negated → consumed, effect nullified
    if (trySpellSteal(g, ctx, card)) { p.discard.push(card); return; } // 주문 파쇄: 무효 + 복제 강탈
    if (tryAttuneJam(g, ctx, card)) { p.discard.push(card); return; } // 어튠 무효 장치(v37)
    p.uses[card.id] = (p.uses[card.id] || 0) + 1;             // game-long usage count (card analytics)
    if (card.star === "trash") { rmz(p).push(card); ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 이 카드 폐기`, `<span class="t">${p.name}</span> ${cn(card)} → このカードを廃棄`); }
    else if (card.star === "chest") {
      p.discard.push(card);
      openTreasure(g, ctx, p);
      // 미믹 파티: 상대가 보물상자를 사용하면 발동 — 상대(사용자) 필드 1마리, 함정 주인 필드 2마리
      if (!g.over) {
        const o2 = g.players[1 - g.cur];
        const mp = takeTrap(g, ctx, o2, "mimicParty");
        if (mp) {
          ctx.log(`  └ <span class="dmg">함정 ${cn(mp)}!</span> 미믹 파티 개최 — ${p.name} 필드에 2마리, ${o2.name} 필드에 3마리`, `  └ <span class="dmg">トラップ ${cn(mp)}!</span> ミミックパーティー — ${p.name} の場に2体, ${o2.name} の場に3体`);
          spawnToken(g, ctx, p, "MIMIC"); spawnToken(g, ctx, p, "MIMIC");
          spawnToken(g, ctx, o2, "MIMIC"); spawnToken(g, ctx, o2, "MIMIC"); spawnToken(g, ctx, o2, "MIMIC");
        }
      }
    }
    else if (card.star === "mana") { p.discard.push(card); p.maxMana++; ctx.log(`<span class="t">${p.name}</span> ${cn(card)} → 최대 마나 +1 (${p.maxMana})`, `<span class="t">${p.name}</span> ${cn(card)} → 最大マナ +1 (${p.maxMana})`); }
    return;
  }
  if (card.t === "mon") {
    if (spaceLocked(g, p)) { ctx.log(`  └ <span class="dmg">공간 술식</span>: 몬스터를 소환할 수 없다`, `  └ <span class="dmg">空間術式</span>: モンスターを召喚できない`); return; }
    if (summonBlockedLow(g, p, card)) { ctx.log(`  └ <span class="dmg">봉쇄령</span>: 코스트 ${card.cost} 몬스터 소환 불가`, `  └ <span class="dmg">封鎖令</span>: コスト ${card.cost} のモンスター召喚不可`); return; }
    if ((p.summonLockUntil ?? 0) > g.turn) { ctx.log(`  └ <span class="dmg">은둔자</span>: 다른 몬스터를 소환할 수 없다`, `  └ <span class="dmg">隠遁者</span>: 他のモンスターを召喚できない`); return; }
    if (p.summonCap != null && p.field.length >= p.summonCap) { ctx.log(`  └ <span class="dmg">고독의 저주</span>: 몬스터를 ${p.summonCap + 1}체 이상 소환할 수 없다`, `  └ <span class="dmg">孤独の呪い</span>: モンスターを${p.summonCap + 1}体以上召喚できない`); return; }
    if (p.lowSummonBanTurn && (card.cost ?? 0) <= 3) { ctx.log(`  └ <span class="dmg">삼격의 불씨</span>: 이번 턴 코스트 3 이하 소환 불가`, `  └ <span class="dmg">三撃の火種</span>: このターン コスト3以下は召喚不可`); return; }
    if (!summonReqMet(p, card, g.players[1 - g.cur])) { ctx.log(`  └ <span class="dmg">소환 조건 미충족</span>: ${cn(card)}`, `  └ <span class="dmg">召喚条件を満たしていない</span>: ${cn(card)}`); return; }
    if ((card.cost ?? 0) >= 5 && castleOf(p)) { ctx.log(`  └ <span class="dmg">성</span>: 코스트 5 이상 몬스터를 소환할 수 없다`, `  └ <span class="dmg">城</span>: コスト5以上のモンスターは召喚できない`); return; }
    if (p.field.length >= FIELD_MAX) { ctx.log(`  └ <span class="dmg">몬스터 존이 가득 찼습니다 (최대 ${FIELD_MAX})</span>`, `  └ <span class="dmg">モンスターゾーンが満杯です (最大 ${FIELD_MAX})</span>`); return; }
    p.playsTurn = (p.playsTurn || 0) + 1; p.mana -= playCost(card, p); p.hand.splice(idx, 1);
    p.uses[card.id] = (p.uses[card.id] || 0) + 1;             // game-long usage count (card analytics — monsters too)
    afterPlay(g, ctx, p, card);
    summonMonster(g, ctx, p, card);
    if (!g.over) treeKeeperTrigger(g, ctx, p, card, card.uid); // 파수꾼 자신의 소환은 제외
    return;
  }
  if (card.t === "spell") {
    const o0 = g.players[1 - g.cur];
    // ---- spell seals (침묵 오라 / 침묵의 심판) ----
    if (g.players.some((pl) => pl.field.some((m) => m.aura === "sealAll"))) { ctx.log(`  └ <span class="dmg">침묵의 거신</span>이 필드에 있어 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の巨神</span>が場にいるため魔法を使用できません`); return; }
    if (sealLowBlocks(g, playCost(card, p))) { ctx.log(`  └ <span class="dmg">침묵의 파수꾼</span>이 필드에 있어 코스트 ${sealLowCap(g)} 이하 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の番人</span>が場にいるためコスト${sealLowCap(g)}以下の魔法を使用できません`); return; }
    if (p.spellSealTurn) { ctx.log(`  └ <span class="dmg">침묵의 심판</span>: 이번 턴 동안 마법을 사용할 수 없습니다`, `  └ <span class="dmg">沈黙の審判</span>: このターン中は魔法を使用できません`); return; }
    if (p.spellCastCap != null && (p.spellsCastTurn || 0) >= p.spellCastCap) { ctx.log(`  └ <span class="dmg">마족 시너지</span>: 이번 턴 마법을 더 사용할 수 없습니다 (한도 ${p.spellCastCap})`, `  └ <span class="dmg">魔族シナジー</span>: このターンはこれ以上魔法を使えません (上限${p.spellCastCap})`); return; }
    if (spaceLocked(g, p)) { ctx.log(`  └ <span class="dmg">공간 술식</span>: 마법을 사용할 수 없다`, `  └ <span class="dmg">空間術式</span>: 魔法を使用できない`); return; }
    // ---- v41b 조건부 마법 ----
    if (card.id === "BEGINNER_MIND" && p.hand.length !== 1) { ctx.log("  └ 패가 0장일 때만 발동 가능", "  └ 手札が0枚の時のみ発動可能"); return; }
    if (card.id === "SPACE_RITE" && o0.field.length + o0.traps.length + o0.enchants.length < 6) { ctx.log("  └ 상대 필드의 카드가 6장 미만이라 사용 불가", "  └ 相手の場のカードが6枚未満のため使用不可"); return; }
    if (card.id === "BUYOUT" && !Object.values(p.buysTurn ?? {}).some((n2) => n2 >= 2)) { ctx.log("  └ 이번 턴 같은 카드를 2장 구매하지 않았다", "  └ このターン同じカードを2枚購入していない"); return; }
    if (card.id === "PACK_INSTINCT" && !p.field.some((m) => p.field.filter((x) => x.id === m.id).length >= 2)) { ctx.log("  └ 자신 필드에 같은 이름의 몬스터가 2체 이상 없다", "  └ 自分の場に同名モンスターが2体以上いない"); return; }
    if (card.id === "MIND_BURST" && !p.field.some((m) => (m.guts || 0) > 0)) { ctx.log("  └ 자신 필드에 기합 카운터가 없다", "  └ 自分の場に気合カウンターがない"); return; }
    if (card.id === "PENANCE" && !(p.brand ?? 0)) { ctx.log("  └ 자신에게 낙인 카운터가 없다", "  └ 自分に烙印カウンターがない"); return; }
    // ---- conditional / usage-gated preconditions (checked BEFORE paying) ----
    if (card.act === "wipeBack" && p.field.length > 0) { ctx.log(`  └ 필드에 몬스터가 있어 사용 불가`, `  └ 場にモンスターがいるため使用不可`); return; }
    if (card.id === "S4" && (p.usesTurn["S4"] || 0) >= 1) { ctx.log("  └ 이번 턴에 이미 사용했습니다", "  └ このターンは既に使用済み"); return; }
    if (card.id === "GS9_0" && o0.hp <= 21) { ctx.log("  └ 상대 체력 21 이하라 사용 불가", "  └ 相手の体力が21以下のため使用不可"); return; }
    if (card.id === "GS10_0" && p.field.length > 1) { ctx.log("  └ 자신 필드 몬스터 2체 이상이라 사용 불가", "  └ 自分の場のモンスターが2体以上のため使用不可"); return; }
    if (card.id === "RUNE1" && !o0.field.some((m) => (m.cost ?? 0) >= 5)) { ctx.log("  └ 코스트 5 이상 상대 몬스터가 없습니다", "  └ コスト5以上の敵モンスターがいません"); return; }
    if ((card.id === "RUNE2" || card.id === "RUNE3") && !spellDeckHalf(p)) { ctx.log("  └ 덱의 절반 이상이 마법이어야 발동 가능", "  └ デッキの半分以上が魔法でなければ発動不可"); return; }
    if ((card.id === "DISARM1" || card.id === "DISARM2" || card.id === "DISARM3") && o0.enchants.length === 0) { ctx.log("  └ 파괴할 상대 영구마법이 없습니다", "  └ 破壊する相手の永続魔法がありません"); return; }
    if (card.id === "BLOOD_SECRET" && !p.field.some((m) => isVampFamily(m))) { ctx.log("  └ 자신 필드에 '흡혈귀' 계열 몬스터가 없습니다", "  └ 自分の場に「吸血鬼」系列モンスターがいません"); return; }
    if (card.id === "BLOOD2" && o0.traps.length + o0.enchants.length === 0) { ctx.log("  └ 파괴할 상대 영구마법·세트 함정이 없습니다", "  └ 破壊する相手の永続魔法・セットトラップがありません"); return; }
    if (card.act === "destroyMon" && card.cap && ![...o0.field, ...p.field].some((m) => m.cost <= card.cap!)) { ctx.log(`  └ 코스트 ${card.cap} 이하의 대상 몬스터가 없습니다`, `  └ コスト${card.cap}以下の対象モンスターがいません`); return; }
    if (card.id === "CHOSEN_AREA" && cullExiled(p) < 25) { ctx.log(`  └ 게임에서 제외된 컬이 ${cullExiled(p)}장 — 25장 이상이어야 발동 가능`, `  └ ゲームから除外されたカルが${cullExiled(p)}枚 — 25枚以上で発動可能`); return; }
    if ((card.id === "DECAY_CRAFT" || card.id === "MAJESTY_RITE") && p.field.length === 0) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
    // 각인 비술: 위엄 미보유 몬스터가 하나도 없으면 발동 불가 — 전원 보유 상태에서
    // 발동되면 allowCancel:false pending이 영원히 해소 불가(모든 픽이 재선택) = 소프트락
    if (card.id === "MAJESTY_RITE" && !p.field.some((m) => !hasPassive(m, "majesty"))) { ctx.log("  └ '위엄'을 부여할 수 있는 몬스터가 없습니다", "  └ 「威厳」を与えられるモンスターがいません"); return; }
    if (card.ench === "foresight" && p.enchants.some((e) => e.card.ench === "foresight")) { ctx.log("  └ 자신 필드에 이미 '선견지명'이 있습니다", "  └ 自分の場に既に「先見の明」があります"); return; }
    if (card.ench === "guild" && p.enchants.some((e) => e.card.ench === "guild")) { ctx.log("  └ 자신 필드에 이미 '상회'가 있습니다", "  └ 自分の場に既に「商会」があります"); return; }
    if (card.id === "SLUM" && !p.enchants.some((e) => e.card.ench === "guild")) { ctx.log("  └ 자신 필드에 '상회'가 없습니다", "  └ 自分の場に「商会」がありません"); return; }
    if (card.id === "DUNGEON_FLOOR" && o0.maxMana < 7) { ctx.log("  └ 상대 최대 마나가 7 미만이라 사용 불가", "  └ 相手の最大マナが7未満のため使用不可"); return; }
    if (card.id === "MEDITATE" && p.maxMana > 11) { ctx.log("  └ 최대 마나가 11을 초과해 사용 불가", "  └ 最大マナが11を超えているため使用不可"); return; }

    if (card.id === "MEDITATE" && p.hp >= p.maxHp) { ctx.log("  └ 체력이 이미 가득 찼습니다", "  └ 体力が既に満タンです"); return; }
    if (card.id === "HERMIT" && p.field.length > 0) { ctx.log("  └ 필드에 몬스터가 있어 사용 불가", "  └ 場にモンスターがいるため使用不可"); return; }
    if (card.id === "HERMIT" && (p.uses["HERMIT"] || 0) >= 5) { ctx.log("  └ 게임당 5회까지만 사용 가능", "  └ ゲーム中5回まで使用可能"); return; }
    if (card.id === "FORBIDDEN" && !p.field.some((m) => m.tribe && m.tribe !== "시초")) { ctx.log("  └ 시초 외 종족 몬스터가 필드에 없습니다", "  └ 始原以外の種族モンスターが場にいません"); return; }
    if (card.id === "MULTI_CULTURE" && new Set(p.field.filter((m) => m.tribe).map((m) => m.tribe)).size < 2) { ctx.log("  └ 서로 다른 종족이 2종 이상 필요합니다", "  └ 異なる種族が2種以上必要です"); return; }
    if (card.id === "GS6_4" && !(o0.brand ?? 0)) { ctx.log("  └ 상대에게 낙인 카운터가 없습니다", "  └ 相手に烙印カウンターがありません"); return; }
    if (card.act === "exilePick" && p.discard.length === 0) { ctx.log("  └ 묘지가 비어 있습니다", "  └ 墓地が空です"); return; }
    if (card.act === "incubate" && !p.field.some((m) => m.hatch != null && m.hatch > 0)) { ctx.log("  └ 자신 필드에 알이 없습니다", "  └ 自分の場に卵がありません"); return; }
    if (card.id === "VAMP_PACT" && p.field.length >= FIELD_MAX) { ctx.log(`  └ <span class="dmg">몬스터 존이 가득 찼습니다 (최대 ${FIELD_MAX})</span>`, `  └ <span class="dmg">モンスターゾーンが満杯です (最大 ${FIELD_MAX})</span>`); return; }
    if (card.id === "COUNTERCALC" && o0.maxMana > 7) { ctx.log("  └ 상대 최대 마나가 7을 초과해 사용 불가", "  └ 相手の最大マナが7を超えているため使用不可"); return; }
    if ((card.id === "EXPANSION" || card.id === "LAND_GRANT") && !castleOf(p)) { ctx.log("  └ 자신 필드에 '성'이 없습니다", "  └ 自分の場に「城」がありません"); return; }
    if (card.id === "TREASON" && !castleOf(o0)) { ctx.log("  └ 상대 필드에 '성'이 없습니다", "  └ 相手の場に「城」がありません"); return; }
    if (card.id === "AEM" && (new Set(deckComp(p).filter((c) => c.t === "mon" && isGolem(c)).map((c) => c.id)).size < 2 || !p.field.some((m) => isGolem(m)))) { ctx.log("  └ 덱 구성에 서로 다른 골램 2장과 필드의 골램이 필요합니다", "  └ デッキ構成に異なるゴーレム2枚と場のゴーレムが必要です"); return; }
    if ((card.id === "KNIGHT_TEACH" || card.id === "NL_SECRET") && p.field.length === 0) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
    if (card.id === "COUNTERCALC" && o0.enchants.length === 0) { ctx.log("  └ 파괴할 상대 영구마법이 없습니다", "  └ 破壊する相手の永続魔法がありません"); return; }
    if (card.id === "AMBUSH" && o0.maxMana !== 4) { ctx.log("  └ 상대 최대 마나가 4가 아니라 사용 불가", "  └ 相手の最大マナが4ではないため使用不可"); return; }
    if (card.id === "TRUMPET" && p.field.length === 0) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
    if (card.id === "WALLBREAK1" && ![...o0.field, ...p.field].some((m) => effAtk(o0, m) <= 2)) { ctx.log("  └ 공격력 2 이하 몬스터가 없습니다", "  └ 攻撃力2以下のモンスターがいません"); return; }
    if (card.id === "WALLBREAK2" && !o0.field.some((m) => effAtk(o0, m) <= 2)) { ctx.log("  └ 공격력 2 이하 적 몬스터가 없습니다", "  └ 攻撃力2以下の敵モンスターがいません"); return; }
    if (card.id === "SNIPE1" && ![...o0.field, ...p.field].some((m) => curHp(o0, m) <= 3)) { ctx.log("  └ 체력 3 이하 몬스터가 없습니다", "  └ 体力3以下のモンスターがいません"); return; }
    if (card.id === "SNIPE2" && !o0.field.some((m) => curHp(o0, m) <= 2)) { ctx.log("  └ 체력 2 이하 적 몬스터가 없습니다", "  └ 体力2以下の敵モンスターがいません"); return; }
    if (card.id === "INQUISITION" && ![...o0.deck, ...o0.discard, ...o0.field].some((m) => m.t === "mon" && m.tribe)) { ctx.log("  └ 상대에게 종족 몬스터가 없습니다", "  └ 相手に種族モンスターがいません"); return; }
    if (card.id === "PURGE_ALL" && p.deck.length + p.discard.length === 0) { ctx.log("  └ 덱과 묘지가 비어 있습니다", "  └ デッキと墓地が空です"); return; }
    if (card.id === "GOLIATH_HUNT" && !o0.field.some((m) => effDef(o0, m) >= 10)) { ctx.log("  └ 최대 체력 10 이상 적 몬스터가 없습니다", "  └ 最大体力10以上の敵モンスターがいません"); return; }
    if (card.id === "MASSACRE" && o0.field.length === 0) { ctx.log("  └ 파괴할 적 몬스터가 없습니다", "  └ 破壊する敵モンスターがいません"); return; }
    if (card.id === "SCRAPPER" && [...p.deck, ...p.discard].filter((c) => c.cost <= 1).length < 2) { ctx.log("  └ 덱·묘지에 코스트 1 이하 카드가 2장 없습니다", "  └ デッキ・墓地にコスト1以下のカードが2枚ありません"); return; }
    if (card.ench && p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ <span class="dmg">마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})</span>`, `  └ <span class="dmg">魔法・罠ゾーンが満杯です (最大 ${ST_MAX})</span>`); return; }
    // 마스터 미믹(chestLock): 보물상자 "계열" 전부 봉인. 행운/길드의 보물상자는 스타터가 아니라
    // 스펠이라 star==="chest" 검사만 있던 예전 가드를 통째로 빠져나갔다.
    if (isChestCard(card) && chestLocked(g)) { ctx.log(`  └ <span class="dmg">${cn(DB.MIMIC2)}</span>: 보물상자 사용 봉인 중`, `  └ <span class="dmg">${cn(DB.MIMIC2)}</span>: 宝箱の使用は封印中`); return; }

    p.playsTurn = (p.playsTurn || 0) + 1; p.mana -= playCost(card, p); p.hand.splice(idx, 1); p.discard.push(card);
    afterPlay(g, ctx, p, card);
    p.spellsCastTurn = (p.spellsCastTurn || 0) + 1; // 마나 역류: 마법(t==="spell")만 카운트 (스타터 제외)
    treeKeeperTrigger(g, ctx, p, card); // 세계수의 파수꾼: '사용'에 반응 (무효화 여부와 무관)
    tryBrandMagic(g, ctx); // 낙인: 마법 "사용" 자체에 반응 — 무효화 여부와 무관
    tryHexCurseOnSpell(g, ctx); // 상급 주술사(v39): 상대 마법 "사용"마다 상대 묘지에 저주 1장 — 무효화 여부와 무관
    if (tryNullSpell(g, ctx, card)) return;
    if (trySpellSteal(g, ctx, card)) return; // 주문 파쇄: 무효 + 복제 강탈
    if (trySecondNull(g, ctx, card)) return;
    if (tryAttuneJam(g, ctx, card)) return; // 어튠 무효 장치(v37): 어튠 - 흑/진/마
    if (tryHexBossNull(g, ctx, card)) return; // 특급 주술사 켈로이드(v39): 주사위 3+면 상대 마법 무효
    // 공허(void) 마법 토큰(와인/암상인): 사용 후 묘지 대신 게임에서 제외 — 영구마법(선견지명류)은 제외
    if (!card.ench && hasPassive(card, "void")) {
      const vi = p.discard.lastIndexOf(card);
      if (vi >= 0) { p.discard.splice(vi, 1); rmz(p).push(card); }
    }
    p.uses[card.id] = (p.uses[card.id] || 0) + 1;             // game-long usage count
    p.usesTurn[card.id] = (p.usesTurn[card.id] || 0) + 1;     // per-turn usage count
    if (card.ench) {
      p.discard.pop(); // stays on the field instead of going to discard
      p.enchants.push({ card, turns: card.val || 1, bornTurn: g.turn });
      const perm = (card.val || 0) >= 99;
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 발동 (지속 ${perm ? "영구" : `${card.val}턴`})`, `<span class="t">${p.name}</span> ${cn(card)} 発動 (${perm ? "永続" : `持続${card.val}ターン`})`);
      ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "field" });
      // 보석의 비: 시전 시 현재 필드의 모든 미믹 계열 공격력 +3 (신규 소환은 applyFieldGlobals가 처리)
      if (card.ench === "gemRain") {
        g.players.forEach((pl) => pl.field.forEach((mm) => { if (MIMIC_IDS.has(mm.id)) mm.atkMod = (mm.atkMod || 0) + 3; }));
        ctx.log(`  └ 필드의 모든 미믹 계열 공격력 +3`, `  └ 場の全ミミック系の攻撃力+3`);
      }
      // 마계(v38): 발동 시 자신 필드의 마족 몬스터 효과도 무효화
      if (card.ench === "demonRealm") {
        for (const dm of p.field) if (dm.tribe === "마족" && (dm.onSummon || dm.turnFx || dm.aura)) { dm.onSummon = undefined; dm.turnFx = undefined; dm.aura = undefined; ctx.log(`  └ 마계: ${cn(dm)} 의 효과 무효화`, `  └ 魔界: ${cn(dm)} の効果を無効化`); }
      }
      // 무법지대(v41): 발동 시 필드의 모든 몬스터(알 제외)의 체력을 1로
      if (card.ench === "lawless") {
        let nl = 0;
        for (const pl of g.players) for (const mm of pl.field) { if (mm.hatch != null) continue; setHpOne(pl, mm); nl++; }
        ctx.log(`  └ 필드의 모든 몬스터 ${nl}체의 체력이 1이 된다`, `  └ 場の全モンスター${nl}体の体力が1になる`);
      }
      // 강산성비(v37): 발동 시 상대 몬스터 전체에 부패 카운터 2개
      if (card.ench === "strongAcid") {
        const o1 = g.players[1 - g.cur];
        for (const tm of [...o1.field]) { if (g.over) break; if (tm.hatch == null && o1.field.some((x) => x.uid === tm.uid)) addDecay(g, ctx, o1, tm, 2); }
      }
      // 약화술식: 시전 시 현재 필드의 모든 몬스터 공격력 -2 (신규 소환은 applyFieldGlobals가 처리)
      if (card.ench === "weakenAll") {
        g.players.forEach((pl) => pl.field.forEach((mm) => (mm.atkMod = (mm.atkMod || 0) - 2)));
        ctx.log(`  └ 양 필드의 모든 몬스터 공격력 -2`, `  └ 両方の場の全モンスター攻撃力-2`);
      }
      // 운명의 수레바퀴 — v25: 시전 대가 없음 (최대 마나 -1 삭제, cost 4→5)
      // 시련의 영역: 시전 대가 (자신 6뎀 — 마법 데미지로 취급)
      if (card.ench === "trialArea") {
        ctx.log(`  └ 대가: 자신에게 6 데미지`, `  └ 代価: 自分に6ダメージ`);
        spellDepth++;
        try { ctx.dealDamage(p, 6, cn(card), cn(card)); } finally { spellDepth--; }
      }
      return;
    }
    ctx.ev.push({ type: "playSpell", player: side(g, p), id: card.id, dest: "discard" }); // reveal animation
    const blood = isBloodMagic(card);
    // 룬 학문 - 상급(runeEcho, v34): 즉발 마법을 마나 없이 1번 더 발동 (선택형/펜딩 생성 마법은 제외)
    const echo = card.t === "spell" && runeEchoDepth === 0 && p.enchants.some((e) => e.card.ench === "runeEcho");
    if (CUSTOM_SPELLS.has(card.id)) {
      spellDepth++; if (blood) bloodDepth++;
      try { customSpell(g, ctx, card); } finally { spellDepth--; if (blood) bloodDepth--; }
      if (blood) bloodTriggers(g, ctx, p);
      if (echo && !g.pending && !g.over) {
        ctx.log(`  └ <span class="good">룬 학문 - 상급</span>: ${cn(card)} 재발동!`, `  └ <span class="good">ルーン学問 - 上級</span>: ${cn(card)} 再発動！`);
        runeEchoDepth++;
        spellDepth++; if (blood) bloodDepth++;
        try { customSpell(g, ctx, card); } finally { spellDepth--; if (blood) bloodDepth--; runeEchoDepth--; }
        if (blood) bloodTriggers(g, ctx, p);
      }
      offerReroll(g, ctx, card);
      return;
    }
    const a = card.act, v = card.val || 0, v2 = card.val2 || 0;
    // Targeted spells resolve later via a pending choice and never reach applySpell's
    // "P card → effect" logs — write the cast line HERE so the card name always
    // appears in the battle log (e.g. 룬 파열's destroy used to show up nameless).
    if (a === "buffTurn" || a === "buffPerm" || a === "destroyMon" || a === "weaken" || a === "seek" || a === "recall" || a === "exilePick" || a === "incubate" || (a === "destroyTrap" && v < 99) || a === "destroyEnch")
      ctx.log(`<span class="t">${p.name}</span> ${cn(card)} 발동`, `<span class="t">${p.name}</span> ${cn(card)} 発動`);
    // v21: 선택형 함정/영구마법 파괴 — 양쪽 필드에서 대상을 고른다 ("전부 파괴"형 destroyTrap(99)은 applySpell에서 일괄 처리)
    if ((a === "destroyTrap" && v < 99) || a === "destroyEnch") {
      const o = g.players[1 - g.cur];
      const n = v || 1;
      const left = a === "destroyTrap" ? o.traps.length + p.traps.length : o.enchants.length + p.enchants.length;
      if (!left) { ctx.log(a === "destroyTrap" ? "  └ 대상 세트 함정 없음" : "  └ 대상 영구마법 없음", a === "destroyTrap" ? "  └ 対象のセットトラップなし" : "  └ 対象の永続魔法なし"); return; }
      g.pending = {
        kind: "oppBoard",
        hint: a === "destroyTrap" ? `파괴할 세트 함정 선택 (양쪽 필드, ${n}장)` : `파괴할 영구마법 선택 (양쪽 필드, ${n}장)`,
        hintJa: a === "destroyTrap" ? `破壊するセットトラップを選択 (両フィールド、${n}枚)` : `破壊する永続魔法を選択 (両フィールド、${n}枚)`,
        reason: a, allowCancel: true,
        data: { val: n, anySide: true, sourceId: card.id, ...(a === "destroyTrap" ? { trapOnly: true } : { enchOnly: true }) },
      };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "buffTurn" || a === "buffPerm") {
      // 칼날의 속삭임(v34): 종족 몬스터는 대상 불가
      if (card.id === "S3" && !p.field.some((m) => !m.tribe)) { ctx.log("  └ 종족이 아닌 몬스터가 없습니다", "  └ 種族でないモンスターがいません"); return; }
      if (!p.field.length) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
      g.pending = {
        kind: "myMon",
        hint: a === "buffTurn" ? `공격력 +${v} 할 자신 몬스터 선택` : (v2 && !v ? `체력 +${v2} 할 자신 몬스터 선택` : "강화할 자신 몬스터 선택"),
        hintJa: a === "buffTurn" ? `攻撃 +${v} する自分のモンスターを選択` : (v2 && !v ? `体力 +${v2} する自分のモンスターを選択` : "強化する自分のモンスターを選択"),
        reason: a, allowCancel: false, data: { val: v, val2: v2, ...(card.grantPassive ? { grant: card.grantPassive } : {}) },
      };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "destroyMon" || a === "weaken") {
      const o = g.players[1 - g.cur];
      // 파괴 선택(v21)은 양쪽 필드가 대상 · 룬 파열(v18): cap 이하 코스트 몬스터만 대상
      const basePool = a === "destroyMon" ? [...o.field, ...p.field] : o.field;
      const pool = a === "destroyMon" && card.cap ? basePool.filter((m) => m.cost <= card.cap!) : basePool;
      if (!pool.length) { ctx.log("  └ 대상 몬스터 없음", "  └ 対象モンスターなし"); return; }
      g.pending = {
        kind: "oppMon",
        hint: a === "destroyMon" ? (card.cap ? `파괴할 몬스터 선택 (양쪽 필드 · 코스트 ${card.cap} 이하)` : "파괴할 몬스터 선택 (양쪽 필드)") : `체력 -${v} 할 적 몬스터 선택`,
        hintJa: a === "destroyMon" ? (card.cap ? `破壊するモンスターを選択 (両フィールド · コスト${card.cap}以下)` : "破壊するモンスターを選択 (両フィールド)") : `体力 -${v} する敵モンスターを選択`,
        reason: a, allowCancel: a === "destroyMon", data: a === "destroyMon" ? { val: v, sourceId: card.id, anySide: true, ...(card.cap ? { maxCost: card.cap } : {}) } : { val: v, sourceId: card.id },
      };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "seek") {
      if (!p.deck.length) { ctx.log("  └ 덱이 비어있음", "  └ デッキが空"); return; } // 시크는 덱에서만 고른다
      g.pending = { kind: "seek", hint: "덱에서 1장 선택", hintJa: "デッキから1枚選択", reason: "seek", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "recall") {
      // 주의: 이 시점에 리콜 카드 자신이 이미 p.discard 에 들어가 있다(플레이 시 push).
      // 그래서 예전엔 묘지가 "비어 있어도" length>=1 이라 발동됐고, 자기 자신을 회수할 수도 있었다.
      if (!p.discard.some((c) => c.uid !== card.uid)) { ctx.log("  └ 묘지가 비어 있습니다", "  └ 墓地が空です"); return; }
      g.pending = { kind: "recall", hint: "버린 패에서 1장 선택", hintJa: "捨て札から1枚選択", reason: "recall", allowCancel: true, data: { exclude: card.uid } };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "exilePick") {
      if ((p.brand ?? 0) > 0) { ctx.log(`  └ 자신의 낙인 카운터 ${p.brand}개 제거`, `  └ 自分の烙印カウンター${p.brand}個を除去`); p.brand = 0; } // 정화의 손길(v34)
      g.pending = { kind: "recall", hint: "게임에서 제외할 카드 선택", hintJa: "ゲームから除外するカードを選択", reason: "exilePick", allowCancel: true };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    if (a === "incubate") { // 고급 부화기: 자신의 알 1개 부화 카운터 -v
      g.pending = { kind: "myMon", hint: `부화를 ${v}턴 앞당길 알 선택`, hintJa: `孵化を${v}ターン早める卵を選択`, reason: "incubate", allowCancel: true, data: { val: v } };
      ctx.ev.push({ type: "needTarget", pending: g.pending }); return;
    }
    spellDepth++; if (blood) bloodDepth++;
    try { applySpell(g, ctx, card); } finally { spellDepth--; if (blood) bloodDepth--; }
    if (blood) bloodTriggers(g, ctx, p);
    if (echo && !g.pending && !g.over) { // 룬 학문 - 상급(v34)
      ctx.log(`  └ <span class="good">룬 학문 - 상급</span>: ${cn(card)} 재발동!`, `  └ <span class="good">ルーン学問 - 上級</span>: ${cn(card)} 再発動！`);
      runeEchoDepth++;
      spellDepth++; if (blood) bloodDepth++;
      try { applySpell(g, ctx, card); } finally { spellDepth--; if (blood) bloodDepth--; runeEchoDepth--; }
      if (blood) bloodTriggers(g, ctx, p);
    }
    offerReroll(g, ctx, card);
    return;
  }
  if (card.t === "trap") {
    if (p.trapBlockTurn) { ctx.log(`  └ <span class="dmg">협상: 이번 턴에는 함정을 설치할 수 없습니다</span>`, `  └ <span class="dmg">交渉: このターンは罠を設置できません</span>`); return; }
    if (g.players[1 - g.cur].field.some((m) => m.aura === "trapBan")) { ctx.log(`  └ <span class="dmg">몰락한 기사</span>: 함정을 세트할 수 없습니다`, `  └ <span class="dmg">没落した騎士</span>: 罠をセットできません`); return; }
    if (p.traps.length + p.enchants.length >= ST_MAX) { ctx.log(`  └ <span class="dmg">마법·함정 존이 가득 찼습니다 (최대 ${ST_MAX})</span>`, `  └ <span class="dmg">魔法・罠ゾーンが満杯です (最大 ${ST_MAX})</span>`); return; }
    p.playsTurn = (p.playsTurn || 0) + 1; p.mana -= playCost(card, p); p.hand.splice(idx, 1);
    afterPlay(g, ctx, p, card);
    const set: TrapSet = { card };
    if (card.react === "doomsday") set.cnt = 3; // 심판의 카운트다운: 3턴 후 자동 발동
    p.traps.push(set);
    ctx.log(`<span class="t">${p.name}</span> 함정을 세트 (정체는 비공개)`, `<span class="t">${p.name}</span> トラップをセット (正体は非公開)`);
    ctx.ev.push({ type: "trapSet", player: side(g, p) });
    treeKeeperTrigger(g, ctx, p, card);
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
  const d = (pending.data || {}) as { val?: number; val2?: number; attackerUid?: string; count?: number; exclude?: string; excl?: string[]; sourceId?: string; zone?: string; fired?: string[]; noMon?: boolean; anySide?: boolean; trapOnly?: boolean; enchOnly?: boolean; grant?: string };

  if (uid === null) {
    if (pending.allowCancel) {
      g.pending = null;
      // 시련의 영역 제외를 끝냈으면(취소 포함) 같은 턴의 마법사 발동 기회를 이어서 제공
      if (pending.reason === "trialExile") offerChosenMage(g, ctx);
    } else if (pending.kind === "oppMon" && pending.reason !== "attack") {
      // 취소 불가 pending이라도 유효한 대상이 전혀 없으면(전원 아우라 등) 해제 — 봇/클라 데드락 방지
      const dd = (pending.data || {}) as { anySide?: boolean; maxCost?: number };
      const anyValid = o.field.some((tm) => !hasPassive(tm, "aura") && (dd.maxCost == null || (tm.cost ?? 0) <= dd.maxCost)) || (!!dd.anySide && p.field.length > 0);
      if (!anyValid) { g.pending = null; ctx.log("  └ 유효한 대상 없음 — 효과 불발", "  └ 有効な対象なし — 効果は不発"); }
    }
    return;
  }
  g.pending = null;

  if (pending.kind === "oppMon") {
    // anySide(파괴 선택): 자신 필드의 몬스터도 대상으로 고를 수 있다 (v21)
    let owner = o;
    let tm = o.field.find((m) => m.uid === uid);
    if (!tm && d.anySide) { const own = p.field.find((m) => m.uid === uid); if (own) { owner = p; tm = own; } }
    // 무효 대상(존재하지 않는 uid)·아우라 대상: pending을 COMPLETE로 소모하지 않고 재선택.
    // (이전에는 여기서 그냥 return → 강제 선택(allowCancel:false)마저 통째로 증발했고,
    //  악성 클라이언트는 임의 uid 전송으로 어떤 필수 선택이든 "취소"할 수 있었다)
    if (!tm) { g.pending = pending; return; }
    // 아우라(ward): "상대의" 마법·몬스터 효과의 대상이 되지 않는다 — 공격 대상 지정과 자기 효과는 허용
    if (owner !== p && hasPassive(tm, "aura") && pending.reason !== "attack") {
      ctx.log(`  └ <span class="dmg">${cn(tm)} 은(는) 효과의 대상이 되지 않는다</span>`, `  └ <span class="dmg">${cn(tm)} は効果の対象にならない</span>`);
      // 아우라가 아닌 대상이 남아 있으면 재선택; 전부 아우라뿐이면 효과 불발 (재선택 강제 시 소프트락)
      const legal = [...o.field.filter((m2) => !hasPassive(m2, "aura")), ...(d.anySide ? p.field : [])];
      if (legal.length) { g.pending = pending; ctx.ev.push({ type: "needTarget", pending: g.pending }); }
      return;
    }
    if (pending.reason === "defDown" || pending.reason === "weaken") { tm.defMod = (tm.defMod || 0) - (d.val || 0); ctx.log(`  └ ${cn(tm)} 체력 -${d.val}`, `  └ ${cn(tm)} 体力 -${d.val}`); recheckDeaths(g, ctx); }
    else if (pending.reason === "atkDown") { tm.atkMod = (tm.atkMod || 0) - (d.val || 0); ctx.log(`  └ ${cn(tm)} 공격력 -${d.val}`, `  └ ${cn(tm)} 攻撃 -${d.val}`); }
    else if (pending.reason === "destroyMon") {
      const mc = (d as { maxCost?: number }).maxCost;
      if (mc != null && tm.cost > mc) { g.pending = pending; ctx.log(`  └ 코스트 ${mc} 이하 몬스터만 대상 가능`, `  └ コスト${mc}以下のモンスターのみ対象可能`); return; }
      const src = d.sourceId && DB[d.sourceId] ? cn(DB[d.sourceId]) : null;
      ctx.log(
        src ? `<span class="t">${p.name}</span> ${src} → ${cn(tm)} 파괴` : `<span class="t">${p.name}</span> → ${cn(tm)} 파괴`,
        src ? `<span class="t">${p.name}</span> ${src} → ${cn(tm)} 破壊` : `<span class="t">${p.name}</span> → ${cn(tm)} 破壊`,
      );
      ctx.destroyMonster(owner, tm);
      const left = ((d.val as number) || 0) - 1;
      const pool2 = d.anySide ? [...o.field, ...p.field] : o.field;
      if (left >= 1 && pool2.some((m2) => mc == null || m2.cost <= mc)) {
        g.pending = { kind: "oppMon", hint: `파괴할 몬스터 선택 (${left}체 남음)`, hintJa: `破壊するモンスターを選択 (残り${left}体)`, reason: "destroyMon", allowCancel: true, data: { val: left, sourceId: d.sourceId, anySide: d.anySide, ...(mc != null ? { maxCost: mc } : {}) } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
    else if (pending.reason === "feastKill") { // 포식 시너지: N체 선택 파괴 후 데미지
      ctx.log(`<span class="t">포식 시너지</span> → ${cn(tm)} 파괴`, `<span class="t">捕食シナジー</span> → ${cn(tm)} 破壊`);
      ctx.destroyMonster(owner, tm);
      const left = ((d.val as number) || 1) - 1;
      const pool2 = d.anySide ? [...o.field, ...p.field] : o.field;
      if (left >= 1 && pool2.length > 0 && !g.over) {
        g.pending = { kind: "oppMon", hint: `포식 시너지 — 파괴할 몬스터 선택 (${left}체 남음)`, hintJa: `捕食シナジー — 破壊するモンスターを選択 (残り${left}体)`, reason: "feastKill", allowCancel: false, data: { val: left, val2: d.val2, anySide: d.anySide } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else if (!g.over) {
        ctx.dealDamage(o, (d.val2 as number) || 0, "포식 시너지", "捕食シナジー");
      }
    }
    else if (pending.reason === "setAtk2") { // 시초의 수호자: 대상 공격력을 2로 변경
      tm.atk = 2; tm.atkMod = 0; tm.tempAtk = 0;
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 의 공격력이 2가 된다`, `<span class="t">${p.name}</span> → ${cn(tm)} の攻撃力が2になる`);
    }
    else if (pending.reason === "decayMark") { // 러스트캡 슬러그: 부패 카운터 1개 부여 (알 제외)
      if (tm.hatch != null) { g.pending = pending; return; } // 알은 대상 불가 — 다시 고르게
      addDecay(g, ctx, o, tm, d.val || 1);
    }
    else if (pending.reason === "bounceLow") { // 굶주린 새끼짐승: 코스트 2 이하만 대상
      const mc2 = (d as { maxCost?: number }).maxCost ?? 2;
      if ((tm.cost ?? 0) > mc2) { g.pending = pending; ctx.log(`  └ 코스트 ${mc2} 이하만 대상 가능`, `  └ コスト${mc2}以下のみ対象可能`); return; }
      const bi = owner.field.findIndex((x) => x.uid === tm.uid);
      if (bi >= 0) {
        const bounced = owner.field.splice(bi, 1)[0];
        if (bounced.aura === "drainMana") { const opp2 = g.players[0] === owner ? g.players[1] : g.players[0]; opp2.maxMana += (bounced.drained ?? (bounced.val || 3)); }
        ctx.ev.push({ type: "destroy", player: side(g, owner), uid: bounced.uid, id: bounced.id });
        if (bounced.token) { rmz(owner).push(resetInst(bounced)); ctx.log(`  └ 토큰 ${cn(bounced)} 은(는) 게임에서 제외`, `  └ トークン ${cn(bounced)} はゲームから除外`); }
        else { owner.hand.push(resetInst(bounced)); ctx.log(`  └ ${cn(bounced)} 을(를) 상대 패로 되돌린다`, `  └ ${cn(bounced)} を相手の手札に戻す`); }
      }
    }
    else if (pending.reason === "attack") {
      const att = p.field.find((m) => m.uid === d.attackerUid);
      if (att) {
        // 귀족 영주(eliteGuard): 코스트 6 이하 몬스터는 이 몬스터를 공격할 수 없다 — 재선택
        if (tm.aura === "eliteGuard" && (att.cost ?? 0) <= 6) { g.pending = pending; ctx.log(`  └ <span class="dmg">귀족 영주</span>: 코스트 6 이하는 공격할 수 없다`, `  └ <span class="dmg">貴族領主</span>: コスト6以下では攻撃できない`); return; }
        ctx.ev.push({ type: "attack", player: side(g, p), uid: att.uid, targetUid: tm.uid }); resolveAttackCore(g, ctx, att, tm.uid);
      }
    }
  } else if (pending.kind === "myMon") {
    const tm = p.field.find((m) => m.uid === uid);
    if (!tm) return;
    if (pending.reason === "buffTurn") {
      const picked = d.excl ?? [];
      if (picked.includes(tm.uid)) { g.pending = pending; return; } // 지원 나팔: 이미 고른 몬스터는 중복 선택 불가 — 다시 고르게
      tm.tempAtk = (tm.tempAtk || 0) + (d.val || 0);
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 공격력 +${d.val}`, `<span class="t">${p.name}</span> → ${cn(tm)} 攻撃 +${d.val}`);
      const left = ((d.count as number) || 1) - 1;
      const nextExcl = [...picked, tm.uid];
      if (left > 0 && p.field.some((x) => !nextExcl.includes(x.uid))) {
        g.pending = { kind: "myMon", hint: `공격력 +${d.val} 할 자신 몬스터 선택 (${left}체 남음)`, hintJa: `攻撃力+${d.val}する自分のモンスターを選択 (残り${left}体)`, reason: "buffTurn", allowCancel: true, data: { val: d.val, count: left, excl: nextExcl } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
    else if (pending.reason === "buffPerm") {
      const bv = (d.val as number) || 0, bv2 = (d.val2 as number) || 0;
      tm.atkMod = (tm.atkMod || 0) + bv; tm.defMod = (tm.defMod || 0) + bv2;
      const sgn = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
      const partsKo: string[] = [], partsJa: string[] = [];
      if (bv) { partsKo.push(`공격${sgn(bv)}`); partsJa.push(`攻撃${sgn(bv)}`); }
      if (bv2) { partsKo.push(`체력${sgn(bv2)}`); partsJa.push(`体力${sgn(bv2)}`); }
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} ${partsKo.join(" / ")}`, `<span class="t">${p.name}</span> → ${cn(tm)} ${partsJa.join(" / ")}`);
      const gp = d.grant as string | undefined;
      if (gp && !hasPassive(tm, gp)) {
        (tm.passivesG ??= []).push(gp);
        const pn = PASSIVES[gp];
        ctx.log(`  └ ${cn(tm)} 이(가) '${pn ? pn.ko.name : gp}'을 얻는다`, `  └ ${cn(tm)} が「${pn ? pn.ja.name : gp}」を得る`);
      }
      if (bv2 < 0) recheckDeaths(g, ctx);
    }
    else if (pending.reason === "incubate") {
      if (tm.hatch == null) { ctx.log("  └ 알이 아닙니다", "  └ 卵ではありません"); return; }
      tm.hatch = Math.max(0, tm.hatch - ((d.val as number) || 5));
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 부화 카운터 -${d.val || 5} (남은 ${tm.hatch}턴)`, `<span class="t">${p.name}</span> → ${cn(tm)} 孵化カウンター-${d.val || 5} (残り${tm.hatch}ターン)`);
    }
    else if (pending.reason === "bloodSecret") {
      if (!isVampFamily(tm)) { g.pending = pending; return; } // 흡혈귀만 지정 가능 — 다시 고르게
      bloodSecretDestroy(g, ctx, p, tm);
    }
    else if (pending.reason === "grantDecay") { // 암기 제작: '부패' 부여 (2체, 이미 가진 몬스터는 재선택)
      if (hasPassive(tm, "decay")) { g.pending = pending; return; }
      (tm.passivesG ??= []).push("decay");
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 이(가) '부패'를 얻는다`, `<span class="t">${p.name}</span> → ${cn(tm)} が「腐敗」を得る`);
      const left = ((d.count as number) || 1) - 1;
      if (left > 0 && p.field.some((x) => !hasPassive(x, "decay"))) {
        g.pending = { kind: "myMon", hint: `'부패'를 부여할 자신 몬스터 선택 (${left}체 남음)`, hintJa: `「腐敗」を与える自分のモンスターを選択 (残り${left}体)`, reason: "grantDecay", allowCancel: true, data: { count: left } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
    else if (pending.reason === "grantMajesty") { // 각인 비술: '위엄' 부여 (이미 가진 몬스터는 재선택)
      if (hasPassive(tm, "majesty")) { g.pending = pending; return; }
      (tm.passivesG ??= []).push("majesty");
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 이(가) '위엄'을 얻는다`, `<span class="t">${p.name}</span> → ${cn(tm)} が「威厳」を得る`);
    }
    else if (pending.reason === "golemBuff") { // 앤티크 인핸스 매직(v38): 골램 2체 공격력 +7
      if (!isGolem(tm) || (d.excl ?? []).includes(tm.uid)) { g.pending = pending; return; }
      tm.atkMod = (tm.atkMod || 0) + (d.val || 7);
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 공격력 +${d.val || 7}(지속)`, `<span class="t">${p.name}</span> → ${cn(tm)} 攻撃力+${d.val || 7}(持続)`);
      const left = ((d.count as number) || 1) - 1; const nextExcl = [...(d.excl ?? []), tm.uid];
      if (left > 0 && p.field.some((x) => isGolem(x) && !nextExcl.includes(x.uid))) {
        g.pending = { kind: "myMon", reason: "golemBuff", allowCancel: false, data: { val: d.val, count: left, excl: nextExcl }, hint: pending.hint, hintJa: pending.hintJa };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
    else if (pending.reason === "nlTarget") { // 나이트로드의 비기(v38): 부여할 패시브 선택으로
      g.pending = { kind: "giantShop", reason: "nlGrant", allowCancel: false, hint: "나이트로드의 비기 — 부여할 패시브 선택", hintJa: "ナイトロードの秘技 — 与えるパッシブを選択",
        data: { ids: ["trapmaster", "ambush", "evade"], free: true, uid: tm.uid, opts: [{ id: "trapmaster", ko: "트랩마스터", ja: "トラップマスター", en: "Trap Master" }, { id: "ambush", ko: "암습", ja: "暗襲", en: "Infiltrate" }, { id: "evade", ko: "회피", ja: "回避", en: "Evade" }] } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
    }
    else if (pending.reason === "emberBuff") { // 시초의 불씨(v36): 다른 시초 몬스터 공격력 +2(지속)
      if (tm.tribe !== "시초" || (d.excl ?? []).includes(tm.uid)) { g.pending = pending; return; }
      tm.atkMod = (tm.atkMod || 0) + (d.val || 2);
      ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 공격력 +${d.val || 2}(지속)`, `<span class="t">${p.name}</span> → ${cn(tm)} 攻撃力+${d.val || 2}(持続)`);
    }
    else if (pending.reason === "worldTree") { // 세계수(v36): 카운터 1개 소모 → 아군 몬스터 체력 전회복 + 자신 체력 80%까지
      if (tm.id !== "WORLD_TREE" || (tm.gcount || 0) <= 0) { g.pending = pending; return; }
      tm.gcount = (tm.gcount || 1) - 1;
      let fixed = 0;
      p.field.forEach((x) => { if ((x.dmg || 0) > 0) { x.dmg = 0; fixed++; } });
      const target = Math.floor(p.maxHp * 0.8);
      const healed = Math.max(0, target - p.hp);
      if (healed > 0) ctx.heal(p, healed);
      ctx.log(`<span class="t">${cn(tm)}</span> 발동 — 아군 몬스터 ${fixed}체 체력 전회복, 자신 체력 ${healed} 회복 (${p.hp}) · 남은 카운터 ${tm.gcount}`, `<span class="t">${cn(tm)}</span> 発動 — 味方モンスター${fixed}体の体力全回復, 自分の体力${healed}回復 (${p.hp}) · 残りカウンター${tm.gcount}`);
    }
    else if (pending.reason === "chosenMage") { // 선택받은 마법사: 제외된 컬 1장 → 묘지, 상대에게 8뎀 (v36)
      if (tm.id !== "CHOSEN_MAGE" || (d.fired ?? []).includes(tm.uid)) { g.pending = pending; return; }
      const list = rmz(p);
      const ci = list.findIndex((c) => c.star === "trash");
      if (ci >= 0) {
        const c = list.splice(ci, 1)[0];
        p.discard.push(c);
        ctx.log(`<span class="t">${cn(tm)}</span> 발동 — 제외된 컬 1장을 묘지로 되돌리고 상대에게 8 데미지`, `<span class="t">${cn(tm)}</span> 発動 — 除外されたカル1枚を墓地に戻し相手に8ダメージ`);
        ctx.dealDamage(o, 8, cn(tm), cn(tm));
      }
      const fired = [...(d.fired ?? []), tm.uid];
      const more = p.field.some((x) => x.id === "CHOSEN_MAGE" && !fired.includes(x.uid));
      if (!g.over && more && rmz(p).some((c) => c.star === "trash")) {
        g.pending = { kind: "myMon", hint: pending.hint, hintJa: pending.hintJa, reason: "chosenMage", allowCancel: true, data: { fired } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
  } else if (pending.kind === "seek") {
    const i = p.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) { p.hand.push(p.deck.splice(i, 1)[0]); shuffle(g, p.deck); ctx.log(`<span class="t">${p.name}</span> 시크 → 1장 서치`, `<span class="t">${p.name}</span> シーク → 1枚サーチ`); }
  } else if (pending.kind === "recall") {
    if (pending.reason === "rogueTrap") { // 선택받은 도적(v36): 덱·묘지의 함정 1장을 코스트 없이 세트
      const di = p.deck.findIndex((c) => c.uid === uid && c.t === "trap");
      const gi = p.discard.findIndex((c) => c.uid === uid && c.t === "trap");
      const c = di >= 0 ? p.deck.splice(di, 1)[0] : gi >= 0 ? p.discard.splice(gi, 1)[0] : null;
      if (!c) { g.pending = pending; return; }
      if (di >= 0) shuffle(g, p.deck);
      const set: TrapSet = { card: c };
      if (c.react === "doomsday") set.cnt = 3;
      p.traps.push(set);
      ctx.log(`<span class="t">${p.name}</span> 선택받은 도적 → 함정을 세트 (정체는 비공개)`, `<span class="t">${p.name}</span> 選ばれし盗賊 → トラップをセット (正体は非公開)`);
      ctx.ev.push({ type: "trapSet", player: side(g, p) });
      return;
    }
    if (pending.reason === "recall" && d.exclude && uid === d.exclude) return; // 리콜 카드 자신은 회수 대상이 아니다
    const i = p.discard.findIndex((c) => c.uid === uid);
    if (i >= 0) {
      if (pending.reason === "exilePick") {
        const c = p.discard.splice(i, 1)[0];
        rmz(p).push(c);
        const n = ctx.drawN(p, 1);
        ctx.log(`<span class="t">${p.name}</span> ${cn(c)} 게임에서 제외 + ${n}장 드로우`, `<span class="t">${p.name}</span> ${cn(c)} をゲームから除外 + ${n}枚ドロー`);
      } else {
        p.hand.push(p.discard.splice(i, 1)[0]);
        ctx.log(`<span class="t">${p.name}</span> 리콜 → 1장 회수`, `<span class="t">${p.name}</span> リコール → 1枚回収`);
      }
    }
  } else if (pending.kind === "purge") {
    let c: CardInst | undefined;
    const zone = d.zone as string | undefined; // "discard" = 묘지만 · "hand" = 패만(리프레시) · 기본 = 덱+묘지
    const discOnly = zone === "discard";
    const handOnly = zone === "hand";
    if (handOnly) { const hi = p.hand.findIndex((x) => x.uid === uid); if (hi >= 0) c = p.hand.splice(hi, 1)[0]; }
    else {
      const di = discOnly ? -1 : p.deck.findIndex((x) => x.uid === uid);
      if (di >= 0) c = p.deck.splice(di, 1)[0];
      else { const gi = p.discard.findIndex((x) => x.uid === uid); if (gi >= 0) c = p.discard.splice(gi, 1)[0]; }
    }
    if (c) {
      rmz(p).push(c);
      ctx.log(`<span class="t">${p.name}</span> ${cn(c)} 게임에서 제외`, `<span class="t">${p.name}</span> ${cn(c)} をゲームから除外`);
      const remaining = ((d.val as number) ?? 1) - 1;
      const poolLeft = handOnly ? p.hand.length : discOnly ? p.discard.length : p.deck.length + p.discard.length;
      if (remaining > 0 && poolLeft > 0) {
        g.pending = { kind: "purge", hint: pending.hint, hintJa: pending.hintJa, reason: pending.reason, allowCancel: true, data: { val: remaining, zone: d.zone } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      } else if (pending.reason === "trialExile") {
        offerChosenMage(g, ctx); // 시련 제외가 소진되면 같은 턴의 마법사 발동 기회 제공
      }
    }
  } else if (pending.kind === "oppRmz") {
    // 흑룡: 상대의 제외존 카드를 상대 묘지로 되돌린다 (덱 재오염)
    const list = rmz(o);
    const i = list.findIndex((x) => x.uid === uid);
    if (i >= 0) {
      const c = list.splice(i, 1)[0];
      if (pending.reason === "jailer") { rmz(p).push(c); ctx.log(`<span class="t">${p.name}</span> ${cn(c)} 을(를) 자신의 제외존으로 유폐`, `<span class="t">${p.name}</span> ${cn(c)} を自分の除外ゾーンに幽閉`); }
      else { o.discard.push(c); ctx.log(`<span class="t">${p.name}</span> ${cn(c)} 을(를) 상대 묘지로 되돌림`, `<span class="t">${p.name}</span> ${cn(c)} を相手の墓地に戻す`); }
      const remaining = ((d.val as number) ?? 1) - 1;
      if (remaining > 0 && list.length > 0) {
        g.pending = { kind: "oppRmz", hint: pending.hint, hintJa: pending.hintJa, reason: pending.reason, allowCancel: true, data: { val: remaining } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    }
  } else if (pending.kind === "oppBoard") {
    // 필드 카드(몬스터/세트 함정/영구마법) 파괴 선택.
    // noMon(블러드 샤워): 함정·영구마법만 · trapOnly(파훼술류): 함정만 · enchOnly(장치해제류): 영구마법만.
    // anySide(v21): 자신 필드의 카드도 대상으로 고를 수 있다.
    const noMon = !!d.noMon;
    const wantMon = !noMon && !d.trapOnly && !d.enchOnly;
    const wantTrap = !d.enchOnly;
    const wantEnch = !d.trapOnly;
    const sides = d.anySide ? [o, p] : [o];
    let done = false;
    for (const owner of sides) {
      if (wantMon) {
        const tm = owner.field.find((x) => x.uid === uid);
        if (tm) {
          // 아우라(ward)는 "상대의" 효과만 막는다 — 자기 카드는 자기 효과로 파괴 가능
          if (owner !== p && hasPassive(tm, "aura")) { g.pending = pending; ctx.log(`  └ <span class="dmg">${cn(tm)} 은(는) 효과의 대상이 되지 않는다</span>`, `  └ <span class="dmg">${cn(tm)} は効果の対象にならない</span>`); return; }
          ctx.log(`<span class="t">${p.name}</span> → ${cn(tm)} 파괴`, `<span class="t">${p.name}</span> → ${cn(tm)} 破壊`);
          ctx.destroyMonster(owner, tm);
          done = true; break;
        }
      }
      if (wantTrap) {
        const ti = owner.traps.findIndex((t2) => t2.card.uid === uid);
        if (ti >= 0) {
          if (owner !== p && trySnare(g, ctx, owner)) { done = true; break; } // 덫 속의 덫: 상대의 파괴만 무효
          const tr = owner.traps.splice(ti, 1)[0];
          owner.discard.push(tr.card);
          ctx.log(`<span class="t">${p.name}</span> → 세트 함정 파괴 (정체: ${cn(tr.card)})`, `<span class="t">${p.name}</span> → セットトラップ破壊 (正体: ${cn(tr.card)})`);
          // 봉인의 실밥(v34): 🎲 5+면 파괴한 함정을 게임에서 제외
          if ((d as { sourceId?: string }).sourceId === "SX2") {
            const { rolls: sxr } = diceRoll(g, ctx.ev, side(g, p), 1, 5);
            if (sxr[0] >= 5) {
              const di2 = owner.discard.lastIndexOf(tr.card);
              if (di2 >= 0) { owner.discard.splice(di2, 1); rmz(owner).push(tr.card); }
              ctx.log(`  └ 🎲 ${sxr[0]} → ${cn(tr.card)} 게임에서 제외`, `  └ 🎲 ${sxr[0]} → ${cn(tr.card)} をゲームから除外`);
            } else ctx.log(`  └ 🎲 ${sxr[0]} — 제외 실패`, `  └ 🎲 ${sxr[0]} — 除外失敗`);
          }
          done = true; break;
        }
      }
      if (wantEnch) {
        const ei = owner.enchants.findIndex((e2) => e2.card.uid === uid);
        if (ei >= 0) {
          const en = owner.enchants.splice(ei, 1)[0];
          ctx.log(`<span class="t">${p.name}</span> → 영구마법 ${cn(en.card)} 파괴`, `<span class="t">${p.name}</span> → 永続魔法 ${cn(en.card)} 破壊`);
          binEnch(g, ctx, owner, en.card);
          done = true; break;
        }
      }
    }
    if (done) {
      const remaining = ((d.val as number) ?? 1) - 1;
      const left = sides.reduce((n, s) => n
        + (wantMon ? s.field.length : 0)
        + (wantTrap ? s.traps.length : 0)
        + (wantEnch ? s.enchants.length : 0), 0);
      if (remaining > 0 && left > 0) {
        g.pending = { kind: "oppBoard", hint: pending.hint, hintJa: pending.hintJa, reason: pending.reason, allowCancel: true, data: { val: remaining, ...(noMon ? { noMon: true } : {}), ...(d.trapOnly ? { trapOnly: true } : {}), ...(d.enchOnly ? { enchOnly: true } : {}), ...(d.anySide ? { anySide: true } : {}) } };
        ctx.ev.push({ type: "needTarget", pending: g.pending });
      }
    } else {
      g.pending = pending; // 무효 대상(noMon 중 몬스터 등) → 선택권 소모 없이 재선택
    }
  } else if (pending.kind === "giantShop") {
    const ids0 = (pending.data?.ids as string[] | undefined) ?? [];
    // 전설의 도박꾼(v37): 예측 → 주사위 3개 → 적중 시 효과 선택
    if (pending.reason === "gamblerGuess") {
      const guess = Number(uid);
      if (!(guess >= 1 && guess <= 6)) { g.pending = pending; return; }
      const gm = p.field.find((x) => x.uid === (pending.data?.uid as string));
      const { rolls: lgRolls } = diceRoll(g, ctx.ev, side(g, p), 3);
      const hit = lgRolls.includes(guess);
      ctx.log(`<span class="t">${gm ? cn(gm) : "전설의 도박꾼"}</span> 예측 ${guess} → 🎲 [${lgRolls.join(", ")}] ${hit ? '<span class="good">적중!</span>' : "빗나감"}`, `<span class="t">${gm ? cn(gm) : "伝説のギャンブラー"}</span> 予測 ${guess} → 🎲 [${lgRolls.join(", ")}] ${hit ? '<span class="good">的中！</span>' : "外れ"}`);
      if (!hit) return;
      if (deckComp(p).some((c) => c.id === "GAMBLER")) { ctx.log(`  └ <span class="good">덱에 도박꾼 — 모든 효과 발동!</span>`, `  └ <span class="good">デッキにギャンブラー — 全効果発動！</span>`); gamblerEffect(g, ctx, p, "1"); gamblerEffect(g, ctx, p, "2"); gamblerEffect(g, ctx, p, "3"); return; }
      g.pending = { kind: "giantShop", reason: "gamblerPick", allowCancel: false, hint: "전설의 도박꾼 — 효과 선택", hintJa: "伝説のギャンブラー — 効果を選択",
        data: { ids: ["1", "2", "3"], free: true, opts: [{ id: "1", ko: "① 최대 마나 +4", ja: "① 最大マナ+4", en: "① Max mana +4" }, { id: "2", ko: "② 최대 체력 +35", ja: "② 最大体力+35", en: "② Max HP +35" }, { id: "3", ko: "③ 상대 필드 카드 2장 파괴", ja: "③ 相手の場のカード2枚破壊", en: "③ Destroy 2 enemy cards" }] } };
      ctx.ev.push({ type: "needTarget", pending: g.pending });
      return;
    }
    if (pending.reason === "gamblerPick") {
      if (!uid || !["1", "2", "3"].includes(uid)) { g.pending = pending; return; }
      gamblerEffect(g, ctx, p, uid);
      return;
    }
    // 나이트로드의 비기(v38): 패시브 부여 + 암살자 2체 공격력 +3
    if (pending.reason === "nlGrant") {
      if (!uid || !["trapmaster", "ambush", "evade"].includes(uid)) { g.pending = pending; return; }
      const tm = p.field.find((x) => x.uid === (pending.data?.uid as string));
      if (tm) {
        if (uid === "ambush") tm.directOnly = true; else if (!hasPassive(tm, uid)) (tm.passivesG ??= []).push(uid);
        ctx.log(`<span class="t">${p.name}</span> 나이트로드의 비기 → ${cn(tm)} 이(가) '${PASSIVES[uid]?.ko.name ?? uid}'을(를) 얻는다`, `<span class="t">${p.name}</span> ナイトロードの秘技 → ${cn(tm)} が「${PASSIVES[uid]?.ja.name ?? uid}」を得る`);
      }
      const ass = [...p.field].filter((x) => isAssassinCard(x)).sort((a2, b2) => effAtk(p, b2) - effAtk(p, a2)).slice(0, 2);
      for (const a3 of ass) { a3.atkMod = (a3.atkMod || 0) + 3; ctx.log(`  └ ${cn(a3)} 공격력 +3(지속)`, `  └ ${cn(a3)} 攻撃力+3(持続)`); }
      return;
    }
    // 드래곤(v37): 융합 결과 선택
    if (pending.reason === "dragonFuse") {
      if (!uid || !ids0.includes(uid)) { g.pending = pending; return; }
      const dd = pending.data as { dragonUid: string; soldierUid: string; knightUid: string };
      doDragonFuse(g, ctx, p, dd.dragonUid, uid === "DRAGON_RIDER" ? dd.soldierUid : dd.knightUid, uid);
      return;
    }
    // 영토 하사(v37): 코스트 3 이하 귀족 카드 1장을 소환 (무료)
    if (pending.reason === "landGrant") {
      if (!uid || !ids0.includes(uid) || !DB[uid]) { g.pending = pending; return; }
      spawnToken(g, ctx, p, uid);
      ctx.log(`<span class="t">${p.name}</span> 영토 하사 → ${cn(DB[uid])} 소환`, `<span class="t">${p.name}</span> 領土付与 → ${cn(DB[uid])} 召喚`);
      return;
    }
    // 고대 문명(civChoice): 알 1장을 무료로 패에 넣는다
    // 윤회(v41b samsaraPick): 직전 턴에 파괴된 몬스터 1체를 자신 필드에 소환
    if (pending.reason === "samsaraPick") {
      if (!uid || !ids0.includes(uid) || !DB[uid]) { g.pending = pending; return; }
      if (p.field.length >= FIELD_MAX) { ctx.log("  └ 몬스터 존이 가득 차 소환 실패", "  └ モンスターゾーンが満杯で召喚失敗"); return; }
      const gi = p.discard.findIndex((c) => c.id === uid);
      if (gi >= 0) p.discard.splice(gi, 1); // 묘지의 그 카드를 필드로 (없으면 토큰)
      ctx.log(`<span class="t">${p.name}</span> 윤회 → ${cn(DB[uid])} 소환`, `<span class="t">${p.name}</span> 輪廻 → ${cn(DB[uid])} 召喚`);
      spawnToken(g, ctx, p, uid, gi >= 0);
      return;
    }
    // 콜로세움(v41 colosseumPick): '선택받은' 몬스터 1체를 자신 필드에 소환 (취소 가능)
    if (pending.reason === "colosseumPick") {
      if (uid === null) { ctx.log("  └ 콜로세움: 소환 취소", "  └ コロシアム: 召喚をキャンセル"); return; }
      if (!ids0.includes(uid) || !DB[uid]) { g.pending = pending; return; }
      if (p.field.length >= FIELD_MAX) { ctx.log("  └ 몬스터 존이 가득 차 소환 실패", "  └ モンスターゾーンが満杯で召喚失敗"); return; }
      ctx.log(`<span class="t">${p.name}</span> 콜로세움 → ${cn(DB[uid])} 소환`, `<span class="t">${p.name}</span> コロシアム → ${cn(DB[uid])} 召喚`);
      spawnToken(g, ctx, p, uid);
      return;
    }
    if (pending.reason === "civChoice") {
      if (uid && ids0.includes(uid) && DB[uid]) {
        const egg = inst(g, uid);
        p.hand.push(egg);
        ctx.log(`<span class="t">${p.name}</span> 고대 문명 → ${cn(egg)} 을(를) 패에 넣는다`, `<span class="t">${p.name}</span> 古代文明 → ${cn(egg)} を手札に加える`);
      } else { g.pending = pending; return; } // 알 2종 외 선택 불가 — 다시 고르게
      return;
    }
    // 은월포(v34): 상대 덱에서 지정 카드 1장 제외 (uid = 카드 ID)
    if (pending.reason === "exileOppDeck") {
      if (uid && ids0.includes(uid)) {
        const di3 = o.deck.findIndex((c) => c.id === uid);
        if (di3 >= 0) {
          const exd = o.deck.splice(di3, 1)[0];
          rmz(o).push(exd);
          ctx.log(`<span class="t">${p.name}</span> 은월포 → 상대 덱의 ${cn(exd)} 게임에서 제외`, `<span class="t">${p.name}</span> 銀月砲 → 相手のデッキの ${cn(exd)} をゲームから除外`);
        }
      }
      return;
    }
    // 시초의 거인: 코스트 5+ 시초 카드를 마나 지불하고 구매 (uid = 카드 ID)
    const ids = ids0;
    if (uid && ids.includes(uid) && DB[uid]) {
      const cost = DB[uid].cost;
      if (p.mana >= cost) {
        p.mana -= cost;
        p.boughtCount = (p.boughtCount || 0) + 1;
        const bought = inst(g, uid);
        p.discard.push(bought);
        const shopKo = pending.reason === "darkMarket" ? "암상인" : pending.reason === "chronicler" ? "기록자" : pending.reason === "nightMarket" ? "나이트 마켓" : "거인의 교역";
        const shopJa = pending.reason === "darkMarket" ? "闇商人" : pending.reason === "chronicler" ? "記録者" : pending.reason === "nightMarket" ? "ナイトマーケット" : "巨人の交易";
        ctx.log(`<span class="t">${p.name}</span> ${shopKo} → ${cn(bought)} 구매 (마나 ${cost})`, `<span class="t">${p.name}</span> ${shopJa} → ${cn(bought)} 購入 (マナ${cost})`);
      } else {
        ctx.log("  └ 마나가 부족해 구매하지 못함", "  └ マナが足りず購入できない");
      }
    }
  } else if (pending.kind === "reroll") {
    // 운명의 수레바퀴: uid "re" = 재굴림, null/기타 = 결과 유지
    const snap = g._wheelSnap;
    g._wheelSnap = null;
    if (uid === "re" && snap && snap.state) {
      ctx.log(`<span class="dmg">운명의 수레바퀴!</span> 결과를 되감고 다시 굴린다…`, `<span class="dmg">運命の輪！</span> 結果を巻き戻して振り直す…`);
      const s = structuredClone(snap.state) as GameState;
      for (const k of Object.keys(g)) if (!(k in (s as unknown as Record<string, unknown>))) delete (g as unknown as Record<string, unknown>)[k];
      Object.assign(g, s);
      g._wheelSnap = null;
      g.rng = (g.rng + 0x9e3779b9) >>> 0; // 시드 점프 → 새 결과
      g.players[g.cur].wheelUsed = true;  // 매턴 1회
      playFromHand(g, ctx, snap.idx);
    }
  }
}

// ============================================================
// main reducer
// ============================================================
export function reduce(prev: GameState, action: Action): ReduceResult {
  // 유령(GHOST) 트리거용: 액션 전 양측 최대 마나/체력 기록 → 액션 후 diff 검사
  const pre = prev.players.map((pl) => ({ mm: pl.maxMana, mh: pl.maxHp, rm: (pl.removed ?? []).length, cull: cullExiled(pl) }));
  const res = reduceCore(prev, action);
  const g2 = res.state;
  // v41: 선별자 — 이 액션으로 컬이 제외될 때마다(장당) 선별자 1체당 컬 1장 추가 제외 (추가 제외는 다시 발동하지 않는다)
  //      차원의 균열 — 이 액션으로 자신의 제외존에 카드가 추가될 때마다(장당) 균열 1장당 최대 체력 +5 (선별자의 추가 제외 포함)
  if (!g2.over) {
    const ctxX = makeCtx(g2, res.events as GameEvent[]);
    for (const sx of [0, 1] as Side[]) {
      const plx = g2.players[sx];
      const sorters = plx.field.filter((m) => m.aura === "sorter").length;
      const gained = cullExiled(plx) - pre[sx].cull;
      if (sorters > 0 && gained > 0) {
        const extra = exileCulls(plx, gained * sorters);
        if (extra > 0) ctxX.log(`  └ <span class="t">선별자</span>: 컬 ${extra}장 추가 제외 (누적 ${cullExiled(plx)})`, `  └ <span class="t">選別者</span>: カル${extra}枚を追加で除外 (累計${cullExiled(plx)})`);
      }
      const rifts = plx.enchants.filter((e) => e.card.ench === "rift").length;
      const added = (plx.removed ?? []).length - pre[sx].rm;
      if (rifts > 0 && added > 0) {
        const gain = 5 * added * rifts;
        plx.maxHp += gain;
        ctxX.log(`  └ <span class="t">차원의 균열</span>: 제외존에 ${added}장 추가 → 최대 체력 +${gain} (${plx.maxHp})`, `  └ <span class="t">次元の裂け目</span>: 除外ゾーンに${added}枚追加 → 最大体力+${gain} (${plx.maxHp})`);
      }
    }
  }
  if (!g2.over) {
    const ctx2 = makeCtx(g2, res.events as GameEvent[]);
    for (const s of [0, 1] as Side[]) {
      const owner = g2.players[s];
      const ghosts = owner.field.filter((m) => m.id === "GHOST").length;
      if (!ghosts || g2.over) continue;
      let hits = 0;
      if (g2.players[1 - s].maxMana > pre[1 - s].mm) hits++;
      if (g2.players[1 - s].maxHp > pre[1 - s].mh) hits++;
      if (hits > 0) {
        const dmg = 2 * hits * ghosts; // v19: 3 → 2
        ctx2.log(`  └ <span class="dmg">유령의 원한</span>: 상대의 성장에 ${owner.name} 이(가) ${dmg} 데미지`, `  └ <span class="dmg">幽霊の怨念</span>: 相手の成長に ${owner.name} が ${dmg} ダメージ`);
        ctx2.dealDamage(owner, dmg, "유령", "幽霊");
      }
    }
  }
  // 카지노(v34): 다이스 카운터 12개마다 카지노 주사위 발동
  if (!g2.over) {
    const ctx3 = makeCtx(g2, res.events as GameEvent[]);
    for (const s3 of [0, 1] as Side[]) {
      const owner = g2.players[s3];
      for (const cas of [...owner.field]) {
        if (cas.aura !== "casino") continue;
        while ((cas.gcount || 0) >= 12 && !g2.over && owner.field.some((x) => x.uid === cas.uid)) {
          cas.gcount = (cas.gcount || 0) - 12;
          const { rolls: cr } = diceRollCasino(g2, res.events as GameEvent[], s3);
          const opp3 = g2.players[1 - s3];
          ctx3.log(`<span class="t">${cas.name}</span> <span class="good">카지노 주사위!</span> 🎲 ${cr[0]}`, `<span class="t">${cas.name}</span> <span class="good">カジノダイス！</span> 🎲 ${cr[0]}`);
          // v36: ①② 자신 30 / ③④ 상대 30 / ⑤ 상대 40 / ⑥ 상대 최대 마나 3
          if (cr[0] <= 2) ctx3.dealDamage(owner, 30, cas.name, cas.name);
          else if (cr[0] <= 4) ctx3.dealDamage(opp3, 30, cas.name, cas.name);
          else if (cr[0] === 5) ctx3.dealDamage(opp3, 40, cas.name, cas.name);
          else { opp3.maxMana = 3; ctx3.log(`  └ 상대 최대 마나가 3이 된다`, `  └ 相手の最大マナが3になる`); }
        }
      }
    }
  }
  // 세계수(v36): 자신의 최대 체력이 늘어날 때마다 세계수 카운터 +1
  for (const s5 of [0, 1] as Side[]) {
    const pl5 = g2.players[s5];
    if (pl5.maxHp > pre[s5].mh) for (const wt of pl5.field) if (wt.id === "WORLD_TREE") wt.gcount = (wt.gcount || 0) + 1;
  }
  // LIFE_CYCLE(v34): 이 액션으로 최대 체력이 늘었다면 🎲 4+로 최대 마나 +1
  if (!g2.over) {
    const ctx4 = makeCtx(g2, res.events as GameEvent[]);
    for (const s4 of [0, 1] as Side[]) {
      const pl4 = g2.players[s4];
      if (pl4.maxHp > pre[s4].mh && pl4.enchants.some((e) => e.card.ench === "healMana")) {
        const { rolls: lcr } = diceRoll(g2, res.events as GameEvent[], s4, 1, 4);
        if (lcr[0] >= 4) { pl4.maxMana += 1; ctx4.log(`  └ 생명의 순환: 최대 마나 +1 (${pl4.maxMana})`, `  └ 生命の循環: 最大マナ+1 (${pl4.maxMana})`); }
      }
    }
  }
  sweepRelics(g2, makeCtx(g2, res.events as GameEvent[])); // v40: 신기는 제외되지 않는다
  normalizeManaCaps(g2);
  rememberPublicCards(g2);
  return res;
}

function reduceCore(prev: GameState, action: Action): ReduceResult {
  const g: GameState = structuredClone(prev);
  const ev: GameEvent[] = [];
  const ctx = makeCtx(g, ev);
  // 운명의 수레바퀴 스냅샷은 재굴림 응답 대기 중에만 유효 — 그 외 액션에선 정리
  if (!g.pending || g.pending.kind !== "reroll") g._wheelSnap = null;

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
      if (card && freeBuyBlocked(p, card)) {
        ctx.log(`  └ <span class="dmg">0코스트 구매는 턴당 ${FREE_BUY_MAX}장까지</span>`, `  └ <span class="dmg">0コスト購入は1ターン${FREE_BUY_MAX}枚まで</span>`);
        break;
      }
      if (card && p.mana >= bc) {
        if (bc === 0) p.freeBuysTurn = (p.freeBuysTurn ?? 0) + 1;
        const bought = inst(g, card.id);
        p.mana -= bc; p.discard.push(bought); p.boughtCount++; p.taxFlag = true; p.buys[card.id] = (p.buys[card.id] || 0) + 1; (p.buysTurn ??= {})[card.id] = (p.buysTurn[card.id] || 0) + 1;
        ctx.log(`<span class="t">${p.name}</span> 고정 마켓 ${cn(card)} 구매 (${bc}) <span class="muted">[묘지로]</span>`, `<span class="t">${p.name}</span> 固定マーケット ${cn(card)} 購入 (${bc}) <span class="muted">[墓地へ]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "market", i: action.i, id: card.id });
        consumeMarketStock(g, ctx, action.i); // v40: 재고 -1, 소진 시 슬롯 교체
        tryToll(g, ctx, p, bought); // 통행세: 구매 반응
      }
      break;
    }
    case "buySupply": {
      const card = p.supply[action.i];
      const bc = card ? buyCost(p, card) : 0;
      if (card && freeBuyBlocked(p, card)) {
        ctx.log(`  └ <span class="dmg">0코스트 구매는 턴당 ${FREE_BUY_MAX}장까지</span>`, `  └ <span class="dmg">0コスト購入は1ターン${FREE_BUY_MAX}枚まで</span>`);
        break;
      }
      if (card && p.mana >= bc) {
        if (bc === 0) p.freeBuysTurn = (p.freeBuysTurn ?? 0) + 1;
        const bought = inst(g, card.id);
        p.mana -= bc; p.discard.push(bought); p.supply[action.i] = null; p.boughtCount++; p.taxFlag = true; p.buys[card.id] = (p.buys[card.id] || 0) + 1; (p.buysTurn ??= {})[card.id] = (p.buysTurn[card.id] || 0) + 1;
        ctx.log(`<span class="t">${p.name}</span> 제시 마켓 ${cn(card)} 구매 (${bc}) <span class="muted">[묘지로]</span>`, `<span class="t">${p.name}</span> 提示マーケット ${cn(card)} 購入 (${bc}) <span class="muted">[墓地へ]</span>`);
        ev.push({ type: "buy", player: side(g, p), from: "supply", i: action.i, id: card.id });
        // 엘프의 쉼터 — v25: 제시 마켓에서 '세계수' 카드를 구매하면 자신 최대 체력 +10
        if ((card.name || "").includes("세계수") && p.enchants.some((e) => e.card.ench === "elfHaven")) {
          p.maxHp += 10;
          ctx.log(`  └ 엘프의 쉼터: 최대 체력 +10 (${p.maxHp})`, `  └ エルフの憩い場: 最大体力+10 (${p.maxHp})`);
        }
        tryToll(g, ctx, p, bought); // 통행세: 구매 반응
      }
      break;
    }
    case "refresh":
      if (p.refreshBlockTurn) { ctx.log(`  └ <span class="dmg">마켓 크래시</span>: 이번 턴 제시를 갱신할 수 없다`, `  └ <span class="dmg">マーケットクラッシュ</span>: このターン提示を更新できない`); break; }
      if ((p.refreshTokens || 0) > 0) { p.refreshTokens = (p.refreshTokens || 1) - 1; rollSupply(g, p); ctx.log(`<span class="t">${p.name}</span> 제시 갱신 (제시 카운터 소모 · 남은 ${p.refreshTokens})`, `<span class="t">${p.name}</span> 提示更新 (提示カウンター消費 · 残り${p.refreshTokens})`); }
      else if (p.mana >= 1) { p.mana -= 1; rollSupply(g, p); ctx.log(`<span class="t">${p.name}</span> 제시 갱신 (1 마나)`, `<span class="t">${p.name}</span> 提示更新 (1マナ)`); }
      break;
    case "attack": {
      if (noAttackActive(g)) { ctx.log(`  └ <span class="dmg">평화 협정</span>: 공격 불가`, `  └ <span class="dmg">平和協定</span>: 攻撃不可`); break; }
      const m = p.field.find((x) => x.uid === action.uid);
      if (!m || m.exhausted) break;
      if (m.hatch != null) { ctx.log(`  └ <span class="dmg">알은 공격할 수 없습니다</span>`, `  └ <span class="dmg">卵は攻撃できません</span>`); break; }
      if (glassBanActive(g) && Math.abs(effAtk(p, m) - effDef(p, m)) >= 4) { ctx.log(`  └ <span class="dmg">전략 변경</span>: 공격력과 체력의 차가 4 이상이면 공격 불가`, `  └ <span class="dmg">戦略変更</span>: 攻撃力と体力の差が4以上なら攻撃不可`); break; }
      const o = g.players[1 - g.cur];
      // 몰락 귀족(lowAtkBan): 코스트 2 이하 몬스터 공격 봉쇄
      if (o.field.some((x) => x.aura === "lowAtkBan") && (m.cost ?? 0) <= 2) { ctx.log(`  └ <span class="dmg">몰락 귀족</span>: 코스트 2 이하는 공격할 수 없다`, `  └ <span class="dmg">没落貴族</span>: コスト2以下は攻撃できない`); break; }
      // 폐문(v37 gateShut): 이번 턴 코스트 4 이상 몬스터 공격 봉쇄
      if (p.noHighAtkTurn && (m.cost ?? 0) >= 4) { ctx.log(`  └ <span class="dmg">폐문</span>: 이번 턴 코스트 4 이상 몬스터는 공격할 수 없다`, `  └ <span class="dmg">閉門</span>: このターン コスト4以上のモンスターは攻撃できない`); break; }
      // 위엄(majesty): 상대 필드에 위엄 몬스터가 있으면 소환한 턴의 몬스터로 공격 불가
      if (m.summonedTurn === g.turn && o.field.some((x) => hasPassive(x, "majesty"))) {
        ctx.log(`  └ <span class="dmg">위엄</span>: 소환된 턴에는 공격할 수 없다`, `  └ <span class="dmg">威厳</span>: 召喚されたターンには攻撃できない`);
        break;
      }
      // 천궁의 폐문(gateClose): 이번 턴 직접 공격 봉쇄
      if (p.noDirectTurn && (o.field.length === 0 || m.directOnly)) { ctx.log(`  └ <span class="dmg">천궁의 폐문</span>: 이번 턴 직접 공격 불가`, `  └ <span class="dmg">天宮の閉門</span>: このターン直接攻撃不可`); break; }
      // 귀족 영주(eliteGuard): 필드에 있는 한 직접 공격 불가
      if ((o.field.length === 0 || m.directOnly) && o.field.some((x) => x.aura === "eliteGuard")) { ctx.log(`  └ <span class="dmg">귀족 영주</span>: 직접 공격 불가`, `  └ <span class="dmg">貴族領主</span>: 直接攻撃不可`); break; }
      // 검귀(v36 berserk): 대상을 고를 수 없다 — 양측 필드의 몬스터(자신 제외) 중 무작위, 없으면 직접 공격
      if (m.attackFx === "berserk") {
        const pool: Array<{ own: boolean; uid: string }> = [
          ...o.field.filter((x) => !(x.aura === "eliteGuard" && (m.cost ?? 0) <= 6)).map((x) => ({ own: false, uid: x.uid })),
          ...p.field.filter((x) => x.uid !== m.uid).map((x) => ({ own: true, uid: x.uid })),
        ];
        if (!pool.length) {
          if (p.noDirectTurn || o.field.some((x) => x.aura === "eliteGuard")) { ctx.log(`  └ 직접 공격 불가`, `  └ 直接攻撃不可`); break; }
          ev.push({ type: "attack", player: side(g, p), uid: m.uid, targetUid: null }); resolveAttackCore(g, ctx, m, null); break;
        }
        const pick = pool[randInt(g, pool.length)];
        ctx.log(`<span class="t">${p.name}</span> ${cn(m)} 광란 — 대상 무작위`, `<span class="t">${p.name}</span> ${cn(m)} 狂乱 — 対象ランダム`);
        if (pick.own) { const tgt = p.field.find((x) => x.uid === pick.uid)!; resolveFriendlyFire(g, ctx, m, tgt); }
        else { ev.push({ type: "attack", player: side(g, p), uid: m.uid, targetUid: pick.uid }); resolveAttackCore(g, ctx, m, pick.uid); }
        break;
      }
      // 암살자(directOnly): always attacks the opponent player directly, never a monster
      if (o.field.length === 0 || m.directOnly) { ev.push({ type: "attack", player: side(g, p), uid: m.uid, targetUid: null }); resolveAttackCore(g, ctx, m, null); }
      else { g.pending = { kind: "oppMon", hint: "공격할 적 몬스터 선택", hintJa: "攻撃する敵モンスターを選択", reason: "attack", allowCancel: true, data: { attackerUid: m.uid } }; ev.push({ type: "needTarget", pending: g.pending }); }
      break;
    }
    case "reorder": {
      // Rearrange own field monsters — purely cosmetic (attacks target by uid),
      // so no log/events; both clients just re-render in the new order.
      const { from, to } = action;
      const f = p.field;
      if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < f.length && to >= 0 && to < f.length && from !== to) {
        const [m] = f.splice(from, 1);
        f.splice(to, 0, m);
      }
      break;
    }
    case "endTurn": endTurn(g, ctx); break;
  }
  return { state: g, events: ev };
}
