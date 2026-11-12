import type {CardDef} from './types';
export const RUNE_RULE_TEXT = {
  ELITE:{ja:'【召喚条件】自分のデッキ構成が6枚以下。\n\n【召喚時】自分の場に「騎士」1体を召喚する。',ko:'【소환 조건】자신의 덱 구성이 6장 이하이다.\n\n【소환 시】자신의 필드에 기사 1체를 소환한다.',en:'【Summon Requirement】Your deck composition has 6 cards or fewer.\n\n【On Summon】Summon 1 Knight to your field.'},
  HORDE:{ja:'【召喚時】自分の場の、このモンスター以外の全ての兵士系モンスターの攻撃力+3（対象が場を離れるまで）。',ko:'【소환 시】자신의 필드에서 이 몬스터 이외의 모든 병사 계열 몬스터의 공격력+3(효과를 받은 몬스터가 필드를 떠날 때까지).',en:'【On Summon】All other military monsters on your field gain 3 ATK until the affected monster leaves the field.'},
  "GS6_4": {
    "ja": "【場にある間】自分の魔法・モンスター効果が相手プレイヤーまたは相手モンスターに与えるダメージを4増やす。相手に烙印があれば、代わりに元のダメージを2倍にする。",
    "ko": "【필드에 있는 동안】자신의 마법·몬스터 효과로 상대 플레이어나 상대 몬스터에게 주는 데미지가 4 증가한다. 상대에게 낙인이 있으면 대신 원래 데미지가 2배가 된다.",
    "en": "【While on the Field】Your spells and monster effects deal 4 extra damage to the opponent or their monsters. If the opponent has a Brand, double the original damage instead."
  },
  "PENANCE": {
    "ja": "【発動条件】自分に烙印がある。\n\n【発動時】自分の烙印を1個消費し、マナ水晶を1個得る。自分の体力を15回復する。",
    "ko": "【발동 조건】자신에게 낙인이 있다.\n\n【발동 시】자신의 낙인 1개를 소모하고 마나 수정 1개를 얻는다. 자신의 체력을 15 회복한다.",
    "en": "【Play Requirement】You have a Brand.\n\n【On Cast】Spend 1 Brand, gain 1 mana crystal and restore 15 HP."
  },
  "FREE_REWARD": {
    "ja": "【場にある間】どちらかのプレイヤーが購入コスト0のカードを使うたび、自分はカードを1枚引く。",
    "ko": "【필드에 있는 동안】누구든 구매 코스트 0인 카드를 사용할 때마다 자신은 카드 1장을 뽑는다.",
    "en": "【While on the Field】Whenever either player plays a card with purchase cost 0, draw 1 card."
  },
  "MULTI_CULTURE": {
    "ja": "【発動条件】両方の場に異なる種族のモンスターが2種類以上いる。\n\n【発動時】種族数に一致する効果を適用する。2種類ならマナ水晶を1個得る。3種類なら相手の場のカードを2枚選んで破壊する。4種類なら相手に烙印を1個付与する。5種類以上なら相手の場のカードを全て破壊してリフトへ送る。",
    "ko": "【발동 조건】양쪽 필드에 서로 다른 종족이 2종 이상 있다.\n\n【발동 시】종족 수에 맞는 효과만 적용한다. 2종이면 마나 수정 1개를 얻는다. 3종이면 상대 필드의 카드 2장을 골라 파괴한다. 4종이면 상대에게 낙인 1개를 준다. 5종 이상이면 상대 필드의 모든 카드를 파괴하여 리프트로 보낸다.",
    "en": "【Play Requirement】Monsters on the two fields represent at least 2 distinct tribes.\n\n【On Cast】Apply the matching tier. With 2 tribes, gain 1 mana crystal. With 3, choose and destroy 2 opposing field cards. With 4, give the opponent 1 Brand. With 5 or more, destroy every opposing field card and send it to the Rift."
  },
  "CHOSEN_ARCHER": {
    "ja": "【場にある間】自分のリフトの「カル」1枚につき攻撃力+1。このモンスターが相手モンスターを破壊したら、次の相手のターンの間、威厳を得る。",
    "ko": "【필드에 있는 동안】자신의 리프트의 컬 1장당 공격력+1. 이 몬스터가 상대 몬스터를 파괴하면 다음 상대 턴 동안 위엄을 얻는다.",
    "en": "【While on the Field】Gain 1 ATK per Cull in your Rift. When this monster destroys an opposing monster, it gains Majesty during the next opposing turn."
  },
  "CHOSEN_KNIGHT": {
    "ja": "【場にある間】自分のリフトの「カル」1枚につき攻撃力と最大体力が1上がる。このモンスターが戦闘を行うたび、気合用カウンターを1個得る。",
    "ko": "【필드에 있는 동안】자신의 리프트의 컬 1장당 공격력과 최대 체력이 1 증가한다. 이 몬스터가 전투할 때마다 기합 카운터를 1개 얻는다.",
    "en": "【While on the Field】Gain 1 ATK and maximum HP per Cull in your Rift. Whenever this monster fights, it gains 1 Guts counter."
  },
  "CHOSEN_MAGE": {
    "ja": "【召喚時】相手の永続魔法を2枚まで選んで破壊する。1枚以上を選んだら、自分のリフトに「カル」があれば1枚を自分の墓地へ戻す。\n\n【場にある間】自分のリフトの「カル」2枚につき攻撃力と最大体力が1上がる。自分の魔法の発動コストを1下げる（最低1）。",
    "ko": "【소환 시】상대 영구 마법을 최대 2장 골라 파괴한다. 1장 이상 골랐다면 자신의 리프트에 컬이 있을 때 1장을 자신의 묘지로 되돌린다.\n\n【필드에 있는 동안】자신의 리프트의 컬 2장당 공격력과 최대 체력이 1 증가한다. 자신의 마법의 발동 코스트가 1 감소한다(최소 1).",
    "en": "【On Summon】Choose and destroy up to 2 opposing persistent spells. If you choose any, return 1 Cull from your Rift to your graveyard if available.\n\n【While on the Field】Gain 1 ATK and maximum HP per 2 Culls in your Rift. Reduce your spells’ cast cost by 1, minimum 1."
  },
  "CHOSEN_ROGUE": {
    "ja": "【召喚時】相手モンスター1体を選んで破壊する。\n\n【場にある間】自分のリフトの「カル」2枚につき攻撃力+2。このモンスターの攻撃ダメージは相手のシールドを無視する。相手プレイヤーに攻撃ダメージを与えたら、次の相手のターンの間、オーラを得る。",
    "ko": "【소환 시】상대 몬스터 1체를 골라 파괴한다.\n\n【필드에 있는 동안】자신의 리프트의 컬 2장당 공격력+2. 이 몬스터의 공격 데미지는 상대의 실드를 무시한다. 상대 플레이어에게 공격 데미지를 주면 다음 상대 턴 동안 아우라를 얻는다.",
    "en": "【On Summon】Choose and destroy 1 opposing monster.\n\n【While on the Field】Gain 2 ATK per 2 Culls in your Rift. This monster’s attack damage bypasses opposing Shield. When its attack damages the opponent, it gains Aura during the next opposing turn."
  },
  "SCRAPPER": {
    "ja": "【発動条件】手札にリフトへ送れる他のカードがある。\n\n【発動時】手札1枚を選んでリフトへ送り、その購入コストに応じた効果を得る。0～1なら3マナを得る。2なら新しい「ワイン」1枚を手札に加える。3以上なら相手の場から虚無を持たないカード1枚を選び、相手の手札に戻す。",
    "ko": "【발동 조건】패에 리프트로 보낼 다른 카드가 있다.\n\n【발동 시】패 1장을 골라 리프트로 보내고 그 구매 코스트에 맞는 효과를 얻는다. 0~1이면 마나 3을 얻는다. 2면 새 와인 1장을 패에 넣는다. 3 이상이면 상대 필드에서 공허가 없는 카드 1장을 골라 상대 패로 돌려보낸다.",
    "en": "【Play Requirement】You have another card in hand that can be sent to the Rift.\n\n【On Cast】Send 1 card from your hand to the Rift. At purchase cost 0–1, gain 3 mana. At 2, add a new Wine to your hand. At 3 or more, choose an opposing field card without Void and return it to its owner’s hand."
  },
  "RUNE1": {
    "ja": "【発動時】相手モンスター1体を選び、虚無以外のパッシブを1つ選んで取り除く。オーラも対象にできる。このターン、先に魔法を4回以上使用したか、同名以外のルーン系カードを使用していれば、代わりに相手の全モンスターから虚無以外のパッシブを全て取り除く。",
    "ko": "【발동 시】상대 몬스터 1체를 골라 공허 이외의 패시브 1개를 선택해 제거한다. 아우라도 선택 가능하다. 이번 턴에 앞서 마법을 4회 이상 사용했거나 다른 이름의 룬 계열 카드를 사용했다면 대신 상대의 모든 몬스터에서 공허 이외의 모든 패시브를 제거한다.",
    "en": "【On Cast】Choose an opposing monster and remove 1 passive of your choice other than Void. You can target Aura. If you previously played at least 4 spells or a differently named Rune card this turn, instead remove all passives other than Void from every opposing monster."
  },
  "RUNE2": {
    "ja": "【発動時】場のモンスター1体に、発動コストに応じたパッシブを付与する。1マナ：気合。2マナ：反撃または回避。3マナ：オーラまたは威厳。このターン、先に魔法を4回以上使用したか、同名以外のルーン系カードを使用していれば、どの選択肢も0マナ。",
    "ko": "【발동 시】필드의 몬스터 1체에 발동 코스트에 따른 패시브를 준다. 마나 1: 기합. 마나 2: 반격 또는 회피. 마나 3: 아우라 또는 위엄. 이번 턴에 앞서 마법을 4회 이상 사용했거나 다른 이름의 룬 계열 카드를 사용했다면 모든 선택지가 마나 0이다.",
    "en": "【On Cast】Choose a cast cost and grant a passive to 1 monster on either field. Pay 1 mana for Guts, 2 for Counter or Evade, or 3 for Aura or Majesty. If you previously played at least 4 spells or a differently named Rune card this turn, all choices cost 0 mana."
  },
  "RUNE3": {
    "ja": "【発動時】両方の場のモンスターが持つパッシブの合計数だけ、相手プレイヤーと相手の全モンスターにダメージを与える。0個なら代わりに相手モンスター1体に虚無を付与する（オーラも選べる）。このターン、先に魔法を4回以上使用したか、同名以外のルーン系カードを使用していれば、さらに相手プレイヤーと相手の全モンスターに3ダメージ。",
    "ko": "【발동 시】양쪽 필드의 몬스터가 가진 패시브의 합계만큼 상대 플레이어와 모든 상대 몬스터에게 데미지를 준다. 0개면 대신 상대 몬스터 1체에 공허를 준다(아우라도 선택 가능). 이번 턴에 앞서 마법을 4회 이상 사용했거나 다른 이름의 룬 계열 카드를 사용했다면 상대 플레이어와 모든 상대 몬스터에게 추가로 3 데미지를 준다.",
    "en": "【On Cast】Deal damage to the opponent and all opposing monsters equal to the total number of monster passives on both fields. At 0, grant Void to 1 opposing monster instead, even one with Aura. If you previously played at least 4 spells or a differently named Rune card this turn, also deal 3 damage to the opponent and all opposing monsters."
  },
  "RUNE_BARRIER": {
    "ja": "【場にある間】次の相手のターン中、パッシブを持つ相手モンスターは攻撃できない。そのターンの終了時、またはパッシブを持たない相手モンスターから直接攻撃か貫通で自分がダメージを受けた時、このカードを破壊する。",
    "ko": "【필드에 있는 동안】다음 상대 턴 동안 패시브를 가진 상대 몬스터는 공격할 수 없다. 그 턴 종료 시 또는 패시브가 없는 상대 몬스터의 직접 공격이나 관통으로 자신이 피해를 받으면 이 카드를 파괴한다.",
    "en": "【While on the Field】During the next opposing turn, opposing monsters with passives cannot attack. Destroy this spell at the end of that turn or when a direct attack or piercing damage from a passive-free opposing monster damages you."
  },
  "RUNE_GLYPH": {
    "ja": "【購入時】場のモンスター1体を選び、その虚無以外のランダムなパッシブ1つを別の場のモンスター1体に付与する。どちらもオーラを選べる。自分のデッキ構成に同名以外のルーン系カードがあれば、さらにルーン系カード1枚を選んで手札に加える。",
    "ko": "【구매 시】필드의 몬스터 1체를 골라 공허 이외의 무작위 패시브 1개를 필드의 다른 몬스터 1체에 부여한다. 둘 다 아우라를 선택할 수 있다. 자신의 덱 구성에 다른 이름의 룬 계열 카드가 있으면 룬 계열 카드 1장도 골라 패에 넣는다.",
    "en": "【On Purchase】Choose a field monster and grant 1 random non-Void passive it has to a different field monster. Either target may have Aura. If your deck composition contains a differently named Rune card, also choose a Rune card to add to your hand."
  },
  "Q_RUNE_SECRET": {
    "ja": "【達成条件】設置後、自分が魔法を20回使用するか、ルーン系魔法を1回使用する。\n\n【達成時】自分のマナ水晶+1。ルーン系魔法で達成した場合、このカードを墓地へ送る。それ以外はリフトへ送る。",
    "ko": "【달성 조건】설치 후 자신이 마법을 20회 사용하거나 룬 계열 마법을 1회 사용한다.\n\n【달성 시】자신의 마나 수정+1. 룬 계열 마법으로 달성했으면 이 카드를 묘지로, 아니면 리프트로 보낸다.",
    "en": "【Completion Requirement】After deployment, play 20 spells or play 1 Rune spell.\n\n【On Completion】Gain 1 mana crystal. Send this card to your graveyard if completed by a Rune spell, otherwise to your Rift."
  },
  "RUNE_SAI": {
    "ja": "【召喚時】このターン、自分が購入するルーン系カードの購入コストは全て1になる。\n\n【場にある間】自分が魔法を使うたび攻撃力+1。ルーン系魔法なら代わりに+2。",
    "ko": "【소환 시】이번 턴 자신이 구매하는 모든 룬 계열 카드의 구매 코스트는 1이 된다.\n\n【필드에 있는 동안】자신이 마법을 사용할 때마다 공격력+1. 룬 계열 마법이면 대신 +2.",
    "en": "【On Summon】For this turn, the purchase cost of your Rune cards is 1.\n\n【While on the Field】Whenever you play a spell, gain 1 ATK, or 2 for a Rune spell."
  },
  "RUNE_NIKRO": {
    "ja": "【召喚時】このターン、自分が購入するルーン系カードの購入コストは全て1になる。\n\n【場にある間】自分が魔法を使うたび、自分の場のモンスター1体を選び、虚無・境界を除くランダムなパッシブを1つ付与する。ルーン系魔法なら2つ付与する。",
    "ko": "【소환 시】이번 턴 자신이 구매하는 모든 룬 계열 카드의 구매 코스트는 1이 된다.\n\n【필드에 있는 동안】자신이 마법을 사용할 때마다 자신의 필드의 몬스터 1체를 골라 공허·경계를 제외한 무작위 패시브 1개를 준다. 룬 계열 마법이면 2개를 준다.",
    "en": "【On Summon】For this turn, the purchase cost of your Rune cards is 1.\n\n【While on the Field】Whenever you play a spell, choose 1 allied monster and grant it 1 random passive other than Void or Boundary, or 2 for a Rune spell."
  },
  "FORBIDDEN": {
    "ja": "【購入時】自分の体力を1にする。これはダメージとして扱わない。シールド30を得て、自分の場に「悪魔」3体を召喚する。",
    "ko": "【구매 시】자신의 체력을 1로 설정한다. 이는 피해가 아니다. 실드 30을 얻고 자신의 필드에 악마 3체를 소환한다.",
    "en": "【On Purchase】Set your HP to 1 without dealing damage. Gain 30 Shield and summon 3 Devils to your field."
  },
  "DEVIL_TOKEN": {
    "ja": "【場にある間】このモンスターが相手プレイヤーを直接攻撃するたび攻撃力−3。どちらかの場のモンスター効果が発動するたび攻撃力と最大体力が1上がる。変化は対象が場を離れるまで続く。",
    "ko": "【필드에 있는 동안】이 몬스터가 상대 플레이어를 직접 공격할 때마다 공격력−3. 어느 쪽이든 필드의 몬스터 효과가 발동할 때마다 공격력과 최대 체력이 1 증가한다. 변화는 효과를 받은 몬스터가 필드를 떠날 때까지 지속된다.",
    "en": "【While on the Field】Each time this monster directly attacks the opponent, it loses 3 ATK. Whenever a monster effect activates on either field, gain 1 ATK and maximum HP. These changes last until the affected monster leaves the field."
  },
  "EXILE_NUKE2": {
    "ja": "【発動時】自分のリフトのカード枚数×2ダメージを、相手プレイヤーと相手の全モンスターに与える。その後、自分のリフトから虚無を持つモンスター以外のカードを全て自分の墓地に戻す。",
    "ko": "【발동 시】자신의 리프트 카드 수×2 데미지를 상대 플레이어와 모든 상대 몬스터에게 준다. 그 후 자신의 리프트에서 공허를 가진 비몬스터 카드를 전부 자신의 묘지로 되돌린다.",
    "en": "【On Cast】Deal damage equal to twice the number of cards in your Rift to the opponent and every opposing monster. Then return every non-monster card with Void from your Rift to your graveyard."
  },
  "M1": {
    "ja": "【破壊時】戦闘以外で破壊された場合、相手に烙印を1個付与する。",
    "ko": "【파괴 시】전투 이외의 방법으로 파괴되면 상대에게 낙인 1개를 부여한다.",
    "en": "【On Destruction】If destroyed outside battle, give the opponent 1 Brand."
  },
  "ORIGIN_QUEST": {
    "ja": "【発動時】両方の場の購入コスト0のモンスター・永続魔法1枚につき、カードを1枚引く。 さらに、このターンに次に手札から召喚する始原モンスターの召喚コストを0にする。",
    "ko": "【발동 시】양쪽 필드의 구매 코스트 0 몬스터·영구 마법 1장당 카드를 1장 뽑는다. 또한 이번 턴 다음에 패에서 소환하는 시초 몬스터의 소환 코스트가 0이 된다.",
    "en": "【On Cast】Draw 1 card for each monster or persistent spell of purchase cost 0 on either field. Also, the summon cost of your next Origin monster from hand this turn is 0."
  },
  "MIMIC_LORD": {
    "ja": "【召喚時】両方の場の、このモンスター以外の「ミミック」系モンスター1体につき、このモンスターの攻撃力+3・体力+3（対象が場を離れるまで）。 さらに相手の場の「ミミック」1体を自分の場に移す。",
    "ko": "【소환 시】양쪽 필드의 이 몬스터 외 미믹 계열 몬스터 1체당 이 몬스터의 공격력 +3, 체력 +3(효과를 받은 몬스터가 필드를 떠날 때까지). 또한 상대 필드의 ‘미믹’ 1체를 자신의 필드로 옮긴다.",
    "en": "【On Summon】This monster gets +3 ATK and +3 HP for each other Mimic-family monster on either field (until the affected monster leaves the field). Also take control of 1 opposing monster named Mimic."
  },
  "FARMER": {
    "ja": "【召喚時】自分の場に「農場」があり、「農民の祈り」がなければ、新しい「農民の祈り」1枚を自分の場に展開する。 \n\n【場にある間】自分の場の「かかし」の最大体力+6。",
    "ko": "【소환 시】자신의 필드에 농장이 있고 농민의 기도가 없으면 새 농민의 기도 1장을 자신의 필드에 전개한다. \n\n【필드에 있는 동안】자신 필드의 허수아비 최대 체력+6.",
    "en": "【On Summon】If you control Farm and no Farmer’s Prayer, deploy a new Farmer’s Prayer to your field. \n\n【While on the Field】Your Scarecrows have +6 maximum HP."
  },
  "EGG_MASTER": {
    "ja": "【召喚時】自分の場の全ての卵にカウンターを5個ずつ追加する（孵化までの残りターンは変わらない）。 \n\n【自分のターン開始時】自分の卵1個を選び、耐久を1消費して孵化までの残りを5ターン減らす（最低0）。0なら直ちに孵化する。",
    "ko": "【소환 시】자신의 필드의 모든 알에 카운터를 각각 5개 추가한다(부화까지 남은 턴은 바뀌지 않음). \n\n【자신의 턴 시작 시】자신의 알 1개를 골라 내구도 1을 소모하고 부화까지 남은 턴을 5 줄인다(최소 0). 0이면 즉시 부화한다.",
    "en": "【On Summon】Add 5 counters to each Egg on your field; remaining hatch turns do not change. \n\n【At the Start of Your Turn】Choose 1 of your Eggs, spend 1 durability and reduce the turns until hatching by 5, to a minimum of 0. At 0, hatch it immediately."
  },
  "S15": {
    "ja": "【発動条件】どちらかの場に購入コスト8以下のモンスターがいる。\n\n【発動時】両方の場から購入コスト8以下のモンスターを1体まで選んで破壊する。 自分のデッキ構成に同名以外のルーン系カードがあれば、0コストでもう1回使用する。",
    "ko": "【발동 조건】어느 쪽이든 필드에 구매 코스트 8 이하의 몬스터가 있다.\n\n【발동 시】양쪽 필드에서 구매 코스트 8 이하 몬스터를 최대 1체 선택해 파괴한다. 자신의 덱 구성에 다른 이름의 룬 계열 카드가 있으면 코스트 0으로 1번 더 사용한다.",
    "en": "【Play Requirement】There is a monster with purchase cost 8 or less on either field.\n\n【On Cast】Choose up to 1 monster on either field with purchase cost 8 or less and destroy it. If your deck composition contains a differently named Rune card, play this spell once more at cost 0."
  },
  "ND2": {
    "ja": "【発動時】カードを2枚引く。自分の体力を3回復する。 自分のデッキ構成に同名以外のルーン系カードがあれば、0コストでもう1回使用する。",
    "ko": "【발동 시】카드를 2장 뽑는다. 자신의 체력을 3 회복한다. 자신의 덱 구성에 다른 이름의 룬 계열 카드가 있으면 코스트 0으로 1번 더 사용한다.",
    "en": "【On Cast】Draw 2 cards. Restore 3 of your HP. If your deck composition contains a differently named Rune card, play this spell once more at cost 0."
  },
  "WINE_COLLECTOR": {
    "ja": "【召喚時】自分の手札に「ワイン」が2枚以上あれば、次の全てを行う。\nそのうち2枚を自動で自分のリフトへ送る。新しい「闇商人」1枚を自分の手札に加える。このモンスターも自分のリフトへ送る。\n\n【場にある間】どちらかのプレイヤーが「ぶどう」を使用するたび、その使用者の墓地に新しい「高品質ぶどう」1枚を加える。",
    "ko": "【소환 시】자신의 패에 와인이 2장 이상 있으면 다음을 모두 처리한다.\n그중 2장을 자동으로 자신의 리프트로 보낸다. 새로운 암상인 1장을 자신의 패에 넣는다. 이 몬스터도 자신의 리프트로 보낸다.\n\n【필드에 있는 동안】어느 플레이어든 '포도'를 사용할 때마다 그 사용자의 묘지에 새로운 '고급 포도' 1장을 추가한다.",
    "en": "【On Summon】If your hand contains at least 2 Wines, do all of the following.\nAutomatically send 2 of them to your Rift. Create 1 Black Market Dealer in your hand. Send this monster to your Rift.\n\n【While on the Field】Whenever either player plays a Grape, create 1 Fine Grape in that player's graveyard."
  },
  "DISARM2": {
    "ja": "【発動条件】いずれかの場に永続魔法がある。\n\n【発動時】両方の場から永続魔法を2枚まで選んで破壊する。",
    "ko": "【발동 조건】어느 쪽이든 필드에 영구 마법이 있다.\n\n【발동 시】양쪽 필드에서 영구 마법 최대 2장을 선택해 파괴한다.",
    "en": "【Play Requirement】Either player controls a persistent spell.\n\n【On Cast】Choose and destroy up to 2 persistent spells on either field."
  },
  "DISARM3": {
    "ja": "【発動条件】いずれかの場に永続魔法がある。\n\n【発動時】相手の永続魔法1枚をランダムに破壊し、墓地の代わりに相手のリフトへ送る。",
    "ko": "【발동 조건】어느 쪽이든 필드에 영구 마법이 있다.\n\n【발동 시】상대 영구 마법 1장을 무작위로 파괴하고 묘지 대신 상대의 리프트로 보낸다.",
    "en": "【Play Requirement】Either player controls a persistent spell.\n\n【On Cast】Destroy 1 random enemy persistent spell and send it to their Rift instead of their graveyard."
  },
  "COLOSSEUM": {
    "ja": "【自分のターン開始時】自分のリフトに「カル」が8枚以上あれば、「選ばれし」モンスターの一覧から1体を選び、3マナを払って新たに自分の場に召喚してよい。 また、自分のリフトの「カル」が8枚以下なら、ダイス1個を振る。1～4なら「兵士」1体、5～6なら「騎士」1体を自分の場に召喚する。",
    "ko": "【자신의 턴 시작 시】자신의 리프트에 컬이 8장 이상이면 선택받은 몬스터 목록에서 1체를 선택해 마나 3을 내고 새로 자신의 필드에 소환할 수 있다. 또한 자신의 리프트의 컬이 8장 이하이면 주사위 1개를 굴린다. 1~4이면 병사 1체, 5~6이면 기사 1체를 자신의 필드에 소환한다.",
    "en": "【At the Start of Your Turn】If your Rift contains at least 8 Culls, you may choose 1 monster from the Chosen catalog and pay 3 mana to summon a new copy to your field. Also, if your Rift has 8 or fewer Culls, roll 1 die. Summon 1 Soldier on 1–4 or 1 Knight on 5–6."
  },
  "SPACE_RITE": {
    "ja": "【発動条件】相手の場のモンスター・永続魔法が合計6枚以上。\n\n【場にある間】相手はモンスターを召喚できず、魔法を使用できない。\n\n【期間】自分のターン開始を2回迎えると終了する。",
    "ko": "【발동 조건】상대의 필드의 몬스터·영구 마법이 합계 6장 이상.\n\n【필드에 있는 동안】상대는 몬스터를 소환하거나 마법을 사용할 수 없다.\n\n【기간】자신의 턴 시작을 2회 맞으면 종료한다.",
    "en": "【Play Requirement】The opponent controls at least 6 monsters and persistent spells combined.\n\n【While on the Field】The opponent cannot summon monsters or play spells.\n\n【Duration】Expires at the start of your 2rd subsequent turn."
  },
  "KIN_CALL": {
    "ja": "【場にある間】自分のデッキ構成に種族を持つモンスターがあれば、自分がマーケットで購入する種族カードの購入コスト−2（最低1）。",
    "ko": "【필드에 있는 동안】자신의 덱 구성에 종족 몬스터가 있으면 마켓에서 구매하는 종족 카드의 구매 코스트−2(최소 1).",
    "en": "【While on the Field】If your deck composition contains a tribal monster, reduce the purchase cost of tribal cards in the market by 2, minimum 1."
  },
  "MANA_HEART": {
    "ja": "【発動時】このゲームで両者を通じて最初の1回だけ、使用者のマナ水晶+3。22ターン後、その使用者の体力を1にし、その永続魔法を全て破壊し、マナ水晶を6失わせる。2回目以降は誰が使っても双方の体力を9回復するだけで、22ターン後の効果を追加・延期しない。",
    "ko": "【발동 시】이 게임에서 양측을 통틀어 최초 1회만 사용자의 마나 수정+3. 22턴 뒤 그 사용자의 체력을 1로 만들고 그 플레이어의 모든 영구 마법을 파괴하고 마나 수정 6개를 잃게 한다. 2회째부터는 누가 사용해도 양측 체력 9 회복만 적용하며 22턴 뒤의 효과를 추가하거나 미루지 않는다.",
    "en": "【On Cast】Only the first use across both players grants its caster 3 mana crystals. After 22 turns, set that caster’s HP to 1, destroy all their persistent spells and remove 6 mana crystals. From the 2nd use on, either caster only heals both players for 9. This does not add or postpone the 22-turn effect."
  }
};

export const RUNE_IDS = new Set(['RUNE1','RUNE2','RUNE3','S15','ND2','RUNE_SAI','RUNE_NIKRO','RUNE_BARRIER','RUNE_GLYPH','Q_RUNE_SECRET']);
export const NOVEMBER_PRINTS: Record<string,Partial<CardDef>> = {
  ELITE:{atk:6,def:6,summonReq:"sixCards"}, HORDE:{atk:2,def:3},
  INFERNO:{cost:4}, MAGIC_BANK:{play:3},
  GS6_4:{cost:6,play:6,ench:'firevein',val:99}, MULTI_CULTURE:{cost:2},
  CHOSEN_ARCHER:{condAtk:'cullEachAttack',attackFx:undefined},
  CHOSEN_KNIGHT:{condAtk:'cullEachBoth',attackFx:undefined,passive:['guts','taunt']},
  CHOSEN_MAGE:{onSummon:'chosenDispel',passive:['aura','evade']},
  CHOSEN_ROGUE:{onSummon:'chosenAssassinate'},
  FARM_KEEPER:{atk:0,def:3}, FARMER:{atk:1,def:2},
  SCRAPPER:{cost:1,play:1}, SPACE_RITE:{val:2}, EXILE_NUKE2:{play:5},
  FORBIDDEN:{cost:2,quick:true}, WINE_COLLECTOR:{onSummon:'wineCollector'},
  RUNE1:{cost:1,play:1,act:undefined}, RUNE2:{cost:2,play:1}, RUNE3:{cost:3,ench:undefined,val:undefined},
};
export function applyRuneCatalog(db:Record<string,CardDef>):void {
  for(const [id,patch] of Object.entries(NOVEMBER_PRINTS)) Object.assign(db[id],patch);
  function add(id:keyof typeof RUNE_RULE_TEXT, names:[string,string,string], cost:number, props:Partial<CardDef>) {
    const t=RUNE_RULE_TEXT[id];
    db[id]={id,t:'spell',cost,nameJa:names[0],name:names[1],nameEn:names[2],textJa:t.ja,text:t.ko,textEn:t.en,...props};
  }
  add('RUNE_SAI',['ルーンマジシャン - サイ','룬 매지션 - 사이','Rune Magician - Sai'],2,{t:'mon',atk:1,def:2,onSummon:'runeMarket',passive:['aura']});
  add('RUNE_NIKRO',['ルーンマジシャン - ニクロ','룬 매지션 - 니크로','Rune Magician - Nikro'],2,{t:'mon',atk:2,def:1,onSummon:'runeMarket',passive:['aura']});
  add('RUNE_BARRIER',['ルーン結界','룬 결계','Rune Barrier'],1,{ench:'runeBarrier',val:99});
  add('RUNE_GLYPH',['ルーン文字','룬 문자','Rune Glyph'],2,{quick:true});
  add('Q_RUNE_SECRET',['ルーンの秘密','룬의 비밀','Secret of the Runes'],1,{t:'quest',noShop:true,quest:{event:'spellPlay',target:20}});
  add('DEVIL_TOKEN',['悪魔','악마','Devil'],0,{t:'mon',atk:5,def:5,noShop:true,passive:['void','aura']});
  delete db.INQUISITION;
}
