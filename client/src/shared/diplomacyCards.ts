import type { CardDef } from './types';

// Distinct identities from the retired Mind Game and Toll Gate traps.
export const DIPLOMACY_CARDS: CardDef[] = [
  {
    id: 'MIND_GAME', t: 'spell', quick: true, cost: 2,
    nameJa: '心理戦', name: '심리전', nameEn: 'Mind Game',
    textJa: "【購入条件】相手の場にモンスターが2体以上いて、自分に相手モンスターを攻撃できるモンスターがいる。\n\n【購入時】攻撃する自分のモンスターを公開し、攻撃先を秘密に選ぶ。相手が攻撃先を当てると攻撃は無効になり、このターンはもう攻撃できない（二刀流は攻撃回数を1回消費する）。外れたらそのまま戦闘を行い、貫通ダメージを2倍にする。この戦闘は攻撃回数を消費しない。",
    text: "【구매 조건】상대 필드에 몬스터가 2체 이상 있고 자신에게 상대 몬스터를 공격할 수 있는 몬스터가 있다.\n\n【구매 시】공격할 몬스터를 공개하고 공격 대상을 비밀로 선택한다. 상대가 대상을 맞히면 공격이 무효가 되고 이번 턴 더 공격할 수 없다(이도류는 공격 횟수 1회 소모). 틀리면 전투를 진행하고 관통 피해가 2배가 된다. 이 전투는 공격 횟수를 소모하지 않는다.",
    textEn: "【Purchase Requirement】The opponent controls at least 2 monsters and one of your monsters can attack an opposing monster.\n\n【On Purchase】Reveal your attacker and secretly choose its target. If the opponent predicts correctly, cancel the attack and the attacker cannot attack again this turn (Dual Wield spends 1 attack instead). Otherwise fight that target with double piercing damage. This battle does not spend an attack.",
  },
  {
    id: 'TOLL_GATE', t: 'spell', ench: 'summonToll', val: 99, cost: 2,
    nameJa: '通行税', name: '통행세', nameEn: 'Toll Gate',
    textJa: "【相手のモンスター召喚時】相手に1ダメージを与える。自分の場に「城」があれば相手は手札を1枚選んで捨てる。傭兵系がいれば召喚されたモンスターの攻撃力を1下げる。貴族がいれば、そのモンスターの減少後の攻撃力と最大体力の合計だけ自分の体力を回復する。各条件はそれぞれ1回適用する。",
    text: "【상대의 몬스터 소환 시】상대에게 1 데미지를 준다. 자신의 필드에 성이 있으면 상대는 패 1장을 골라 버린다. 용병 계열이 있으면 소환된 몬스터의 공격력을 1 줄인다. 귀족이 있으면 그 몬스터의 감소 후 공격력과 최대 체력의 합만큼 자신의 체력을 회복한다. 각 조건은 1회씩 적용한다.",
    textEn: "【When the Opponent Summons a Monster】Deal 1 damage to the opponent. If you control Castle, they choose and discard 1 card. If you control a Mercenary-family monster, reduce the summoned monster’s ATK by 1. If you control an Aristocrat, heal yourself for its resulting ATK plus maximum HP. Each condition applies once.",
  },
  {
    id: 'TRUCE', t: 'spell', act: 'truce', cost: 3,
    nameJa: '休戦', name: '휴전', nameEn: 'Truce',
    textJa: "【発動条件】このターン、自分のモンスターが攻撃していない。\n\n【発動時】両方の場のモンスターをそれぞれの手札に戻す（トークンはリフトへ送る）。このターンの残りと次の相手のターンは、双方のモンスターが攻撃できない。アサシン系は手札に戻らず、この攻撃制限も受けない。",
    text: "【발동 조건】이번 턴 자신의 몬스터가 공격하지 않았다.\n\n【발동 시】양쪽 필드의 몬스터를 각자의 패로 되돌린다(토큰은 리프트로 보낸다). 이번 턴의 남은 시간과 다음 상대 턴에는 양측 몬스터가 공격할 수 없다. 암살자 계열은 패로 돌아가지 않으며 이 공격 제한을 받지 않는다.",
    textEn: "【Play Requirement】None of your monsters have attacked this turn.\n\n【On Cast】Return monsters on both fields to their respective hands (send tokens to the Rift). Neither side can attack with monsters for the rest of this turn and the next opposing turn. Assassin-family monsters stay on the field and ignore this attack restriction.",
  },
];
