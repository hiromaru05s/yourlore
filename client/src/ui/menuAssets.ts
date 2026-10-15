import {DB, STARTERS, PASSIVES, SLEEVE_LIST, frameFor, fieldFrameFor} from '../shared/cards';
import {COSMETICS} from '../shared/cosmetics';
import {THEMES, asset} from '../shared/atelierThemes';
import {BOT_NPCS} from '../shared/botNpcs';
import {artUrl} from './cardArt';
import {HOME_ICONS} from './homeIcons';
/** Every image reachable from the lounge, including filters, zoom and dialogs.
 * Compressed bytes are stored on disk; only visible images need decoded pixels. */
export function menuAssetUrls():string[]{
 return [...new Set([
  ...HOME_ICONS.map(k=>`/art/lounge/icons/v2/${k}.png`),
  '/art/lounge/icons/shard-simple-v1.png',
  '/art/brand/lore-logo-transparent.webp', '/art/lounge/illustrated-v1/biblion.webp',
  '/art/lounge/stage-v1/sigil.webp', '/art/lounge/v1/library.webp',
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
