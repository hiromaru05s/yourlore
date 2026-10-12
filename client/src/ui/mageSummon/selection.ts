/** User selected Revision 02 / 01 for all three mages, 2026-10-09. */
export const MAGE_CARDS=['FIRE_MASTER','BLACK_ELSA','BLACK_ALICE'] as const;
export type MageId=typeof MAGE_CARDS[number];
export const MAGE_SUMMON_VARIANT=0;
export function isMage(id:string|undefined):id is MageId{return MAGE_CARDS.includes(id as MageId);}
