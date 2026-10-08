/** User-selected study 01 and 04. IDs deliberately differ from atelier-v1. */
export const LIVING_THEMES=[
 {id:'azure-plume',variant:0,ja:'藍羽の白磁',en:'Azure Plume Porcelain',ko:'푸른 깃털의 백자'},
 {id:'pressed-fern',variant:3,ja:'翠葉の標本',en:'Pressed Fern Herbarium',ko:'녹엽의 표본'}
] as const;
export const livingArt=(id:string)=>`/cosmetics/living-v1/${id}/art.png`;
export const livingFromUrl=(url?:string)=>LIVING_THEMES.find(t=>url?.includes(livingArt(t.id)));
