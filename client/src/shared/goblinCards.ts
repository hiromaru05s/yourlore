import type { CardDef } from './types';

export const GOBLIN_STARTERS = ["GOBLIN","GOBLIN_RAIDER","GOBLIN_SETTLEMENT","RELIC_PROTECTION","RELIC_BOUNTY","MANA_BACKFLOW","BATTLEFIELD"];
export const GOBLIN_IDS = new Set(["GOBLIN","GOBLIN_RAIDER","GOBLIN_SETTLEMENT","GOBLIN_LEADER","GOBLIN_KING"]);
export const isBasicGoblin = (card: {id:string}): boolean => card.id === 'GOBLIN' || card.id === 'GOBLIN_RAIDER';
export const GOBLIN_CARDS: CardDef[] = [
  {
    "id": "GOBLIN",
    "name": "고블린",
    "nameJa": "ゴブリン",
    "nameEn": "Goblin",
    "cost": 1,
    "text": "【공격 시】상대 플레이어를 직접 공격하면 추가로 1 데미지를 준다.",
    "textJa": "【攻撃時】相手プレイヤーに直接攻撃した場合、追加で1ダメージを与える。",
    "textEn": "【On Attack】When this monster directly attacks the opponent, deal 1 additional damage to them.",
    "t": "mon",
    "noShop": true,
    "atk": 1,
    "attackFx": "goblinDirect",
    "def": 1
  },
  {
    "id": "GOBLIN_RAIDER",
    "summonReq": "uniqueRaider",
    "name": "돌격 고블린",
    "nameJa": "特攻ゴブリン",
    "nameEn": "Goblin Raider",
    "cost": 3,
    "text": "【설치 제한】자신의 필드에 최대 1체.\n\n【필드에 있는 동안】자신의 필드에 있는 고블린과 돌격 고블린의 공격력 +1.\n\n【소환 시】소환한 플레이어의 다음 상대 턴 종료 시 이 몬스터를 반드시 파괴한다.",
    "textJa": "【設置上限】自分の場に最大1体。\n\n【場にある間】自分の場の「ゴブリン」「特攻ゴブリン」の攻撃力+1。\n\n【召喚時】召喚したプレイヤーの次の相手のターン終了時に、このモンスターを必ず破壊する。",
    "textEn": "【Field Limit】At most 1 on your field.\n\n【While on the Field】Your Goblins and Goblin Raiders on the field have +1 ATK.\n\n【On Summon】Destroy this monster at the end of the summoning player’s next opponent turn, without exception.",
    "t": "mon",
    "noShop": true,
    "atk": 2,
    "def": 1,
    "aura": "goblinAttack"
  },
  {
    "id": "GOBLIN_SETTLEMENT",
    "name": "고블린 집락",
    "nameJa": "ゴブリン集落",
    "nameEn": "Goblin Settlement",
    "cost": 4,
    "text": "【발동 조건】자신의 필드에 고블린 또는 돌격 고블린이 있다.\n\n【자신의 턴 시작 시】자신의 필드에 있는 고블린과 돌격 고블린의 체력 +1(지속).\n\n【파괴 시】마법 카드의 효과로 파괴됐다면 상대에게 8 데미지를 준다.",
    "textJa": "【発動条件】自分の場に「ゴブリン」か「特攻ゴブリン」がいる。\n\n【自分のターン開始時】自分の場の「ゴブリン」「特攻ゴブリン」の体力+1（持続）。\n\n【破壊時】魔法カードの効果で破壊された場合、相手に8ダメージを与える。",
    "textEn": "【Play Requirement】You control a Goblin or Goblin Raider.\n\n【At the Start of Your Turn】Your Goblins and Goblin Raiders on the field gain +1 HP (lasting).\n\n【On Destruction】If destroyed by a spell card’s effect, deal 8 damage to the opponent.",
    "t": "spell",
    "noShop": true,
    "ench": "goblinSettlement",
    "val": 99
  },
  {
    "id": "RELIC_PROTECTION",
    "name": "신기의 가호",
    "nameJa": "神器の加護",
    "nameEn": "Relic Protection",
    "cost": 1,
    "text": "【발동 시】다음 상대 턴 종료 시에 한해 자신의 남은 실드가 소멸하지 않고 유지된다. 그다음 상대 턴 종료 시에는 정상적으로 소멸한다.",
    "textJa": "【発動時】次の相手のターン終了時に限り、自分に残ったシールドは消失せず維持される。その次の相手のターン終了時には通常どおり消失する。",
    "textEn": "【On Cast】At the end of the next opponent turn only, retain your remaining Shield instead of losing it. It expires normally at the end of the following opponent turn.",
    "t": "spell",
    "noShop": true,
    "act": "relicProtection",
    "passive": [
      "relic"
    ]
  },
  {
    "id": "RELIC_BOUNTY",
    "name": "신기의 은혜",
    "nameJa": "神器の恵み",
    "nameEn": "Relic Bounty",
    "cost": 3,
    "text": "【필드에 있는 동안】자신의 필드·패에서 코스트 1 카드가 묘지로 갈 때마다 자신에게 실드 1을 준다.",
    "textJa": "【場にある間】自分の場・手札からコスト1のカードが墓地に行くたび、自分にシールド1を与える。",
    "textEn": "【While on the Field】Whenever a cost-1 card goes from your field or hand to your graveyard, gain 1 Shield.",
    "t": "spell",
    "noShop": true,
    "ench": "relicBounty",
    "val": 99
  },
  {
    "id": "MANA_BACKFLOW",
    "name": "마나 역류 장치",
    "nameJa": "マナ逆流装置",
    "nameEn": "Mana Backflow Device",
    "cost": 2,
    "text": "【자신의 턴 시작 시】발동 후 자신의 15번째 턴 시작 시 이 카드를 파괴한다.\n\n【파괴 시】이 카드의 효과로 파괴됐다면 자신의 최대 마나를 3으로 만든다. 다른 카드의 효과로 파괴됐다면 상대의 최대 마나 -1.",
    "textJa": "【自分のターン開始時】発動した後の自分の15回目のターン開始時、このカードを破壊する。\n\n【破壊時】このカードの効果で破壊された場合、自分の最大マナを3にする。他のカードの効果で破壊された場合、相手の最大マナ-1。",
    "textEn": "【At the Start of Your Turn】At the start of your 15th turn after casting this card, destroy it.\n\n【On Destruction】If destroyed by its own effect, set your max mana to 3. If destroyed by another card’s effect, the opponent loses 1 max mana.",
    "t": "spell",
    "noShop": true,
    "ench": "manaBackflow",
    "val": 15
  },
  {
    "id": "BATTLEFIELD",
    "name": "전장",
    "nameJa": "戦場",
    "nameEn": "Battlefield",
    "cost": 2,
    "text": "【각 턴 시작 시】그 턴의 플레이어에게 2 데미지를 준다.",
    "textJa": "【各ターン開始時】そのターンのプレイヤーに2ダメージを与える。",
    "textEn": "【At the Start of Each Turn】Deal 2 damage to the player whose turn is starting.",
    "t": "spell",
    "noShop": true,
    "ench": "battlefield",
    "val": 99
  },
  {
    "id": "TRAINING_GROUND",
    "name": "훈련소",
    "nameJa": "訓練所",
    "nameEn": "Training Ground",
    "cost": 6,
    "text": "【자신의 턴 시작 시】주사위를 1회 굴린다.\n1~3: 포격병 1체를 자신의 필드에 소환한다.\n4~5: 대포병 1체를 자신의 필드에 소환한다.\n6: 자신의 필드에 있는 훈련소를 전부 파괴한다. 자신의 필드에 성이 있으면 파괴하는 대신 기사 2체를 자신의 필드에 소환한다.",
    "textJa": "【自分のターン開始時】ダイスを1回振る。\n1～3：「砲撃兵」1体を自分の場に召喚する。\n4～5：「大砲兵」1体を自分の場に召喚する。\n6：自分の場の「訓練所」を全て破壊する。自分の場に「城」がある場合、破壊する代わりに「騎士」2体を自分の場に召喚する。",
    "textEn": "【At the Start of Your Turn】Roll 1 die.\n1–3: Summon 1 Gunner to your field.\n4–5: Summon 1 Heavy Gunner to your field.\n6: Destroy all Training Grounds on your field. If you control a Castle, summon 2 Knights to your field instead of destroying them.",
    "t": "spell",
    "ench": "trainingGround",
    "val": 99
  },
  {
    "id": "GOBLIN_LEADER",
    "name": "고블린 리더",
    "nameJa": "ゴブリンリーダー",
    "nameEn": "Goblin Leader",
    "cost": 3,
    "text": "【소환 시】자신의 필드에 있는 고블린 계열 카드 수만큼 상대에게 데미지를 준다. 이 몬스터 자신과 지속 마법도 센다.",
    "textJa": "【召喚時】自分の場の「ゴブリン」関連カードの枚数分、相手にダメージを与える。このモンスター自身と永続魔法も数える。",
    "textEn": "【On Summon】Deal damage to the opponent equal to the number of Goblin-related cards on your field, including this monster and persistent spells.",
    "t": "mon",
    "atk": 4,
    "def": 3,
    "onSummon": "goblinLeader"
  },
  {
    "id": "GOBLIN_KING",
    "name": "고블린 킹",
    "nameJa": "ゴブリンキング",
    "nameEn": "Goblin King",
    "cost": 5,
    "text": "【소환 시】주사위를 1회 굴린다.\n1~2: 자신의 덱·패·묘지·필드에 고블린 계열 카드가 2종류 미만이면 이 카드 외 자신의 필드 카드를 전부 파괴한다. 그 경우 이번 턴 종료 시 이 카드를 자신의 리프트로 보낸다.\n3~6: 자신의 필드에 있는 고블린 계열 몬스터 전부 +2/+2(지속).",
    "textJa": "【召喚時】ダイスを1回振る。\n1～2：自分のデッキ・手札・墓地・場に「ゴブリン」関連カードが2種類未満なら、このカード以外の自分の場のカードを全て破壊する。その場合、このターン終了時にこのカードを自分のリフトへ送る。\n3～6：自分の場の「ゴブリン」系モンスター全てを+2/+2（持続）。",
    "textEn": "【On Summon】Roll 1 die.\n1–2: If your deck, hand, graveyard and field contain fewer than 2 distinct Goblin-related cards, destroy all other cards on your field. If so, send this card to your Rift at the end of this turn.\n3–6: Give all Goblin monsters on your field +2/+2 (lasting).",
    "t": "mon",
    "atk": 7,
    "def": 9,
    "onSummon": "goblinKing",
    "passive": [
      "aura",
      "guts"
    ]
  }
];
