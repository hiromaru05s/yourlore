import type {CardDef} from './types';

/** Read-only fallback for games/events saved before catalog retirement. Never purchasable or generated. */
export const RETIRED_GROWTH: CardDef = {
  "id": "GROWTH",
  "nameJa": "成長",
  "name": "성장",
  "nameEn": "Growth",
  "cost": 6,
  "textJa": "【自分の追加ドロー時】自分のターン中、通常の開始時ドロー以外でカードを1枚引くたび、自分の体力を1回復する。",
  "text": "【자신의 추가 드로우 시】자신 턴에 통상 턴 시작 드로우 이외로 카드 1장을 뽑을 때마다 자신의 체력을 1 회복한다.",
  "textEn": "【When You Draw Extra Cards】During your turn, whenever you draw 1 card outside the normal turn-start draw, restore 1 of your HP.",
  "t": "spell",
  "act": "expansion",
  "ench": "growth",
  "val": 99
};
