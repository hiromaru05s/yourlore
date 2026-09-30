import {HOME_ICONS} from './homeIcons';
/** Shared lounge chrome only. Gallery pages decode their visible cards before
 * reveal; shop/deck cosmetics are gated by the destination screen's readiness.
 * Loading every card in both sizes here delayed HOME and flooded the image cache. */
export function menuAssetUrls():string[]{
 return [...new Set([
  ...HOME_ICONS.map(k=>`/art/lounge/icons/v2/${k}.png`),
  ...['home','deck','cards','trophy','friends','shop','book'].map(k=>`/art/lounge/icons/active-v1/${k}.webp`),
  '/art/lounge/icons/shard-simple-v1.png',
  '/art/brand/lore-logo-transparent.webp','/art/lounge/stage-v1/stage.webp','/art/lounge/stage-v1/sigil.webp','/art/lounge/v1/library.webp',
  '/art/seekers/menu-v1/blue.webp','/art/seekers/menu-v1/red.webp',
 ])];
}
