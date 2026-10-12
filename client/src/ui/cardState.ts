import type { CardInst, FieldMon } from '../shared/types';
import { PASSIVES } from '../shared/cards';
import { displayPassives, decayStateDescription } from '../shared/cardPresentation';
import { getLang } from '../i18n';

/** Public state only. Catalog cards never receive a fabricated live counter. */
export function cardStateEl(c: CardInst, hp?: {now:number;max:number;turn?:number}): HTMLElement | null {
  const m = c as Partial<FieldMon>;
  if (m.summonedTurn == null) return null;
  const lang = getLang();
  const loc = (ja:string,ko:string,en:string):string => ({ja,ko,en})[lang];
  const section = document.createElement('section'); section.className = 'inspect-current-state';
  const title = document.createElement('h2'); title.textContent = loc('現在の状態','현재 상태','Current state'); section.append(title);
  const list = document.createElement('dl'); section.append(list);
  const row = (label:string,value:string): void => {
    const term=document.createElement('dt'), detail=document.createElement('dd');
    term.textContent=label;detail.textContent=value;list.append(term,detail);
  };
  const signed=(n:number):string=>`${n>=0?'+':''}${n}`;
  if (m.hatch != null) {
    row(loc('孵化まで','부화까지','Until hatching'),loc(`残り${m.hatch}ターン（双方のターンを数える）`,`${m.hatch}턴 남음 (양쪽 턴을 셈)`,`${m.hatch} turns remaining (both players’ turns count)`));
    row(loc('耐久','내구','Durability'),String(m.dur ?? c.hatchDur ?? 4));
  } else {
    row(loc('攻撃力','공격력','ATK'),String(c.atk ?? 0));
    if (hp) row(loc('現在体力／最大体力','현재 / 최대 체력','Current / max HP'),`${hp.now} / ${hp.max}`);
  }
  if (displayPassives(c).includes('guts') || (m.guts ?? 0)>0) row(loc('気合用カウンター','기합용 카운터','Counters for Guts'),String(m.guts ?? 0));
  if ((m.decayCnt ?? 0)>0) row(loc('受けている腐敗','받은 부패','Applied Decay'),decayStateDescription(m.decayCnt!,lang));
  if (m.gcount != null || ['castle','casino','assassinGuild','vampButler'].includes(c.aura ?? '')) {
    const limit = c.aura === 'casino' ? 12 : c.aura === 'assassinGuild' || c.aura === 'vampButler' ? 3 : null;
    row(c.id === 'CASTLE' ? loc('攻撃無効用カウンター','공격 무효용 카운터','Counters for negating attacks') : c.aura === 'casino' ? loc('カジノ用カウンター','카지노용 카운터','Counters for Casino') : loc('このカードの効果用カウンター','이 카드 효과용 카운터','Counters for this card’s effect'),`${m.gcount ?? 0}${limit ? ` / ${limit}` : ''}`);
  }
  if (m.atkMod) row(loc('攻撃力補正（持続）','공격력 보정 (지속)','ATK modifier (lasting)'),signed(m.atkMod));
  if (m.defMod) row(loc('体力補正（持続）','체력 보정 (지속)','HP modifier (lasting)'),signed(m.defMod));
  const expiring=(m.tempAtkExpiry ?? []).reduce((n,e)=>n+e.amount,0);
  if ((m.tempAtk ?? 0)-expiring) row(loc('攻撃力補正（自分のターン終了まで）','공격력 보정 (자신 턴 종료까지)','ATK modifier (until your turn ends)'),signed((m.tempAtk ?? 0)-expiring));
  for (const e of m.tempAtkExpiry ?? []) row(loc(`攻撃力補正（ターン${e.turn}終了まで）`,`공격력 보정 (${e.turn}턴 종료까지)`,`ATK modifier (until turn ${e.turn} ends)`),signed(e.amount));
  if (m.immuneDamageTurn != null && m.immuneDamageTurn === hp?.turn) row(loc('ダメージ無効','데미지 무효','Damage prevention'),loc(`ターン${m.immuneDamageTurn}終了まで`,`${m.immuneDamageTurn}턴 종료까지`,`Until turn ${m.immuneDamageTurn} ends`));
  const granted=(m.passivesG ?? []).filter(k=>!!PASSIVES[k]);
  if(granted.length) row(loc('付与された能力（持続）','부여받은 능력 (지속)','Granted abilities (lasting)'),granted.map(k=>PASSIVES[k][lang].name).join(' · '));
  if(m.conditionalPassives?.length) row(loc('条件成立中の能力','조건 충족 중인 능력','Abilities from active conditions'),m.conditionalPassives.filter(k=>!!PASSIVES[k]).map(k=>PASSIVES[k][lang].name).join(' · '));
  return section;
}
