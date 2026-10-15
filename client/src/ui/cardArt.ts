/** All live cards have dedicated Biblion artwork, including quests and quick cards. */
export const ART_V = "20260910-theme-identity-v3";
const revision=(id:string)=>id==='EXILE_NUKE1'?'20261014-void-shot-v1':id==='MASSACRE'?'20261014-torsion-v1':ART_V;
const artFile=(id:string)=>id==='EXILE_NUKE2'?'EXILE_NUKE2-void-crystal-v1':id;
export const artUrl = {
  xs: (id: string) => `/art/cards-xs/${artFile(id)}.webp?v=${revision(id)}`,
  sm: (id: string) => `/art/cards-sm/${artFile(id)}.webp?v=${revision(id)}`,
  full: (id: string) => `/art/cards/${artFile(id)}.webp?v=${revision(id)}`,
};
