/** Read-only card calculations shared by menus and the reducer. No action resolution dependencies. */
import type {CardDef,CardInst,FieldMon,GameState,PlayerState} from './types';
import {RUNE_SPELL_IDS} from './runeRework';
import {FIRE_SPELL_IDS} from './fireCards';
import {isGoblinMonster} from './goblinCards';

/** 어튠 계열 (스타터 어튠 + 어튠 - 흑/진/마) — 어튠 무효 장치(T1) 대상 */
export function isAttuneCard(c: { star?: string; name?: string }): boolean { return c.star === "mana" || (c.name || "").includes("어튠"); }

/** '암살자' 계열 — 이름 기준 (암살자 4종 + 길드 지부/본부 + 길드 보물상자) */
export function isAssassinCard(c: { name?: string }): boolean { return (c.name || "").includes("암살자"); }

/** '주술사' 계열 (v39: 견습/초급/중급/상급/특급 주술사) — 특급 주술사 켈로이드(hexBoss) 공격력 +5 대상 */
export function isHexer(c: { name?: string }): boolean { return (c.name || "").includes("주술사"); }

/** 덱 구성(덱·패·묘지·필드) — "デッキ構成" 판정 공용 */
export function deckComp(p: PlayerState): CardInst[] { return [...p.deck, ...p.hand, ...p.discard, ...(p.field as CardInst[])]; }

export const MIMIC_IDS = new Set(["MIMIC", "MIMIC2", "AWAKENED_MIMIC", "MIMIC_KING", "MIMIC_KING2", "ORIGIN_MIMIC", "MIMIC_LORD"]);

/** 게임에서 제외된 자신의 '컬' 수 — 선택받은 시리즈/선택받은 영역 공용. */
export function cullExiled(p: PlayerState): number {
  return (p.removed ?? []).filter((c) => c.star === "trash").length;
}

export function hasWorldTreeOnField(p: PlayerState): boolean {
  const named = (c: CardInst) => (c.name || "").includes("세계수");
  return p.field.some(named) || p.enchants.some(e => named(e.card))
    || p.traps.some(t => named(t.card)) || (p.quests ?? []).some(q => named(q.card));
}

/** Pass the live game for conditions that inspect both fields. */
export function effAtk(p: PlayerState, m: FieldMon, g?: Pick<GameState, "players"> & Partial<Pick<GameState,"cur">>, raw = false): number {
  if (m.wardenZeroActive && !m.trickSwapped) return 0;
  const printed = (m.atk ?? 0) + (m.tempAtk ?? 0) + (m.atkMod ?? 0);
  const bonus = p.strengthAuras ?? 0;
  const boost = (amount:number) => amount > 0 ? amount + bonus : amount;
  let extra = 0;
  if (p.demonRealms) extra += p.demonRealms * boost(1);
  if (!p.monsterSilence) {
    const enemy = g?.players[g.players[0] === p ? 1 : 0];
    if (m.id === 'TOKEN00') extra += boost(m.visibleCurseAttack ?? (enemy ? deckComp(enemy).filter(c=>c.id==='CURSE').length : 0));
    if (m.id === 'DRAGON_KILLER' && enemy) {
      if (enemy.field.some(x=>['GM6_0','D_RED','D_BLUE','D_BLACK','M7','GM5_3'].includes(x.id))) extra += boost(15);
      if (enemy.field.some(x=>['DRAGON_RIDER','ANTIQUE_DK'].includes(x.id))) extra += boost(20);
    }
    if (m.id === 'TSO3' && !m.mutedEffects && !p.discard.some(c=>c.t==='mon' && c.tribe!=='고독')) extra += boost(1);
    if (isGoblinMonster(m)) extra += p.field.filter(x=>x.id==='GOBLIN_DRAGON_RIDER' && !x.mutedEffects).length * boost(3);
    if (isGoblinMonster(m)) extra += p.field.filter(x=>x.aura==='goblinAttack').length * boost(1);
    const hexArmies = p.field.filter(ally => ally.aura === 'hexArmy').length;
    if ((hexArmies || m.condAtk === 'hexCurses') && (g?.cur != null ? g.players[g.cur] === p : p.hexerAttackCurses != null)) {
      const curses = m.visibleCurseAttack ?? (enemy ? deckComp(enemy).filter(c=>c.id==='CURSE').length : p.hexerAttackCurses ?? 0);
      if (m.condAtk === 'hexCurses') extra += boost(curses);
      extra += hexArmies * boost(Math.floor(curses / 3));
    }
    if (m.condAtk==='worldTree' && (g ? g.players.some(hasWorldTreeOnField) : p.worldTreePresent || hasWorldTreeOnField(p))) extra += boost(3);
    if (m.condAtk==='twoPlus' && p.field.length>=2) extra += boost(m.val ?? 2);
    if (m.condAtk==='hp45' && p.hp>=45) extra += boost(1);
    if (m.condAtk==='cullEachAttack' || m.condAtk==='cullEachBoth') extra += boost(cullExiled(p));
    if (m.condAtk==='cullPlus' || m.condAtk==='cullAtk1' || m.condAtk==='cullAtk2')
      extra += boost(Math.floor(cullExiled(p)/2) * (m.condAtk==='cullAtk2' ? 2 : 1));
    for (const ally of p.field) {
      if (m.tribe==='시초' && ally.aura==='originLord') extra += boost(ally.val || 3);
      if (isHexer(m) && ally.aura==='hexBoss') extra += boost(ally.val || 5);
    }
    extra += boost(elfTreeBonus(p,m));
  }
  if (bonus && g && MIMIC_IDS.has(m.id)) extra += bonus*g.players.reduce((n,pl)=>n+pl.enchants.filter(e=>e.card.ench==='gemRain').length,0);
  const value = printed + extra;
  return raw ? value : Math.max(0,value);
}

export function effDef(p: PlayerState, m: FieldMon, raw = false): number {
  const bonus=p.strengthAuras ?? 0;
  const boost=(amount:number)=>amount>0 ? amount+bonus : amount;
  let extra=0;
  if (!p.monsterSilence) {
    for(const ally of p.field) {
      if (ally.aura==='wallDef') extra+=boost(ally.val || 3);
      if (ally.aura==='originLord' && m.tribe==='시초') extra+=boost(ally.val || 3);
      if (ally.id==='FARMER' && !ally.mutedEffects && m.id==='TOKEN00') extra+=boost(6);
      if (ally.aura==='farmerHealth' && m.id==='FARMER') extra+=boost(5);
    }
    if(m.condAtk==='worldTree' && (p.worldTreePresent || hasWorldTreeOnField(p))) extra+=boost(2);
    if(m.id==='TSO3' && !m.mutedEffects && !p.discard.some(c=>c.t==='mon' && c.tribe!=='고독')) extra+=boost(2);
    if(m.condAtk==='hp45' && p.hp>=45) extra+=boost(3);
    if(m.condAtk==='cullEachBoth') extra+=boost(cullExiled(p));
    if(m.condAtk==='cullPlus') extra+=boost(Math.floor(cullExiled(p)/2));
    extra+=boost(elfTreeBonus(p,m));
  }
  const value = (m.def ?? 0)+(m.defMod ?? 0)+extra;
  return raw ? value : Math.max(1,value);
}

/** v24 HP-combat: a monster's CURRENT HP - HP (effDef) minus accumulated damage. */
export function curHp(p: PlayerState, m: FieldMon): number {
  return Math.max(0, effDef(p, m) - (m.dmg || 0));
}

export function havenDiscount(p: PlayerState, c: CardInst): boolean {
  return isWorldTreeCard(c) && p.enchants.some(e => e.card.ench === "elfHaven");
}

/** Cost to PLAY a card from hand (may be < its buy cost).
 *  p를 넘기면 플레이어 상태 의존 할인(엘프의 쉼터: '세계수' 카드 시전 0)을 반영한다. */
export function playCost(c: CardInst, p?: PlayerState): number {
  if (p && c.id === "ROGUE_ART" && p.field.some(isAssassinCard)) return 0;
  if (p && c.tribe==='시초' && c.t==='mon' && p.freeOrigin) return 0;
  if (p && c.id==='RUNE2' && runeBoost(p,c.id,false)) return 0;
  if (p && havenDiscount(p, c)) return 0;
  if (p && c.id === "RUNE_PEBBLE" && p.runePlays?.some(id => RUNE_SPELL_IDS.has(id))) return 0;
  let base = c.play ?? c.cost;
  if (p && c.id === "RUNE_GUIDANCE") base = Math.max(0, base - (p.runeGuidanceUses ?? 0));
  if (p && c.id === 'FIRE_METEOR' && p.expansion?.firePlayed.some(id => id !== c.id)) base = 1;
  if (p && c.id === 'FIRE_BRANDING') base -= p.expansion?.firePlayed.length ?? 0;
  if (p && isFire(c)) base = Math.max(0, base - (p.expansion?.fireDiscount ?? 0) - 2 * p.field.filter(m => !m.mutedEffects && m.id === 'FIRE_MASTER').length);
  if (p && c.t === "spell" && base > 0 && p.field.some(m=>m.aura==="sageDiscount")) base=Math.max(1,base-1);
  if (p && c.t==='spell' && base>0) base=Math.max(1,base-p.field.filter(m=>m.id==='CHOSEN_MAGE' && !m.mutedEffects).length);
  if (p && c.t === "spell") base = Math.max(0, base - (p.spellDiscountCharges?.length ?? p.spellDiscountTurn ?? 0));
  if (p && isAttuneCard(c)) {
    const named = ['DUAL_ATTUNE','AMA','ATTUNE_SECRET','ATTUNE_SHINE'].includes(c.id) ? p.attunePlaysTurn ?? 0 : 0;
    base = Math.max(0,base - named - (p.attuneFlowTurn ?? 0));
  }
  return base * (p?.manaCostMult ?? 1); // 마족 4종: 소모 마나 3배
}

export function isWorldTreeCard(c: Pick<CardDef, 'name' | 'nameJa'>): boolean { return /세계수|世界樹/.test(c.name + (c.nameJa ?? '')); }

function elfTreeBonus(p: PlayerState, m: FieldMon): number {
  const mult = m.id === 'ELF' ? 1 : m.id === 'HIGH_ELF' ? 2 : m.id === 'ELDER_ELF_KING' ? 4 : 0;
  return mult * new Set([...p.field, ...p.enchants.map(e => e.card), ...(p.quests ?? []).map(q => q.card)].filter(isWorldTreeCard).map(c => c.id)).size;
}

export function runeBoost(p:PlayerState,id:string,committed:boolean):boolean {
  return (p.spellsCastTurn ?? 0)>=(committed?5:4) || !!p.runePlays?.some(other=>other!==id);
}


// ---------- v50 expansion: shared rules for server, client and deterministic bots ----------
const FIRE_IDS = new Set(FIRE_SPELL_IDS);

export const isFire = (c: CardDef): boolean => FIRE_IDS.has(c.id);
