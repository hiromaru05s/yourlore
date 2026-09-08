/** Original engraved line icons, rendered at any display density. */
const paths = {
  duel: '<path d="m13 8 26 29-4 4L8 13V8h5Zm27 0L12 37l4 4L45 13V8h-5ZM8 33l11 11m17-11L25 44M9 44l5-5m26 5-5-5"/>',
  bot: '<path d="M26 5 42 12v13c0 10-9 17-16 22-7-5-16-12-16-22V12L26 5Z"/><path d="m19 21 7-9 7 9-7 15-7-15Zm-2 19h18"/>',
  deck: '<path d="m10 13 7-5 24 5-7 33-24-5V13Zm7 2 24-2M7 22l-3 17 5 4"/><path d="m25 20 6 9-8 9-5-10 7-8Z"/>',
  cards: '<path d="M8 8h26v35H8zM34 12h8v34H16v-3"/><path d="m21 15 7 10-7 10-7-10 7-10Z"/>',
  home: '<path d="M26 3v7m0 32v7M3 26h7m32 0h7"/><circle cx="26" cy="26" r="17"/><path d="m26 13 5 8 8 5-8 5-5 8-5-8-8-5 8-5 5-8Z"/><circle cx="26" cy="26" r="4"/>',
  trophy: '<path d="M16 8h20v13c0 7-4 12-10 12s-10-5-10-12V8Zm0 4H8v8c0 5 4 7 9 7m19-15h8v8c0 5-4 7-9 7M26 33v10m-9 2h18M20 4h12"/>',
  shop: '<path d="m9 19 5-11h24l5 11H9Zm2 0v24h30V19M19 43V28h14v15M7 23h38M26 8v11m-7-11-2 11M33 8l2 11"/>',
  friends: '<circle cx="20" cy="17" r="7"/><path d="M6 42v-5c0-8 6-12 14-12s14 4 14 12v5H6ZM33 10a7 7 0 0 1 0 14m4 4c7 1 10 6 10 13h-9"/>',
  book: '<path d="M26 14c-6-5-13-6-20-4v31c7-2 14-1 20 4 6-5 13-6 20-4V10c-7-2-14-1-20 4Zm0 0v31M12 18l8 3m-8 4 8 3m12-7 8-3m-8 10 8-3"/>',
  mail: '<path d="M6 14h40v28H6V14Zm0 0 20 17 20-17M6 42l14-16m26 16L32 26"/><path d="m26 5 4 4-4 4-4-4 4-4Z"/>',
  gift: '<path d="M7 20h38v9H7zM10 29v17h32V29M23 20v26m6-26v26"/><path d="M26 20C9 20 10 6 16 7c6 0 10 13 10 13Zm0 0C43 20 42 6 36 7c-6 0-10 13-10 13Z"/>',
  settings: '<path d="m21 6-2 7-6 3-7-1-2 8 6 4 1 6-3 6 7 5 6-4h7l6 4 7-5-3-6 1-6 6-4-2-8-7 1-6-3-2-7h-9Z"/><circle cx="25" cy="26" r="8"/>',
  shard: '<path d="m26 3 13 22-13 24-13-24L26 3Zm0 0v46M13 25h26M26 3l-5 22 5 24 5-24-5-22Z"/>',
} as const;
export type HomeIcon = keyof typeof paths;
export function homeIcon(name: HomeIcon): string {
  return `<svg class="lore-icon" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${paths[name]}</svg>`;
}
