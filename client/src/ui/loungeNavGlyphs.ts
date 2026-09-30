/** Original monochrome menu symbols, approved HOME navigation study 01. */
const paths = [
  '<path d="M9 26V13L20 5l11 8v13M15 30V18h10v12M7 31h26"/><path d="m16 10 4-3 4 3"/>',
  '<path d="m9 9 17-3 5 26-17 3z"/><path d="m7 15-3 2 7 19 8-3M19 13l5 6-3 7-5-6z"/>',
  '<path d="M14 7h17v26H14zM9 10H7v23h3M2 14v16"/><path d="m22 12 5 8-5 8-5-8z"/>',
  '<path d="M14 7h12v8c0 7-12 7-12 0zM14 10H8v4q0 6 7 6M26 10h6v4q0 6-7 6M20 21v9M13 33h14M16 29h8"/>',
  '<circle cx="16" cy="13" r="5"/><path d="M6 31v-5c0-8 20-8 20 0v5M26 9c8 0 8 9 1 10M29 23q6 1 6 8"/>',
  '<path d="M8 14h24v19H8zM6 14l4-7h20l4 7M7 18q4 4 8 0 5 4 10 0 4 4 8 0M17 25h7v8"/>',
  '<path d="M20 11Q12 6 5 9v22q8-3 15 1 7-4 15-1V9q-7-3-15 2v21M10 15l5 1M10 21l5 1M25 16l5-1M25 22l5-1"/>'
];

export function loungeNavGlyph(index:number):string {
  return `<span class="horizon-glyph" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter">${paths[index]??paths[0]}</svg></span>`;
}

/** Secondary menu actions share the quiet line work of the main navigation. */
const utilityPaths = {
  settings: '<path d="M10 7v7m0 6v13M20 7v16m0 6v4M30 7v3m0 6v17"/><path d="M6 14h8v6H6zM16 23h8v6h-8zM26 10h8v6h-8z"/>',
  invite: '<path d="M8 18h24v15H8zM6 12h28v6H6zM20 12v21"/><path d="M20 12c-3-8-10-9-10-4 0 4 6 4 10 4Zm0 0c3-8 10-9 10-4 0 4-6 4-10 4Z"/>',
  inquiry: '<path d="M5 10h30v21H5zM5 10l15 12 15-12M5 31l10-10m20 10L25 21"/>',
} as const;
export function loungeUtilityGlyph(action:keyof typeof utilityPaths):string {
  return `<span class="lounge-utility-glyph" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" focusable="false">${utilityPaths[action]}</svg></span>`;
}
