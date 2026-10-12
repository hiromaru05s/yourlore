export const ASSASSIN_IDS=['ASSASSIN1','ASSASSIN2','ASSASSIN3','ASSASSIN4','ASSASSIN_SQUAD'] as const;
export const isAssassin=(id:string|undefined):id is typeof ASSASSIN_IDS[number]=>ASSASSIN_IDS.some(value=>value===id);
