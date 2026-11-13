import {NOVEMBER_PRINTS,RUNE_RULE_TEXT} from '../../client/src/shared/runeRework';
import {MERC_IDS} from '../../client/src/shared/mercenaryCards';
import { DB, STARTERS } from '../../client/src/shared/cards';
import { refreshFieldPassives } from '../../client/src/shared/engine';
import type { CardInst, FieldMon, GameState } from '../../client/src/shared/types';

const castleCards = new Set([
  'SOLDIER2','EXPANSION','LAND_GRANT','QUICK_MUSTER','TREASON','HARVEST','STABLE',
  'GENESIS_SONG','GENESIS_MAGIC','MERC_ART','BLOOD_SECRET','AEM','COLOSSEUM',
  'BLACK_CURSE','BLOOD_FEST','GS5_3','QUICK_CURSE','SOUL_HARVEST','Q_CASTLE','ELITE','LEVY',
]);

const armyChanges = new Set('GUNNER HEAVY_GUNNER INFKNIGHT CAVALRY AMA SLUM_ASSASSIN DICE_ARCHER DICE_FIGHTER DICE_MAGICIAN TPO3 TOKEN00 D_BLUE D_RED D_BLACK DIVINE ANTIQUE_DK DRAGON_RIDER GM6_0 CURSE MIMIC MERCH1 MERCH2 STARTER_CHEST'.split(' '));
const fireCards = new Set(['FLAME','FIRE_BALL','FIRE_ZONE','FIRE_METEOR','FIRE_MASTER']);
const questCards = new Set(['Q_RIFT','Q_BRAND','Q_TORI','Q_TRIBE','Q_DECAY','Q_ASSASSIN','Q_MANA','Q_CHEAT']);

/** Rooms persist full card instances, including their printed rules. Update only
 * revised print fields so UID, counters, damage and granted abilities survive. */
export function restoreReworkedCards(game: GameState): void {
  const updateCastle = !game.castleReworkApplied;
  const updateQuests = !game.questReworkApplied;
  const updateArmy = !game.armyAttuneApplied;
  const updateStarterCosts = !game.starterQuestReworkApplied;
  const updateFire = !game.fireBrandReworkApplied;
  const updateDemons = !game.demonRealmReworkApplied;
  const updateHexers = !game.hexerReworkApplied;
  const updateDiplomacy = !game.diplomacyApplied;
  const updateCasinoRally = !game.casinoRallyApplied;
  const updateRunes=!game.runeReworkApplied;
  const auditRunes = !game.runeZonesAudited;
  const renameFire = !game.threeFireNamed;
  const updateMercs = !game.mercReworkApplied;
  if (game.over || (!updateCastle && !updateQuests && !updateArmy && !updateStarterCosts && !updateFire && !updateDemons && !updateHexers && !updateMercs && !updateDiplomacy && !updateCasinoRally && !updateRunes && !auditRunes && !renameFire)) return;
  game.threeFireNamed = true;
  game.runeReworkApplied=true;
  if (auditRunes) {
    game.runeZonesAudited = true;
    for (const p of game.players) p.exile = p.exile.filter(entry => entry.card.id !== 'INQUISITION');
  }
  game.casinoRallyApplied = true;
  game.diplomacyApplied = true;
  game.mercReworkApplied = true;
  game.hexerReworkApplied = true;
  game.demonRealmReworkApplied = true;
  game.fireBrandReworkApplied = true;
  game.starterQuestReworkApplied = true;
  game.armyAttuneApplied = true;
  game.questReworkApplied = true;
  game.castleReworkApplied = true;
  function refresh(card: CardInst | null) {
    if (!card) return;
    if (renameFire && card.id === "S1") {
      const {name, nameJa, nameEn} = DB.S1;
      Object.assign(card, {name, nameJa, nameEn});
    }
    if (updateCasinoRally && (MERC_IDS.has(card.id) || card.id === 'VITAL4' || card.id === 'SCARECROW')) {
      const def = DB[card.id];
      Object.assign(card,{name:def.name, nameJa:def.nameJa, nameEn:def.nameEn, text:def.text, textJa:def.textJa, textEn:def.textEn});
      if (card.id === 'VITAL4') {
        if ((card as FieldMon).trickSwapped) card.atk = def.def;
        else card.def = def.def;
      }
    }
    if (updateDiplomacy && ['E2','Q_TOWN','QUICK_AID','QUICK_CURSE','GS5_3','DISARM1','MIMIC_HUNTER'].includes(card.id)) {
      const def = DB[card.id];
      Object.assign(card,{text:def.text,textJa:def.textJa,textEn:def.textEn});
      if (card.id === 'E2') card.cost = def.cost;
      if (card.id === 'Q_TOWN') card.quest = {...def.quest!};
    }
    if (updateMercs && MERC_IDS.has(card.id)) {
      const def = DB[card.id], swapped = (card as FieldMon).trickSwapped;
      Object.assign(card, {cost:def.cost, val:def.val, val2:def.val2, atk:swapped?def.def:def.atk, def:swapped?def.atk:def.def,
        text:def.text, textJa:def.textJa, textEn:def.textEn});
    }
    if (updateHexers && ['NHEX','HEXER1','HEXER2','HEXER3','HEXER4'].includes(card.id)) {
      const def = DB[card.id];
      const swapped = 'trickSwapped' in card && card.trickSwapped;
      Object.assign(card,{text:def.text,textJa:def.textJa,textEn:def.textEn,atk:swapped?def.def:def.atk,def:swapped?def.atk:def.def});
      const dest = (card as Partial<FieldMon>).mutedEffects ?? card;
      for (const k of ['onSummon','turnFx','condAtk','attackFx','aura'] as const) {
        if (def[k] && !(k==='onSummon' && 'token' in card && card.token)) dest[k]=def[k];
        else delete dest[k];
      }
      for (const k of ['val','val2','summonReq'] as const) {
        if (def[k] === undefined) delete card[k]; else Object.assign(card,{[k]:def[k]});
      }
    }
    if (updateDemons && (card.id === 'DEMON_REALM' || card.tribe === '마족')) {
      const def = DB[card.id];
      Object.assign(card, {cost:def.cost, text:def.text, textJa:def.textJa, textEn:def.textEn});
      if (def.t === 'mon') {
        const swapped = 'trickSwapped' in card && card.trickSwapped;
        card.atk = swapped ? def.def : def.atk;
        card.def = swapped ? def.atk : def.def;
      }
    }
    if (updateFire && fireCards.has(card.id)) {
      const def = DB[card.id];
      Object.assign(card, {text:def.text, textJa:def.textJa, textEn:def.textEn});
    }
    if (updateStarterCosts && (card.id === 'GOBLIN_SETTLEMENT' || card.id === 'BATTLEFIELD')) {
      const def = DB[card.id];
      Object.assign(card, {cost: def.cost, text: def.text, textJa: def.textJa, textEn: def.textEn});
    }
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
      // Old town progress included both players without recording who acted.
      if (updateDiplomacy && q.card.id === 'Q_TOWN') { q.townSeen = []; q.progress = 0; }
      if (updateQuests && questCards.has(q.card.id)) q.progress = Math.min(q.progress, q.card.quest!.target);
    }
  }
  if(updateRunes){
    const refreshRune=(c:CardInst|null)=>{
      if(!c || !DB[c.id] || !(c.id in RUNE_RULE_TEXT || c.id in NOVEMBER_PRINTS || c.id==='DRAGON_KILLER'))return;
      const def=DB[c.id], patch=NOVEMBER_PRINTS[c.id], field=c as FieldMon;
      Object.assign(c,{text:def.text,textJa:def.textJa,textEn:def.textEn});
      for(const k of Object.keys(patch??{}) as (keyof typeof def)[]){
        if(k==='passive'){
          const old=c.passive??[];
          c.passive=[...new Set([...old.filter(p=>!(c.id==='CHOSEN_KNIGHT'&&p==='counter')),...def.passive??[]])];
        }else if((k==='atk'||k==='def')&&field.trickSwapped)c[k]=def[k==='atk'?'def':'atk'];
        else {
          const target=field.mutedEffects && ['aura','condAtk','onSummon','attackFx','turnFx'].includes(k)?field.mutedEffects:c;
          if(def[k]===undefined)Reflect.deleteProperty(target,k);else Reflect.set(target,k,def[k]);
        }
      }
    };
    game.market=game.market.map(c=>c?.id==='INQUISITION'?{...DB.M1,uid:c.uid}:c);
    game.market.forEach(refreshRune);
    for(const p of game.players){
      for(const pile of [p.hand,p.deck,p.discard,p.removed??[],p.field]){
        for(let i=pile.length-1;i>=0;i--)if(pile[i].id==='INQUISITION')pile.splice(i,1);else refreshRune(pile[i]);
      }
      p.supply=p.supply.map(c=>c?.id==='INQUISITION'?{...DB.M1,uid:c.uid}:c);p.supply.forEach(refreshRune);
      for(const entry of [...p.enchants,...p.traps,...p.quests??[],...p.exile]) refreshRune(entry.card);
      for(const e of [...p.enchants])if(e.card.id==='RUNE3'){p.enchants.splice(p.enchants.indexOf(e),1);p.discard.push(e.card);}
      for(const e of p.enchants)if(e.card.id==='SPACE_RITE')e.turns=Math.min(e.turns,2);
      delete p.uses.INQUISITION;
    }
    if(game.pending && ['chosenMage','scrapper'].includes(game.pending.reason))game.pending=null;
    delete game.chosenMageQueued;
  }
  if (updateDemons) {
    for (const p of game.players) for (const m of p.field) {
      // Old Realm removed these printed abilities and explicitly emptied both
      // keyword arrays. Preserve any later grants and overlapping Essence mute.
      if (m.tribe !== '마족' || m.passive?.length !== 0 || !m.passivesG || m.onSummon || m.turnFx || m.aura) continue;
      const def = DB[m.id];
      if (def.passive) m.passive = [...def.passive];
      for (const key of ['onSummon','turnFx','aura'] as const) {
        if (def[key]) (m.mutedEffects ?? m)[key] = def[key];
      }
    }
  }
  if (updateDemons || updateHexers) refreshFieldPassives(game);
  const wheel = game._wheelSnap;
  if (wheel?.state) restoreReworkedCards(wheel.state as GameState);
  if (wheel?.resolved?.state) restoreReworkedCards(wheel.resolved.state as GameState);
}
