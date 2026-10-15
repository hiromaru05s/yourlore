import type {CardInst, GameState, Side} from '../shared/types';
import {cardName, getLang} from '../i18n';

const loc=(ja:string,ko:string,en:string):string=>({ja,ko,en})[getLang()];
/** Read only public enchantments. Never inspect the opponent's hidden hand. */
export function spaceRiteSources(g:GameState,side:Side) {
  return g.over ? [] : g.players[1-side].enchants.filter(e=>e.card.ench==='spaceLock');
}
export function spaceRiteReason(g:GameState,side:Side,card:CardInst):string|null {
  if(!['mon','spell','starter'].includes(card.t)||!spaceRiteSources(g,side).length)return null;
  return card.t==='mon'
    ?loc('空間術式により、モンスターを召喚できません。','공간 술식으로 몬스터를 소환할 수 없습니다.','Spatial Rite prevents you from summoning monsters.')
    :loc('空間術式により、魔法を使用できません。','공간 술식으로 마법을 사용할 수 없습니다.','Spatial Rite prevents you from casting spells.');
}
export function spaceRiteSourceText(g:GameState,side:Side):string {
  return spaceRiteSources(g,side).map(e=>loc(`相手の${cardName(e.card)} · 残り${e.turns}ターン`,`상대의 ${cardName(e.card)} · ${e.turns}턴 남음`,`Opponent's ${cardName(e.card)} · ${e.turns} turns remaining`)).join(' / ');
}
export function paintSpaceRiteCard(el:HTMLElement,reason:string|null,card:CardInst):void {
  el.classList.toggle('space-rite-locked',!!reason);
  let badge=el.querySelector<HTMLElement>('.space-rite-lock-badge');
  if(!reason){badge?.remove();delete el.dataset.spaceRiteReason;return;}
  el.dataset.spaceRiteReason=reason;
  if(!badge){badge=document.createElement('span');badge.className='space-rite-lock-badge';el.append(badge);}
  badge.textContent=card.t==='mon'?loc('召喚不可','소환 불가','No summon'):loc('魔法使用不可','마법 사용 불가','No casting');
}
export function syncSpaceRiteStatus(root:HTMLElement,g:GameState,side:Side,suppressed:boolean):void {
  const sources=spaceRiteSources(g,side);
  let panel=root.querySelector<HTMLElement>('.space-rite-status');
  if(suppressed||!sources.length){panel?.remove();return;}
  if(!panel){
    panel=document.createElement('div');panel.className='space-rite-status';panel.setAttribute('role','status');
    panel.innerHTML='<img alt=""><div><strong></strong><span></span></div>';
    root.querySelector('.game')?.append(panel);
  }
  panel.querySelector('img')!.src=`/art/cards/${encodeURIComponent(sources[0].card.id)}.webp`;
  const reason=loc('空間術式により、召喚・魔法を使用できません。','공간 술식으로 소환 및 마법 사용이 불가능합니다.','Spatial Rite prevents summoning and spellcasting.');
  const detail=spaceRiteSourceText(g,side);
  // Keep the live region quiet on unrelated board renders.
  const title=panel.querySelector('strong')!,text=panel.querySelector('span')!;
  if(title.textContent!==reason)title.textContent=reason;
  if(text.textContent!==detail)text.textContent=detail;
}
