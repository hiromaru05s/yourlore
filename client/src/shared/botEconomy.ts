import type { CardDef, CardInst, GameState, PlayerState } from './types';
import { ALL_IDS, DB, hasPassive } from './cards';
import { MAX_TURNS, buyCost, curHp, effAtk, effMaxMana, isAssassinCard, isGolem, isVampFamily, isWorldTreeCard, playCost, purchaseAllowed, freeBuyBlocked, summonReqMet, spellDeckHalf } from './engine';
import { cardPower } from './cardEval';
import { recoveryEngine, strategicPowerEvaluator } from './botStrategy';
import { enteringAttack, matchupPlan, removalHits } from './botMatchup';

/** Components are policy estimates in cardPower units, not card-balance tiers. */
export const ECONOMY_DEFAULTS = {minBuy:11,minBuyEarly:6,costW:1,floorK:1.25};
export interface PurchaseValue {
  base: number; synergy: number; matchup: number; readiness: number;
  redundancy: number; delay: number; denial: number; cost: number;
  value: number; floor: number; margin: number;
}
const inventory = (p: PlayerState): CardInst[] => [...p.hand, ...p.deck, ...p.discard, ...p.field.filter(c => !c.token), ...p.enchants.map(e => e.card), ...(p.quests ?? []).map(q => q.card), ...p.exile.map(e => e.card)];
/** Public physical cards only. In particular, do not inspect a sampled/real hidden deck. */
export function publicInventory(p: PlayerState): CardDef[] {
  const cards = new Map<string, CardDef>();
  for (const c of p.revealedCards ?? []) if (DB[c.id]) cards.set(c.uid, DB[c.id]);
  for (const c of [...p.discard, ...p.field, ...p.enchants.map(e => e.card), ...(p.quests ?? []).map(q => q.card), ...p.exile.map(e => e.card)]) cards.set(c.uid, c);
  for (const c of p.removed ?? []) cards.delete(c.uid);
  return [...cards.values()];
}
const dewSource = (c: CardDef): number => c.act === 'dew' ? c.val ?? 1 : c.ench === 'worldCare' ? 1 : c.turnFx === 'worldTree' ? 3 : c.aura === 'shieldDew' ? 2 : c.ench === 'elfHaven' ? 1 : 0;
const dewSummonCost = (c: CardDef): number => c.onSummon==='darkElfDew'||c.onSummon==='elfDew' ? 4 : c.onSummon==='highElfDew' ? 10 : c.onSummon==='elderDew' ? 12 : c.onSummon==='worldTreeDew' ? 8 : 0;
const decay = (c: CardDef): boolean => hasPassive(c, 'decay') || ['DECAY_CRAFT','STRONG_ACID','ROTTEN_GROUND'].includes(c.id);
const enchantAnswer = (c: CardDef): boolean => c.act === 'destroyEnch' || ['DISARM3','COUNTERCALC','BLOOD2'].includes(c.id);

/** Build once per position; marginal purchases must not discount already-owned material. */
export function purchaseEvaluator(g: GameState, p: PlayerState, tuning = ECONOMY_DEFAULTS): (c: CardInst, marketIndex?: number) => PurchaseValue {
  const o = g.players[p === g.players[0] ? 1 : 0], own = inventory(p), known = publicInventory(o);
  const plan = matchupPlan(g,p,known);
  const cycle = [...p.hand, ...p.deck, ...p.discard];
  const counts = new Map<string, number>();
  own.forEach(c => counts.set(c.id, (counts.get(c.id) ?? 0) + 1));
  const count = (id: string): number => counts.get(id) ?? 0;
  const offers = [...g.market.filter((_, i) => (g.marketStock?.[i] ?? 3) > 0), ...p.supply.filter((c): c is CardInst => !!c)];
  const accessible = offers.filter(c => buyCost(p,c) <= effMaxMana(p) + 2);
  const power = strategicPowerEvaluator(g,p);
  const mana = effMaxMana(p), sources = own.reduce((n,c) => n + (!c.summonReq || summonReqMet(p,c,o) ? dewSource(c) : 0),0);
  // Taking damage is not free quest progress: without recovery, the required
  // damage can kill the buyer before the delayed reward matters. Shields do
  // not count because the engine advances opponentDamage after absorption.
  const recoveryBudget = (p.dew ?? 0)*4 + own.reduce((n,c) => n
    + (c.act==='heal' ? c.val??0 : c.star==='chest' ? 5 : 0)
    + recoveryEngine(c)*3 + dewSource(c)*4,0);
  const decayers = own.filter(decay).length, assassins = own.filter(isAssassinCard).length;
  const usableAnswer = (c: CardDef): boolean => enchantAnswer(c) && (c.id !== 'COUNTERCALC' || o.maxMana <= 7) && (c.id !== 'BLOOD2' || p.hp > 16);
  const answerCoverage = own.filter(usableAnswer).length;
  const suppression = g.players.reduce((n,q)=>n+q.enchants.filter(e=>e.card.ench==='weakenAll').length,0);
  const reverse = g.players.some(q=>q.enchants.some(e=>e.card.ench==='blackReverse'));
  const magicHeals = g.players.some(q=>q.enchants.some(e=>e.card.ench==='spellHeal'));
  const ownSuppression = p.enchants.some(e=>e.card.ench==='weakenAll');
  const spells = own.filter(c => c.t === 'spell').length;
  const monsters = own.filter(c => c.t === 'mon').length;
  const opponentAttack = o.field.reduce((n,m) => n + effAtk(o,m,g) * (m.mult ?? 1),0);
  const urgent = opponentAttack > p.hp + (p.shield ?? 0) + p.field.reduce((n,m) => n + curHp(p,m),0);
  const drawTurns = Math.max(1, (p.deck.length + 1) / 3);
  const ownTurnsLeft = Math.max(0, Math.ceil((MAX_TURNS - g.turn) / 2));
  // Evaluate baseline quality at usable cost; a hand of uncastable bombs must
  // not prevent acquiring the enablers that make those bombs work.
  const avg = cycle.reduce((n,c) => n + cardPower(c) * (c.summonReq && !summonReqMet(p,c,o) ? .35 : 1) / (1 + Math.max(0,playCost(c,p)-mana)*.7),0) / Math.max(1,cycle.length);
  const floor = Math.max(p.maxMana >= 5 ? p.botTune?.minBuy ?? tuning.minBuy : p.botTune?.minBuyEarly ?? tuning.minBuyEarly, avg * tuning.floorK);
  return (c, marketIndex) => {
    const copies = count(c.id), base = power(c), cost = buyCost(p,c);
    let synergy = 0, matchup = 0, readiness = 0, redundancy = 0, delay = 0, denial = 0;
    if (dewSource(c)) synergy += Math.min(12, own.filter(x => /^dew\d+$/.test(x.summonReq ?? '') || x.summonReq === 'darkElf').length * 4);
    if (isWorldTreeCard(c) && count('ELF_HAVEN')) synergy += 5;
    if (c.id === 'STRONG_ACID' || c.id === 'DECAY_CRAFT' || c.id === 'POISON_MASTER') synergy += Math.min(12,decayers*3);
    if (c.id === 'POISON_MASTER' || c.id === 'DECAY_CRAFT') synergy += Math.min(6,count('STRONG_ACID')*6);
    if (isAssassinCard(c)) synergy += Math.min(8,assassins*2);
    if (c.id === 'AEM' || c.aura === 'manaGolem' || c.aura === 'leaderGolem' || c.summonReq === 'golemKin') synergy += Math.min(10,own.filter(isGolem).length*2);
    if (c.id === 'BLOOD_SECRET' || c.ench === 'vampWard') synergy += Math.min(10,own.filter(isVampFamily).length*3);
    if (isVampFamily(c)) synergy += Math.min(8,count('NIGHT_CASTLE_GIFT')*3 + count('VAMP_PACT')*3);
    if (c.condAtk?.startsWith('cull')) synergy += Math.min(16,(p.removed ?? []).filter(x=>x.star==='trash').length*.8 + count('RIFT')*2);
    if (c.id === 'SOUL_HARVEST') {
      const curses = known.filter(x=>x.id==='CURSE').length;
      synergy += Math.min(18,curses*2 + count('BLACK_CURSE')*5 + own.filter(x=>x.aura==='hexCurseOnSpell'||x.turnFx==='hexCurse').length*3);
      if (!curses && !own.some(x=>x.id==='BLACK_CURSE'||x.aura==='hexCurseOnSpell'||x.turnFx==='hexCurse')) readiness -= 13;
    }
    if (c.id === 'ADVANCE') synergy += Math.min(18,monsters*2 + plan.stopped*4);
    if (c.id === 'TRAINING_GROUND') synergy += count('CASTLE') ? 12 : 5;
    if (c.id === 'GOBLIN_KING' && !own.some(x=>x.id.startsWith('GOBLIN')&&x.id!=='GOBLIN_KING')) readiness -= 20;
    if (c.id==='GOBLIN_LEADER'||c.id==='GOBLIN_KING') synergy += Math.min(14,own.filter(x=>x.id.startsWith('GOBLIN')&&x.id!==c.id).length*2);
    if (c.id==='FARMER') synergy += count('FARM') ? 20 : 0;
    if (c.id==='FARM_KEEPER') synergy += count('FARM')||count('BREWING') ? 15 : 0;
    if (c.id==='FARM') {
      synergy += Math.min(15,count('FARMER')*8+count('HARVEST')*5+count('FARM_KEEPER')*6);
      if(ownTurnsLeft<drawTurns+7) readiness -= base+synergy;
    }
    if (c.id==='HARVEST') {synergy += count('FARM')?10:0;if(!count('FARM'))readiness-=base;}
    if (c.id==='APPLE') {
      if(p.field.some(x=>['ELF','HIGH_ELF','HALF_ELF','DARK_ELF','WORLD_TREE','WORLD_TREE_ELDER'].includes(x.id))) synergy+=4;
      if(p.enchants.some(e=>e.card.ench==='farmerPrayer'))synergy+=28;
    }
    if (c.id === 'EMPTY_MIND' && spells<9) readiness -= base*.8;
    // Mercenary Arts only repeats the three mercenary effects; it has no
    // standalone payoff and multiple copies do not stack in mercEffect.
    if (c.ench === 'mercArt') {
      if (!own.some(x=>['MERCENARY','MERC_LEADER','MERC_MASTER'].includes(x.id))) readiness -= base;
      if (copies) redundancy -= base*.9;
    }
    if (c.id === 'RUNE2' || c.id === 'RUNE3' || c.ench === 'runeEcho') synergy += spellDeckHalf(p) ? Math.min(8,spells) : -10;
    if (c.act?.startsWith('buff') || c.id === 'TRUMPET') synergy += monsters ? Math.min(6,monsters*1.5) : -8;
    // Market support is an option, discounted heavily compared with owned support.
    if (c.id !== 'STRONG_ACID' && decay(c) && !decayers && accessible.some(x=>x.id==='STRONG_ACID')) synergy += 2;
    if (dewSource(c) && accessible.some(x=>x.summonReq?.startsWith('dew'))) synergy += 2;

    if (c.summonReq && !summonReqMet(p,c,o)) {
      const dewNeed = c.summonReq === 'darkElf' ? 4 : /^dew\d+$/.test(c.summonReq) ? Number(c.summonReq.slice(3)) : 0;
      let factor = .35;
      if (dewNeed) {
        const reserve = (p.dew ?? 0) + sources * 2;
        factor = reserve >= dewNeed ? .8 : sources > 0 ? .55 : .12;
        if (c.summonReq === 'darkElf' && p.field.some(x=>['ELF','HIGH_ELF','HALF_ELF','ELDER_ELF_KING'].includes(x.id))) factor *= .5;
      } else if (c.summonReq === 'assassinTrio') factor = new Set(own.filter(isAssassinCard).map(x=>x.id)).size / 3;
      else if (c.summonReq === 'assassinKin' || c.summonReq === 'assassinField') factor = assassins ? .75 : .15;
      else if (c.summonReq === 'hexBoss') factor = spells >= 12 && spells * 2 >= own.length ? .75 : .15;
      else if (c.summonReq === 'golemKin') factor = own.some(isGolem) ? .8 : .15;
      else if (c.summonReq === 'mm5') factor = mana >= 4 ? .85 : .5;
      readiness -= base * (1-Math.min(1,factor));
    }
    // A consumable summon resource cannot support every copy independently.
    // Repeated copies share a forecast budget. Different finishers can replace
    // the old plan; do not force the buyer to fund every sunk purchase first.
    // Monsters already on the field have paid their summon cost.
    const dewCost = dewSummonCost(c);
    if (dewCost) {
      const committed = cycle.filter(x=>x.id===c.id).length*dewCost;
      const available = Math.max(0,(p.dew??0)+sources*2-committed);
      // The first copy already has its summon requirement evaluated above.
      if (committed) readiness -= base*.85*(1-Math.min(1,available/dewCost));
    }
    readiness -= Math.min(base*.6,Math.max(0,playCost(c,p)-mana)*4);
    // Attack-dependent bodies cannot deliver their payoff at zero ATK.
    // Account for the public global stat swap and suppression on entry.
    if (c.t==='mon') {
      const attack=enteringAttack(g,p,c);
      if (suppression && attack<=0) {
        const reliant=c.directOnly||hasPassive(c,'decay')||(!c.onSummon&&!c.turnFx&&!c.aura);
        readiness -= base*(reliant?.8:.35)/(1+(ownSuppression?0:answerCoverage*.5));
      }
      // Small attackers are not a sustainable plan into an affordable wall.
      // Decay still gets credit when it can actually attack through suppression.
      if ((c.atk??0)<=2 && !hasPassive(c,'decay') && !c.directOnly && !c.turnFx && !c.aura)
        matchup -= plan.wallRisk*base*.45;
      if (attack>=4 && !c.summonReq) matchup += Math.min(10,plan.suppressRisk*6+plan.wallRisk*4);
      if (c.directOnly && !o.field.some(m=>m.aura==='eliteGuard') && !reverse)
        matchup += plan.wallRisk*5;
    }
    if (p.field.some(m=>m.id==='CASTLE') && c.t==='mon' && c.cost>=5) readiness -= base*.7;
    if (c.quest && copies) redundancy -= base + 30;
    if (c.quest?.event==='opponentDamage' && p.hp+recoveryBudget<=c.quest.target+10)
      readiness -= base*.8;
    // A quest's printed reward has little value without a route to its counter.
    // Do not offer/buy castle, tribe or assassin payoffs as generic good cards.
    if (c.quest) {
      const support = c.quest.event==='castleTurn' ? Math.min(1,count('CASTLE'))
        : c.quest.event==='tribeSummon' ? Math.min(1,own.filter(x=>x.t==='mon'&&x.tribe).length/3)
        : c.quest.event==='assassinHit' ? Math.min(1,assassins/2)
        : c.quest.event==='decayKill' ? Math.min(1,decayers/2)
        : c.quest.event==='healthGain' ? Math.min(1,recoveryBudget/c.quest.target)
        : c.quest.event==='emptyTurn' ? Math.max(0,1-monsters/4)
        : 1;
      readiness -= base*.85*(1-support);
    }
    // Singular permanents and narrow answers lose value sharply after coverage.
    if (c.ench && ['worldCare','foresight','guild'].includes(c.ench) && copies) redundancy -= base*.8;
    if (enchantAnswer(c)) {
      const threats = known.filter(x=>x.ench);
      const active = o.enchants.length;
      const future = g.market.some((x,i)=>x.ench && (g.marketStock?.[i]??3)>0 && x.cost<=o.maxMana+2);
      const coverage = answerCoverage;
      if(plan.blocked && o.enchants.some(e=>e.card.ench==='weakenAll'||e.card.ench==='noAttack'))
        matchup += Math.min(24,plan.stopped*5+plan.small*2)/(1+coverage);
      matchup += Math.min(22,active*9 + Math.max(0,threats.length-active)*3 + (future?2:0)) / (1+coverage);
      if (c.id==='COUNTERCALC' && o.maxMana>7) readiness -= base + matchup;
    }
    const wallAnswer=c.act==='destroyMon' && plan.walls.some(m=>removalHits(g,o,c,m));
    if (c.act==='destroyMon') {
      const targets=o.field.filter(m=>removalHits(g,o,c,m));
      const coverage=own.filter(x=>plan.walls.some(m=>removalHits(g,o,x,m))).length;
      const future=plan.offers.some(m=>(m.def??0)>=7&&removalHits(g,o,c,m));
      matchup += (Math.min(20,Math.max(0,...targets.map(m=>effAtk(o,m,g)+curHp(o,m)*.5+(m.guts??0)*2)))
        + (wallAnswer?12:future?8:0))/(1+coverage);
    }
    if (c.id==='ADVANCE' || c.act==='buffAllTurn' || c.act==='buffPerm')
      matchup += plan.blocked ? Math.min(18,plan.small*3)/(1+own.filter(x=>x.id==='ADVANCE'||x.act==='buffPerm').length) : 0;
    if (c.id==='POISON_MASTER') matchup += Math.min(10,o.field.filter(m=>m.hatch==null&&curHp(o,m)>=8).length*4);
    const faceSpell = ['S13','FLAME','AMBUSH'].includes(c.id);
    const recipient = reverse ? p : o;
    if (faceSpell && (reverse !== magicHeals || recipient.enchants.some(e=>e.card.ench==='blackInfinity'))) readiness -= base*.9;
    if (c.directOnly && reverse) readiness -= base*.7;
    if (c.directOnly && o.field.some(m=>m.aura==='eliteGuard')) matchup -= 10;
    if (c.t==='mon' && c.cost<=2 && o.field.some(m=>m.aura==='lowAtkBan')) matchup -= 8;
    if (c.id==='BLACK_REVERSE') {
      const direct = own.filter(x=>x.directOnly||x.act==='dmg'||x.id==='SOUL_HARVEST').length;
      matchup -= Math.min(16,direct*3);
    }
    // Repeated monsters may be useful; do not impose a blanket one-copy rule.
    if (!c.quick) redundancy -= Math.max(0,copies-1)*Math.min(5,base*.12);
    if (!c.quick && (urgent || drawTurns>=ownTurnsLeft)) delay -= Math.max(0,base+synergy+readiness)*.55;
    if (marketIndex!=null && (g.marketStock?.[marketIndex]??3)===1 && cost<=o.maxMana) {
      // Only deny the last public copy when there is evidence it serves the foe.
      if (known.some(x=>x.id===c.id) || (dewSource(c)&&known.some(x=>x.summonReq?.startsWith('dew'))) || (decay(c)&&known.some(decay))) denial = 2;
    }
    const value = Math.max(0,base+synergy+matchup+readiness+redundancy+delay+denial)-cost*tuning.costW;
    // A strong deck can still lack an answer. Its printed average is not an
    // appropriate floor for the first card that covers an active engine.
    const firstAnswer = (usableAnswer(c) && o.enchants.length>0 && !answerCoverage && readiness>=0)
      || (wallAnswer && !own.some(x=>plan.walls.some(m=>removalHits(g,o,x,m))))
      || (plan.blocked && c.id==='ADVANCE' && !count('ADVANCE'));
    const threshold = c.quick ? 0 : firstAnswer ? Math.min(floor,12) : floor;
    return {base,synergy,matchup,readiness,redundancy,delay,denial,cost,value,floor:threshold,margin:value-threshold};
  };
}

/** Exact expected best positive purchase margin for the public offer pool.
 * rollSupply draws three distinct IDs uniformly. No live RNG/order is read.
 * The refresh fee also reduces what we can afford after refreshing.
 */
export function refreshValue(g: GameState, p: PlayerState, tuning = ECONOMY_DEFAULTS): number {
  if (p.refreshBlockTurn || (!(p.refreshTokens ?? 0) && p.mana < 2)) return -Infinity;
  const fee = (p.refreshTokens ?? 0) > 0 ? 0 : 1;
  const evaluate = purchaseEvaluator(g,p,tuning), shared = new Set(g.market.map(c=>c.id));
  const margins = ALL_IDS.filter(id=>DB[id].cost>=1 && DB[id].cost<=effMaxMana(p) && !DB[id].noShop && !shared.has(id)).map(id=>{
    const c={...DB[id],uid:'offer-estimate'};
    return buyCost(p,c)<=p.mana-fee && purchaseAllowed(g,p,c) && !freeBuyBlocked(p,c) ? Math.max(0,evaluate(c).margin) : 0;
  }).sort((a,b)=>a-b);
  if (!margins.length) return -Infinity;
  const draws = Math.min(margins.length,p.supplyShrink>0?Math.max(2,3-p.supplyShrink):3);
  const choose = (n:number,k:number):number => {let v=1;for(let i=0;i<k;i++)v*=Math.max(0,n-i)/(i+1);return v;};
  const total = choose(margins.length,draws);
  const expected = margins.reduce((sum,v,i)=>sum+v*(choose(i+1,draws)-choose(i,draws))/total,0);
  const available = Math.max(0,...p.supply.filter((c):c is CardInst=>!!c).filter(c=>buyCost(p,c)<=p.mana && purchaseAllowed(g,p,c) && !freeBuyBlocked(p,c)).map(c=>evaluate(c).margin));
  return expected-available-fee*2;
}
