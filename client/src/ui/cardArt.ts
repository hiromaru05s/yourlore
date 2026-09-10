/** All live cards have dedicated Biblion artwork, including quests and quick cards. */
export const ART_V = "20260910-biblion";
export const artUrl = {
  xs: (id: string) => `/art/cards-xs/${id}.webp?v=${ART_V}`,
  sm: (id: string) => `/art/cards-sm/${id}.webp?v=${ART_V}`,
  full: (id: string) => `/art/cards/${id}.webp?v=${ART_V}`,
};
