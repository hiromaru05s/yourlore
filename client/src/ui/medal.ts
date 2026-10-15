import {MEDAL_BY_ID,type MedalText} from '../shared/medals';
import {getLang,esc} from '../i18n';
import '../styles/medals.css';
export const medalText=(text:MedalText):string=>text[getLang()];
export function medalName(id:string|null|undefined):string { const m=id?MEDAL_BY_ID.get(id):undefined;return m?medalText(m.name):''; }
/** An engraved text ribbon, deliberately smaller and dimmer than the player's name. */
export function medalHtml(id:string|null|undefined):string {
 const name=medalName(id);return name?`<span class="medal-inscription" data-medal="${esc(id!)}" title="${esc(name)}">${esc(name)}</span>`:'';
}
