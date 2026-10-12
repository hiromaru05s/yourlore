export const VAMPIRE_IDS=['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'] as const;
export type Id=typeof VAMPIRE_IDS[number];
export const isVampire=(id:string|undefined):id is Id=>VAMPIRE_IDS.includes(id as Id);
