import type { CardDef, FieldMon } from './types';
import type { EffectLocale } from './cardEffectText';
import { cardPassives, PASSIVES } from './cards';
import { CARD_RULE_METADATA } from './cardRuleMetadata';

export function cardTypeLabel(c: CardDef, lang: EffectLocale): string {
  const kind = c.t === 'spell' ? c.quick ? 'quick' : c.ench ? 'persistent' : 'spell' : c.t;
  return {
    mon: {ja:'モンスター',ko:'몬스터',en:'Monster'},
    spell: {ja:'魔法',ko:'마법',en:'Spell'},
    persistent: {ja:'永続魔法',ko:'영구 마법',en:'Persistent spell'},
    quick: {ja:'クイック魔法',ko:'퀵 마법',en:'Quick spell'},
    quest: {ja:'クエスト',ko:'퀘스트',en:'Quest'},
    trap: {ja:'罠',ko:'함정',en:'Trap'},
    starter: {ja:'スターター',ko:'스타터',en:'Starter'},
  }[kind][lang];
}

export function quickSpellRule(lang: EffectLocale): string {
  return {ja:'購入すると手札に入らず、このカードをリフトに置いてから効果を処理する。無効にされてもリフトに残る。',ko:'구매하면 패에 넣지 않고 이 카드를 리프트에 놓은 뒤 효과를 처리한다. 무효화되어도 리프트에 남는다.',en:'On purchase, this card goes directly to your Rift before its effect resolves. It stays there even if negated.'}[lang];
}

export function questProgressText(progress: number, target: number, lang: EffectLocale): string {
  return `${{ja:'クエスト進捗',ko:'퀘스트 진행',en:'Quest progress'}[lang]} ${progress}/${target}`;
}

/** Spell keyword metadata may describe what it grants, not an ability it owns. */
export function displayPassives(c: CardDef & Partial<FieldMon>): string[] {
  return [...new Set([...cardPassives(c).filter(k => c.t === 'mon' || !(CARD_RULE_METADATA[c.id]?.grants ?? []).includes(k)), ...(c.passivesG ?? [])])].filter(k => !!PASSIVES[k]);
}

export function referencedPassives(c: CardDef): string[] {
  return CARD_RULE_METADATA[c.id]?.mentions ?? [];
}

export function cardSearchText(c: CardDef): string {
  const keys = [...new Set([...cardPassives(c), ...referencedPassives(c)])];
  return [c.name,c.nameJa,c.nameEn,c.text,c.textJa,c.textEn,...keys.flatMap(k=>Object.values(PASSIVES[k] ?? {}).map(p=>p.name))].join(' ').normalize('NFKC').toLocaleLowerCase();
}

export type PassiveSearchScope = 'owned' | 'granted' | 'mentioned';
export function passiveSearchKeys(c: CardDef, scope: PassiveSearchScope): string[] {
  return scope === 'granted' ? CARD_RULE_METADATA[c.id]?.grants ?? [] : scope === 'mentioned' ? referencedPassives(c) : displayPassives(c);
}

export function decayStateDescription(count: number, lang: EffectLocale): string {
  return {
    ja:`腐敗によるカウンター ${count}/3。このモンスターが腐敗を受けている状態。3個以上になると破壊され、持ち主に3ダメージ。腐敗を与える能力ではない。`,
    ko:`부패로 받은 카운터 ${count}/3. 이 몬스터가 부패를 받은 상태다. 3개 이상이면 파괴되고 소유자에게 3 데미지를 준다. 부패를 부여하는 능력이 아니다.`,
    en:`Counters received from Decay: ${count}/3. At 3 or more, this monster is destroyed and its owner takes 3 damage. This is an applied status, not the ability to inflict Decay.`,
  }[lang];
}
