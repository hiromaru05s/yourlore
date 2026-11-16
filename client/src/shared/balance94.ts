import type {CardDef} from './types';

export const balance94Prints: Record<string, Partial<CardDef>> = {
  "HEXER3": {
    "atk": 3,
    "def": 5
  },
  "MERC_LEADER": {
    "atk": 3,
    "def": 2
  },
  "MERC_MASTER": {
    "atk": 5,
    "def": 3
  },
  "TDE3": {
    "atk": 7,
    "def": 6
  },
  "GM5_0": {
    "atk": 8,
    "def": 3
  },
  "AWAKENED_MIMIC": {
    "atk": 2,
    "def": 2
  },
  "HEXER2": {
    "atk": 3,
    "def": 3
  },
  "TDE2": {
    "atk": 4,
    "def": 4
  },
  "GM5_2": {
    "atk": 3,
    "def": 6,
    "passive": [
      "taunt",
      "guts"
    ]
  },
  "FORBIDDEN": {
    "cost": 5
  },
  "MUSTER_DIE": {
    "cost": 4
  },
  "RELIC_PROTECTION": {
    "cost": 0,
    "maxUsesPerTurn": 1
  },
  "TRICKROOM": {
    "cost": 2
  },
  "BREWING": {
    "cost": 2,
    "val": 4
  },
  "NIGHT_CASTLE_GIFT": {
    "cost": 2,
    "play": 2,
    "val": 3
  },
  "TRIBE_PACT": {
    "cost": 1
  },
  "ACID_RAIN": {
    "play": 4
  }
};

export const balance94Text: Record<string, {ja:string; ko:string; en:string}> = {
  "QUICK_MUSTER": {
    "ja": "【購入時】「兵士」3体を自分の場に召喚する。自分の場に「城」があれば、代わりに「騎士」2体を召喚する。この効果で召喚されたモンスターは、このターン攻撃できない。",
    "ko": "【구매 시】병사 3체를 자신의 필드에 소환한다. 자신의 필드에 성이 있으면 대신 기사 2체를 소환한다. 이 효과로 소환된 몬스터는 이번 턴에 공격할 수 없다.",
    "en": "【On Purchase】Summon 3 Soldiers. If you control a Castle, summon 2 Knights instead. Monsters summoned this way cannot attack this turn."
  },
  "HEXER3": {
    "ja": "【召喚時】相手の墓地に「呪い」を3枚追加する。自分の場にいる、このカードと異なる名前の「呪術師」モンスター1種類につき、さらに1枚追加する。\n\n【場にある間】自分のターンの間、相手のデッキ構成にある「呪い」2枚につき、自分の場の全モンスターの攻撃力を1上げる。\n\n【自分のターン終了時】自分に呪印が15個以上あれば、相手の場のカードを1枚選んで破壊する。",
    "ko": "【소환 시】상대 묘지에 저주 3장을 추가한다. 자신의 필드에 있는 이 카드와 이름이 다른 주술사 몬스터 1종류당 1장을 더 추가한다.\n\n【필드에 있는 동안】자신의 턴 동안 상대 덱 구성의 저주 2장당 자신의 필드의 모든 몬스터의 공격력을 1 올린다.\n\n【자신의 턴 종료 시】자신의 주인이 15개 이상이면 상대 필드의 카드 1장을 선택해 파괴한다.",
    "en": "【On Summon】Add 3 Curses to the opponent’s graveyard. Add 1 more for each differently named Hexer monster you control, counting each other name once.\n\n【While on the Field】During your turn, all your monsters gain 1 ATK for every 2 Curses in the opponent’s deck composition.\n\n【At the End of Your Turn】If you have at least 15 Curse Seals, choose and destroy 1 card on the opponent’s field."
  },
  "FORBIDDEN": {
    "ja": "【購入時】自分の体力を1にする。これはダメージとして扱わない。シールド5を得て、自分の場に「悪魔」3体を召喚する。",
    "ko": "【구매 시】자신의 체력을 1로 설정한다. 이는 피해가 아니다. 실드 5을 얻고 자신의 필드에 악마 3체를 소환한다.",
    "en": "【On Purchase】Set your HP to 1 without dealing damage. Gain 5 Shield and summon 3 Devils to your field."
  },
  "QUICK_ESCORT": {
    "ja": "【購入時】挑発を持つ騎士を2体召喚する。自分の城があれば3体。自分がダメージを受けるまで、これらの騎士は攻撃できない。",
    "ko": "【구매 시】도발을 가진 기사 2체 소환. 자신의 성이 있으면 3체. 자신이 피해를 받을 때까지 이 기사들은 공격할 수 없다.",
    "en": "【On Purchase】Summon 2 Knights with Taunt, or 3 if you control a Castle. They cannot attack until you take damage."
  },
  "MERC_MASTER": {
    "ja": "【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で1マナを支払って召喚してもよい。\n\n【召喚時】依頼を1つ選ぶ。\n賞金首：相手の場のモンスター1体を指名する。このモンスターが戦闘でその相手を倒すと、自分は3マナを得る。相手が場を離れると指名は終了する。\n荒事：相手の場のモンスター1体に5ダメージを与える。\n護衛：「傭兵」1体を召喚する。この依頼はこのカードの召喚1回につき1度まで選べる。\n\n【召喚時】どちらかの場に「カジノ」があれば、ダイス10個を振る。\n\n【自分のターン開始時】どちらかの場に「カジノ」があれば、ダイス10個を振る。",
    "ko": "【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 1을 추가로 지불하고 소환할 수 있다.\n\n【소환 시】의뢰 1개를 선택한다.\n현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 몬스터가 전투로 그 몬스터를 처치하면 자신은 마나를 3 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n무력 행사: 상대 필드의 몬스터 1체에게 피해를 5 준다.\n호위: 용병 1체를 소환한다. 이 의뢰는 이 카드의 소환당 1번만 선택할 수 있다.\n\n【소환 시】어느 쪽 필드에든 카지노가 있으면 주사위 10개를 굴린다.\n\n【자신의 턴 시작 시】어느 쪽 필드에든 카지노가 있으면 주사위 10개를 굴린다.",
    "en": "【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 1 extra mana to summon it.\n\n【On Summon】Choose 1 contract.\nBounty: Mark 1 opposing monster. Gain 3 mana when this monster defeats it in battle. The mark expires when the target leaves the field.\nRough Work: Deal 5 damage to 1 opposing monster.\nEscort: Summon 1 Mercenary. You can choose Escort once per summon of this card.\n\n【On Summon】If either player controls a Casino, roll 10 dice.\n\n【At the Start of Your Turn】If either player controls a Casino, roll 10 dice."
  },
  "TAR5": {
    "ja": "【場にある間】相手の購入コスト4以下のモンスターはこのモンスターを攻撃できない。相手の全モンスターは自分を直接攻撃できない。",
    "ko": "【필드에 있는 동안】상대의 구매 코스트 4 이하 몬스터는 이 몬스터를 공격할 수 없다. 상대의 모든 몬스터는 자신을 직접 공격할 수 없다.",
    "en": "【While on the Field】Enemy monsters with purchase cost 4 or less cannot attack this monster. No enemy monster can attack you directly."
  },
  "MINI_SPIRIT": {
    "ja": "【場にある間】基本のアチューンを使用するたび自身の体力+2。自分が体力を得るたび攻撃力+1、シールドを得るたび+1/+1、雫を得るたび+1/+1。場を離れるとリセット。",
    "ko": "【필드에 있는 동안】기본 어튠 사용 시 체력 +2. 자신이 체력을 얻을 때마다 공격력 +1, 실드면 +1/+1, 이슬이면 +1/+1. 필드를 떠나면 초기화한다.",
    "en": "【While on the Field】Gain 2 HP whenever you play basic Attune. Whenever you gain HP, gain 1 ATK. Whenever you gain Shield, gain +1/+1. Whenever you gain Dew, gain +1/+1. Resets on leaving the field."
  },
  "GOBLIN": {
    "ja": "【攻撃時】相手プレイヤーに直接攻撃した場合、追加で1ダメージを与える。相手モンスターを攻撃する場合、自分に2ダメージを与える。",
    "ko": "【공격 시】상대 플레이어를 직접 공격하면 추가로 1 데미지를 준다. 상대 몬스터를 공격하면 자신에게 2 데미지를 준다.",
    "en": "【On Attack】When this monster directly attacks the opponent, deal 1 additional damage to them. When it attacks an enemy monster, deal 2 damage to yourself."
  },
  "SLUM_ASSASSIN": {
    "ja": "【召喚条件】自分の場に同名カードがない。\n\n【場にある間】自分のデッキ構成に「スラム街」があれば「回避」を得る。\n\n【破壊時】自分の手札を2枚選んで捨てる。手札が2枚未満なら全て捨てる。",
    "ko": "【소환 조건】자신의 필드에 같은 이름의 카드가 없다.\n\n【필드에 있는 동안】자신의 덱 구성에 슬럼가가 있으면 회피를 얻는다.\n\n【파괴 시】자신의 패에서 2장을 선택해 버린다. 2장 미만이면 전부 버린다.",
    "en": "【Summon Requirement】You control no copy of this card.\n\n【While on the Field】Gain Evade while Slums is in your deck composition.\n\n【On Destruction】Choose and discard 2 cards from your hand. If you have fewer than 2, discard your entire hand."
  },
  "RUST_SHROOM": {
    "ja": "【相手のモンスター腐敗破壊時】腐敗で相手モンスターが破壊されるたび、自分のマナ水晶+1（同名は重複しない）。\n\n【破壊時】ダイス1個を振る。3以上なら、自分に3ダメージを与え、このモンスターを墓地の代わりに自分のリフトへ送る。",
    "ko": "【상대의 몬스터가 부패로 파괴될 때】부패로 상대 몬스터가 파괴될 때마다 자신의 마나 수정 +1(동명 중첩 불가).\n\n【파괴 시】주사위 1개를 굴린다. 3 이상이면 자신에게 3 데미지를 주고 이 몬스터를 묘지 대신 자신의 리프트로 보낸다.",
    "en": "【When Decay Destroys an Enemy Monster】Whenever Decay destroys an enemy monster, increase your mana crystals by 1; multiple copies do not stack.\n\n【On Destruction】Roll 1 die. On 3 or more, take 3 damage and send this monster to your Rift instead of your graveyard."
  },
  "TRIAL_AREA": {
    "ja": "【発動時】自分に1ダメージを与える。\n\n【自分のターン開始時】新しい「カル」1枚を自分の墓地に追加する。",
    "ko": "【발동 시】자신에게 1 데미지를 준다.\n\n【자신의 턴 시작 시】새로운 컬 1장을 자신의 묘지에 추가한다.",
    "en": "【On Cast】You take 1 damage.\n\n【At the Start of Your Turn】Create 1 new Cull in your graveyard."
  },
  "RELIC_PROTECTION": {
    "ja": "【発動時】次の相手のターン終了時に限り、自分に残ったシールドは消失せず維持される。その次の相手のターン終了時には通常どおり消失する。\n\n【回数制限】同名カード合計で自分の各ターン1回まで使用できる。",
    "ko": "【발동 시】다음 상대 턴 종료 시에 한해 자신의 남은 실드가 소멸하지 않고 유지된다. 그다음 상대 턴 종료 시에는 정상적으로 소멸한다.\n\n【횟수 제한】같은 이름의 카드 합계로 자신의 턴마다 1회까지 사용할 수 있다.",
    "en": "【On Cast】At the end of the next opponent turn only, retain your remaining Shield instead of losing it. It expires normally at the end of the following opponent turn.\n\n【Use Limit】You may play cards with this name only 1 time during each of your turns in total."
  },
  "TRICKROOM": {
    "ja": "【発動時】このターンの間、両方の場の全モンスターの攻撃力と現在体力を入れ替える。このターン中に場に出るモンスターも対象。この入れ替えで体力が0になったモンスターを破壊する。ターン終了時に元に戻し、効果中に受けた強化は反対の能力値に残る。",
    "ko": "【발동 시】이번 턴 동안 양쪽 필드의 모든 몬스터의 공격력과 현재 체력을 서로 바꾼다. 이번 턴에 필드에 나오는 몬스터도 포함한다. 교환으로 체력이 0이 된 몬스터를 파괴한다. 턴 종료 시 되돌리며 효과 중 얻은 강화는 반대 능력치에 남는다.",
    "en": "【On Cast】This turn, swap the ATK and current HP of all monsters on both fields, including monsters that enter this turn. Destroy monsters reduced to 0 HP by the swap. Swap back at turn end. Buffs gained during the effect remain on the opposite stat."
  },
  "BREWING": {
    "ja": "【発動条件】自分の場に「醸造」がない。\n\n【自分のターン開始時】自分の手札の「ぶどう」「高品質ぶどう」「りんご」を全て自分の墓地へ送る。送った「ぶどう」1枚につき1個、「高品質ぶどう」1枚につき3個、「りんご」1枚につき5個、この魔法にカウンターを付与する。\n\n【期間】発動後、4回目の自分のターン開始時に上の処理を行った後、この魔法のカウンター数と同じ枚数の新しい「ワイン」を自分の手札に加え、この魔法を自分の墓地へ送る。",
    "ko": "【발동 조건】자신의 필드에 양조가 없다.\n\n【자신의 턴 시작 시】자신의 패에 있는 포도·고급 포도·사과를 전부 자신의 묘지로 보낸다. 보낸 포도 1장당 1개, 고급 포도 1장당 3개, 사과 1장당 5개의 카운터를 이 마법에 놓는다.\n\n【기간】발동 후 4번째 자신의 턴 시작에 위 처리를 한 뒤, 이 마법의 카운터 수만큼 새로운 와인을 자신의 패에 넣고 이 마법을 자신의 묘지로 보낸다.",
    "en": "【Play Requirement】You do not control Brewing.\n\n【At the Start of Your Turn】Send all Grapes, Fine Grapes and Apples in your hand to your graveyard. Put 1 counter on this spell per Grape sent and 3 per Fine Grape and 5 per Apple sent.\n\n【Duration】At your 4th turn start after casting, perform the effect above, then create Wines in your hand equal to this spell’s counters and send this spell to your graveyard."
  },
  "NIGHT_CASTLE_GIFT": {
    "ja": "【自分のターン開始時】発動後、3回目の自分のターン開始時に「吸血契約」「吸血の極意」から1枚を選び、その新しいカードを自分の手札に加える。その後、この魔法を自分の墓地へ送る。発動したターンと相手のターンは数えない。",
    "ko": "【자신의 턴 시작 시】발동 후 자신의 3번째 턴 시작에 흡혈 계약 또는 흡혈의 극의 중 1장을 선택해 새 카드를 자신의 패에 넣는다. 그 후 이 마법을 자신의 묘지로 보낸다. 발동한 턴과 상대 턴은 세지 않는다.",
    "en": "【At the Start of Your Turn】At your 3rd turn start after casting this spell, choose Vampiric Pact or Vampiric Secret Art and add a new copy to your hand. Then send this spell to your graveyard. Do not count the turn it was cast or the opponent’s turns."
  },
  "STARTER_CHEST": {
    "ja": "【使用時】ダイス1個を振る — 1-2: 相手の場に「ミミック」（攻撃力3・体力2）1体を召喚する / 3-4: 自分の体力を4回復する / 5-6: 自分のマナ水晶+1。",
    "ko": "【사용 시】주사위 1개를 굴린다 — 1-2: 상대의 필드에 미믹(공격력 3, 체력 2) 1체 소환한다 / 3-4: 자신의 체력을 4 회복한다 / 5-6: 자신의 마나 수정 +1.",
    "en": "【On Play】Roll 1 die — 1-2: Summon 1 Mimic (3 ATK, 2 HP) to the opponent's field / 3-4: Restore 4 of your HP / 5-6: Increase your mana crystals by 1."
  },
  "ATTUNE_RETURN": {
    "ja": "【発動時】手札を1枚捨て、デッキか墓地からアチューン1枚を手札に加える。デッキから加えた場合、自分の体力を1回復する。",
    "ko": "【발동 시】패 1장을 버린 뒤 덱이나 묘지의 기본 어튠 1장을 패에 넣는다. 덱에서 가져왔다면 자신의 체력을 1 회복한다.",
    "en": "【On Cast】Discard one card, then return one basic Attune from deck or graveyard to your hand. If you took it from your deck, restore 1 of your HP."
  },
  "FLAME": {
    "ja": "【発動時】相手に2ダメージ、自分に1ダメージを与える。この対戦中、自分がこの同名カードを使用した回数が今回を含めて7回以上なら、相手へのダメージは代わりに5になる。相手に烙印カウンターがある場合、追加で相手プレイヤーに4ダメージを与える。",
    "ko": "【발동 시】상대에게 2 데미지, 자신에게 1 데미지를 준다. 이번 사용을 포함해 이 대전에서 자신이 동명 카드를 사용한 횟수가 7회 이상이면 상대에게 주는 데미지는 대신 5가 된다. 상대에게 낙인 카운터가 있으면 상대 플레이어에게 추가로 4 데미지를 준다.",
    "en": "【On Cast】Deal 2 damage to the opponent and take 1 damage. If you have used cards with this name at least 7 times this duel, including this use, deal 5 to the opponent instead. If the opponent has a Brand counter, deal an additional 4 damage to the opponent."
  },
  "RIFT": {
    "ja": "【自分のリフト追加時】自分のリフトにカードが1枚追加されるたび、自分の体力を2回復する。",
    "ko": "【자신의 리프트에 추가 시】자신의 리프트에 카드가 1장 추가될 때마다 자신의 체력을 2 회복한다.",
    "en": "【Card Added to Your Rift】Whenever 1 card is added to your Rift, restore 2 of your HP."
  },
  "SUPPLY_LINE": {
    "ja": "【自分のモンスター召喚時】自分がモンスターを1体召喚するたび、自分はカードを1枚引く。召喚したモンスターの購入コストが6以上なら、その後この魔法を自分のリフトへ送る。",
    "ko": "【자신의 몬스터 소환 시】자신이 몬스터를 1체 소환할 때마다 카드를 1장 드로우한다. 소환한 몬스터의 구매 코스트가 6 이상이면 그 후 이 마법을 자신의 리프트로 보낸다.",
    "en": "【When You Summon a Monster】Draw 1 card each time you summon a monster. If the summoned monster has purchase cost 6 or more, then send this spell to your Rift."
  },
  "NOURISHING_RAIN": {
    "ja": "【発動時】自分は雫1を得る。自分の場に「世界樹」と「エルフ」系のカードが両方あれば、さらに自分の体力を2回復する。",
    "ko": "【발동 시】자신은 이슬 1을 얻는다. 자신의 필드에 세계수와 엘프 계열 카드가 모두 있으면 추가로 자신의 체력을 2 회복한다.",
    "en": "【On Cast】Gain 1 Dew. If you control both World Tree and an Elf-family card, also restore 2 of your HP."
  },
  "BATTLEFIELD": {
    "ja": "【各ターン開始時】そのターンのプレイヤーに2ダメージを与える。\n\n【自分のモンスター破壊時】自分の場の購入コスト3以下のモンスターが破壊され、自分の墓地へ送られた直後、ダイス1個を振る。5以上なら、そのカードを自分の手札に加える。",
    "ko": "【각 턴 시작 시】그 턴의 플레이어에게 2 데미지를 준다.\n\n【자신의 몬스터 파괴 시】자신의 필드에서 구매 코스트 3 이하인 몬스터가 파괴되어 자신의 묘지로 보내진 직후, 주사위 1개를 굴린다. 5 이상이면 그 카드를 자신의 패에 넣는다.",
    "en": "【At the Start of Each Turn】Deal 2 damage to the player whose turn is starting.\n\n【When Your Monster Is Destroyed】Immediately after a monster with purchase cost 3 or less is destroyed on your field and sent to your graveyard, roll 1 die. On 5 or more, return that card to your hand."
  }
};
