/** Paired stills from the board's deck and graveyard models. */
export function deckFurniturePreview(equipped?:string) {
  const key=equipped?.startsWith('furniture:') ? equipped.slice('furniture:'.length) : 'default';
  return '/cosmetics/deck-settings/'+key+'.webp';
}
