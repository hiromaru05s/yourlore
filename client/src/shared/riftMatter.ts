import type { CardDef } from './types';

export const RIFT_MATTER: CardDef = {
  id: 'RIFT_MATTER', t: 'spell', cost: 5,
  name: '리프트 광석 - 스타라이트', nameJa: 'リフト鉱石 - スターライト', nameEn: 'Rift Ore - Starlight',
  text: '【발동 조건】이 카드는 플레이할 수 없다.\n\n【자신의 리프트에 추가 시】다른 카드의 효과로 자신의 리프트로 보내졌을 때만 발동한다. 상대 필드의 카드 2장을 선택해 상대의 리프트로 보낸다(1장만 있으면 그 1장).',
  textJa: '【発動条件】このカードはプレイできない。\n\n【自分のリフト追加時】他のカードの効果で自分のリフトに送られた場合のみ発動する。相手の場のカード2枚を選び、相手のリフトに送る（1枚しかなければその1枚）。',
  textEn: '【Play Requirement】This card cannot be played.\n\n【Card Added to Your Rift】Activate only when another card’s effect sends this card to your Rift. Choose 2 cards on the opponent’s field and send them to their Rift; if only 1 exists, send that card.',
};

export const RIFT_METALIGHT: CardDef = {
  id: 'RIFT_METALIGHT', t: 'spell', cost: 2,
  name: '리프트 광석 - 메타라이트', nameJa: 'リフト鉱石 - メタライト', nameEn: 'Rift Ore - Metalight',
  text: '【발동 조건】이 카드는 플레이할 수 없다.\n\n【자신의 리프트에 추가 시】다른 카드의 효과로 자신의 리프트로 보내졌을 때만 발동한다. 상대 묘지의 카드 1장을 선택해 상대의 리프트로 보낸다.',
  textJa: '【発動条件】このカードはプレイできない。\n\n【自分のリフト追加時】他のカードの効果で自分のリフトに送られた場合のみ発動する。相手の墓地のカード1枚を選び、相手のリフトに送る。',
  textEn: '【Play Requirement】This card cannot be played.\n\n【Card Added to Your Rift】Activate only when another card’s effect sends this card to your Rift. Choose 1 card in the opponent’s graveyard and send it to their Rift.',
};
