import type {CardDef} from './types';

export const CARD_REWORK_1120: CardDef[] = [
  {
    "id": "EXECUTION",
    "name": "처형",
    "nameJa": "処刑",
    "nameEn": "Execution",
    "t": "spell",
    "cost": 2,
    "text": "",
    "play": 3,
    "act": "expansion"
  },
  {
    "id": "ARCANE_DISMANTLER",
    "name": "마도구 해체업자",
    "nameJa": "魔道具解体屋",
    "nameEn": "Arcane Dismantler",
    "t": "mon",
    "cost": 2,
    "text": "",
    "atk": 1,
    "onSummon": "arcaneDismantle",
    "def": 3
  },
  {
    "id": "BLOOD_BIRTH",
    "name": "피의 마법 - 탄생",
    "nameJa": "血の魔法 - 誕生",
    "nameEn": "Blood Magic - Birth",
    "t": "spell",
    "cost": 5,
    "text": "",
    "play": 5,
    "act": "expansion",
    "passive": [
      "void"
    ],
    "noShop": true
  },
  {
    "id": "RUNE_GUIDANCE",
    "name": "룬의 인도",
    "nameJa": "ルーンの導き",
    "nameEn": "Rune Guidance",
    "t": "spell",
    "cost": 5,
    "text": "",
    "play": 5,
    "act": "expansion",
    "noShop": true
  },
  {
    "id": "RUNE_PEBBLE",
    "name": "룬의 돌멩이",
    "nameJa": "ルーンの礫",
    "nameEn": "Rune Pebble",
    "t": "spell",
    "cost": 1,
    "text": "",
    "play": 1,
    "act": "expansion",
    "noShop": true
  },
  {
    "id": "PRIMAL_CIVILIZATION",
    "name": "원시 문명",
    "nameJa": "原始文明",
    "nameEn": "Primal Civilization",
    "t": "spell",
    "cost": 2,
    "text": "",
    "play": 2,
    "act": "expansion",
    "noShop": true
  },
  {
    "id": "COMRADE_AID",
    "name": "동지의 도움",
    "nameJa": "同志の助け",
    "nameEn": "Comrade Aid",
    "t": "spell",
    "cost": 3,
    "text": "",
    "play": 3,
    "act": "expansion",
    "noShop": true
  },
  {
    "id": "EXILED_HEXER",
    "name": "파문당한 주술사",
    "nameJa": "破門された呪術師",
    "nameEn": "Exiled Hexer",
    "t": "mon",
    "cost": 1,
    "text": "",
    "atk": 0,
    "onSummon": "exiledHexer",
    "noShop": true,
    "def": 1
  },
  {
    "id": "SUBSTITUTE",
    "name": "대역",
    "nameJa": "身代わり",
    "nameEn": "Substitute",
    "t": "spell",
    "cost": 3,
    "text": "",
    "play": 3,
    "act": "expansion",
    "noShop": true
  },
  {
    "id": "SHIELD_STRIKE",
    "name": "실드 어택",
    "nameJa": "シールドアタック",
    "nameEn": "Shield Attack",
    "t": "spell",
    "cost": 0,
    "text": "",
    "play": 0,
    "act": "expansion",
    "noShop": true
  }
];

export const CARD_REWORK_1120_PRINTS: Record<string, Partial<CardDef>> = {
  "S10": {
    "name": "마나 드로우",
    "nameJa": "マナドロー",
    "nameEn": "Mana Draw",
    "cost": 1,
    "play": 1,
    "noShop": true
  },
  "EROSION": {
    "cost": 5,
    "play": 5,
    "noShop": true
  },
  "MIMIC_LORD": {
    "cost": 3,
    "noShop": true
  },
  "Q_RUNE_SECRET": {
    "quest": {
      "event": "spellPlay",
      "target": 18
    }
  }
};

export const CARD_REWORK_1120_TEXT = {
  "PURGE_TOUCH": {
    "ja": "【発動条件】自分の墓地にカードがある。\n\n【発動時】自分の烙印カウンターを1個取り除く。自分の墓地からカードを1枚まで選び、自分のリフトへ送る。送った場合、カードを1枚引く。",
    "ko": "【발동 조건】자신의 묘지에 카드가 있다.\n\n【발동 시】자신의 낙인 카운터를 1개 제거한다. 자신의 묘지에서 카드를 최대 1장 선택해 자신의 리프트로 보낸다. 보냈다면 카드를 1장 뽑는다.",
    "en": "【Play Requirement】Your graveyard is not empty.\n\n【On Cast】Remove 1 of your Brand counters. Choose up to 1 card in your graveyard and send it to your Rift. If you do, draw 1 card."
  },
  "UNBRANDER": {
    "ja": "【召喚時】自分と相手の烙印カウンターを1個ずつ取り除く。\n\n【場にある間】自分が使用する「呪い」の効果を「自分の体力を3回復する」に変更する（同名は重複しない）。",
    "ko": "【소환 시】자신과 상대의 낙인 카운터를 각각 1개 제거한다.\n\n【필드에 있는 동안】자신이 사용하는 「저주」의 효과를 「자신의 체력을 3 회복한다」로 변경한다(동명 중복 없음).",
    "en": "【On Summon】Remove 1 Brand counter from each player.\n\n【While on the Field】Replace the effect of each Curse you use with “Restore 3 of your HP” (does not stack)."
  },
  "COUNTERCALC": {
    "ja": "【発動条件】相手のマナ水晶が7以下で、どちらかの場に永続魔法がある。同名カード合計で自分の各ターン1回まで使用できる。\n\n【発動時】両方の場の永続魔法から1枚をランダムに選び、破壊する。",
    "ko": "【발동 조건】상대의 마나 수정이 7 이하이고 어느 쪽 필드에든 영구 마법이 있다. 같은 이름의 카드 합계로 자신의 턴마다 1회까지 사용할 수 있다.\n\n【발동 시】양쪽 필드의 영구 마법 중 1장을 무작위로 골라 파괴한다.",
    "en": "【Play Requirement】The opponent has at most 7 mana crystals and either player controls a persistent spell. You may play cards with this name only 1 time during each of your turns in total.\n\n【On Cast】Destroy 1 random persistent spell on either field."
  },
  "GOLEM_TEST": {
    "ja": "【場にある間】自分の場の永続魔法が破壊されるたび、「兵士ゴーレム」1体を自分の場に召喚する。",
    "ko": "【필드에 있는 동안】자신의 필드의 영구 마법이 파괴될 때마다 병사 골램 1체를 자신의 필드에 소환한다.",
    "en": "【While on the Field】Whenever a persistent spell on your field is destroyed, summon 1 Soldier Golem to your field."
  },
  "Q_RUNE_SECRET": {
    "ja": "【設置上限】自分の場に最大1枚。\n\n【達成条件】設置後、自分が魔法を18回使用するか、ルーン系魔法を2回使用する。\n\n【達成時】自分のマナ水晶+1。ルーン系魔法2回で達成した場合、このカードを墓地へ送る。それ以外はリフトへ送る。",
    "ko": "【설치 제한】자신의 필드에 최대 1장.\n\n【달성 조건】설치 후 자신이 마법을 18회 사용하거나 룬 계열 마법을 2회 사용한다.\n\n【달성 시】자신의 마나 수정 +1. 룬 계열 마법 2회로 달성했다면 이 카드를 묘지로, 아니면 리프트로 보낸다.",
    "en": "【Field Limit】At most 1 on your field.\n\n【Completion Requirement】After deployment, play 18 spells or 2 Rune spells.\n\n【On Completion】Gain 1 mana crystal. Send this card to your graveyard if completed by playing 2 Rune spells, otherwise to your Rift."
  },
  "MINI_SPIRIT": {
    "ja": "【場にある間】基本のアチューンを使用するたび、このモンスターの体力+1。自分が体力を得るたび、このモンスターの攻撃力+1。自分がシールドを得るたび、このモンスターの体力+1。自分が雫を得るたび、このモンスターの攻撃力+1。これらの変化は場を離れるとリセットされる。\n\n【パッシブの追加・除去時】両方の場のモンスターにパッシブが1つ追加されるたび、または取り除かれるたび、このモンスターの攻撃力+2・体力+2（このモンスターが場を離れるまで）。",
    "ko": "【필드에 있는 동안】기본 어튠을 사용할 때마다 이 몬스터의 체력 +1. 자신이 체력을 얻을 때마다 이 몬스터의 공격력 +1. 자신이 실드를 얻을 때마다 이 몬스터의 체력 +1. 자신이 이슬을 얻을 때마다 이 몬스터의 공격력 +1. 필드를 떠나면 이 변화는 초기화된다.\n\n【패시브 추가·제거 시】양쪽 필드의 몬스터에게 패시브가 1개 추가되거나 제거될 때마다 이 몬스터의 공격력 +2, 체력 +2(이 몬스터가 필드를 떠날 때까지).",
    "en": "【While on the Field】Whenever you play basic Attune, this monster gains 1 HP. Whenever you gain HP, it gains 1 ATK. Whenever you gain Shield, it gains 1 HP. Whenever you gain Dew, it gains 1 ATK. These changes reset when it leaves the field.\n\n【When a Passive Is Added or Removed】Whenever a passive is added to or removed from a monster on either field, this monster gains +2 ATK and +2 HP until it leaves the field."
  },
  "EROSION": {
    "ja": "【自分の追加ドロー時】自分のターン中、通常の開始時ドロー以外でカードを1枚引くたび、相手に1ダメージを与える。",
    "ko": "【자신의 추가 드로우 시】자신 턴에 통상 턴 시작 드로우 이외로 카드 1장을 뽑을 때마다 상대에게 1 데미지를 준다.",
    "en": "【When You Draw Extra Cards】During your turn, whenever you draw 1 card outside the normal turn-start draw, deal 1 damage to the opponent."
  },
  "MIMIC_LORD": {
    "ja": "【召喚時】両方の場の、このモンスター以外の「ミミック」系モンスター1体につき、このモンスターの攻撃力+2・体力+2（対象が場を離れるまで）。 さらに相手の場の「ミミック」1体を自分の場に移す。",
    "ko": "【소환 시】양쪽 필드의 이 몬스터 외 미믹 계열 몬스터 1체당 이 몬스터의 공격력 +2, 체력 +2(효과를 받은 몬스터가 필드를 떠날 때까지). 또한 상대 필드의 ‘미믹’ 1체를 자신의 필드로 옮긴다.",
    "en": "【On Summon】This monster gets +2 ATK and +2 HP for each other Mimic-family monster on either field (until the affected monster leaves the field). Also take control of 1 opposing monster named Mimic."
  },
  "EXECUTION": {
    "ja": "【発動時】両方の場のモンスターから1体をランダムに選び、破壊する。",
    "ko": "【발동 시】양쪽 필드의 몬스터 중 1체를 무작위로 골라 파괴한다.",
    "en": "【On Cast】Destroy 1 random monster on either field."
  },
  "ARCANE_DISMANTLER": {
    "ja": "【召喚時】両方の場から購入コスト2以下の永続魔法1枚を選び、破壊する。",
    "ko": "【소환 시】양쪽 필드에서 구매 코스트 2 이하인 영구 마법 1장을 선택해 파괴한다.",
    "en": "【On Summon】Choose and destroy 1 persistent spell with purchase cost 2 or less on either field."
  },
  "BLOOD_BIRTH": {
    "ja": "【発動時】自分に5ダメージを与え、相手にシールド5を付与する。新しい「血の魔法」1枚をランダムに自分の手札に加える。",
    "ko": "【발동 시】자신에게 5 데미지를 주고 상대에게 실드 5를 부여한다. 새로운 피의 마법 1장을 무작위로 자신의 패에 넣는다.",
    "en": "【On Cast】Deal 5 damage to yourself and grant the opponent 5 Shield. Add 1 new random Blood Magic spell to your hand."
  },
  "RUNE_GUIDANCE": {
    "ja": "【発動時】カードを3枚引き、自分の体力を1回復する。\n\n【使用時】このゲーム中、自分の同名カード全ての発動コストを1下げる（最低0）。\n\n【発動時】発動コスト0で使用した場合、さらに、新しいルーン系魔法カード1枚をランダムに自分の手札に加える。",
    "ko": "【발동 시】카드를 3장 뽑고 자신의 체력을 1 회복한다.\n\n【사용 시】이번 게임 동안 자신의 같은 이름의 카드 전체의 발동 코스트를 1 낮춘다(최소 0).\n\n【발동 시】발동 코스트 0으로 사용했다면 추가로 새로운 룬 계열 마법 카드 1장을 무작위로 자신의 패에 넣는다.",
    "en": "【On Cast】Draw 3 cards and restore 1 of your HP.\n\n【On Play】Reduce the cast cost of all your cards with this name by 1 for the rest of the game (minimum 0).\n\n【On Cast】If played at cast cost 0, also add 1 new random Rune spell card to your hand."
  },
  "RUNE_PEBBLE": {
    "ja": "【コスト】このターン、既に自分がルーン系魔法を使用していれば0。\n\n【発動時】プレイヤーか場のモンスター1体を選ぶ。自分のデッキ構成にある、「ルーンの導き」以外のルーン系魔法カードとルーン系モンスターカードの合計枚数×7ダメージを、その対象に一度に与える。",
    "ko": "【코스트】이번 턴에 이미 자신이 룬 계열 마법을 사용했다면 0.\n\n【발동 시】플레이어 또는 필드의 몬스터 1체를 선택한다. 자신의 덱 구성에 있는 룬의 인도 이외의 룬 계열 마법 카드와 룬 계열 몬스터 카드의 총 장수×7 데미지를 그 대상에게 한 번에 준다.",
    "en": "【Cost】Costs 0 if you have already played a Rune spell this turn.\n\n【On Cast】Choose a player or a monster on the field. Deal 7 damage to it for each Rune spell or Rune monster card in your deck composition, excluding Rune Guidance, as a single hit."
  },
  "S10": {
    "ja": "【発動時】カードを2枚引く。",
    "ko": "【발동 시】카드를 2장 뽑는다.",
    "en": "【On Cast】Draw 2 cards."
  },
  "PRIMAL_CIVILIZATION": {
    "ja": "【発動時】自分の次のターン開始時に、相手の体力を8回復し、新しい「始原の卵」1枚を自分の手札に加える。",
    "ko": "【발동 시】자신의 다음 턴 시작에 상대의 체력을 8 회복하고 새로운 시초의 알 1장을 자신의 패에 넣는다.",
    "en": "【On Cast】At the start of your next turn, restore 8 of the opponent’s HP and add 1 new Origin Egg to your hand."
  },
  "COMRADE_AID": {
    "ja": "【発動時】自分の場のモンスターが持つ種族から、始原以外の種族を1種類ランダムに選ぶ。その種族の購入コスト4以下のモンスター1体をランダムに自分の場に召喚する。この効果は召喚条件を無視する。",
    "ko": "【발동 시】자신의 필드의 몬스터가 가진 종족 중 시초 이외의 종족 1종류를 무작위로 고른다. 그 종족의 구매 코스트 4 이하인 몬스터 1체를 무작위로 자신의 필드에 소환한다. 이 효과는 소환 조건을 무시한다.",
    "en": "【On Cast】Randomly choose 1 non-Origin tribe among monsters on your field. Summon 1 random monster of that tribe with purchase cost 4 or less to your field, ignoring its summon requirements."
  },
  "EXILED_HEXER": {
    "ja": "【召喚時】相手の墓地に新しい「呪い」1枚を追加する。相手のデッキ構成に「呪い」が3枚以上あれば、この効果は発動しない。",
    "ko": "【소환 시】상대의 묘지에 새로운 저주 1장을 추가한다. 상대의 덱 구성에 저주가 3장 이상 있으면 이 효과는 발동하지 않는다.",
    "en": "【On Summon】Add 1 new Curse to the opponent’s graveyard. This effect does not activate if their deck composition already contains at least 3 Curses."
  },
  "SUBSTITUTE": {
    "ja": "【発動時】挑発を持つ「かかし」2体を自分の場に召喚する。",
    "ko": "【발동 시】도발을 가진 허수아비 2체를 자신의 필드에 소환한다.",
    "en": "【On Cast】Summon 2 Scarecrows with Taunt to your field."
  },
  "SHIELD_STRIKE": {
    "ja": "【発動時】プレイヤーか場のモンスター1体を選ぶ。自分のシールドを全て消費し、消費した数だけその対象にダメージを与える。",
    "ko": "【발동 시】플레이어 또는 필드의 몬스터 1체를 선택한다. 자신의 실드를 전부 소비하고 소비한 수만큼 그 대상에게 데미지를 준다.",
    "en": "【On Cast】Choose a player or a monster on the field. Consume all your Shield and deal that much damage to that target."
  }
};

export const MOVED_STARTERS_1120 = ['S10','EROSION','MIMIC_LORD'];
export const STARTERS_1120 = [...MOVED_STARTERS_1120, ...CARD_REWORK_1120.filter(c=>c.noShop).map(c=>c.id)];
