import type { CardDef } from './types';
import type { EffectLocale } from './cardEffectText';
import { CARD_RULE_METADATA } from './cardRuleMetadata';
import { cardTypeLabel, quickSpellRule } from './cardPresentation';

export const RULE_TERM_NOTES = {
  composition: {ja:'デッキ構成：自分のデッキ・手札・墓地・場のモンスターの合計。場の魔法・クエストとリフトは含まない。単に「デッキ」とある場合は山札だけを指す。',ko:'덱 구성: 자신의 덱·패·묘지·필드의 몬스터를 합한 카드. 필드의 마법·퀘스트와 리프트는 제외한다. 단순히 덱이라고 쓰면 뽑는 카드 더미만 뜻한다.',en:'Deck composition: your deck, hand, graveyard, and monsters on your field combined. Excludes spells and quests on the field and your Rift. “Deck” alone means only your draw pile.'},
  graveyard: {ja:'墓地：使用済み・破壊・購入したカードなどを置く場所。デッキが尽きると、墓地をシャッフルしてデッキに戻す。リフトとは別の場所。',ko:'묘지: 사용·파괴·구매한 카드 등을 놓는 곳. 덱이 소진되면 묘지를 섞어 덱으로 되돌린다. 리프트와는 다른 곳이다.',en:'Graveyard: holds used, destroyed and purchased cards. When your deck runs out, shuffle your graveyard into your deck. It is separate from the Rift.'},
  rift: {ja:'リフト：ゲームから除外されたカードを置く場所。墓地とは別で、デッキの補充には使わない。リフトから移動できるのは、それを明記した効果だけ。',ko:'리프트: 게임에서 제외된 카드를 놓는 곳. 묘지와 다르며 덱 보충에 쓰지 않는다. 리프트에서 이동하려면 이를 명시한 효과가 필요하다.',en:'Rift: the zone for exiled cards, separate from the graveyard. It does not refill your deck. Only effects that explicitly refer to it can move cards out.'},
  lasting: {ja:'持続：変更を受けたモンスターが場を離れるまで続く。付与元が場を離れても残る。「場にある間」の補正は、条件や発生源がなくなると終了する。',ko:'지속: 변경을 받은 몬스터가 필드를 떠날 때까지 유지된다. 부여한 카드가 필드를 떠나도 남는다. 필드에 있는 동안의 보정은 조건이나 발생원이 사라지면 끝난다.',en:'Lasting: remains until the affected monster leaves the field, even if the card that granted it leaves first. A “While on the Field” bonus ends when its condition or source is no longer present.'},
  counters: {ja:'カウンター：効果の回数や状態を記録する目印。個数に応じた処理は各効果に従う。用途が異なるものは別々に数える。気合・腐敗・卵の耐久などのカウンターと、プレイヤーの烙印カウンターは共有しない。',ko:'카운터: 효과의 횟수나 상태를 기록하는 표식. 개수에 따른 처리는 각 효과의 설명을 따른다. 용도가 다르면 별도로 센다. 기합·부패·알의 내구 등에 쓰는 카운터와 플레이어의 낙인 카운터는 공유하지 않는다.',en:'Counters are markers that track an effect’s uses or a state. Each effect explains what its counter amount does. Counters with different uses are tracked separately. Guts, Decay, Egg durability, and a player’s Brand counters do not share a pool.'}
};

export const QUEST_RULE = {ja:'クエスト：設置後から進捗を数える。達成するとこのカードをリフトへ送り、報酬を1回だけ得る。',ko:'퀘스트: 설치 후부터 진행을 센다. 달성하면 이 카드를 리프트로 보내고 보상을 1회 받는다.',en:'Quest: counts progress only after deployment. On completion, this card goes to your Rift and grants its reward once.'};

/** Contextual definitions shown alongside the complete effect, in the selected language. */
export function cardEffectNotes(card: CardDef, lang: EffectLocale): string[] {
  const terms = CARD_RULE_METADATA[card.id]?.terms ?? [];
  const notes: string[] = [];
  const add = (ja: string, ko: string, en: string): void => { notes.push(({ ja, ko, en })[lang]); };
  if (terms.includes('composition')) notes.push(RULE_TERM_NOTES.composition[lang]);
  if (terms.includes('graveyard')) notes.push(RULE_TERM_NOTES.graveyard[lang]);
  if (terms.includes('rift')) notes.push(RULE_TERM_NOTES.rift[lang]);
  if (terms.includes('lasting')) notes.push(RULE_TERM_NOTES.lasting[lang]);
  if (card.t === 'mon' || card.ench) add(
    '場の効果：召喚時・破壊時などの記載に従って処理する。繰り返す効果は、このカードが場にある間に発動する。場を離れても続く効果は本文に明記する。',
    '필드 효과: 소환 시·파괴 시 등 적힌 시점에 처리한다. 반복 효과는 이 카드가 필드에 있는 동안 발동한다. 필드를 떠나도 이어지는 효과는 본문에 명시한다.',
    'Field effects resolve at the stated time, such as on summon or destruction. Recurring effects trigger while this card is on the field. Effects that continue after it leaves say so explicitly.',
  );
  if (terms.includes('counters')) notes.push(RULE_TERM_NOTES.counters[lang]);
  if (card.quick) notes.push(`${cardTypeLabel(card, lang)}: ${quickSpellRule(lang)}`);
  if (card.t === 'quest') notes.push(QUEST_RULE[lang]);
  return notes;
}
