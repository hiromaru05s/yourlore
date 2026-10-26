import type { CardDef } from './types';

/** User-approved legacy card refresh. Player-facing rules live in cardEffectText.ts. */
export function applyLegacyCardRework(db: Record<string, CardDef>): void {
  Object.assign(db.M2, {onSummon: 'recoverCostOneMonster'});
  Object.assign(db.M4, {aura: 'killBurn', val: 2});
  Object.assign(db.M5, {onSummon: 'shield', val: 2});
  Object.assign(db.M8, {onSummon: 'stealDew', val: 1});
  db.M12.val = 2;
  db.UNBRANDER.aura = 'curseHeal';
  for (const [id, cost] of Object.entries({NIGHT_CASTLE_GIFT: 3, AHEUK: 4, GS8_0: 7, S14: 3})) {
    db[id].cost = cost;
    db[id].play = cost;
  }
  Object.assign(db.TIMEWARP, {cost: 12, play: 8});
  db.GM5_3.val = 4;
}
