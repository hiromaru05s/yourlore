import type { CardDef } from './types';

export const balance99Prints: Record<string, Partial<CardDef>> = {
  SPIRIT_RESONANCE: { cost: 5 },
  GM5_0: { atk: 6, val: 1, turnFx: 'endGrowAtk' },
  HEXER2: { atk: 1 },
  GM5_3: { atk: 5 },
  TAR3: { passive: [] },
  GOBLIN_KING: { atk: 6, def: 7 },
  TDE3: { def: 4 },
  TDE2: { def: 3 },
  AWAKENED_MIMIC: { atk: 0 },
  HEX_PUPPET: { cost: 6 },
  TAR5: { atk: 1 },
  GM6_0: { atk: 5 },
  MERC_MASTER: { def: 2, val2: 4 },
  M10: { def: 3 },
  QUICK_WORLD: { cost: 4 },
  GOLEM2: { def: 3 },
  GM6_8: { atk: 12 },
  MERCENARY: { val2: undefined },
};

export const balance99Text = {
  QUICK_MUSTER: {
    ja: "【購入条件】自分の場のモンスターが1体以下。\n\n【購入時】「兵士」2体を自分の場に召喚する。自分の場に「城」があれば、代わりに「騎士」2体を召喚する。この効果で召喚されたモンスターは、このターン攻撃できない。",
    ko: "【구매 조건】자신의 필드에 몬스터가 1체 이하이다.\n\n【구매 시】병사 2체를 자신의 필드에 소환한다. 자신의 필드에 성이 있으면 대신 기사 2체를 소환한다. 이 효과로 소환된 몬스터는 이번 턴에 공격할 수 없다.",
    en: "【Purchase Requirement】You control 1 or fewer monsters.\n\n【On Purchase】Summon 2 Soldiers. If you control a Castle, summon 2 Knights instead. Monsters summoned this way cannot attack this turn.",
  },
  MERC_LEADER: {
    ja: "【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で2マナを支払って召喚してもよい。\n\n【召喚時】依頼を1つ選ぶ。\n賞金首：相手の場のモンスター1体を指名する。このモンスターが戦闘でその相手を倒すと、自分は2マナを得る。相手が場を離れると指名は終了する。\n荒事：相手の場のモンスター1体に2ダメージを与える。\n護衛：このモンスターは挑発を得る。\n\n【召喚時】どちらかの場に「カジノ」があれば、ダイス5個を振る。",
    ko: "【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 2를 추가로 지불하고 소환할 수 있다.\n\n【소환 시】의뢰 1개를 선택한다.\n현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 몬스터가 전투로 그 몬스터를 처치하면 자신은 마나를 2 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n무력 행사: 상대 필드의 몬스터 1체에게 피해를 2 준다.\n호위: 이 몬스터가 도발을 얻는다.\n\n【소환 시】어느 쪽 필드에든 카지노가 있으면 주사위 5개를 굴린다.",
    en: "【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 2 extra mana to summon it.\n\n【On Summon】Choose 1 contract.\nBounty: Mark 1 opposing monster. Gain 2 mana when this monster defeats it in battle. The mark expires when the target leaves the field.\nRough Work: Deal 2 damage to 1 opposing monster.\nEscort: This monster gains Taunt.\n\n【On Summon】If either player controls a Casino, roll 5 dice.",
  },
  MERCENARY: {
    ja: "【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で1マナを支払って召喚してもよい。\n\n【召喚時】賞金首：相手の場のモンスター1体を指名する。このモンスターが戦闘でその相手を倒すと、自分は1マナを得る。相手が場を離れると指名は終了する。\n\n【召喚時】どちらかの場に「カジノ」があれば、ダイス3個を振る。",
    ko: "【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 1을 추가로 지불하고 소환할 수 있다.\n\n【소환 시】현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 몬스터가 전투로 그 몬스터를 처치하면 자신은 마나를 1 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n\n【소환 시】어느 쪽 필드에든 카지노가 있으면 주사위 3개를 굴린다.",
    en: "【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 1 extra mana to summon it.\n\n【On Summon】Bounty: Mark 1 opposing monster. Gain 1 mana when this monster defeats it in battle. The mark expires when the target leaves the field.\n\n【On Summon】If either player controls a Casino, roll 3 dice.",
  },
  QUICK_MIMIC: {
    ja: "【購入時】「ミミック」1体を自分の場に召喚し、新たな「ミミック」2枚を自分のリフトに追加する。この効果で召喚された「ミミック」は反撃を持たない。",
    ko: "【구매 시】미믹 1체 자신의 필드에 소환, 새로운 미믹 2장 자신의 리프트에 추가한다. 이 효과로 소환된 미믹은 반격을 갖지 않는다.",
    en: "【On Purchase】Summon 1 Mimic on your field and add 2 new Mimics to your Rift. Mimics summoned this way do not have Counter.",
  },
  GREED_PRICE: {
    ja: "【発動時】「ミミック」2体を自分の場に召喚する。新しい「ミミック」5枚を自分のリフトに追加する。この効果で召喚された「ミミック」は反撃を持たない。",
    ko: "【발동 시】미믹 2체를 자신의 필드에 소환한다. 새로운 미믹 5장을 자신의 리프트에 추가한다. 이 효과로 소환된 미믹은 반격을 갖지 않는다.",
    en: "【On Cast】Summon 2 Mimics to your field. Create 5 new Mimics in your Rift. Mimics summoned this way do not have Counter.",
  },
  GM5_0: {
    ja: "【自分のターン終了時】このモンスターの攻撃力+1（このモンスターが場を離れるまで）。",
    ko: "【자신의 턴 종료 시】이 몬스터의 공격력 +1(이 몬스터가 필드를 떠날 때까지).",
    en: "【At the End of Your Turn】This monster gains +1 ATK until it leaves the field.",
  },
  HEXER3: {
    ja: "【召喚時】相手の墓地に「呪い」を2枚追加する。自分の場にいる、このカードと異なる名前の「呪術師」モンスター1種類につき、さらに1枚追加する。\n\n【場にある間】自分のターンの間、相手のデッキ構成にある「呪い」3枚につき、自分の場の全モンスターの攻撃力を1上げる。\n\n【自分のターン終了時】自分に呪印が15個以上あれば、相手の場のカードを1枚選んで破壊する。",
    ko: "【소환 시】상대 묘지에 저주 2장을 추가한다. 자신의 필드에 있는 이 카드와 이름이 다른 주술사 몬스터 1종류당 1장을 더 추가한다.\n\n【필드에 있는 동안】자신의 턴 동안 상대 덱 구성의 저주 3장당 자신의 필드의 모든 몬스터의 공격력을 1 올린다.\n\n【자신의 턴 종료 시】자신의 주인이 15개 이상이면 상대 필드의 카드 1장을 선택해 파괴한다.",
    en: "【On Summon】Add 2 Curses to the opponent’s graveyard. Add 1 more for each differently named Hexer monster you control, counting each other name once.\n\n【While on the Field】During your turn, all your monsters gain 1 ATK for every 3 Curses in the opponent’s deck composition.\n\n【At the End of Your Turn】If you have at least 15 Curse Seals, choose and destroy 1 card on the opponent’s field.",
  },
  TAR3: {
    ja: "【場にある間】このモンスターが相手モンスターを破壊した時、このモンスターを自分の墓地に送り、「騎士」1体を自分の場に召喚する。この効果で召喚された「騎士」はこのターン攻撃できない。",
    ko: "【필드에 있는 동안】이 몬스터가 상대 몬스터를 파괴하면 이 몬스터를 자신의 묘지로 보내고 기사 1체를 자신의 필드에 소환한다. 이 효과로 소환된 기사는 이번 턴에 공격할 수 없다.",
    en: "【While on the Field】When this monster destroys an enemy monster, send this monster to your graveyard and summon 1 Knight to your field. The Knight summoned this way cannot attack this turn.",
  },
  TAR5: {
    ja: "【場にある間】相手の購入コスト3以下のモンスターはこのモンスターを攻撃できない。相手の全モンスターは自分を直接攻撃できない。",
    ko: "【필드에 있는 동안】상대의 구매 코스트 3 이하 몬스터는 이 몬스터를 공격할 수 없다. 상대의 모든 몬스터는 자신을 직접 공격할 수 없다.",
    en: "【While on the Field】Enemy monsters with purchase cost 3 or less cannot attack this monster. No enemy monster can attack you directly.",
  },
  CAPTAIN: {
    ja: "【自分のターン終了時】相手プレイヤーかモンスターにランダムな1ダメージを3回与える。\n\n【場にある間】他のモンスター効果がダメージを与えるたび、同じ対象に追加で3ダメージ。追加ダメージは連鎖しない。",
    ko: "【자신의 턴 종료 시】무작위 적에게 1 피해를 3회 준다.\n\n【필드에 있는 동안】다른 몬스터 효과로 피해를 줄 때마다 같은 대상에게 추가 3 피해. 추가 피해는 연쇄되지 않는다.",
    en: "【At the End of Your Turn】Deal 1 damage three times to random enemies.\n\n【While on the Field】When another monster effect deals damage, deal 3 more to the same target without triggering another bonus.",
  },
  MANA_GIANT: {
    ja: "【召喚時】自分のデッキ構成に同名以外の「ゴーレム」系統モンスターがいなければ、このモンスターの体力は7になる。\n\n【場にある間】相手のターン中、相手がマナ水晶を得るたび、このモンスターの「虚無」を取り除く。すでに「虚無」がなければ、代わりに攻撃力・体力が2増える。自分がマナ水晶を得るたび、マナを1得る。自分のデッキ構成に同名以外の「ゴーレム」系統モンスターがいれば、さらにマナを1得る。",
    ko: "【소환 시】자신의 덱 구성에 이름이 다른 골렘 계열 몬스터가 없으면 이 몬스터의 체력이 7가 된다.\n\n【필드에 있는 동안】상대 턴에 상대가 마나 수정을 얻을 때마다 이 몬스터의 공허를 제거한다. 이미 공허가 없으면 대신 공격력과 체력이 2 증가한다. 자신이 마나 수정을 얻을 때마다 마나를 1 얻는다. 자신의 덱 구성에 이름이 다른 골렘 계열 몬스터가 있으면 마나를 1 더 얻는다.",
    en: "【On Summon】If your deck composition contains no differently named Golem monster, set this monster’s HP to 7.\n\n【While on the Field】Whenever the opponent gains mana crystals during their turn, remove Void from this monster. If it already lacks Void, it gains +2 ATK and +2 HP instead. Whenever you gain mana crystals, gain 1 mana, plus 1 more if your deck composition contains a differently named Golem monster.",
  },
  MERC_MASTER: {
    ja: "【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で1マナを支払って召喚してもよい。\n\n【召喚時】依頼を1つ選ぶ。\n賞金首：相手の場のモンスター1体を指名する。このモンスターが戦闘でその相手を倒すと、自分は3マナを得る。相手が場を離れると指名は終了する。\n荒事：相手の場のモンスター1体に4ダメージを与える。\n護衛：「傭兵」1体を召喚する。この依頼はこのカードの召喚1回につき1度まで選べる。\n\n【召喚時】どちらかの場に「カジノ」があれば、ダイス10個を振る。",
    ko: "【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 1을 추가로 지불하고 소환할 수 있다.\n\n【소환 시】의뢰 1개를 선택한다.\n현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 몬스터가 전투로 그 몬스터를 처치하면 자신은 마나를 3 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n무력 행사: 상대 필드의 몬스터 1체에게 피해를 4 준다.\n호위: 용병 1체를 소환한다. 이 의뢰는 이 카드의 소환당 1번만 선택할 수 있다.\n\n【소환 시】어느 쪽 필드에든 카지노가 있으면 주사위 10개를 굴린다.",
    en: "【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 1 extra mana to summon it.\n\n【On Summon】Choose 1 contract.\nBounty: Mark 1 opposing monster. Gain 3 mana when this monster defeats it in battle. The mark expires when the target leaves the field.\nRough Work: Deal 4 damage to 1 opposing monster.\nEscort: Summon 1 Mercenary. You can choose Escort once per summon of this card.\n\n【On Summon】If either player controls a Casino, roll 10 dice.",
  },
  WORLD_HEART: {
    ja: "【自分のターン開始時】雫2を得る。",
    ko: "【자신의 턴 시작 시】이슬 2를 얻는다.",
    en: "【At the Start of Your Turn】Gain 2 Dew.",
  },
  TPO5: {
    ja: "【召喚時】相手のオーラを持たない購入コスト3～4のモンスターのうち、攻撃力と現在体力の合計が最大の1体を自動で破壊する（同値は場の並び順）。",
    ko: "【소환 시】상대의 아우라가 없는 구매 코스트 3~4 몬스터 중 공격력과 현재 체력의 합이 가장 큰 1체를 자동으로 파괴한다(동률이면 필드 순서).",
    en: "【On Summon】Automatically destroy the enemy monster without Aura with purchase cost 3–4 and the highest combined ATK and current HP (ties use field order).",
  },
  POISON_MASTER: {
    ja: "【攻撃時】攻撃対象の相手モンスターにカウンター1個を追加で付与する（腐敗の処理）。\n\n【場にある間】相手の場のモンスターが腐敗で破壊されるたび、相手に烙印を1つ付与する。",
    ko: "【공격 시】공격 대상 상대 몬스터에 카운터 1개 추가 부여한다(부패 처리).\n\n【필드에 있는 동안】상대 필드의 몬스터가 부패로 파괴될 때마다 상대에게 낙인 1개를 부여한다.",
    en: "【On Attack】Put 1 additional counter on the enemy monster this monster attacks, applying Decay rules.\n\n【While on the Field】Whenever an enemy monster is destroyed by Decay, give the opponent 1 Brand.",
  },
  TDE1: {
    ja: "【召喚条件】自分のマナ水晶が5以上。\n\n【召喚時】自分のマナ水晶-1。双方通算16ターン後のターン開始時に、自分のマナ水晶+1（このモンスターが場を離れても戻る）。\n\n【攻撃時】このモンスターが相手プレイヤーへの直接攻撃に成功した場合、相手に烙印カウンター1個を付与する。シールドでダメージを全て防がれた場合も付与する。",
    ko: "【소환 조건】자신의 마나 수정 5 이상.\n\n【소환 시】자신의 마나 수정 -1. 양쪽 합계 16턴 후 턴 시작시 자신의 마나 수정 +1(이 몬스터가 필드를 떠나도 복구).\n\n【공격 시】이 몬스터가 상대 플레이어에 대한 직접 공격에 성공하면 상대에게 낙인 카운터 1개를 준다. 실드가 데미지를 전부 막아도 준다.",
    en: "【Summon Requirement】Your mana crystals are at least 5.\n\n【On Summon】Reduce your mana crystals by 1. At turn start 16 total turns later, counting both players, increase your mana crystals by 1, even if this monster has left.\n\n【On Attack】When this monster lands a direct attack on the opponent, give the opponent 1 Brand counter. This applies even if Shield absorbs all the damage.",
  },
  GOLEM1: {
    ja: "【自分のターン開始時】このモンスターの気合カウンター1つとマナ2を支払い、「リーダーゴーレム」か「マナ・ゴーレム」を自分の場に1体召喚してよい。",
    ko: "【자신의 턴 시작 시】이 몬스터의 기합 카운터 1개와 마나 2을 지불하고 리더 골램 또는 마나 골렘 중 1체를 자신의 필드에 소환할 수 있다.",
    en: "【At the Start of Your Turn】You may spend 1 Guts counter from this monster and 2 mana to summon a Leader Golem or a Mana Golem to your field.",
  },
};
