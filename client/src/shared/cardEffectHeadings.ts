// Canonical headings: Japanese, Korean, English, then the explicit parent group.
// One event has one label. Card-family and numeric conditions stay in the authored body.
export type EffectRuleGroup = 'requirements' | 'effects' | 'notes';
export const CARD_EFFECT_HEADINGS = [
  ["召喚条件", "소환 조건", "Summon Requirement", "requirements"],
  ["発動条件", "발동 조건", "Play Requirement", "requirements"],
  ["購入条件", "구매 조건", "Purchase Requirement", "requirements"],
  ["攻撃条件", "공격 조건", "Attack Requirement", "requirements"],
  ["召喚時", "소환 시", "On Summon", "effects"],
  ["発動時", "발동 시", "On Cast", "effects"],
  ["使用時", "사용 시", "On Play", "effects"],
  ["購入時", "구매 시", "On Purchase", "effects"],
  ["破壊時", "파괴 시", "On Destruction", "effects"],
  ["自分のターン開始時", "자신의 턴 시작 시", "At the Start of Your Turn", "effects"],
  ["自分のターン終了時", "자신의 턴 종료 시", "At the End of Your Turn", "effects"],
  ["各ターン開始時", "각 턴 시작 시", "At the Start of Each Turn", "effects"],
  ["攻撃時", "공격 시", "On Attack", "effects"],
  ["攻撃後", "공격 후", "After Attack", "effects"],
  ["場にある間", "필드에 있는 동안", "While on the Field", "effects"],
  ["達成条件", "달성 조건", "Completion Requirement", "effects"],
  ["達成時", "달성 시", "On Completion", "effects"],
  ["回数制限", "횟수 제한", "Use Limit", "effects"],
  ["期間", "기간", "Duration", "effects"],
  ["カードの扱い", "카드 취급", "Card Rules", "notes"],
  ["耐久", "내구", "Durability", "effects"],
  ["孵化条件", "부화 조건", "Hatching Condition", "effects"],
  ["孵化時", "부화 시", "On Hatching", "effects"],
  ["設置上限", "설치 제한", "Field Limit", "requirements"],
  ["コスト", "코스트", "Cost", "requirements"],
  ["自分のターン中", "자신의 턴 중", "During Your Turn", "effects"],
  ["自分のモンスター召喚時", "자신의 몬스터 소환 시", "When You Summon a Monster", "effects"],
  ["相手のモンスター召喚時", "상대의 몬스터 소환 시", "When the Opponent Summons a Monster", "effects"],
  ["いずれかのモンスター召喚時", "어느 쪽이든 몬스터 소환 시", "When Either Player Summons a Monster", "effects"],
  ["相手のモンスター破壊時", "상대의 몬스터 파괴 시", "When an Enemy Monster Is Destroyed", "effects"],
  ["自分のモンスター破壊時", "자신의 몬스터 파괴 시", "When Your Monster Is Destroyed", "effects"],
  ["相手のモンスター腐敗破壊時", "상대의 몬스터가 부패로 파괴될 때", "When Decay Destroys an Enemy Monster", "effects"],
  ["攻撃ダメージを受けた後", "공격 데미지를 받은 후", "After Taking Attack Damage", "effects"],
  ["攻撃を受ける時", "공격받을 때", "When Attacked", "effects"],
  ["自分のモンスター攻撃時", "자신의 몬스터 공격 시", "When Your Monster Attacks", "effects"],
  ["自分のモンスター被攻撃時", "자신의 몬스터가 공격받을 때", "When Your Monster Is Attacked", "effects"],
  ["自分のカード使用時", "자신의 카드 사용 시", "When You Play a Card", "effects"],
  ["自分のカード購入時", "자신의 카드 구매 시", "When You Buy a Card", "effects"],
  ["相手の魔法使用時", "상대 마법 사용 시", "Opponent Plays a Spell", "effects"],
  ["自分の魔法発動時", "자신의 마법 발동 시", "When Your Spell Takes Effect", "effects"],
  ["自分の魔法使用時", "자신의 마법 사용 시", "When You Play a Spell", "effects"],
  ["相手の回復時", "상대 회복 시", "When the Opponent Heals", "effects"],
  ["自分の回復時", "자신 회복 시", "When You Heal", "effects"],
  ["行動の終了後", "행동 처리 후", "After an Action", "effects"],
  ["相手への攻撃ダメージ発生時", "공격으로 상대에게 데미지를 줄 때", "When an Attack Damages the Opponent", "effects"],
  ["相手がダメージを受けた時", "상대가 데미지를 받을 때", "Opponent Takes Damage", "effects"],
  ["自分がダメージを受けた時", "자신이 데미지를 받을 때", "When You Take Damage", "effects"],
  ["自分のシールド獲得時", "자신의 실드 획득 시", "When You Gain Shield", "effects"],
  ["自分のリフト追加時", "자신의 리프트에 추가 시", "Card Added to Your Rift", "effects"],
  ["ダイスを振った時", "주사위를 굴릴 때", "When Dice Are Rolled", "effects"],
  ["出目を確認した後", "눈을 확인한 후", "After Seeing the Roll", "effects"],
  ["自分の追加ドロー時", "자신의 추가 드로우 시", "When You Draw Extra Cards", "effects"],
  ["カウンター蓄積時", "카운터 축적 시", "When Counters Accumulate", "effects"],
] as const;

export const CARD_RULE_GROUP_LABELS = {
  requirements: { ja: '使用条件', ko: '사용 조건', en: 'Requirements' },
  effects: { ja: '効果', ko: '효과', en: 'Effects' },
  notes: { ja: '補足', ko: '참고', en: 'Notes' },
} as const;

/** Exact authored vocabulary lookup. Never classify or rewrite a rule from its prose. */
export function effectRuleGroup(heading: string): EffectRuleGroup {
  const row = CARD_EFFECT_HEADINGS.find(row => row.slice(0, 3).some(label => label === heading));
  // Saved games can carry pre-registry text. Keep it readable; the catalog checker
  // still rejects unknown or missing headings in newly authored definitions.
  return row?.[3] ?? 'effects';
}
