import type { CardDef } from './types';

/** 2026-10-31 approved spell changes. Canonical rules: cardEffectText.ts. */
export function applySpellRework74(db: Record<string, CardDef>): void {
  db.GRAPE2.val = 5;
  db.ANCIENT_CIV.cost = 3;
  db.FARM.val = 4;
  db.GS8_0.play = 6;
  delete db.GS8_0.act; delete db.GS8_0.val; delete db.GS8_0.val2;
  db.FORBIDDEN.cost = 2;
  db.TIMEWARP.play = 7;
  Object.assign(db.DESERTIFICATION, {ench: 'desertification', val: 99});
  db.BLACK_REVERSE.maxUsesPerGame = 2;
}
