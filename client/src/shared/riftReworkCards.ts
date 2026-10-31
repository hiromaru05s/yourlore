import type { CardDef } from './types';

export const RIFT_REWORK_IDS = new Set(['VOID_APOSTLE', 'GM6_8', 'GM6_1', 'SORTER']);
export const ARCANE_CARDS: CardDef[] = [
  { id: 'MAGIC_TRAIN', t: 'spell', cost: 3, play: 3,
    name: '마도 열차', nameJa: '魔道列車', nameEn: 'Arcane Train',
    text: '【발동 시】다음 자신의 턴 시작 직전에 양쪽 합계 6턴만큼 턴 수와 남은 기간을 진행한다. 그동안 드로우·회복 등 턴 시작·종료 효과는 발동하지 않는다.',
    textJa: '【発動時】次の自分のターン開始直前に、双方通算6ターン分、ターン数と残り期間を進める。その間のドロー・回復などのターン開始・終了効果は発動しない。',
    textEn: '【On Cast】Immediately before your next turn starts, advance the turn number and remaining durations by 6 turns total, counting both players. Do not trigger draws, healing, or other start/end-of-turn effects during those turns.' },
  { id: 'MAGIC_BANK', t: 'spell', cost: 5, play: 4, ench: 'magicBank', val: 2,
    name: '마도 은행', nameJa: '魔道銀行', nameEn: 'Arcane Bank',
    text: '【발동 시】자신의 최대 마나 -1.\n\n【필드에 있는 동안】이 턴을 포함해 자신의 2턴 동안, 자신의 최대 마나가 증가할 때마다 추가로 최대 마나 +1. 이 추가분으로 마도 은행은 재발동하지 않는다.',
    textJa: '【発動時】自分の最大マナ-1。\n\n【場にある間】このターンを含む自分の2ターンの間、自分の最大マナが増えるたび、追加で最大マナ+1。この追加分では「魔道銀行」は再発動しない。',
    textEn: '【On Cast】Reduce your max mana by 1.\n\n【While on the Field】For 2 of your turns, including this turn, whenever your max mana increases, gain 1 additional max mana. This extra gain does not trigger Arcane Bank again.' },
];
