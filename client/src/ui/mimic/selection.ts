/** User-approved variants only. ORIGIN_MIMIC remains deferred. */
export const selected = {
 MIMIC: {variant:3, duration:3200, material:2},
 MIMIC2: {variant:1, duration:3200, material:2},
 MIMIC_LORD: {variant:3, duration:3400, material:2},
 AWAKENED_MIMIC: {variant:1, duration:3800, material:2},
 MIMIC_KING: {variant:2, duration:4700, material:2},
 MIMIC_KING2: {variant:1, duration:5100, material:2},
} as const;
export type MimicId=keyof typeof selected;
export type FamilyId='MIMIC_LORD'|'AWAKENED_MIMIC';
export const isMimic=(id:string):id is MimicId=>Object.hasOwn(selected,id);
export const clock=(time:number,id:MimicId)=>time/selected[id].duration*3200;
export function focusScale(id:MimicId){const royal=id==='MIMIC_KING'||id==='MIMIC_KING2';return Math.min(innerWidth/(royal?540:460),innerHeight/(royal?740:505),1.12);}
