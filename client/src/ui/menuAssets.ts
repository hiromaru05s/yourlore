export {duelFileAssets} from './duelFileAssets';
import {DB, STARTERS, PASSIVES, SLEEVE_LIST, frameFor, fieldFrameFor} from '../shared/cards';
import {COSMETICS} from '../shared/cosmetics';
import {THEMES, asset} from '../shared/atelierThemes';
import {BOT_NPCS} from '../shared/botNpcs';
import {artUrl} from './cardArt';
import {duelImageUrls} from './duelAssets';
import {HOME_ICONS} from './homeIcons';
/** Every image reachable from the lounge, including filters, zoom and dialogs.
 * Compressed bytes are stored on disk; only visible images need decoded pixels. */
export function menuAssetUrls():string[]{
 return [...new Set([
  ...duelImageUrls(),'/art/biblion/duel-table.png',
  '/vfx/purchase-air/crystal-72.png','/vfx/chosen-victory/crown.png','/vfx/merchant/balance.png',
  ...['knight','mage','archer','rogue'].map(k=>`/vfx/chosen-heroes/${k}.png`),
  '/art/vfx/mimic-family/engraved-brass.png','/art/vfx/mimic-cavity-r3/02-moist-cheeks.png',
  ...['01-reference-ivory','02-ridged-bone','03-moist-flesh','04-predator-fangs'].map(k=>`/art/vfx/mimic-mouth-r2/${k}.png`),
  '/art/vfx/taunt-four/lion-relief.png',
  '/art/lounge/gifts/courier.png',
  ...HOME_ICONS.map(k=>`/art/lounge/icons/v2/${k}.png`),
  '/art/lounge/icons/shard-simple-v1.png',
  '/art/brand/lore-logo-transparent.webp',
  '/art/lounge/atmosphere-v2/library-wide.png', '/art/lounge/atmosphere-v2/ivy.png', '/art/lounge/atmosphere-v1/clouds.png',
  '/art/lounge/stage-v1/sigil.webp', '/art/lounge/duel-ink-v1/disc.png',
  '/art/seekers/faceless-v2/portrait.webp', '/art/seekers/faceless-v2/poses.webp',
  ...BOT_NPCS.map(n=>n.portrait),
  ...Object.keys({...DB,...STARTERS}).flatMap(id=>[artUrl.sm(id),artUrl.xs(id),artUrl.full(id)]),
  ...(['mon','spell','trap','quest','starter'] as const).flatMap(t=>[frameFor(t),frameFor(t,true),fieldFrameFor(t)]),
  ...['attack','health','cost','plaque'].map(k=>`/art/biblion/modular/${k}-ui.webp`),
  ...['mon','spell','starter','trap'].map(k=>`/ui/cost-${k}.webp?v=2`),
  ...Object.keys(PASSIVES).map(k=>`/ui/passives/v2/${k}.svg`),
  ...SLEEVE_LIST.map(s=>s.url), ...COSMETICS.map(c=>c.url),
  ...THEMES.flatMap(t=>['body.webp','lining.webp','inlay-mask.webp','finish-mask.svg','surface-normal.webp','surface-roughness.webp'].map(f=>asset(t,f))),
  ...['astral','ivory','crimson','verdant'].map(k=>`/cosmetics/v2/sleeve-${k}.webp`),
  ...['compass','prism'].map(k=>`/frames/sleeve_${k}.webp`),
  '/art/key-visuals/concepts/lore-kv-02-midnight-astral-observatory.png',
  '/art/key-visuals/concepts/lore-kv-03-crimson-eclipse-duel-arena.png',
 ])];
}
