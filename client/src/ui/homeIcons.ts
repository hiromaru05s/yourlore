/** Original image-generated LORE emblems. Keep labels on the containing controls. */
export const HOME_ICONS = ['home','duel','bot','deck','cards','trophy','friends','shop','book','gift','mail','settings','shard','profile','sleeve','menu','check','close','arrow','search','bell','sound','language','history','edit'] as const;
export type HomeIcon = typeof HOME_ICONS[number];
export function homeIcon(name: HomeIcon, active=false): string {
  return `<img class="lore-icon lore-icon-${name}" src="/art/lounge/icons/${active?'active-v1':'v2'}/${name}.${active?'webp':'png'}" width="48" height="48" alt="" aria-hidden="true" draggable="false" decoding="async">`;
}
