export const golemIds=['GOLEM1','GOLEM2','GOLEM3','M10','NGA3','NWL3','MANA_GIANT'] as const;
export type GolemId=typeof golemIds[number];
export const isGolem=(id:string|undefined):id is GolemId=>golemIds.includes(id as GolemId);
