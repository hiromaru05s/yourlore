import type {CardDef, QuestState} from './types';

export const STARTER_QUESTS: CardDef[] = [
  {
    id: 'Q_ENJOY_THE_SHOW', t: 'quest', cost: 4, noShop: true, quest: {event: 'healOccurrence', target: 8},
    nameJa: '高みの見物', name: '강 건너 불구경', nameEn: 'Enjoy the show',
    textJa: '【達成条件】設置後、自分の体力を8回回復する。\n\n【達成時】相手プレイヤーに烙印カウンターを1個付与する。',
    text: '【달성 조건】설치 후 자신의 체력을 8회 회복한다.\n\n【달성 시】상대 플레이어에게 낙인 카운터 1개를 부여한다.',
    textEn: '【Completion Requirement】After deployment, restore your HP 8 times.\n\n【On Completion】Give the opponent 1 Brand counter.',
  },
  {
    id: 'Q_UNDERWORLD_DEAL', t: 'quest', cost: 1, noShop: true, quest: {event: 'ambushAttack', target: 8},
    nameJa: '裏世界の取引', name: '암흑가의 거래', nameEn: 'Underworld Deal',
    textJa: '【場にある間】どちらかの場の「暗襲」を持つモンスターが攻撃するたび、このカードにカウンターを1個付与する。\n\n【自分のターン中】カウンターを消費して次の報酬を1つ選び、このカードを墓地に送ることができる。\n3個：相手プレイヤーに4ダメージを与える。\n5個：相手プレイヤーのマナ水晶を1減らす。\n8個：「アサシンギルドの宝箱」1枚を手札に加える。',
    text: '【필드에 있는 동안】양쪽 필드에서 암습을 가진 몬스터가 공격할 때마다 이 카드에 카운터 1개를 부여한다.\n\n【자신의 턴 중】카운터를 소모하여 다음 보상 중 1개를 선택하고 이 카드를 묘지로 보낼 수 있다.\n3개: 상대 플레이어에게 4 데미지를 준다.\n5개: 상대 플레이어의 마나 수정을 1 줄인다.\n8개: 암살자 길드의 보물상자 1장을 패에 넣는다.',
    textEn: "【While on the Field】Whenever a monster on either field with Infiltrate attacks, put 1 counter on this card.\n\n【During Your Turn】You may spend counters to claim 1 reward and send this card to your graveyard.\n3 counters: Deal 4 damage to the opponent.\n5 counters: The opponent loses 1 mana crystal.\n8 counters: Add 1 Assassin Guild's Chest to your hand.",
  },
];

export const DEAL_REWARDS = [
  {cost: 3, ja: '相手に4ダメージ', ko: '상대에게 4 데미지', en: 'Deal 4 damage to the opponent'},
  {cost: 5, ja: '相手のマナ水晶−1', ko: '상대 마나 수정 −1', en: 'Remove 1 enemy mana crystal'},
  {cost: 8, ja: 'アサシンギルドの宝箱を手札に加える', ko: '암살자 길드의 보물상자를 패에 추가', en: "Add Assassin Guild's Chest to your hand"},
] as const;

export function availableDealRewards(q: QuestState) {
  return DEAL_REWARDS.filter(reward => q.card.id === 'Q_UNDERWORLD_DEAL' && q.progress >= reward.cost);
}
