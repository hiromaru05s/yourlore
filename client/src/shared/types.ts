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
  nameJa?: string; // Japanese name (falls back to name)
  textJa?: string; // Japanese effect text (falls back to text)
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
}

export interface Pending {
  kind: "oppMon" | "myMon" | "seek" | "recall";
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
}

// --- Actions: the only way to mutate a GameState ---
export type Action =
  | { type: "play"; idx: number }
  | { type: "buyMarket"; i: number }
  | { type: "buySupply"; i: number }
  | { type: "refresh" }
  | { type: "attack"; uid: string }
  | { type: "chooseTarget"; uid: string | null } // null = cancel
  | { type: "pick"; uid: string | null } // resolve seek / recall (null = cancel)
  | { type: "endTurn" }
  | { type: "surrender"; player: Side };

// --- Events: emitted by reduce(), consumed by the UI for animation/log ---
export type GameEvent =
  | { type: "log"; html: string; htmlJa: string }
  | { type: "turnHeader"; turn: number; name: string; isBot: boolean }
  | { type: "summon"; player: Side; uid: string }
  | { type: "attack"; player: Side; uid: string; targetUid: string | null }
  | { type: "hit"; uid: string }
  | { type: "damage"; player: Side; amount: number }
  | { type: "heal"; player: Side; amount: number }
  | { type: "destroy"; player: Side; uid: string }
  | { type: "buy"; player: Side; from: "market" | "supply"; i: number }
  | { type: "draw"; player: Side; count: number }
  | { type: "treasure"; player: Side; kind: string; text: string; textJa: string; isBot: boolean }
  | { type: "trap"; player: Side; name: string }
  | { type: "win"; winner: Side }
  | { type: "needTarget"; pending: Pending };

export interface ReduceResult {
  state: GameState;
  events: GameEvent[];
}
