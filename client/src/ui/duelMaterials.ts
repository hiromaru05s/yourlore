/** Raster skins contain no gameplay text or sleeve artwork. */
export const refinedArt = (name: string): string => `/art/biblion/refined/${name}.png`;
export function deckBucket(count: number): 0 | 1 | 3 | 5 | 10 | 15 {
  return count <= 0 ? 0 : count < 3 ? 1 : count < 5 ? 3 : count < 10 ? 5 : count < 15 ? 10 : 15;
}
