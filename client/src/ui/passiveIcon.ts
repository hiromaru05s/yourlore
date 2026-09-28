import {PASSIVES} from '../shared/cards';
import {getLang} from '../i18n';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const passiveIconUrl=(key:string):string=>`/ui/passives/v2/${key}.svg`;
/** One accessible icon vocabulary for card faces, rules, search and the field. */
export function passiveIcon(key:string,options:{count?:number;granted?:boolean}={}):string{
 const p=PASSIVES[key]?.[getLang()];if(!p)return '';
 const count=options.count&&options.count>0?Math.floor(options.count):0;
 const label=`${p.name}${count?` ${count}`:''}: ${p.desc}`;
 return `<span class="psv passive-icon${options.granted?' kw--granted':''}" data-psv="${esc(key)}" role="img" aria-label="${esc(label)}" title="${esc(label)}"><img src="${esc(passiveIconUrl(key))}" alt="" decoding="async">${count?`<b aria-hidden="true">${count}</b>`:''}</span>`;
}
