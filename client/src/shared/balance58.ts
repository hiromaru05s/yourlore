import type { CardDef } from './types';

/** Approved Elf tuning; Elf, High Elf and Elder retain their existing passives. */
export function applyBalance58(db: Record<string, CardDef>): void {
  Object.assign(db.ELF, { atk: 12, def: 10 });
  Object.assign(db.HIGH_ELF, { atk: 20, def: 20 });
  db.ELDER_ELF_KING.def = 14;
  db.DARK_ELF.atk = 16;
  Object.assign(db.WORLD_TREE, { def: 25, onSummon: 'worldTreeDew', passive: ['guts'] });
}

export const NIGHT_CASTLE_GIFT: CardDef = {
  id: 'NIGHT_CASTLE_GIFT', t: 'spell', cost: 4, noShop: true,
  name: '밤성의 선물', nameJa: '夜城からの贈り物', nameEn: 'Gift from the Night Castle',
  ench: 'nightCastleGift', val: 4,
  text: '발동 후 자신의 4번째 턴 시작에 흡혈 계약 또는 흡혈의 극의 1장을 선택해 패에 넣고 이 마법을 묘지로 보낸다.',
};
