// ============================================================
// LORE — English card localization.
// Hand-authored cards get explicit names/texts; generated cards
// (GM/GS/GT) are translated via prefix+noun dictionaries and
// text pattern rules. Fallback: Korean original.
// ============================================================
import type { CardDef } from "./types";

const NAMES: Record<string, string> = {
  // core monsters
  M1: "Spark Imp", M2: "Stone Pup", M3: "Dust Scout", M4: "Blade Hare", M5: "Iron Shell",
  M6: "Twin Fang", M7: "Ember Drake", M8: "Grove Warden", M9: "Relic Hunter", M10: "Mana Golem",
  M11: "Warlord", M12: "Titan Gate", M13: "Void Reaver",
  NGA3: "Glass Cannon", NGA4: "Frenzied Blade Fiend", NWL3: "Rock Tortoise", NWL4: "Iron Gatekeeper",
  NHEX: "Little Hexer", NSPR: "Crystal Spirit", NMD2: "Tome Sprite", NMD4: "Chronicler", NMD6: "Grand Sage",
  MIMIC: "Mimic", MIMIC2: "Master Mimic", INFKNIGHT: "Infinite Knight", CREATOR: "Creator God",
  MANA_GIANT: "Mana Crystal Giant",
  // assassins
  ASSASSIN1: "Novice Assassin", ASSASSIN2: "Adept Assassin", ASSASSIN3: "Elite Assassin", ASSASSIN4: "Master Assassin - Nightlord",
  // tribes
  TSO2: "Lone Wolf", TSO3: "Solitary Hunter", TSO5: "Solitary Wanderer",
  TNO2: "Noble Knight", TNO3: "Noble Squire", TNO5: "Noble Paladin",
  TPO2: "Starving Beast", TPO3: "Starving Stalker", TPO5: "Predator",
  TAR2: "Fallen Aristocrat", TAR3: "Fallen Knight", TAR5: "Aristocrat Lord",
  TGE1: "Origin Egg", TGE2: "Origin Ember", TGE3: "Origin Sprout", TGE4: "Origin Spirit",
  TGE5: "Origin Guardian", TGE6: "Origin Giant", TGE7: "Origin Monarch",
  // spells
  S1: "Quick Jab", S3: "Sharpen", S4: "Double Draw", S5: "Market Crash", S6: "Seek", S7: "Overload",
  S8: "Recall", S9: "Siphon", S10: "Mana Charge", S11: "Fireball", S12: "Reinforce", S13: "Meteor",
  S14: "Earth's Blessing", S15: "Rune Burst",
  SX2: "Trapbreak", SX4: "Unseal", SX6: "Trap Collapse",
  E1: "Lockdown Decree", E2: "Peace Treaty", E3: "Well of Knowledge",
  ND2: "Rune of Foresight", ND3: "Sage's Prophecy", ND5: "Ancient Knowledge",
  AHEUK: "Attune - Black", AJIN: "Attune - True", AMA: "Attune - Arcane",
  NHEAL: "Grace of Life", NWIPE: "Purging Blast",
  RUNE1: "Runecraft - Novice", RUNE2: "Runecraft - Adept", RUNE3: "Runecraft - Master",
  GENESIS_SONG: "Song of Origin", GENESIS_MAGIC: "Magic of Origin",
  KIN_CALL: "Call of Kin", MULTI_CULTURE: "Many Cultures", SLAY_ART: "Art of Slaughter",
  BLOOD1: "Blood Magic 1", BLOOD2: "Blood Magic 2", BLOOD3: "Blood Magic 3",
  DISARM1: "Disarm", DISARM2: "Device Analysis", DISARM3: "Magic Research Institute",
  FORBIDDEN: "Forbidden Ritual", HANDRESET: "Hand Reset", TIMEWARP: "Spacetime Manipulation",
  GAMBLE: "Gamble", DICE8: "Devil's Dice", INFERNO: "Inferno",
  CATALYST: "Rift Catalyst", WORLD_SEED: "World Tree Seed", HOURGLASS: "Hourglass of Time",
  LIFE_CYCLE: "Cycle of Life", LIFE_SANCTUM: "Sanctum of Life", WORLD_HEART: "Heart of the World Tree",
  WORLD_BLESS: "Blessing of the World Tree",
  MEDITATE: "Meditation", PRAYER: "Sanctuary Prayer", HERMIT: "Hermit's Rest",
  LUCKY_CHEST: "Lucky Treasure Chest", GUILD_CHEST: "Assassin Guild's Chest", GUILD_EYE: "Guild Network",
  GLASS_BAN: "Glass Arms Ban", SHATTER: "Shattering Tremor", SCARECROW: "Scarecrow Muster", LEVY: "Troop Levy",
  INQUISITION: "Inquisition", MIMIC_LORD: "Mimic Leader", AWAKENED_MIMIC: "Awakened Mimic", MIMIC_KING: "Mimic King", VITAL2: "Vitality Devotee", VITAL3: "Vitality Priest", VITAL4: "Full-Blooded Warrior",
  CULL_FLOOD: "Baptism of Culls", PAIN_HARVEST: "Pain Harvest", CULL_FARM: "Cull Farm", PURGE_ALL: "The Great Purge",
  EXILE_NUKE1: "Void Barrage", EXILE_NUKE2: "Void Cataclysm", CULL_TITAN: "Avatar of Culls", GREED_PRICE: "Price of Greed", MARKET_CRISIS: "Economic Crisis", TOKEN00: "Scarecrow", SOLDIER2: "Soldier",
  WALLBREAK1: "Wall Smash", WALLBREAK2: "Siege Collapse", SNIPE1: "Snipe", SNIPE2: "Volley Fire",
  FURNACE: "Blast Furnace", PURGE_TOUCH: "Purging Touch", SCRAPPER: "Scrap Collector",
  HORDE: "Horde Standard-Bearer", ELITE: "Elite Knight-Captain", TRAPSMITH: "Trapsmith",
  // traps
  T1: "Half Guard", T2: "Null Field", T3: "Pitfall", T4: "Mirror Hand", T6: "Counter Surge",
  T8: "Spike Trap", T9: "Backflow", T10: "Soul Devour", T11: "Time Warp", T12: "Absolute Bulwark", T13: "Divine Punishment",
  NT_NULL3: "Mana Block", NT_NULL5: "Spell Seal", NT_NULL6: "Anti-Magic Ward",
  // starters
  STARTER_TRASH: "Cull", STARTER_CHEST: "Treasure Chest", STARTER_MANA: "Attune",
};

const TEXTS: Record<string, string> = {
  M3: "On summon: draw 1 card", M5: "On summon: take 2 damage", M6: "On summon: -2 DEF to an enemy monster (permanent)",
  M7: "On summon: deal 2 damage to the opponent", M8: "On summon: restore 1 HP", M9: "On summon: refresh your offer row for free",
  M10: "While on the field: max mana +1", M11: "ATK +1 while you control 2+ monsters",
  M12: "On summon: -1 ATK to an enemy monster (permanent)", M13: "On summon: destroy 1 enemy set trap",
  NGA3: "On summon: take 2 damage", NGA4: "On summon: take 3 damage",
  NHEX: "On summon: deal 5 damage to the opponent", NSPR: "While on the field: max mana +1. On summon: draw 2",
  NMD2: "On summon: draw 1 card", NMD4: "On summon: draw 2 cards", NMD6: "On summon: draw 5 cards",
  MIMIC: "Summoned to the opponent's field by a failed treasure chest",
  MIMIC2: "While this card is on the field, neither player can use Treasure Chests (Attune - Arcane still works)",
  CREATOR: "On summon: summon 3 random monsters from both decks/graveyards to your field",
  MANA_GIANT: "While on the field: max mana +2",
  ASSASSIN1: "Can only attack the opponent directly (never monsters)",
  ASSASSIN2: "Can only attack the opponent directly (never monsters)",
  ASSASSIN3: "Can only attack the opponent directly. Requires an Assassin on your field to summon",
  ASSASSIN4: "On summon: destroy ALL enemy set traps · Attacks twice per turn · Summonable when Novice/Adept/Elite Assassins are each in your field/deck/graveyard (hand excluded)",
  S1: "Deal 2 damage to the opponent. From the 3rd use this turn: draw 1", S3: "+3 ATK to one of your monsters (this turn)",
  S4: "Draw 3 cards (Cast 1). Once per turn", S5: "Opponent's next offer shrinks 3 -> 2 (Cast 2)",
  S6: "Take any 1 card from your deck (Cast 2)", S7: "+3 ATK to all your monsters (this turn) + max HP +2",
  S8: "Take any 1 card from your graveyard", S9: "Deal 4 damage to the opponent + restore 3 HP",
  S10: "Draw 2 cards", S11: "Deal 4 damage to the opponent", S12: "+2 ATK / +1 DEF to one of your monsters (permanent)",
  S13: "Deal 9 damage to the opponent", S14: "Restore 10 HP + draw 1 card", S15: "Destroy 1 enemy monster",
  SX2: "Destroy 1 enemy set trap", SX4: "Destroy 2 enemy set traps", SX6: "Destroy all enemy set traps + draw 1",
  E1: "For 2 turns, the opponent cannot summon monsters of cost 3 or less",
  E2: "For 3 turns, neither player can attack with monsters",
  E3: "For your next 4 turns: draw 1 extra at turn start. When it ends: max mana +1 next turn (Cast 4)",
  ND2: "Draw 2 cards + restore 2 HP (Cast 1)", ND3: "Draw 3 cards, 30% chance to draw 2 more (Cast 1)",
  ND5: "Draw 5 cards, 20% chance of max mana +1 (Cast 2)",
  AHEUK: "Opponent's max mana -1. -1 more if you control no monsters",
  AJIN: "Max mana +1, 50% chance to add an Attune to your graveyard",
  AMA: "Discard a Treasure Chest from hand -> max mana +1",
  NHEAL: "Permanent: restore 1 HP whenever you summon a monster (Cast 2)",
  NWIPE: "Only with no monsters on your field. Destroy all enemy traps & enchantments, then take 5 damage",
  RUNE1: "Destroy 1 enemy monster of cost 5+ (Cast 3)", RUNE2: "Discard 'Runecraft - Novice' from hand -> max mana +2",
  RUNE3: "Discard Novice & Adept from hand -> max mana +4 (Cast 8)",
  GENESIS_SONG: "Summon 1 random 'Origin' monster from your deck/graveyard (Cast 2)",
  GENESIS_MAGIC: "+4/+4 to all your 'Origin' monsters (Cast 0)",
  KIN_CALL: "Permanent: tribe cards in the market cost -2 (min 1) while you control a tribe monster",
  MULTI_CULTURE: "Permanent: +1 temporary max mana per tribe monster you control (Origin excluded) (Cast 4)",
  SLAY_ART: "Permanent: +2 bonus damage whenever either player takes damage",
  BLOOD1: "Take 4 damage, draw 3 cards (Cast 1)", BLOOD2: "Take 8 damage, draw 6 cards (Cast 1)",
  BLOOD3: "Take 12 damage + deal 20 damage, then draw 1 (Cast 5)",
  DISARM1: "Destroy 1 enemy enchantment (Cast 0)", DISARM2: "Destroy 2 enemy enchantments (Cast 2)",
  DISARM3: "Destroy 1 enemy enchantment and exile it from the game (Cast 3)",
  FORBIDDEN: "Your HP -15, max mana -2. On a die roll of 4-6, summon the rest of one tribe on your field (Origin excluded)",
  HANDRESET: "Discard your hand, draw 4, max HP +1 (Cast 2)",
  TIMEWARP: "70% chance to skip the opponent's next turn (Cast 12)",
  GAMBLE: "Die 1-6 - 1/2: 8 dmg to you / 3/4: 5 dmg to opponent / 5: summon Mana Golem (3/5) / 6: summon 3 Glass Cannons (7/1)",
  DICE8: "Die 1-6 - 1/2: your max mana -4 / 3/4: opponent mana -1 & 14 dmg / 5: Storm Warrior (11/9, double attack) / 6: wipe enemy spells & traps + 2 Storm Warriors + max mana +2 + 10 HP",
  INFERNO: "Permanent: each of your turns, 6 damage to you / 5 to the opponent",
  CATALYST: "Take 4 damage, max mana +1",
  WORLD_SEED: "Permanent: 33% chance of max mana +1 at the start of each of your turns",
  HOURGLASS: "Max mana +2, draw 2 cards",
  LIFE_CYCLE: "Permanent: whenever you restore HP, 15% chance of max mana +1 (Cast 2)",
  LIFE_SANCTUM: "Permanent: max HP +2 each of your turns (Cast 2)",
  WORLD_HEART: "Permanent: max HP +7 each of your turns. Your max mana -2 while this is on the field (Cast 4)",
  WORLD_BLESS: "Permanent: both players gain max mana +1 at the start of their turns. The caster has a 40% chance of +2 more each turn (Cast 6)",
  MEDITATE: "Castable only if you played no other card this turn. Restore HP up to 80% of max (Cast 3)",
  PRAYER: "Castable only if you played no other card this turn. Fully restore HP + max HP +5 (Cast 5)",
  HERMIT: "Castable only with no monsters on your field. Fully restore HP + max HP +15 (Cast 7)",
  LUCKY_CHEST: "10%: max mana +3 & draw 2 / 40%: max mana +1 / 30%: max HP +8 / 5%: max HP +12 / 15%: dud (Master Mimic 10/3 on enemy field)",
  GUILD_CHEST: "10%: max mana +3 / 10%: +1 draw at turn start (permanent) / 20%: max mana +2 / 10%: max mana +1 / 10%: max HP +10 / 20%: Novice & Adept Assassins on enemy field / 20%: Novice, Adept & Elite Assassins + take 10 damage (Cast 3)",
  GUILD_EYE: "Permanent: draw 1 extra card at the start of your turn",
  GLASS_BAN: "Permanent: monsters with DEF 1 or less cannot attack (both players) (Cast 2)",
  SHATTER: "Take 5 damage. All monsters on the field have their DEF set to 0 (permanent) (Cast 2)",
  SCARECROW: "Summon three 0/0 Scarecrows to your field",
  LEVY: "Summon three 2/2 Soldiers to your field (Cast 4)",
  INQUISITION: "Deal 4 damage per tribe monster in the opponent's deck, graveyard and field (Cast 2)",
  MIMIC_LORD: "On summon: +3/+3 per 'Mimic'-family monster on either field (excluding itself)",
  AWAKENED_MIMIC: "On summon: summon two Mimics (3/2) to your field",
  MIMIC_KING: "On summon: +1/+1 per 'Mimic'-family card of yours exiled from the game. If 6+ are exiled: summon a Master Mimic to your field",
  VITAL2: "On summon: max HP +2", VITAL3: "On summon: max HP +4",
  VITAL4: "Aura: +1/+3 while your HP is 45 or more",
  CULL_FLOOD: "Add 4 Culls to your graveyard, then exile any 3 cards from your deck/graveyard",
  PAIN_HARVEST: "Permanent: gain a Cull to hand whenever the opponent takes damage (Cast 2)",
  CULL_FARM: "Permanent: gain a Cull to hand at the start of each of your turns (Cast 2)",
  PURGE_ALL: "Exile any number of cards from your deck/graveyard from the game",
  EXILE_NUKE1: "Deal 2 damage per card of yours exiled from the game (Cast 10)",
  EXILE_NUKE2: "Deal 3 damage per card of yours exiled from the game (Cast 12)",
  CULL_TITAN: "On summon: +1/+1 per 'Cull' of yours exiled from the game",
  GREED_PRICE: "Take 2 damage · Summon two Mimics (3/2) to your field · Exile 3 more Mimics from the game",
  MARKET_CRISIS: "Refresh all 10 cards of the fixed market",
  TOKEN00: "—", SOLDIER2: "—",
  WALLBREAK1: "Destroy 1 enemy monster with ATK 1 or less (Cast 1)",
  WALLBREAK2: "Destroy all enemy monsters with ATK 2 or less",
  SNIPE1: "Destroy 1 enemy monster with DEF 1 or less (Cast 1)",
  SNIPE2: "Destroy all enemy monsters with DEF 2 or less",
  FURNACE: "Permanent: at the start of each of your turns, exile the lowest-cost card in your graveyard from the game",
  PURGE_TOUCH: "Pick a card in your graveyard, exile it from the game + draw 1 (Cast 1)",
  SCRAPPER: "Exile 2 cards of cost 1 or less from your deck/graveyard -> max mana +1 (Cast 2)",
  HORDE: "On summon: +3/+3 if your deck+graveyard is 24+ cards",
  ELITE: "On summon: +4 ATK if your deck+graveyard is 8 or fewer cards",
  TRAPSMITH: "On summon: +1/+1 per trap in your deck, graveyard and set zone",
  T1: "Halve the attack + 1 damage to the attacker's owner (Cast 1)", T2: "Negate 1 enemy spell of cost 4 or less",
  T3: "Destroy a summoned enemy monster of cost 6 or less",
  T4: "Destroy the attacking monster + 30% chance to deal its ATK to the opponent (Cast 3)",
  T6: "Destroy the attacking monster + reflect half its ATK (Cast 3)",
  T8: "When attacked: 4 damage to the attacker's owner", T9: "Negate the attack + restore 3 HP (Cast 1)",
  T10: "Destroy the attacking monster + restore 2 HP", T11: "When attacked: draw 5 cards",
  T12: "Negate this attack + all your monsters +4 DEF (permanent)",
  T13: "Destroy the attacking monster + 4 damage to the opponent (Cast 3)",
  NT_NULL3: "Negate 1 enemy spell of cost 2 or less", NT_NULL5: "Negate 1 enemy spell",
  NT_NULL6: "Negate 1 enemy spell + 2 damage to the opponent",
  STARTER_TRASH: "Mana 1: exile this card from the game (thins your deck)", STARTER_CHEST: "Mana 1: open the treasure chest",
  STARTER_MANA: "Mana 3: max mana +1",
  TGE1: "[Origin] tribe synergy. Summon cost 2", TGE2: "[Origin] On summon: max HP -2", TGE3: "[Origin] On summon: max HP -1",
  TGE4: "[Origin] tribe synergy", TGE5: "[Origin] tribe synergy", TGE6: "[Origin] On summon: max HP +1", TGE7: "[Origin] On summon: max HP +2",
};
// tribe monsters share one text
for (const id of ["TSO2","TSO3","TSO5"]) TEXTS[id] = "[Solitary] tribe synergy";
for (const id of ["TNO2","TNO3","TNO5"]) TEXTS[id] = "[Noble] tribe synergy";
for (const id of ["TPO2","TPO3","TPO5"]) TEXTS[id] = "[Devour] tribe synergy";
for (const id of ["TAR2","TAR3","TAR5"]) TEXTS[id] = "[Aristocrat] tribe synergy";

const PREFIX_EN: Record<string, string> = {
  "고대의": "Ancient", "심연의": "Abyssal", "강철의": "Steel", "화염의": "Flame", "서리의": "Frost",
  "폭풍의": "Storm", "황금의": "Golden", "저주받은": "Cursed", "신성한": "Sacred", "그림자": "Shadow",
  "용암의": "Magma", "천공의": "Sky", "피의": "Blood", "비취의": "Jade", "흑요석": "Obsidian",
  "은빛": "Silver", "파멸의": "Doom", "여명의": "Dawn", "심판의": "Judgment", "광휘의": "Radiant",
  "태초의": "Primordial", "무한의": "Infinite", "공허의": "Void", "붕괴의": "Collapse",
};
const NOUN_EN: Record<string, string> = {
  "광전사": "Berserker", "약탈자": "Raider", "맹수": "Beast", "수호자": "Guardian", "성벽": "Rampart",
  "거인": "Giant", "기사": "Knight", "용병": "Mercenary", "전사": "Warrior", "드레이크": "Drake",
  "폭격수": "Bomber", "화염술사": "Pyromancer", "사제": "Priest", "수도승": "Monk", "치유사": "Healer",
  "정찰병": "Scout", "탐색자": "Seeker", "사냥꾼": "Hunter", "주술사": "Shaman", "저주술사": "Hexer",
  "마녀": "Witch", "지휘관": "Commander", "장군": "General", "대장": "Captain", "파괴자": "Destroyer",
  "해체자": "Dismantler", "공성병": "Siegebreaker", "반격": "Counter", "반사막": "Mirror Veil",
  "방어 태세": "Defense Stance", "빙결": "Freeze", "생명의 빛": "Light of Life", "수호막": "Ward",
  "예리함": "Keen Edge", "전군 강화": "Rally", "차단막": "Barrier", "천벌": "Punishment",
  "통찰": "Insight", "포식": "Devour", "화염구": "Firebolt",
};

// generated-text pattern rules (applied top-down; first match wins)
const RULES: [RegExp, string][] = [
  [/^\[시초\] 동족 시너지 · 소환 코스트 (\d+)$/, "[Origin] tribe synergy. Summon cost $1"],
  [/^\[시초\] 동족 시너지$/, "[Origin] tribe synergy"],
  [/^\[시초\] 소환시 최대 체력 \+(\d+)$/, "[Origin] On summon: max HP +$1"],
  [/^\[시초\] 소환시 최대 체력 -(\d+)$/, "[Origin] On summon: max HP -$1"],
  [/^—$/, "—"],
  [/^공격 몬스터 파괴 \+ (\d+)%로 그 방어력만큼 회복$/, "Destroy the attacker + $1% chance to restore HP equal to its DEF"],
  [/^공격 몬스터 파괴 \+ (\d+)%로 자신 필드에 소생\(소유권 이동\)$/, "Destroy the attacker + $1% chance to revive it on YOUR field"],
  [/^공격 몬스터 파괴 \+ 공격 (\d+) 이하 상대 몬스터 전멸$/, "Destroy the attacker + wipe all enemy monsters with ATK $1 or less"],
  [/^공격 몬스터 파괴 \+ 공격력 절반 반사$/, "Destroy the attacker + reflect half its ATK"],
  [/^공격 몬스터 파괴 \+ 상대 전체 공격 -(\d+)\(이번 턴\)$/, "Destroy the attacker + all enemy monsters -$1 ATK (this turn)"],
  [/^공격 몬스터 파괴 \+ 상대 체력에 (\d+) 데미지$/, "Destroy the attacker + $1 damage to the opponent"],
  [/^공격 몬스터 파괴 \+ 체력 (\d+) 회복$/, "Destroy the attacker + restore $1 HP"],
  [/^공격 무효 \+ (\d+)장 드로우$/, "Negate the attack + draw $1"],
  [/^공격 무효 \+ 공격측 함정 (\d+)장 파괴 \+ (\d+)장 드로우$/, "Negate the attack + destroy $1 attacker trap + draw $2"],
  [/^공격 무효 \+ 공격측에 (\d+) 데미지$/, "Negate the attack + $1 damage to the attacker's owner"],
  [/^공격 무효 \+ 상대 몬스터 전체 방어 -(\d+)$/, "Negate the attack + all enemy monsters -$1 DEF"],
  [/^공격 무효 \+ 상대 함정·영구마법 (\d+)장 파괴$/, "Negate the attack + destroy $1 enemy traps/enchantments"],
  [/^공격 무효 \+ 자신 몬스터 전체 방어 \+(\d+) \+ (\d+)장 드로우$/, "Negate the attack + all your monsters +$1 DEF + draw $2"],
  [/^공격 무효 \+ 최대 마나 \+(\d+)$/, "Negate the attack + max mana +$1"],
  [/^공격 무효 \+ 최대 마나 -(\d+)로 상대 몬스터 최대 (\d+)체 파괴$/, "Negate the attack + max mana -$1 to destroy up to $2 enemy monsters"],
  [/^공격 절반 \+ 공격측에 (\d+) 데미지$/, "Halve the attack + $1 damage to the attacker's owner"],
  [/^공격할 때마다 자신의 공격 -(\d+)\(영구\)$/, "Each time it attacks: its ATK -$1 (permanent)"],
  [/^공격해온 몬스터의 공격력만큼 반사$/, "Reflect the attacking monster's full ATK"],
  [/^매 턴 마나 (\d+)로 방어 \+(\d+), 체력 \+(\d+) 회복$/, "Each turn, pay $1 mana: +$2 DEF and restore $3 HP"],
  [/^매 턴 시작 시 공격 \+(\d+)\(영구\)$/, "At the start of each turn: +$1 ATK (permanent)"],
  [/^매 턴 시작 시 방어 \+(\d+)\(영구\)$/, "At the start of each turn: +$1 DEF (permanent)"],
  [/^매 턴 시작 시 상대 체력에 (\d+) 데미지$/, "At the start of each turn: $1 damage to the opponent"],
  [/^매 턴 시작 시 체력 \+(\d+) 회복$/, "At the start of each turn: restore $1 HP"],
  [/^상대 체력에 (\d+) 데미지 \(상대 체력 (\d+) 이하면 사용 불가\)$/, "Deal $1 damage (unusable if opponent HP <= $2)"],
  [/^상대 체력에 (\d+) 데미지 \(자신 필드 몬스터 (\d+)체 이하일 때만\)$/, "Deal $1 damage (only with $2 or fewer monsters on your field)"],
  [/^상대 체력에 (\d+) 데미지 \+ 자신 체력 (\d+) 회복$/, "Deal $1 damage + restore $2 HP"],
  [/^상대 체력에 (\d+) 데미지 \+ 카드 (\d+)장 드로우$/, "Deal $1 damage + draw $2"],
  [/^상대 체력에 (\d+) 데미지 · 사용 시 (\d+)%로 상대 덱 맨 위 (\d+)장 제외$/, "Deal $1 damage. $2% chance to exile the top $3 cards of the enemy deck"],
  [/^상대 체력에 (\d+) 데미지, (\d+)% 확률로 상대 최대 마나 -(\d+)$/, "Deal $1 damage, $2% chance of enemy max mana -$3"],
  [/^상대 체력에 (\d+) 데미지, (\d+)% 확률로 자신 최대 마나 -(\d+)$/, "Deal $1 damage, $2% chance of YOUR max mana -$3"],
  [/^상대 체력에 (\d+) 데미지$/, "Deal $1 damage to the opponent"],
  [/^상대 플레이어에게 데미지를 입힐 때마다 \+(\d+)\/\+(\d+)\(영구\)$/, "Whenever it damages the opponent: +$1/+$2 (permanent)"],
  [/^상시: 몬스터를 소환할 때 그 몬스터 공격 \+(\d+)$/, "Aura: monsters you summon gain +$1 ATK"],
  [/^상시: 자신 필드의 아군 몬스터 방어 \+(\d+)$/, "Aura: your monsters have +$1 DEF"],
  [/^소환 코스트 (\d+)\. 소환시 (\d+)%로 자신을 복제 소환$/, "Summon cost $1. On summon: $2% chance to clone itself"],
  [/^소환시: (\d+)장 드로우$/, "On summon: draw $1"],
  [/^소환시: 공격 (\d+) 이하 상대 몬스터 전멸$/, "On summon: wipe all enemy monsters with ATK $1 or less"],
  [/^소환시: 덱에서 랜덤 몬스터 (\d+)체 무료 소환$/, "On summon: summon $1 random monsters from your deck for free"],
  [/^소환시: 마나 (\d+) 지불 → (\d+)\/(\d+) '무한의 기사' 소환$/, "On summon: pay $1 mana -> summon a $2/$3 Infinite Knight"],
  [/^소환시: 상대 체력 홀수면 (\d+) 데미지, 짝수면 (\d+)장 드로우$/, "On summon: if enemy HP is odd, $1 damage; if even, draw $2"],
  [/^소환시: 상대 체력에 (\d+) 데미지$/, "On summon: deal $1 damage to the opponent"],
  [/^소환시: 상대 함정 (\d+)장 파괴, 성공 시 (\d+)장 드로우$/, "On summon: destroy $1 enemy trap; if successful, draw $2"],
  [/^소환시: 상대에 (\d+) 데미지 \+ 상대 함정 (\d+)장 파괴$/, "On summon: $1 damage + destroy $2 enemy trap"],
  [/^소환시: 상대에 (\d+) 데미지 \+ 최대 마나 \+(\d+)\. 매 턴 패의 보물상자를 묘지로 보내면 (\d+)장 드로우$/, "On summon: $1 damage + max mana +$2. Each turn, discard a chest from hand to draw $3"],
  [/^소환시: 상대에 (\d+) 데미지\. 이후 상대는 매 턴 (\d+) 데미지\(중첩 불가\)$/, "On summon: $1 damage. The opponent then takes $2 damage each turn (doesn't stack)"],
  [/^소환시: 적 몬스터 방어 -(\d+)\(영구\)$/, "On summon: -$1 DEF to an enemy monster (permanent)"],
  [/^소환시: 체력 (\d+) 회복$/, "On summon: restore $1 HP"],
  [/^소환시: 최대 체력 \+(\d+), 최대 마나 \+(\d+)$/, "On summon: max HP +$1, max mana +$2"],
  [/^아군 몬스터 (\d+)체 이상이면 공격 \+(\d+)$/, "ATK +$2 while you control $1+ monsters"],
  [/^아군 전체 공격 \+(\d+) · (\d+)%로 (\d+)코스트 이하 몬스터 무작위 소환$/, "All your monsters +$1 ATK. $2% chance to summon a random monster of cost $3 or less"],
  [/^아군 전체 공격 \+(\d+)\(이번 턴\) · 이번 턴 종료 후 공격 \+(\d+)\(영구\)$/, "All your monsters +$1 ATK (this turn), then +$2 ATK (permanent)"],
  [/^아군 전체 공격 \+(\d+)\(이번 턴\)$/, "All your monsters +$1 ATK (this turn)"],
  [/^이 카드가 필드에 있는 한 상대 최대 마나 -(\d+)$/, "While on the field: enemy max mana -$1"],
  [/^자신 몬스터 (\d+)체 공격 \+(\d+)\(이번 턴\)$/, "$1 of your monsters gain +$2 ATK (this turn)"],
  [/^체력 (\d+) 회복 · 상대 몬스터 (\d+)체 \+ 마법\/함정 (\d+)장 파괴$/, "Restore $1 HP. Destroy $2 enemy monster + $3 spell/trap"],
  [/^체력 (\d+) 회복 · 이 카드 (\d+)번째 사용부터 피격 시마다 체력 \+(\d+)$/, "Restore $1 HP. From use #$2 of this card: restore $3 HP whenever you're hit"],
  [/^체력 (\d+) 회복 · 자신 최대 마나가 (\d+) 이하면 체력 완전 회복$/, "Restore $1 HP. If your max mana is $2 or less: fully restore HP"],
  [/^체력 (\d+) 회복 · 체력 (\d+) 이상이면 최대 체력 \+(\d+)$/, "Restore $1 HP. If your HP is $2+: max HP +$3"],
  [/^체력 (\d+) 회복 · 패의 '생명의 빛' (\d+)장 묘지로 보내면 최대 체력 \+(\d+)$/, "Restore $1 HP. Discard $2 'Light of Life' from hand: max HP +$3"],
  [/^체력 (\d+) 회복, (\d+)% 확률로 최대 체력 \+(\d+)$/, "Restore $1 HP, $2% chance of max HP +$3"],
  [/^카드 (\d+)장 드로우 · (\d+)%로 상대 몬스터\/함정\/마법 (\d+)장 무작위 파괴$/, "Draw $1 cards. $2% chance to destroy $3 random enemy monster/trap/spell"],
  [/^카드 (\d+)장 드로우 · 최대 체력 (\d+) 이상이면 (\d+)장 추가$/, "Draw $1 cards. If your max HP is $2+: draw $3 more"],
  [/^카드 (\d+)장 드로우$/, "Draw $1 cards"],
  [/^코스트(\d+) 이상 카드를 버릴 때마다 상대 함정 (\d+)장 파괴$/, "Whenever you discard a card of cost $1+: destroy $2 enemy trap"],
  [/^한 턴에 (\d+)번 공격할 수 있다$/, "Can attack $1 times per turn"],
];

const ROMAN = [" II", " III", " IV", " V", " VI"];
function genNameEn(ko: string): string | undefined {
  let suffix = "";
  for (const r of ROMAN) if (ko.endsWith(r)) { suffix = r; ko = ko.slice(0, -r.length); break; }
  for (const p of Object.keys(PREFIX_EN)) {
    if (ko.startsWith(p)) {
      const noun = ko.slice(p.length).trim();
      const n = NOUN_EN[noun];
      if (n) return `${PREFIX_EN[p]} ${n}${suffix}`;
    }
  }
  return undefined;
}
function genTextEn(ko: string): string | undefined {
  // split off a trailing "(시전 N)"
  const m = ko.match(/^(.*?)\s*\(시전 (\d+)\)$/);
  const body = m ? m[1] : ko;
  const cast = m ? ` (Cast ${m[2]})` : "";
  for (const [re, en] of RULES) {
    if (re.test(body)) return body.replace(re, en) + cast;
  }
  return undefined;
}

/** Attach nameEn/textEn to every card (explicit map -> generator dictionaries -> Korean fallback). */
export function applyEnglish(pools: Array<Record<string, CardDef>>): void {
  for (const pool of pools) {
    for (const id of Object.keys(pool)) {
      const c = pool[id];
      c.nameEn = NAMES[id] ?? genNameEn(c.name) ?? c.name;
      c.textEn = TEXTS[id] ?? genTextEn(c.text) ?? c.text;
    }
  }
}
