import type { CardDef } from './types';

/** Approved nine-card rework. Effect text lives in cardEffectText.ts. */
export function applyBalance57(db: Record<string, CardDef>): void {
  Object.assign(db.M11, { atk: 4, def: 3 });
  db.NGA3.atk = 3;
  db.ELITE.def = 3;
  db.GM6_8.atk = 12;
  db.NGA4.atk = 7;
  Object.assign(db.VITAL3, { onSummon: undefined, val: undefined });
  db.ACID_RAIN.play = 4;
}
