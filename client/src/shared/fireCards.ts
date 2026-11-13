import type { CardDef } from './types';

export const FIRE_SPELL_IDS = ['FLAME', 'S1', 'FIRE_BALL', 'FIRE_ARROW', 'FIRE_ZONE', 'FIRE_METEOR', 'FIRE_ART', 'FIRE_MARK', 'FIRE_BRANDING'];

export const FIRE_BRAND_CARDS: CardDef[] = [
  {
    id: 'FIRE_MARK', t: 'spell', act: 'expansion', cost: 2, play: 1,
    nameJa: 'ファイアーマーク', name: '파이어 마크', nameEn: 'Fire Mark',
    textJa: '【発動時】ダイス1個を振る。出目が6なら、相手に烙印カウンター1個を付与する。このターン、このカードより前に自分がファイアー魔法を2回以上使用していれば、ダイスを振らずに付与する。',
    text: '【발동 시】주사위 1개를 굴린다. 6이면 상대에게 낙인 카운터 1개를 준다. 이번 턴 이 카드보다 먼저 자신이 파이어 마법을 2회 이상 사용했다면 주사위를 굴리지 않고 준다.',
    textEn: '【On Cast】Roll 1 die. On a 6, give the opponent 1 Brand counter. If you played at least 2 Fire spells earlier this turn, give the opponent 1 Brand counter without rolling.',
  },
  {
    id: 'FIRE_BRANDING', t: 'spell', act: 'expansion', cost: 6, play: 6,
    nameJa: 'ファイアーマスターの焼印術', name: '파이어 마스터의 낙인술', nameEn: 'Fire Master’s Branding Art',
    textJa: '【コスト】このターン、自分が既に使用したファイアー魔法1回につき、このカードの発動コストを1下げる（最低0）。\n\n【発動時】ダイス1個を振る。出目が3以上なら、相手に烙印カウンター1個を付与する。',
    text: '【코스트】이번 턴 자신이 이미 사용한 파이어 마법 1회당 이 카드의 발동 코스트를 1 줄인다(최저 0).\n\n【발동 시】주사위 1개를 굴린다. 3 이상이면 상대에게 낙인 카운터 1개를 준다.',
    textEn: '【Cost】Reduce this card’s cast cost by 1 for each Fire spell you already played this turn, to a minimum of 0.\n\n【On Cast】Roll 1 die. On a 3 or higher, give the opponent 1 Brand counter.',
  },
];
