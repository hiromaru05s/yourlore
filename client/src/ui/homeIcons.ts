/** Original image-generated LORE emblems. Keep labels on the containing controls. */
export const HOME_ICONS = ['home','duel','bot','deck','cards','trophy','friends','shop','book','gift','mail','settings','shard','profile','sleeve','menu','check','close','arrow','search','bell','sound','language','history','edit'] as const;
export type HomeIcon = typeof HOME_ICONS[number];
export function homeIcon(name: HomeIcon): string {
  return `<img class="lore-icon lore-icon-${name}" src="/art/lounge/icons/v2/${name}.png" width="48" height="48" alt="" aria-hidden="true" draggable="false" decoding="async">`;
}
