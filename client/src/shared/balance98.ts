import type { CardDef } from './types';

export const balance98Prints: Record<string, Partial<CardDef>> = {
  CAPTAIN: { atk: 5, def: 1 },
  HEXER3: { val: 2 },
  MERC_LEADER: { val2: 2 },
  GOBLIN_LEADER: { def: 2 },
  TDE3: { play: 5, def: 5 },
  TDE2: { play: 3 },
  FATE_WHEEL: { cost: 3 },
};

export const balance98Text = {
  HEXER3: {
    ja: "【召喚時】相手の墓地に「呪い」を2枚追加する。自分の場にいる、このカードと異なる名前の「呪術師」モンスター1種類につき、さらに1枚追加する。\n\n【場にある間】自分のターンの間、相手のデッキ構成にある「呪い」2枚につき、自分の場の全モンスターの攻撃力を1上げる。\n\n【自分のターン終了時】自分に呪印が15個以上あれば、相手の場のカードを1枚選んで破壊する。",
    ko: "【소환 시】상대 묘지에 저주 2장을 추가한다. 자신의 필드에 있는 이 카드와 이름이 다른 주술사 몬스터 1종류당 1장을 더 추가한다.\n\n【필드에 있는 동안】자신의 턴 동안 상대 덱 구성의 저주 2장당 자신의 필드의 모든 몬스터의 공격력을 1 올린다.\n\n【자신의 턴 종료 시】자신의 주인이 15개 이상이면 상대 필드의 카드 1장을 선택해 파괴한다.",
    en: "【On Summon】Add 2 Curses to the opponent’s graveyard. Add 1 more for each differently named Hexer monster you control, counting each other name once.\n\n【While on the Field】During your turn, all your monsters gain 1 ATK for every 2 Curses in the opponent’s deck composition.\n\n【At the End of Your Turn】If you have at least 15 Curse Seals, choose and destroy 1 card on the opponent’s field.",
  },
  MERC_LEADER: {
    ja: "【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で1マナを支払って召喚してもよい。\n\n【召喚時】依頼を1つ選ぶ。\n賞金首：相手の場のモンスター1体を指名する。このモンスターが戦闘でその相手を倒すと、自分は2マナを得る。相手が場を離れると指名は終了する。\n荒事：相手の場のモンスター1体に2ダメージを与える。\n護衛：このモンスターは挑発を得る。\n\n【召喚時】どちらかの場に「カジノ」があれば、ダイス5個を振る。",
    ko: "【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 1을 추가로 지불하고 소환할 수 있다.\n\n【소환 시】의뢰 1개를 선택한다.\n현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 몬스터가 전투로 그 몬스터를 처치하면 자신은 마나를 2 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n무력 행사: 상대 필드의 몬스터 1체에게 피해를 2 준다.\n호위: 이 몬스터가 도발을 얻는다.\n\n【소환 시】어느 쪽 필드에든 카지노가 있으면 주사위 5개를 굴린다.",
    en: "【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 1 extra mana to summon it.\n\n【On Summon】Choose 1 contract.\nBounty: Mark 1 opposing monster. Gain 2 mana when this monster defeats it in battle. The mark expires when the target leaves the field.\nRough Work: Deal 2 damage to 1 opposing monster.\nEscort: This monster gains Taunt.\n\n【On Summon】If either player controls a Casino, roll 5 dice.",
  },
  GOBLIN_LEADER: {
    ja: "【召喚時】自分の場の「ゴブリン」関連カードの枚数分、相手プレイヤーと相手の場の全モンスターにそれぞれダメージを与える。このモンスター自身は数えず、他の同名カードと永続魔法は数える。",
    ko: "【소환 시】자신의 필드에 있는 고블린 계열 카드 수만큼 상대 플레이어와 상대 필드의 모든 몬스터에게 각각 데미지를 준다. 이 몬스터 자신은 세지 않으며, 다른 동명 카드와 영구마법은 센다.",
    en: "【On Summon】Deal damage to the opposing player and each enemy monster equal to the number of Goblin-related cards on your field, including other copies and persistent spells. Exclude this monster.",
  },
  HEX_PUPPET: {
    ja: "【発動時】相手の墓地に「呪い」を3枚追加する。その後、自分の場に「かかし」1体を召喚する。",
    ko: "【발동 시】상대 묘지에 저주 3장을 추가한다. 그 후 자신의 필드에 허수아비 1체를 소환한다.",
    en: "【On Cast】Add 3 Curses to the opponent’s graveyard. Then summon 1 Scarecrow to your field.",
  },
  FLAME: {
    ja: "【発動時】相手に2ダメージ、自分に1ダメージを与える。この対戦中、自分がこの同名カードを使用した回数が今回を含めて5回以上なら、相手へのダメージは代わりに5になる。相手に烙印カウンターがある場合、追加で相手プレイヤーに4ダメージを与える。",
    ko: "【발동 시】상대에게 2 데미지, 자신에게 1 데미지를 준다. 이번 사용을 포함해 이 대전에서 자신이 동명 카드를 사용한 횟수가 5회 이상이면 상대에게 주는 데미지는 대신 5가 된다. 상대에게 낙인 카운터가 있으면 상대 플레이어에게 추가로 4 데미지를 준다.",
    en: "【On Cast】Deal 2 damage to the opponent and take 1 damage. If you have used cards with this name at least 5 times this duel, including this use, deal 5 to the opponent instead. If the opponent has a Brand counter, deal an additional 4 damage to the opponent.",
  },
  MANA_BACKFLOW: {
    ja: "【自分のターン開始時】発動した後の自分の25回目のターン開始時、このカードを破壊する。\n\n【破壊時】このカードの効果で破壊された場合、自分のマナ水晶-2。他のカードの効果で破壊された場合、相手のマナ水晶-2。",
    ko: "【자신의 턴 시작 시】발동 후 자신의 25번째 턴 시작 시 이 카드를 파괴한다.\n\n【파괴 시】이 카드의 효과로 파괴됐다면 자신의 마나 수정 -2. 다른 카드의 효과로 파괴됐다면 상대의 마나 수정 -2.",
    en: "【At the Start of Your Turn】At the start of your 25th turn after casting this card, destroy it.\n\n【On Destruction】If destroyed by its own effect, lose 2 mana crystals. If destroyed by another card’s effect, the opponent loses 2 mana crystals.",
  },
  RUST_SHROOM: {
    ja: "【相手のモンスター腐敗破壊時】腐敗で相手モンスターが破壊されるたび、自分のマナ水晶+1（同名は重複しない）。\n\n【破壊時】ダイス1個を振る。3以上なら、自分に4ダメージを与え、このモンスターを墓地の代わりに自分のリフトへ送る。",
    ko: "【상대의 몬스터가 부패로 파괴될 때】부패로 상대 몬스터가 파괴될 때마다 자신의 마나 수정 +1(동명 중첩 불가).\n\n【파괴 시】주사위 1개를 굴린다. 3 이상이면 자신에게 4 데미지를 주고 이 몬스터를 묘지 대신 자신의 리프트로 보낸다.",
    en: "【When Decay Destroys an Enemy Monster】Whenever Decay destroys an enemy monster, increase your mana crystals by 1; multiple copies do not stack.\n\n【On Destruction】Roll 1 die. On 3 or more, take 4 damage and send this monster to your Rift instead of your graveyard.",
  },
  FOCUS: {
    ja: "【発動時】自分のデッキ・墓地・場からカードを1枚まで選び、自分のリフトへ送る。 この効果で購入コスト4以上のカードをリフトに送った場合、自分はマナを2得る。",
    ko: "【발동 시】자신의 덱·묘지·필드에서 카드를 1장까지 선택해 자신의 리프트로 보낸다. 이 효과로 구매 코스트 4 이상인 카드를 리프트로 보냈다면 마나를 2 얻는다.",
    en: "【On Cast】Choose up to 1 card from your deck, graveyard and field and send it to your Rift. If you sent a card with purchase cost 4 or more to the Rift this way, gain 2 mana.",
  },
  QUICK_MUSTER: {
    ja: "【購入条件】自分の場のモンスターが1体以下。\n\n【購入時】「兵士」3体を自分の場に召喚する。自分の場に「城」があれば、代わりに「騎士」2体を召喚する。この効果で召喚されたモンスターは、このターン攻撃できない。",
    ko: "【구매 조건】자신의 필드에 몬스터가 1체 이하이다.\n\n【구매 시】병사 3체를 자신의 필드에 소환한다. 자신의 필드에 성이 있으면 대신 기사 2체를 소환한다. 이 효과로 소환된 몬스터는 이번 턴에 공격할 수 없다.",
    en: "【Purchase Requirement】You control 1 or fewer monsters.\n\n【On Purchase】Summon 3 Soldiers. If you control a Castle, summon 2 Knights instead. Monsters summoned this way cannot attack this turn.",
  },
};
