import {FURNITURE_LIST} from '../shared/cosmetics';
import {DB,STARTERS,frameFor,SLEEVE_LIST,PASSIVES} from '../shared/cards';
import {artUrl} from './cardArt';
import {HOME_ICONS} from './homeIcons';
/** All menu artwork is prepared once when entering the authenticated lounge.
 * Full-resolution duel/zoom artwork remains demand-loaded to avoid a huge boot. */
export function menuAssetUrls():string[]{
 return [...new Set([
  ...Object.keys({...DB,...STARTERS}).flatMap(id=>[artUrl.sm(id),artUrl.xs(id)]),
  ...['mon','spell','quest','trap','starter'].map(t=>frameFor(t as 'mon')),
  ...HOME_ICONS.map(k=>`/art/lounge/icons/v2/${k}.png`),
  ...['home','deck','cards','trophy','friends','shop','book'].map(k=>`/art/lounge/icons/active-v1/${k}.webp`),
  ...Object.keys(PASSIVES).map(k=>`/ui/passives/v1/${k}.webp`),
  ...SLEEVE_LIST.map(s=>s.url),...FURNITURE_LIST.map(s=>s.url),
  '/art/brand/lore-logo-transparent.webp','/art/lounge/stage-v1/stage.webp','/art/lounge/stage-v1/sigil.webp','/art/lounge/v1/library.webp',
  '/art/seekers/menu-v1/blue.webp','/art/seekers/menu-v1/red.webp','/ui/loading/v1/runner.webp',
 ])];
}
