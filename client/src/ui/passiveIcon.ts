import {PASSIVES} from '../shared/cards';
import {getLang} from '../i18n';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** One accessible icon vocabulary for card faces, rules, search and the field. */
export function passiveIcon(key:string):string{
 const p=PASSIVES[key]?.[getLang()];if(!p)return '';
 return `<span class="psv passive-icon" data-psv="${esc(key)}" role="img" aria-label="${esc(p.name)}" title="${esc(p.name)}"><img src="/ui/passives/v1/${esc(key)}.webp" alt="" decoding="async"></span>`;
}
