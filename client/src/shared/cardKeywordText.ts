import type { EffectLocale } from './cardEffectText';
import type { CardDef } from './types';

type RuleLabel = 'effect' | 'trigger' | 'result' | 'note' | 'monster' | 'normalSpell' | 'persistentSpell' | 'rift';
type Rule = { label: RuleLabel; ja: string; ko: string; en: string };
const LABELS: Record<RuleLabel, Record<EffectLocale, string>> = {
  effect: {ja:'効果',ko:'효과',en:'Effect'},
  trigger: {ja:'条件',ko:'조건',en:'When'},
  result: {ja:'処理',ko:'처리',en:'Resolution'},
  note: {ja:'補足',ko:'보충',en:'Details'},
  monster: {ja:'モンスター',ko:'몬스터',en:'Monsters'},
  normalSpell: {ja:'通常魔法',ko:'일반 마법',en:'Normal spells'},
  persistentSpell: {ja:'永続魔法',ko:'영구마법',en:'Persistent spells'},
  rift: {ja:'リフトとは',ko:'리프트란',en:'About the Rift'},
};

/** One source for the structured inspector and plain-text icon tooltips. */
export const CARD_KEYWORD_RULES: Record<string, Rule[]> = {
  counter: [
    {label:'effect',ja:'攻撃を受けた後、攻撃してきたモンスターに反撃する。反撃ダメージは、このモンスターの攻撃力の半分（端数切り上げ）。',ko:'공격받은 뒤 공격한 몬스터에게 반격한다. 반격 데미지는 이 몬스터 공격력의 절반(올림)이다.',en:'After receiving an attack, strike back at the attacker for half this monster’s ATK, rounded up.'},
    {label:'note',ja:'その攻撃でこのモンスターが破壊されても反撃する。攻撃を無効にした場合は反撃しない。反撃では貫通ダメージ・反撃への反撃・攻撃時効果は発生しない。',ko:'그 공격으로 이 몬스터가 파괴되어도 반격한다. 공격이 무효화되면 반격하지 않는다. 반격으로 관통 데미지, 반격에 대한 반격, 공격 시 효과는 발생하지 않는다.',en:'This monster still counters if that attack destroys it, but not if the attack is negated. A counter causes no piercing damage, counter in response, or on-attack effects.'},
  ],
  dual: [
    {label:'effect',ja:'自分の各ターンに、このモンスターで2回まで攻撃できる。',ko:'자신의 각 턴에 이 몬스터로 2회까지 공격할 수 있다.',en:'This monster can attack up to twice during each of your turns.'},
    {label:'note',ja:'1回目の攻撃が無効になっても、攻撃回数は1回分消費する。',ko:'첫 번째 공격이 무효화되어도 공격 횟수 1회를 소비한다.',en:'A negated first attack still uses up one of these attacks.'},
  ],
  ambush: [
    {label:'effect',ja:'相手の場にモンスターがいても、相手プレイヤーを直接攻撃できる。',ko:'상대 필드에 몬스터가 있어도 상대 플레이어를 직접 공격할 수 있다.',en:'This monster can attack the opponent directly even while they control monsters.'},
    {label:'note',ja:'このモンスターはモンスターを攻撃できない。直接攻撃を禁止する効果は受ける。',ko:'이 몬스터는 몬스터를 공격할 수 없다. 직접 공격을 금지하는 효과는 적용된다.',en:'It cannot attack monsters. Effects that prohibit direct attacks still apply.'},
  ],
  aura: [
    {label:'effect',ja:'相手は、魔法・モンスター効果で対象を選ぶ時、このモンスターを選べない。',ko:'상대가 마법·몬스터 효과의 대상을 고를 때 이 몬스터를 선택할 수 없다.',en:'The opponent cannot choose this monster when selecting a target for a spell or monster effect.'},
    {label:'note',ja:'攻撃の対象にはなる。全体に及ぶ効果や、自分が対象を選ぶ効果も受ける。あらゆる効果を無効にする能力ではない。',ko:'공격 대상은 될 수 있다. 전체에 적용되는 효과나 자신이 대상을 고르는 효과도 받는다. 모든 효과를 무효화하는 능력은 아니다.',en:'It can still be attacked, affected by effects that apply to all monsters, and chosen by your own effects. This ability does not negate every effect.'},
  ],
  void: [
    {label:'monster',ja:'このモンスターが破壊されると、墓地の代わりに自分のリフトへ送る。',ko:'이 몬스터가 파괴되면 묘지 대신 자신의 리프트로 보낸다.',en:'When this monster is destroyed, send it to your Rift instead of your graveyard.'},
    {label:'normalSpell',ja:'この魔法を使い、無効にされなかった場合、効果を処理する直前に自分のリフトへ送る。無効にされた場合は墓地に残る。',ko:'이 마법을 사용하고 무효화되지 않았다면 효과 처리 직전에 자신의 리프트로 보낸다. 무효화되면 묘지에 남는다.',en:'When you play this spell and it is not negated, send it to your Rift just before resolving its effect. If negated, it stays in your graveyard.'},
    {label:'persistentSpell',ja:'この魔法が場で破壊された時や、持続期間を終えた時、墓地の代わりに自分のリフトへ送る。発動を無効にされた場合は墓地に残る。',ko:'필드의 이 마법이 파괴되거나 지속 기간이 끝나면 묘지 대신 자신의 리프트로 보낸다. 발동이 무효화되면 묘지에 남는다.',en:'When this spell is destroyed on the field or its duration ends, send it to your Rift instead of your graveyard. If its activation is negated, it stays in your graveyard.'},
    {label:'rift',ja:'ゲームから除外されたカードの置き場。リフトのカードは、墓地をデッキに戻す時に混ぜない。リフトから戻す効果があれば取り戻せる。',ko:'게임에서 제외된 카드를 두는 곳이다. 묘지를 덱으로 되돌릴 때 리프트의 카드는 섞지 않는다. 리프트에서 되돌리는 효과로는 가져올 수 있다.',en:'The Rift holds exiled cards. These cards are not shuffled into your deck when it is refilled from the graveyard. Effects that recover cards from the Rift can still retrieve them.'},
    {label:'note',ja:'手札から捨てただけでは、この能力でリフトへ送られない。',ko:'패에서 버리기만 한 카드는 이 능력으로 리프트에 보내지지 않는다.',en:'Simply discarding this card from your hand does not send it to the Rift through this ability.'},
  ],
  guts: [
    {label:'trigger',ja:'召喚時に、気合で使うカウンターを1個得る。',ko:'소환 시 기합에 쓰는 카운터를 1개 얻는다.',en:'On summon, this monster gains 1 counter for Guts.'},
    {label:'effect',ja:'攻撃・反撃のダメージで体力が0以下になる時、このカウンターを1個消費し、体力1で生き残る。',ko:'공격·반격 데미지로 체력이 0 이하가 될 때 이 카운터 1개를 소비하고 체력 1로 생존한다.',en:'When attack or counter damage would reduce its HP to 0 or below, spend 1 of these counters to survive at 1 HP.'},
    {label:'note',ja:'カウンターがなければ耐えられない。魔法などの効果ダメージや、直接「破壊する」効果は防げない。自分プレイヤーが受ける貫通ダメージも減らない。',ko:'카운터가 없으면 버틸 수 없다. 마법 등의 효과 데미지나 직접 파괴하는 효과는 막지 못한다. 자신 플레이어가 받는 관통 데미지도 줄이지 않는다.',en:'It cannot survive this way without a counter. Guts does not protect against effect damage, such as spell damage, or effects that directly destroy a monster. Piercing damage to you is not reduced.'},
  ],
  decay: [
    {label:'trigger',ja:'このモンスターが卵以外の相手モンスターを攻撃すると、攻撃ダメージを与える前に、攻撃先にカウンターを1個付与する。',ko:'이 몬스터가 알 이외의 상대 몬스터를 공격하면 공격 데미지를 주기 전에 공격 대상에게 카운터 1개를 부여한다.',en:'When this monster attacks an enemy monster other than an Egg, place 1 counter on the target before dealing attack damage.'},
    {label:'result',ja:'腐敗で使うカウンターが3個以上たまると、そのモンスターを破壊する。破壊できた場合、その持ち主に3ダメージを与える。',ko:'부패에 쓰는 카운터가 3개 이상 쌓이면 그 몬스터를 파괴한다. 파괴에 성공하면 그 소유자에게 3 데미지를 준다.',en:'When the target has 3 or more counters used for Decay, destroy it. If it is destroyed, deal 3 damage to its owner.'},
    {label:'note',ja:'回避された攻撃では付与しない。気合や卵など、別の用途のカウンターとは合算しない。',ko:'회피된 공격에는 카운터를 부여하지 않는다. 기합이나 알 등 다른 용도의 카운터와 합산하지 않는다.',en:'An evaded attack places no counter. Do not add counters used for Guts, Eggs, or other purposes to this total.'},
  ],
  majesty: [
    {label:'effect',ja:'このモンスターが場にいる間、相手はそのターンに召喚したモンスターで攻撃できない。',ko:'이 몬스터가 필드에 있는 동안 상대는 그 턴에 소환한 몬스터로 공격할 수 없다.',en:'While this monster is on the field, the opponent cannot attack with monsters summoned that turn.'},
    {label:'note',ja:'前のターン以前に召喚されたモンスターは攻撃できる。自分の場に「威厳」を持つモンスターがいなくなると、この制限はなくなる。',ko:'이전 턴까지 소환된 몬스터는 공격할 수 있다. 자신의 필드에 위엄 몬스터가 없어지면 이 제한은 사라진다.',en:'Monsters summoned on earlier turns can still attack. This restriction ends when you no longer control any monsters with Majesty.'},
  ],
  taunt: [
    {label:'trigger',ja:'自分の他のモンスターが攻撃され、そのモンスターが「挑発」を持たない場合、ダイスを1個振る。',ko:'자신의 다른 몬스터가 공격받고 그 몬스터에게 도발이 없다면 주사위 1개를 굴린다.',en:'When another of your monsters is attacked and it does not have Taunt, roll 1 die.'},
    {label:'result',ja:'4以上なら、自分の「挑発」を持つモンスター1体が代わりに攻撃を受ける。複数いる場合はランダムに1体を選ぶ。',ko:'4 이상이면 자신의 도발 몬스터 1체가 대신 공격받는다. 여러 체라면 무작위로 1체를 고른다.',en:'On 4 or more, one of your monsters with Taunt takes the attack instead. If you have several, choose one at random.'},
    {label:'note',ja:'挑発を持つモンスターが複数いても、ダイスは1個だけ。プレイヤーへの直接攻撃は引き受けない。',ko:'도발 몬스터가 여러 체여도 주사위는 1개만 굴린다. 플레이어에 대한 직접 공격은 대신 받지 않는다.',en:'Roll only 1 die even if several of your monsters have Taunt. Taunt does not intercept direct attacks against a player.'},
  ],
  evade: [
    {label:'trigger',ja:'このモンスターが攻撃される時、ダイスを1個振る。',ko:'이 몬스터가 공격받을 때 주사위 1개를 굴린다.',en:'When this monster is attacked, roll 1 die.'},
    {label:'result',ja:'4以上ならその攻撃を無効にし、攻撃ダメージを受けない。相手の攻撃回数は1回分消費される。',ko:'4 이상이면 그 공격을 무효화하고 공격 데미지를 받지 않는다. 상대의 공격 횟수는 1회 소비된다.',en:'On 4 or more, negate that attack and take no attack damage. The attacker still uses up one attack.'},
    {label:'note',ja:'魔法などの効果ダメージや、反撃には発動しない。',ko:'마법 등의 효과 데미지나 반격에는 발동하지 않는다.',en:'This does not trigger against effect damage, such as spell damage, or against a counter.'},
  ],
  relic: [
    {label:'effect',ja:'このカードをリフトに残さない能力。除外するカードを選ぶ時、このカードは選べない。',ko:'이 카드가 리프트에 남지 않게 하는 능력이다. 제외할 카드를 고를 때 이 카드는 선택할 수 없다.',en:'This card cannot remain in the Rift. It cannot be chosen when selecting cards to exile.'},
    {label:'result',ja:'自動効果などでリフトへ送られても、自分の墓地へ戻る。手札や場に戻るわけではない。',ko:'자동 효과 등으로 리프트에 보내져도 자신의 묘지로 돌아온다. 패나 필드로 돌아오는 것은 아니다.',en:'If an automatic effect or another effect sends it to the Rift, it returns to your graveyard, not to your hand or field.'},
    {label:'note',ja:'墓地に戻った後は、通常どおりデッキの補充に使われる。',ko:'묘지로 돌아온 뒤에는 평소처럼 덱 보충에 사용된다.',en:'Once in your graveyard, it can be shuffled back into your deck as usual when the deck is refilled.'},
  ],
};

/** Only owned Void uses the inspected card's type; a granted/referenced ability shows all types. */
export function keywordRules(key: string, lang: EffectLocale, owner?: Pick<CardDef, 't' | 'ench'>): {label: string; text: string}[] {
  const kind = owner?.t === 'mon' ? 'monster' : owner?.t === 'spell' ? owner.ench ? 'persistentSpell' : 'normalSpell' : undefined;
  return (CARD_KEYWORD_RULES[key] ?? [])
    .filter(row => key !== 'void' || !kind || !['monster','normalSpell','persistentSpell'].includes(row.label) || row.label === kind)
    .map(row => ({label: LABELS[row.label][lang], text: row[lang]}));
}
export const CARD_KEYWORD_TEXT: Record<string, Record<EffectLocale, string>> = Object.fromEntries(
  Object.keys(CARD_KEYWORD_RULES).map(key => [key, Object.fromEntries(
    (['ja','ko','en'] as const).map(lang => [lang, keywordRules(key, lang).map(row => `${row.label}: ${row.text}`).join('\n')]),
  ) as Record<EffectLocale, string>]),
);
export function applyKeywordText(keywords: Record<string, Record<EffectLocale, { desc: string }>>): void {
  for (const [key, descriptions] of Object.entries(CARD_KEYWORD_TEXT)) {
    for (const lang of ['ja','ko','en'] as const) keywords[key][lang].desc = descriptions[lang];
  }
}
