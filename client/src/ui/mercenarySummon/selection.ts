export const MERCENARY_IDS=['MERCENARY','MERC_LEADER','MERC_MASTER'] as const;
export type MercenaryId=typeof MERCENARY_IDS[number];
export const isMercenary=(id:string|undefined):id is MercenaryId=>MERCENARY_IDS.includes(id as MercenaryId);
