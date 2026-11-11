import { DB, STARTERS } from '../../client/src/shared/cards';
import type { CardInst, GameState } from '../../client/src/shared/types';

const castleCards = new Set([
  'SOLDIER2','EXPANSION','LAND_GRANT','QUICK_MUSTER','TREASON','HARVEST','STABLE',
  'GENESIS_SONG','GENESIS_MAGIC','MERC_ART','BLOOD_SECRET','AEM','COLOSSEUM',
  'BLACK_CURSE','BLOOD_FEST','GS5_3','QUICK_CURSE','SOUL_HARVEST','Q_CASTLE','ELITE','LEVY',
]);

const armyChanges = new Set('GUNNER HEAVY_GUNNER INFKNIGHT CAVALRY AMA SLUM_ASSASSIN DICE_ARCHER DICE_FIGHTER DICE_MAGICIAN TPO3 TOKEN00 D_BLUE D_RED D_BLACK DIVINE ANTIQUE_DK DRAGON_RIDER GM6_0 CURSE MIMIC MERCH1 MERCH2 STARTER_CHEST'.split(' '));
const questCards = new Set(['Q_RIFT','Q_BRAND','Q_TORI','Q_TRIBE','Q_DECAY','Q_ASSASSIN','Q_MANA','Q_CHEAT']);

/** Rooms persist full card instances, including their printed rules. Update only
 * revised print fields so UID, counters, damage and granted abilities survive. */
export function restoreReworkedCards(game: GameState): void {
  const updateCastle = !game.castleReworkApplied;
  const updateQuests = !game.questReworkApplied;
  const updateArmy = !game.armyAttuneApplied;
  if (game.over || (!updateCastle && !updateQuests && !updateArmy)) return;
  game.armyAttuneApplied = true;
  game.questReworkApplied = true;
  game.castleReworkApplied = true;
  function refresh(card: CardInst | null) {
    if (!card) return;
    const revisedQuest = updateQuests && questCards.has(card.id);
    if (updateArmy) {
      const current = DB[card.id] ?? STARTERS[card.id];
      if (current && armyChanges.has(card.id)) {
        Object.assign(card,{text:current.text,textJa:current.textJa,textEn:current.textEn});
        if (['DICE_ARCHER','DICE_FIGHTER','DICE_MAGICIAN','GM6_0','AMA'].includes(card.id)) card.cost=current.cost;
        if (card.id==='AMA') { card.act=current.act; card.play=current.play; }
        if (card.id==='SLUM_ASSASSIN') card.summonReq=current.summonReq;
        if (['AMA','SLUM_ASSASSIN','DIVINE'].includes(card.id)) card.passive=[...new Set([...(card.passive??[]),...(current.passive??[])])];
        if (['DIVINE','D_BLUE'].includes(card.id)) { delete card.aura; if(card.id==='D_BLUE'){delete card.turnFx;delete card.onSummon;} }
        if (['DIVINE','ANTIQUE_DK','MERCH2'].includes(card.id)) {
          const swapped='trickSwapped' in card && card.trickSwapped;
          card.atk = swapped?current.def:current.atk;
          card.def = swapped?current.atk:current.def;
        }
      }
    }
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
