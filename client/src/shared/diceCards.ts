import type { CardDef } from './types';

export const DICE_SET_CARDS: CardDef[] = [
  {
    "id": "MANA_CYCLE",
    "nameJa": "マナサイクル",
    "name": "마나 사이클",
    "nameEn": "Mana Cycle",
    "cost": 0,
    "textJa": "【発動条件】自分の場にモンスターが2体以上いて、自分に空のマナ水晶が1個以上ある。\n\n【発動時】マナを1得る。",
    "text": "【발동 조건】자신의 필드에 몬스터가 2체 이상 있고 빈 마나 수정이 1개 이상 있다.\n\n【발동 시】마나 1을 얻는다.",
    "textEn": "【Play Requirement】You control at least 2 monsters and have at least 1 empty mana crystal.\n\n【On Cast】Gain 1 mana.",
    "t": "spell",
    "act": "manaCycle",
    "passive": [
      "void"
    ],
    "noShop": true
  },
  {
    "id": "SLUM_ASSASSIN",
    "nameJa": "スラム街のアサシン",
    "name": "빈민가의 암살자",
    "nameEn": "Slum Assassin",
    "cost": 1,
    "textJa": "【召喚条件】自分の場に同名カードがない。\n\n【場にある間】自分のデッキ構成に「スラム街」があれば「回避」を得る。",
    "text": "【소환 조건】자신의 필드에 같은 이름의 카드가 없다.\n\n【필드에 있는 동안】자신의 덱 구성에 슬럼가가 있으면 회피를 얻는다.",
    "textEn": "【Summon Requirement】You control no copy of this card.\n\n【While on the Field】Gain Evade while Slums is in your deck composition.",
    "t": "mon",
    "atk": 2,
    "directOnly": true,
    "summonReq": "uniqueField",
    "passive": ["void"],
    "noShop": true,
    "def": 1
  },
  {
    "id": "DICE_FIGHTER",
    "nameJa": "ダイスファイター",
    "name": "다이스 파이터",
    "nameEn": "Dice Fighter",
    "cost": 4,
    "textJa": "【ダイスを振った時】自分がダイスを1個振るたび、このモンスターは+1/+1を得る。\n\n【場にある間】自分の場に「回避」か「オーラ」を持つモンスターがいる間、このモンスターは「回避」と「オーラ」の両方を得る。",
    "text": "【주사위를 굴릴 때】자신이 주사위를 1개 굴릴 때마다 이 몬스터는 +1/+1을 얻는다.\n\n【필드에 있는 동안】자신의 필드에 회피 또는 아우라를 가진 몬스터가 있는 동안, 이 몬스터는 회피 및 아우라를 모두 얻는다.",
    "textEn": "【When Dice Are Rolled】For each die you roll, this monster gains +1/+1.\n\n【While on the Field】While you control a monster with Evade or Aura, this monster gains both Evade and Aura.",
    "t": "mon",
    "atk": 1,
    "passive": [
      "counter"
    ],
    "def": 2
  },
  {
    "id": "DICE_ARCHER",
    "nameJa": "ダイスアーチャー",
    "name": "다이스 아처",
    "nameEn": "Dice Archer",
    "cost": 3,
    "textJa": "【ダイスを振った時】自分がダイスを1個振るたび、このモンスターは攻撃力+2を得る。\n\n【場にある間】自分の場に「反撃」か「オーラ」を持つモンスターがいる間、このモンスターは「反撃」と「オーラ」の両方を得る。",
    "text": "【주사위를 굴릴 때】자신이 주사위를 1개 굴릴 때마다 이 몬스터는 공격력 +2를 얻는다.\n\n【필드에 있는 동안】자신의 필드에 반격 또는 아우라를 가진 몬스터가 있는 동안, 이 몬스터는 반격 및 아우라를 모두 얻는다.",
    "textEn": "【When Dice Are Rolled】For each die you roll, this monster gains +2 ATK.\n\n【While on the Field】While you control a monster with Counter or Aura, this monster gains both Counter and Aura.",
    "t": "mon",
    "atk": 2,
    "passive": [
      "evade"
    ],
    "def": 1
  },
  {
    "id": "DICE_MAGICIAN",
    "nameJa": "ダイスマジシャン",
    "name": "다이스 매지션",
    "nameEn": "Dice Magician",
    "cost": 4,
    "textJa": "【ダイスを振った時】自分がダイスを1個振るたび、このモンスターは攻撃力+1を得る。出目が5以上なら、自分はマナ水晶を1個得る。\n\n【場にある間】自分の場に「反撃」か「回避」を持つモンスターがいる間、このモンスターは「反撃」と「回避」の両方を得る。",
    "text": "【주사위를 굴릴 때】자신이 주사위를 1개 굴릴 때마다 이 몬스터는 공격력 +1을 얻는다. 눈이 5 이상이면 마나 수정 1개를 얻는다.\n\n【필드에 있는 동안】자신의 필드에 반격 또는 회피를 가진 몬스터가 있는 동안, 이 몬스터는 반격 및 회피를 모두 얻는다.",
    "textEn": "【When Dice Are Rolled】For each die you roll, this monster gains +1 ATK. For each result of 5 or higher, gain 1 mana crystal.\n\n【While on the Field】While you control a monster with Counter or Evade, this monster gains both Counter and Evade.",
    "t": "mon",
    "atk": 2,
    "passive": [
      "aura"
    ],
    "def": 2
  }
];
