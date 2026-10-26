import type { GameState, Side, CardInst } from './types';
import { DB } from './cards';
import { purchaseEvaluator, publicInventory } from './botEconomy';

/** Estimate the competing buyer using only publicly revealed physical cards.
 * An expensive generic bomb can help the human as much as the NPC. */
function publicRival(g: GameState, side: Side): GameState {
  const rival = (1-side) as Side, p = g.players[rival];
  const known = publicInventory(p).map((c,i)=>({...c,uid:`market-known-${i}`} as CardInst));
  for(const c of [...p.discard,...p.field,...p.enchants.map(e=>e.card),...(p.quests??[]).map(q=>q.card),...p.exile.map(e=>e.card)]) {
    const i=known.findIndex(k=>k.id===c.id);if(i>=0)known.splice(i,1);
  }
  const players=[...g.players] as GameState['players'];
  players[rival]={...p,hand:[],deck:known,traps:[],collection:[],botTune:undefined};
  return {...g,players};
}

/** Challenge-only sampling. Percentages are bias probabilities, not win rates.
 * Uses the NPC's inventory and the opponent's public board/history only.
 * No card stats, player dice, draws, costs, or PvP distributions are changed. */
export const BOT_MARKET_BIAS = { easy: 0, normal: 0, hard: .5, hell: .9 } as const;
export function botMarketIndex(g: GameState, ids: string[], random: () => number): number {
  const setting = g.botMarket;
  if (!setting || !g.botDifficulty || !BOT_MARKET_BIAS[g.botDifficulty]) return Math.floor(random() * ids.length);
  const bias = BOT_MARKET_BIAS[g.botDifficulty];
  let index: number;
  if (random() >= bias || ids.length < 2) index = Math.floor(random() * ids.length);
  else {
    const p = g.players[setting.side], evaluate = purchaseEvaluator(g, p);
    const publicGame = publicRival(g,setting.side), opponentValue = purchaseEvaluator(publicGame,publicGame.players[1-setting.side]);
    // A fresh random candidate subset makes the whole legal pool reachable.
    // Recency penalties prevent endlessly feeding the same engine/combination.
    const candidates = ids.map((id, i) => ({id, i, roll: random()})).sort((a,b) => a.roll-b.roll).slice(0,32);
    const recent = setting.recent;
    const owned = [...p.hand,...p.deck,...p.discard,...p.field,...p.enchants.map(e=>e.card)];
    // Favor an advantage in the shared market, not merely an expensive card
    // either player could exploit. Owned enablers make the difference.
    const ranked = candidates.map(c => {
      const value = evaluate({...DB[c.id], uid:'market-candidate'});
      const rival = opponentValue({...DB[c.id], uid:'market-candidate'});
      const repeats = recent.filter(id => id===c.id).length;
      const copies = owned.filter(x=>x.id===c.id).length;
      return {...c, score: value.value - rival.value + value.synergy*2 + value.matchup*.5 - repeats*22 - Math.max(0,copies-1)*7};
    }).sort((a,b)=>b.score-a.score).slice(0,8);
    // Eight alternatives, not a scripted fixed combo. Retain exploration even
    // when one card has an unusually large heuristic score.
    const weights = ranked.map((_,i)=>8-i);
    let roll = random()*weights.reduce((a,b)=>a+b,0);
    index = ranked[ranked.length-1].i;
    for(let i=0;i<ranked.length;i++){roll-=weights[i];if(roll<0){index=ranked[i].i;break;}}
  }
  setting.recent.push(ids[index]);
  if(setting.recent.length>36)setting.recent.splice(0,setting.recent.length-36);
  return index;
}
export function challengeMarket(side: Side): NonNullable<GameState['botMarket']> { return {side,recent:[]}; }
