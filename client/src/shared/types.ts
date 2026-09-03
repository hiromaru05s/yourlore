// ============================================================
// LORE — shared game types (no DOM, no platform deps).
// Imported by both the client UI and the authoritative server.
// ============================================================

export type CardType = "mon" | "spell" | "trap" | "starter";
export type Side = 0 | 1;

export interface CardDef {
  id: string;
  t: CardType;
  cost: number;
  name: string;
  text: string;
  atk?: number;
  def?: number;
  onSummon?: string; // monster summon effect key
  aura?: string; // persistent passive
  condAtk?: string; // conditional attack bonus
  act?: string; // spell action key
  react?: string; // trap reaction key
  star?: string; // starter kind: trash | chest | mana
  val?: number; // generic effect magnitude (also enchant duration)
  val2?: number; // secondary magnitude (e.g. heal+draw, atk+def buff, enchant amount)
  play?: number; // play/cast cost (defaults to `cost`); buy cost stays `cost`
  ench?: string; // persistent field-enchantment key (spell stays on field)
  tribe?: string; // tribe key (고독/고귀/포식/귀족) for synergy monsters
  turnFx?: string; // per-turn effect while on field (fires on owner's turn start)
  attackFx?: string; // effect that fires whenever this monster attacks
  mult?: number; // attacks allowed per turn (default 1)
  directOnly?: boolean; // can ONLY attack the opponent player directly (never monsters) — 암살자
  summonReq?: string; // summon precondition key (checked before summoning) — 암살자 상급/특급
  cap?: number; // nullspell trap: only counters spells with play cost <= cap (undefined = any)
  lockSpell?: boolean; // nullspell trap: caster also cannot cast spells for the rest of this turn
  hatchTurns?: number; // 알(egg): hatch counter — decrements on EVERY turn start (both players)
  hatchDur?: number; // 알(egg): durability — enemy monster attacks consume 1; 0 = egg destroyed
  hatchInto?: string[]; // 알(egg): card ids the egg can hatch into (random pick)
  evolveTo?: string; // 흡혈귀: card id summoned when the owner casts a 피의 마법 (once per card)
  noShop?: boolean; // 스타팅(덱 구성) 전용 — 고정/제시 마켓에 등장하지 않음
  exileOnDestroy?: boolean; // 영구마법: 파괴/제거 시 묘지 대신 게임에서 제외
  passive?: string[]; // 키워드 패시브 (cards.PASSIVES 키 — 기합/부패/위엄/도발/회피/공허/아우라 …)
  grantPassive?: string; // 마법(buffPerm): 강화 대상 몬스터에게 부여하는 패시브 키워드 (거암의 가호 → 도발)
  nameJa?: string; // Japanese name (falls back to name)
  textJa?: string; // Japanese effect text (falls back to text)
  nameEn?: string; // English name (falls back to name)
  textEn?: string; // English effect text (falls back to text)
}

export interface Enchant {
  card: CardInst;
  turns: number;
  bornTurn?: number; // 시전 시점의 g.turn — "N턴 경과 후" 류 효과의 기준 (혈귀술 만료 / 고대 문명)
  cnt?: number; // 범용 카운터 — 상회(마켓 카운터) / 양조(와인 카운터)
}

export interface CardInst extends CardDef {
  uid: string;
}

export interface FieldMon extends CardInst {
  exhausted: boolean;
  tempAtk: number; // temporary atk (cleared end of turn)
  atkMod: number; // permanent atk change
  defMod: number; // permanent def change
  summonedTurn: number;
  attacksUsed?: number; // attacks made this turn (for multi-attack monsters)
  token?: boolean; // conjured by an effect (not a real deck card) — exiled on death, never enters the deck cycle
  hatch?: number; // 알: remaining hatch counter (both players' turns tick it)
  dur?: number; // 알: remaining durability (enemy attacks consume 1 instead of combat)
  evolvedUsed?: boolean; // 흡혈귀: 진화(1회) 사용됨
  trickSwapped?: boolean; // 트릭룸: 공/방 반전 적용 중
  dmg?: number; // v24 HP-combat: accumulated damage taken (current HP = effDef - dmg); cleared when the card leaves the field
  gcount?: number; // 누적 카운트 (암살자 길드 / 뱀파이어 집사 흡혈 카운트)
  passivesG?: string[]; // 게임 중 부여된 패시브 (암기 제작→부패, 각인 비술→위엄)
  guts?: number; // 기합: 남은 기합 토큰 (전투 파괴를 1회 무효화)
  drained?: number; // drainMana 아우라가 실제로 깎은 상대 최대 마나 (사망 시 이만큼만 복원 — 바닥 클램프 비대칭 방지)
  decayCnt?: number; // 부패: 이 몬스터에 쌓인 부패 카운터 (3이면 파괴 + 주인 3뎀)
}

export interface TrapSet {
  card: CardInst;
  /** 다회용/시한 함정의 상태 카운터 — 정보상(남은 사용 횟수) · 심판의 카운트다운(남은 턴) */
  cnt?: number;
}

export interface ExileEntry {
  card: CardInst;
  turns: number;
}

export interface RevealedCard {
  uid: string;
  id: string;
}

export interface PlayerState {
  id: string; // user id (online) or "bot"/"local"
  name: string;
  isBot: boolean;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  manaPenalty: number;
  nextPenalty: number;
  deck: CardInst[];
  hand: CardInst[];
  discard: CardInst[];
  exile: ExileEntry[];
  field: FieldMon[];
  traps: TrapSet[];
  supply: (CardInst | null)[];
  boughtCount: number;
  taxFlag: boolean;
  enchants: Enchant[]; // active persistent spells (public, on field)
  tribesFired: string[]; // "<tribe>:<count>" synergy thresholds already used this game
  bonusDrawPerm: number; // permanent extra draw at turn start (귀족 3 synergy)
  bleed: number; // persistent damage taken at the start of each of this player's turns
  uses: Record<string, number>; // per-game count of how many times each card id has been played
  buys: Record<string, number>; // per-game count of how many times each card id has been bought (analytics)
  usesTurn: Record<string, number>; // per-turn count (reset each turn)
  playsTurn?: number; // total cards played this turn (monsters/spells/traps/starters)
  spellSealTurn?: boolean; // cannot cast spells for the rest of this turn (침묵의 심판)
  trapBlockNext?: boolean; // 협상: 다음 턴 함정 설치 불가 (예약)
  trapBlockTurn?: boolean; // 협상: 이번 턴 함정 설치 불가 (활성)
  freeBuysTurn?: number; // 이번 턴에 0코스트로 구매한 장수 (엘프의 쉼터 무한 구매 방지 — FREE_BUY_MAX)
  wheelUsed?: boolean; // 운명의 수레바퀴: 이번 턴 재굴림 사용됨
  brand?: number; // 낙인: 쌓인 낙인 카운터 — 1개당 매 턴 시작시 주사위 1개를 굴려 그 수만큼 자해
  bastionUses?: number; // 최후의 보루: 이 게임에서 발동한 횟수 (4회째부터 회복 없음)
  bastionDraw?: number; // 최후의 보루: 다음 자기 턴 시작시 추가 드로우 수 (1회성)
  noDirectTurn?: boolean; // 천궁의 폐문: 이번 턴 동안 직접 공격 불가 (공격측에 걸린다)
  spellsCastTurn?: number; // 이번 턴에 사용한 마법(t==="spell") 수 — 마나 역류 판정용
  drawPenaltyNext?: number; // 흉조(omen): 다음 턴 시작 드로우에서 차감할 장수 (1회성)
  soloCurse?: boolean; // 고독 4종 시너지: 매 턴 시작시 주사위 5+ 여야만 턴 진행 (걸린 쪽에 표시)
  spellCastCap?: number; // 마족 2/3종 시너지: 자기 턴당 마법 사용 한도 (2 → 0)
  manaCostMult?: number; // 마족 4종 시너지: 소모 마나 배수 (3)
  summonLockUntil?: number; // 고독1(은둔자): g.turn이 이 값 미만인 동안 몬스터 소환 불가
  manaRegain?: { at: number; amt: number }[]; // 마족1: 임시 최대 마나 차감의 복구 예약 (g.turn 기준)
  trapBlockTurns?: number; // 협상(v34): 남은 함정 설치 금지 턴 수 (자신 턴 시작마다 -1)
  lowSummonBanNext?: boolean; // 삼격의 불씨 ⑤⑥: 다음 턴 코스트 3 이하 소환 불가 (예약)
  lowSummonBanTurn?: boolean; // 〃 (활성)
  refreshBlockNext?: boolean; // 마켓 크래시(v34): 다음 턴 제시 갱신 불가 (예약)
  refreshBlockTurn?: boolean; // 〃 (활성)
  supplyShrink: number; // if >0, this player's next 제시 roll offers 2 cards instead of 3
  defendHeal: number; // heal this much whenever this player is attacked
  manaGainNext: number; // max mana to gain at the start of this player's next turn
  skipNext: boolean; // legacy: if true, this player's next turn is skipped
  skipTurns?: number; // queued turn skips; stacks when 시공간 조작 succeeds more than once
  revealedCards?: RevealedCard[]; // cards permanently known to the opponent this game (physical-card UID + card id)
  collection?: string[]; // redacted view only: public card ids the opponent may inspect
  removed?: CardInst[]; // cards permanently exiled from the game (public zone)
  botTune?: { minBuy?: number; minBuyEarly?: number; chestTurn?: number }; // per-archetype bot buy discipline (see bot.ts BOT_DECKS)
  refreshTokens?: number; // 렐릭 헌터(v36): 제시 마켓 무료 갱신 카운터 — 갱신 시 마나 대신 소모
  supplyHist?: { turn: number; ids: string[] }[]; // 기록자(v36): 최근 제시 마켓 이력 (갱신분 포함)
  onceUsed?: string[]; // 게임당 1회 효과의 사용 기록 (시초의 재판관 등)
}

export interface Pending {
  kind: "oppMon" | "myMon" | "seek" | "recall" | "purge" | "oppRmz" | "oppBoard" | "reroll" | "giantShop"; // oppRmz: 흑룡 · oppBoard: 신수 · reroll: 수레바퀴 · giantShop: 시초의 거인 교역
  hint: string;
  hintJa: string; // Japanese target hint
  reason: string; // which effect awaits input
  allowCancel: boolean;
  data?: Record<string, unknown>;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  cur: Side;
  turn: number;
  phase: "main" | "over";
  pending: Pending | null;
  over: boolean;
  winner: Side | null;
  market: CardInst[];
  dmgTally: [number, number];
  rng: number; // mutable PRNG state (mulberry32)
  uidSeq: number;
  mode: "bot" | "online";
  trickLeft?: number; // 트릭룸: 남은 턴 수 (매 턴 시작마다 -1, 0이면 반전 해제)
  /** 운명의 수레바퀴: 재굴림용 시전 직전 스냅샷 — redactFor가 양쪽 모두에서 제거(클라 불필요) */
  _wheelSnap?: { state: unknown; idx: number } | null;
  /** server-stamped remaining ms for the current turn (online only); lets a reconnecting
      client resume the turn clock instead of restarting it from full. */
  turnLeftMs?: number;
  /** server-stamped full turn length in ms (online only): ranked 50s / casual 90s.
      drives the timer ring's full-scale so it drains correctly regardless of mode. */
  turnTotalMs?: number;
  /** each side's equipped card-back sleeve id (online only), so a client can render the
      OPPONENT's card backs with their chosen sleeve. index = Side. null = default back. */
  sleeves?: [string | null, string | null];
}

// --- Actions: the only way to mutate a GameState ---
export type Action =
  | { type: "play"; idx: number }
  | { type: "buyMarket"; i: number }
  | { type: "buySupply"; i: number }
  | { type: "refresh" }
  | { type: "attack"; uid: string }
  | { type: "reorder"; from: number; to: number } // rearrange own field monsters (cosmetic, no rules impact)
  | { type: "chooseTarget"; uid: string | null } // null = cancel
  | { type: "pick"; uid: string | null } // resolve seek / recall (null = cancel)
  | { type: "endTurn" }
  | { type: "surrender"; player: Side };

// --- Events: emitted by reduce(), consumed by the UI for animation/log ---
export type GameEvent =
  | { type: "log"; html: string; htmlJa: string }
  | { type: "turnHeader"; turn: number; name: string; isBot: boolean; player?: Side } // player: whose turn (log tinting)
  | { type: "summon"; player: Side; uid: string; id?: string } // id: card id (drives the summon ghost when the monster dies in the same batch)
  | { type: "attack"; player: Side; uid: string; targetUid: string | null }
  | { type: "hit"; uid: string }
  | { type: "damage"; player: Side; amount: number; srcKo?: string; srcJa?: string } // src: what dealt it (death-cause display)
  | { type: "heal"; player: Side; amount: number }
  | { type: "destroy"; player: Side; uid: string; id?: string }
  | { type: "buy"; player: Side; from: "market" | "supply"; i: number; id: string }
  | { type: "draw"; player: Side; count: number }
  | { type: "treasure"; player: Side; kind: string; text: string; textJa: string; isBot: boolean }
  | { type: "dice"; player: Side; rolls: number[]; need?: number; success?: boolean; variant?: "casino" } // dice roll (need = min TOTAL for success; undefined = outcome-table roll · variant "casino" = 카지노 전용 연출)
  | { type: "playSpell"; player: Side; id: string; dest: "discard" | "field" | "vanish" } // spell/starter/enchant played from hand
  | { type: "trapSet"; player: Side } // a face-down trap was set (identity hidden)
  | { type: "trapReveal"; player: Side; id: string } // a trap fired → reveal then discard
  | { type: "win"; winner: Side }
  | { type: "matchDraw" } // 60-turn limit reached with tied HP — the game ends in a draw
  | { type: "needTarget"; pending: Pending };

export interface ReduceResult {
  state: GameState;
  events: GameEvent[];
}
