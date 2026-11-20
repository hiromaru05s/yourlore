/** Standard sleeves available to every account, independent of purchased inventory. */
export const INDIGO_EYE_SLEEVE='sleeve:indigo-eye';
export const FREE_SLEEVES={
 default:{id:'default',url:'/frames/sleeve_default.webp',ko:'기본',ja:'デフォルト',en:'Default',price:0},
 [INDIGO_EYE_SLEEVE]:{id:INDIGO_EYE_SLEEVE,url:'/frames/sleeve_indigo_eye.webp',ko:'남빛의 눈',ja:'藍銀の瞳',en:'Indigo Eye',price:0},
};
export const FREE_SLEEVE_IDS=Object.values(FREE_SLEEVES).map(sleeve=>sleeve.id);
export const isFreeSleeve=(id:unknown):id is string=>typeof id==='string'&&FREE_SLEEVE_IDS.includes(id);
