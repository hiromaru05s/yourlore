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
  nameJa?: string; // Japanese name (falls back to name)
  textJa?: string; // Japanese effect text (falls back to text)
  nameEn?: string; // English name (falls back to name)
  textEn?: string; // English effect text (falls back to text)
}

export interface Enchant {
  card: CardInst;
  turns: number;
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
}

export interface TrapSet {
  card: CardInst;
}

export interface ExileEntry {
  card: CardInst;
  turns: number;
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
  supplyShrink: number; // if >0, this player's next 제시 roll offers 2 cards instead of 3
  defendHeal: number; // heal this much whenever this player is attacked
  manaGainNext: number; // max mana to gain at the start of this player's next turn
  skipNext: boolean; // if true, this player's next turn is skipped
  collection?: string[]; // redacted view only: sorted card-id multiset of hidden zones (public via buy log)
  removed?: CardInst[]; // cards permanently exiled from the game (public zone)
}

export interface Pending {
  kind: "oppMon" | "myMon" | "seek" | "recall" | "purge" | "oppRmz" | "oppBoard"; // purge: deck+graveyard exile · oppRmz: 흑룡(상대 제외존→묘지) · oppBoard: 신수(상대 필드 카드 파괴)
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
  | { type: "playSpell"; player: Side; id: string; dest: "discard" | "field" | "vanish" } // spell/starter/enchant played from hand
  | { type: "trapSet"; player: Side } // a face-down trap was set (identity hidden)
  | { type: "trapReveal"; player: Side; id: string } // a trap fired → reveal then discard
  | { type: "win"; winner: Side }
  | { type: "matchDraw" } // 75-turn limit reached — the game ends in a draw
  | { type: "needTarget"; pending: Pending };

export interface ReduceResult {
  state: GameState;
  events: GameEvent[];
}
