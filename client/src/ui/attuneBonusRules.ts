import type { CardInst, PlayerState } from '../shared/types';
import { getLang } from '../i18n';

type Bonus = NonNullable<PlayerState['attuneBonuses']>[number];
const effects: Record<Bonus, Record<'ja'|'ko'|'en', string>> = {
  heal1: {ja:'自分の体力を1回復する。',ko:'자신의 체력을 1 회복한다.',en:'Restore 1 of your HP.'},
  heal2: {ja:'自分の体力を2回復する。',ko:'자신의 체력을 2 회복한다.',en:'Restore 2 of your HP.'},
  heal3: {ja:'自分の体力を3回復する。',ko:'자신의 체력을 3 회복한다.',en:'Restore 3 of your HP.'},
  shield: {ja:'自分のシールド+1。',ko:'자신의 실드 +1.',en:'Gain 1 Shield.'},
  dew: {ja:'自分の雫+1。',ko:'자신의 이슬 +1.',en:'Gain 1 Dew.'},
  crystal: {ja:'自分のマナ水晶+1。',ko:'자신의 마나 수정 +1.',en:'Gain 1 mana crystal.'},
  mana: {ja:'自分の現在マナ+1。',ko:'자신의 현재 마나 +1.',en:'Gain 1 current mana.'},
  shine: {ja:'相手プレイヤーと相手の場のモンスターすべてに、それぞれ1ダメージを与える。',ko:'상대 플레이어와 상대 필드의 모든 몬스터에게 각각 1 데미지를 준다.',en:'Deal 1 damage to the opponent and each of their monsters.'},
  spirit: {ja:'「ミニ精霊」1体を自分の場に召喚する。',ko:'자신의 필드에 미니 정령 1체를 소환한다.',en:'Summon 1 Mini Spirit to your field.'},
  hex: {ja:'相手の墓地に「呪い」3枚を加える。',ko:'상대 묘지에 저주 3장을 추가한다.',en:'Add 3 Curses to the opponent’s graveyard.'},
  selfHex: {ja:'自分の墓地に「呪い」1枚を加える。',ko:'자신의 묘지에 저주 1장을 추가한다.',en:'Add 1 Curse to your graveyard.'},
};

/** Player-wide upgrades apply to every basic Attune, never to catalog variants.
 * Preserve grant order and per-trigger amounts (healing/shield modifiers can make
 * combining several small triggers into a single total misleading). */
export function attuneBonusRulesEl(card: CardInst, owner?: PlayerState): HTMLElement | null {
  if (card.id !== 'STARTER_MANA' || !owner) return null;
  const lang = getLang();
  const section = document.createElement('section');
  section.className = 'card-rule-group attune-added-effects';
  const heading = document.createElement('h2'); heading.className = 'card-rule-heading';
  heading.textContent = {ja:'追加効果（永続）',ko:'추가 효과 (영구)',en:'Added effects (permanent)'}[lang];
  section.setAttribute('aria-label', heading.textContent);
  const note = document.createElement('p'); note.className = 'card-effect-body';
  const bonuses = owner.attuneBonuses ?? [];
  note.textContent = bonuses.length
    ? {ja:'この対戦中、自分の基本アチューンすべてに適用。発動するたび、以下の順に追加で発動します。',ko:'이번 대전에서 자신의 모든 기본 어튠에 적용. 발동할 때마다 아래 순서대로 추가 발동합니다.',en:'Applies to all your basic Attunes this duel. Each time one resolves, these effects also trigger in the order below.'}[lang]
    : {ja:'現在、追加効果はありません。',ko:'현재 추가 효과가 없습니다.',en:'No added effects yet.'}[lang];
  section.append(heading, note);
  const runs: {bonus: Bonus; count: number}[] = [];
  for (const bonus of bonuses) {
    const last = runs.at(-1);
    if (last?.bonus === bonus) last.count++;
    else runs.push({bonus, count: 1});
  }
  for (const {bonus, count} of runs) {
    const row = document.createElement('p'); row.className = 'card-effect-body';
    row.dataset.attuneBonus = bonus;
    row.textContent = effects[bonus][lang] + (count > 1 ? ` ×${count}` : '');
    section.append(row);
  }
  return section;
}
