import type {Enchant,GameState,PlayerState} from '../shared/types';
import {getLang} from '../i18n';
import {enchantmentTile} from './cardView';
import {createEnchantTime,enchantTimeState} from './enchantTime';
import {createCardCounter,enchantCounterValue} from './cardCounter';

export type EnchantmentContext={enchant:Enchant;game:Pick<GameState,'turn'>;owner:Pick<PlayerState,'tribesFired'>};
/** One public face from the first flight texture through the settled board. */
export function activeEnchantmentTile({enchant:e,game,owner}:EnchantmentContext):HTMLDivElement {
 const time=enchantTimeState(e,game,owner),lang=getLang();
 const tile=enchantmentTile(e.card,time?'':`<img class="buff-infinity" src="/art/biblion/modular/infinity-ui.webp" alt="${lang==='ja'?'無期限':lang==='en'?'Permanent':'무기한'}">`);
 if(time){tile.append(createEnchantTime(time));tile.classList.add('ench-timed');if(time.remaining<=1)tile.classList.add('ench-expiring');}
 else tile.classList.add('ench-perm');
 const value=enchantCounterValue(e);
 if(value!=null)tile.append(createCardCounter(e.card.uid,e.card.id,'charge',value));
 return tile;
}
