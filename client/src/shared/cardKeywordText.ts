import type { EffectLocale } from './cardEffectText';

/** Keyword names stay stable; descriptions use the same rules as card effects. */
export const CARD_KEYWORD_TEXT: Record<string, Record<EffectLocale, string>> = {
  counter: {
    ja: 'このモンスターが攻撃を受け、その攻撃が無効にならなかった場合、攻撃したモンスターに、このモンスターの攻撃力の半分（切り上げ）のダメージを与える。このモンスターが倒されても発動する。反撃では貫通・再反撃・攻撃時効果は発生しない。',
    ko: '이 몬스터가 공격받고 그 공격이 무효화되지 않았다면 공격한 몬스터에게 이 몬스터 공격력의 절반(올림)만큼 데미지를 준다. 이 몬스터가 파괴되어도 발동한다. 반격으로는 관통·재반격·공격시 효과가 발생하지 않는다.',
    en: 'When this monster receives an attack that is not negated, deal damage to the attacking monster equal to half this monster\'s ATK, rounded up. This happens even if this monster is destroyed. Counter damage causes no piercing, further counterattack, or attack triggers.',
  },
  dual: {
    ja: 'このモンスターは自分の各ターンに2回まで攻撃できる。',
    ko: '이 몬스터는 자신의 각 턴에 2회까지 공격할 수 있다.',
    en: 'This monster can attack up to 2 times during each of your turns.',
  },
  ambush: {
    ja: 'このモンスターは相手プレイヤーへの直接攻撃だけを行える。相手の場にモンスターがいても直接攻撃できるが、モンスターは攻撃できない。',
    ko: '이 몬스터는 상대 플레이어에게 직접 공격만 할 수 있다. 상대 필드에 몬스터가 있어도 직접 공격할 수 있지만 몬스터를 공격할 수는 없다.',
    en: 'This monster can only attack the opponent directly, even while they control monsters. It cannot attack monsters.',
  },
  aura: {
    ja: 'このモンスターは相手の魔法・モンスター効果の選択対象にならない。攻撃の対象にはなり、対象を選ばない全体効果も受ける。',
    ko: '이 몬스터는 상대 마법·몬스터 효과의 선택 대상이 되지 않는다. 공격 대상은 될 수 있으며 대상을 선택하지 않는 전체 효과도 받는다.',
    en: 'The opponent cannot select this monster as a target of spell or monster effects. It can still be attacked and is still affected by effects that affect all monsters without selecting targets.',
  },
  void: {
    ja: 'モンスター・永続魔法は破壊時に、墓地の代わりに自分のリフトへ行く。通常魔法は使用すると墓地に置かれず、効果の処理前に自分のリフトへ行く。',
    ko: '몬스터·영구마법은 파괴되면 묘지 대신 자신 리프트로 간다. 일반 마법은 사용하면 묘지에 놓지 않고 효과 처리 전에 자신 리프트로 간다.',
    en: 'Monsters and persistent spells go to your Rift instead of your graveyard when destroyed. A normal spell goes to your Rift before its effect resolves when played.',
  },
  guts: {
    ja: 'このモンスターは召喚時にカウンター1個を得る。攻撃・反撃で致命ダメージを受ける時、そのカウンター1個を消費して体力1で生き残る。自分プレイヤーへの貫通ダメージは防がない。',
    ko: '이 몬스터는 소환시 카운터 1개를 얻는다. 공격·반격으로 치명 데미지를 받을 때 그 카운터 1개를 소비하고 체력 1로 생존한다. 자신 플레이어에게 오는 관통 데미지는 막지 않는다.',
    en: 'This monster gains 1 counter on summon. When attack or counterattack damage would be lethal, spend 1 of these counters to survive at 1 HP. This does not prevent piercing damage to you.',
  },
  decay: {
    ja: 'このモンスターが卵以外の相手モンスターを攻撃する時、相手モンスターにカウンター1個を置く。腐敗の処理で置かれたカウンターが3個以上になると、そのモンスターを破壊し、その持ち主に3ダメージを与える。回避された攻撃では置かない。',
    ko: '이 몬스터가 알 이외 상대 몬스터를 공격할 때 상대 몬스터에 카운터 1개를 놓는다. 부패 처리로 놓인 카운터가 3개 이상이면 그 몬스터를 파괴하고 소유자에게 3 데미지를 준다. 회피된 공격에는 놓지 않는다.',
    en: 'When this monster attacks a non-Egg enemy monster, put 1 counter on that monster. At 3 or more counters applied through Decay, destroy it and deal 3 damage to its owner. Evaded attacks do not apply the counter.',
  },
  majesty: {
    ja: 'このモンスターが場にいる間、相手のモンスターは召喚されたターンに攻撃できない。',
    ko: '이 몬스터가 필드에 있는 동안 상대 몬스터는 소환된 턴에 공격할 수 없다.',
    en: 'While this monster is on the field, enemy monsters cannot attack during the turn they were summoned.',
  },
  taunt: {
    ja: '相手が「挑発」を持たない自分の他のモンスターを攻撃する時、ダイス1個を振る。4以上なら、自分の「挑発」を持つモンスターからランダムに1体が代わりに攻撃を受ける。直接攻撃は引き受けない。',
    ko: '상대가 도발이 없는 자신의 다른 몬스터를 공격할 때 주사위 1개를 굴린다. 4 이상이면 자신의 도발 몬스터 중 무작위 1체가 대신 공격받는다. 직접 공격은 대신 받지 않는다.',
    en: 'When the opponent attacks another of your monsters without Taunt, roll 1 die. On 4 or more, 1 randomly selected monster you control with Taunt receives the attack instead. This does not redirect direct attacks.',
  },
  evade: {
    ja: 'このモンスターが攻撃される時、ダイス1個を振る。4以上なら、その攻撃を無効にする。無効になっても相手の攻撃回数は消費される。',
    ko: '이 몬스터가 공격받을 때 주사위 1개를 굴린다. 4 이상이면 그 공격을 무효화한다. 무효화되어도 상대의 공격 횟수는 소비된다.',
    en: 'When this monster is attacked, roll 1 die. On 4 or more, negate the attack. The attacker still spends that attack.',
  },
  relic: {
    ja: 'このカードはリフトへ除外できない。除外を選ぶ効果では対象外となり、自動効果で除外された場合は自分の墓地へ戻る。',
    ko: '이 카드는 리프트로 제외할 수 없다. 제외할 카드를 고르는 효과에서는 대상이 되지 않으며 자동 효과로 제외되면 자신 묘지로 돌아온다.',
    en: 'This card cannot remain exiled in the Rift. It cannot be selected by exile choices; if an automatic effect exiles it, it returns to your graveyard.',
  },
};
export function applyKeywordText(keywords: Record<string, Record<EffectLocale, { desc: string }>>): void {
  for (const [key, descriptions] of Object.entries(CARD_KEYWORD_TEXT)) {
    for (const lang of ['ja','ko','en'] as const) keywords[key][lang].desc = descriptions[lang];
  }
}
