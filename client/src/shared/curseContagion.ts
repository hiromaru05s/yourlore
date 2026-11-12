import type { CardDef } from './types';

/** Ordinary market spell. Generated Curses are new records, never copies of cards in the Rift. */
export const CURSE_CONTAGION: CardDef = {
  id: 'CURSE_CONTAGION', t: 'spell', act: 'curseContagion', cost: 1,
  nameJa: '呪いの伝染', name: '저주의 전염', nameEn: 'Curse Contagion',
  textJa: '【発動時】双方のデッキ構成に「呪い」がない場合、新しい「呪い」を相手の墓地に2枚、自分の墓地に1枚加える。それ以外の場合、相手のデッキ構成の「呪い」が5枚未満なら相手の墓地に新しい「呪い」1枚、5枚以上なら3枚を加える。',
  text: '【발동 시】양측 덱 구성에 저주가 없으면 상대 묘지에 새 저주 2장, 자신의 묘지에 새 저주 1장을 추가한다. 그 외에는 상대 덱 구성의 저주가 5장 미만이면 상대 묘지에 새 저주 1장을, 5장 이상이면 3장을 추가한다.',
  textEn: '【On Cast】If neither player has a Curse in their deck composition, add 2 new Curses to the opposing graveyard and 1 to your own graveyard. Otherwise, if the opponent has fewer than 5 Curses in their deck composition, add 1 new Curse to their graveyard. If they have 5 or more, add 3.',
};
