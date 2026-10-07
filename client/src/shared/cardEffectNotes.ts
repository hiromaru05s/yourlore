import type { CardDef } from './types';
import type { EffectLocale } from './cardEffectText';

/** Contextual definitions shown alongside the complete effect, in the selected language. */
export function cardEffectNotes(card: CardDef, lang: EffectLocale): string[] {
  const text = lang === 'ja' ? card.textJa ?? '' : lang === 'en' ? card.textEn ?? '' : card.text;
  const notes: string[] = [];
  const add = (ja: string, ko: string, en: string): void => { notes.push(({ ja, ko, en })[lang]); };
  if (/デッキ構成|덱 구성|deck composition/i.test(text)) add(
    'デッキ構成：自分のデッキ・手札・墓地・場のモンスターの合計。場の魔法・クエストとリフトは含まない。単に「デッキ」とある場合は山札だけを指す。',
    '덱 구성: 자신의 덱·패·묘지·필드의 몬스터를 합한 카드. 필드의 마법·퀘스트와 리프트는 제외한다. 단순히 덱이라고 쓰면 뽑는 카드 더미만 뜻한다.',
    'Deck composition: your deck, hand, graveyard, and monsters on your field combined. Excludes spells and quests on the field and your Rift. “Deck” alone means only your draw pile.',
  );
  if (card.quick || card.t === 'quest' || /リフト|리프트|\bRift\b/.test(text)) add(
    'リフト：ゲームから除外されたカードを置く場所。墓地とは別で、デッキの補充には使わない。リフトから移動できるのは、それを明記した効果だけ。',
    '리프트: 게임에서 제외된 카드를 놓는 곳. 묘지와 다르며 덱 보충에 쓰지 않는다. 리프트에서 이동하려면 이를 명시한 효과가 필요하다.',
    'Rift: the zone for exiled cards, separate from the graveyard. It does not refill your deck. Only effects that explicitly refer to it can move cards out.',
  );
  if (/[（(](?:持続|지속|lasting)[）)]/.test(text)) add(
    '持続：変更を受けたモンスターが場を離れるまで続く。「場にいる間／場にある間」の補正は、条件や発生源がなくなると終了する。',
    '지속: 변경을 받은 몬스터가 필드를 떠날 때까지 유지된다. 필드에 있는 동안/놓인 동안의 보정은 조건이나 발생원이 사라지면 끝난다.',
    'Lasting: remains until the affected monster leaves the field. A “While on the Field” or “While Deployed” bonus ends when its condition or source is no longer present.',
  );
  if (card.t === 'mon' || card.ench) add(
    '場の効果：召喚時・破壊時などの記載に従って処理する。繰り返す効果は、このカードが場にある間に発動する。場を離れても続く効果は本文に明記する。',
    '필드 효과: 소환시·파괴시 등 적힌 시점에 처리한다. 반복 효과는 이 카드가 필드에 있는 동안 발동한다. 필드를 떠나도 이어지는 효과는 본문에 명시한다.',
    'Field effects resolve at the stated time, such as on summon or destruction. Recurring effects trigger while this card is on the field. Effects that continue after it leaves say so explicitly.',
  );
  if (/カウンター|카운터|counter/i.test(text)) add(
    'カウンター：用途が異なるものは別々に数える。気合・腐敗・卵の耐久などのカウンターと、プレイヤーの烙印カウンターは共有しない。',
    '카운터: 용도가 다르면 별도로 센다. 기합·부패·알의 내구 등에 쓰는 카운터와 플레이어의 낙인 카운터는 공유하지 않는다.',
    'Counters with different uses are tracked separately. Guts, Decay, Egg durability, and a player’s Brand counters do not share a pool.',
  );
  if (card.quick) add(
    '即効魔法：購入すると手札に入らず、このカードをリフトに置いてから効果を処理する。無効にされてもリフトに残る。',
    '속공 마법: 구매하면 패에 넣지 않고 이 카드를 리프트에 놓은 뒤 효과를 처리한다. 무효화되어도 리프트에 남는다.',
    'Quick spell: on purchase, this card goes directly to your Rift before its effect resolves. It stays there even if negated.',
  );
  if (card.t === 'quest') add(
    'クエスト：設置後から進捗を数える。達成するとこのカードをリフトへ送り、報酬を1回だけ得る。',
    '퀘스트: 설치 후부터 진행을 센다. 달성하면 이 카드를 리프트로 보내고 보상을 1회 받는다.',
    'Quest: counts progress only after deployment. On completion, this card goes to your Rift and grants its reward once.',
  );
  return notes;
}
