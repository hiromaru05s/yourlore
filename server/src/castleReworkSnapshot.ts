import { DB } from '../../client/src/shared/cards';
import type { CardInst, GameState } from '../../client/src/shared/types';

const revised = new Set([
  'SOLDIER2','EXPANSION','LAND_GRANT','QUICK_MUSTER','TREASON','HARVEST','STABLE',
  'GENESIS_SONG','GENESIS_MAGIC','MERC_ART','BLOOD_SECRET','AEM','COLOSSEUM',
  'BLACK_CURSE','BLOOD_FEST','GS5_3','QUICK_CURSE','SOUL_HARVEST','Q_CASTLE','ELITE','LEVY',
]);

/** Rooms persist full card instances, including their printed rules. Update only
 * revised print fields so UID, counters, damage and granted abilities survive. */
export function restoreCastleRework(game: GameState): void {
  if (game.castleReworkApplied || game.over) return;
  game.castleReworkApplied = true;
  function refresh(card: CardInst | null) {
    if (!card || !revised.has(card.id)) return;
    const def = DB[card.id];
    Object.assign(card, {name:def.name, nameJa:def.nameJa, nameEn:def.nameEn,
      text:def.text, textJa:def.textJa, textEn:def.textEn});
    if (['EXPANSION','SOUL_HARVEST','GENESIS_MAGIC','COLOSSEUM','AEM'].includes(card.id)) {
      card.cost = def.cost;
      card.play = def.play;
    }
    if (card.id === 'GENESIS_MAGIC' || card.id === 'BLOOD_SECRET') card.passive = [...new Set([...(card.passive ?? []), 'void'])];
    if (card.id === 'Q_CASTLE') card.quest = {...def.quest!};
    if (card.id === 'SOLDIER2') {
      // Trick Room swaps the two printed stats as well as the live modifiers.
      if ('trickSwapped' in card && card.trickSwapped) card.atk = def.def;
      else card.def = def.def;
    }
  }
  game.market.forEach(refresh);
  for (const p of game.players) {
    [...p.hand, ...p.deck, ...p.field, ...p.discard, ...(p.removed ?? []), ...p.supply].forEach(refresh);
    for (const entry of [...p.enchants,...p.traps,...(p.quests ?? []),...p.exile]) refresh(entry.card);
  }
  const wheel = game._wheelSnap;
  if (wheel?.state) restoreCastleRework(wheel.state as GameState);
  if (wheel?.resolved?.state) restoreCastleRework(wheel.resolved.state as GameState);
}
