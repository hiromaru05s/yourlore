/** All live cards have dedicated Biblion artwork, including quests and quick cards. */
export const ART_V = "20260910-theme-identity-v3";
const revision=(id:string)=>id==='MASSACRE'?'20261014-torsion-v1':ART_V;
export const artUrl = {
  xs: (id: string) => `/art/cards-xs/${id}.webp?v=${revision(id)}`,
  sm: (id: string) => `/art/cards-sm/${id}.webp?v=${revision(id)}`,
  full: (id: string) => `/art/cards/${id}.webp?v=${revision(id)}`,
};
