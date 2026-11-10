import { DB } from '../../client/src/shared/cards';
import type { CardInst, GameState } from '../../client/src/shared/types';

const castleCards = new Set([
  'SOLDIER2','EXPANSION','LAND_GRANT','QUICK_MUSTER','TREASON','HARVEST','STABLE',
  'GENESIS_SONG','GENESIS_MAGIC','MERC_ART','BLOOD_SECRET','AEM','COLOSSEUM',
  'BLACK_CURSE','BLOOD_FEST','GS5_3','QUICK_CURSE','SOUL_HARVEST','Q_CASTLE','ELITE','LEVY',
]);

const questCards = new Set(['Q_RIFT','Q_BRAND','Q_TORI','Q_TRIBE','Q_DECAY','Q_ASSASSIN','Q_MANA','Q_CHEAT']);

/** Rooms persist full card instances, including their printed rules. Update only
 * revised print fields so UID, counters, damage and granted abilities survive. */
export function restoreReworkedCards(game: GameState): void {
  const updateCastle = !game.castleReworkApplied;
  const updateQuests = !game.questReworkApplied;
  if (game.over || (!updateCastle && !updateQuests)) return;
  game.questReworkApplied = true;
  game.castleReworkApplied = true;
  function refresh(card: CardInst | null) {
    if (!card) return;
    const revisedQuest = updateQuests && questCards.has(card.id);
    if (!revisedQuest && !(updateCastle && castleCards.has(card.id))) return;
    const def = DB[card.id];
    Object.assign(card, {name:def.name, nameJa:def.nameJa, nameEn:def.nameEn,
      text:def.text, textJa:def.textJa, textEn:def.textEn});
    if (revisedQuest || ['EXPANSION','SOUL_HARVEST','GENESIS_MAGIC','COLOSSEUM','AEM'].includes(card.id)) {
      card.cost = def.cost;
      card.play = def.play;
    }
    if (card.id === 'GENESIS_MAGIC' || card.id === 'BLOOD_SECRET') card.passive = [...new Set([...(card.passive ?? []), 'void'])];
    if (revisedQuest || card.id === 'Q_CASTLE') card.quest = {...def.quest!};
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
    for (const q of p.quests ?? []) {
      if (updateQuests && questCards.has(q.card.id)) q.progress = Math.min(q.progress, q.card.quest!.target);
    }
  }
  const wheel = game._wheelSnap;
  if (wheel?.state) restoreReworkedCards(wheel.state as GameState);
  if (wheel?.resolved?.state) restoreReworkedCards(wheel.resolved.state as GameState);
}
