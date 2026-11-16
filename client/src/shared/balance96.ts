import type { CardDef } from './types';

export const balance96Prints: Record<string, Partial<CardDef>> = {
  MERC_LEADER: {def:1},
  AWAKENED_MIMIC: {atk:1, passive:['aura']},
  HEXER3: {def:4},
  GM5_0: {atk:7},
  QUICK_ESCORT: {cost:6},
};

export const balance96Text: Record<string, {ja:string;ko:string;en:string}> = {
  "FORBIDDEN": {
    "ja": "【購入条件】自分の場にモンスターがいない。\n\n【購入時】自分の体力を1にする。これはダメージとして扱わない。シールド5を得て、自分の場に「悪魔」3体を召喚する。この効果で召喚された悪魔は、このターン攻撃できない。",
    "ko": "【구매 조건】자신의 필드에 몬스터가 없어야 한다.\n\n【구매 시】자신의 체력을 1로 한다. 이는 피해로 취급하지 않는다. 실드 5를 얻고 자신의 필드에 악마 3체를 소환한다. 이 효과로 소환한 악마는 이번 턴에 공격할 수 없다.",
    "en": "【Purchase Requirement】You control no monsters.\n\n【On Purchase】Set your HP to 1. This does not count as damage. Gain 5 Shield and summon 3 Devils to your field. Devils summoned this way cannot attack this turn."
  },
  "QUICK_ESCORT": {
    "ja": "【購入時】挑発を持つ「騎士」2体を自分の場に召喚する。自分の場に「城」があれば、代わりに3体召喚する。この効果で召喚された騎士は、場を離れるまで攻撃できない。",
    "ko": "【구매 시】도발을 가진 기사 2체를 자신의 필드에 소환한다. 자신의 필드에 성이 있으면 대신 3체를 소환한다. 이 효과로 소환한 기사는 필드를 떠날 때까지 공격할 수 없다.",
    "en": "【On Purchase】Summon 2 Knights with Taunt to your field, or 3 if you control a Castle. Knights summoned this way cannot attack until they leave the field."
  },
  "MINI_SPIRIT": {
    "ja": "【場にある間】基本のアチューンを使用するたび、このモンスターの体力+2。自分が体力を得るたび、このモンスターの攻撃力+1。自分がシールドを得るたび、このモンスターの体力+1。自分が雫を得るたび、このモンスターの攻撃力+1。これらの変化は場を離れるとリセットされる。",
    "ko": "【필드에 있는 동안】기본 어튠을 사용할 때마다 이 몬스터의 체력 +2. 자신이 체력을 얻을 때마다 이 몬스터의 공격력 +1. 자신이 실드를 얻을 때마다 이 몬스터의 체력 +1. 자신이 이슬을 얻을 때마다 이 몬스터의 공격력 +1. 필드를 떠나면 이 변화는 초기화된다.",
    "en": "【While on the Field】Whenever you play basic Attune, this monster gains 2 HP. Whenever you gain HP, it gains 1 ATK. Whenever you gain Shield, it gains 1 HP. Whenever you gain Dew, it gains 1 ATK. These changes reset when it leaves the field."
  }
};
