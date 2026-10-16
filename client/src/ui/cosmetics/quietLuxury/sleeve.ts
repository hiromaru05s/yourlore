import {sleeveArt,animatedSleeve} from './art';
import type {QuietLuxuryVariant} from '../../../shared/quietLuxuryCosmetics';
let phase=0;
export const setQuietLuxuryPhase=(seconds:number)=>{phase=seconds;};
const pool=new Map<QuietLuxuryVariant,{art:ReturnType<typeof sleeveArt>;users:number}>();
export function retainQuietLuxuryArt(index:QuietLuxuryVariant){
 let entry=pool.get(index);if(!entry){entry={art:sleeveArt(index),users:0};pool.set(index,entry);}entry.users++;
 let released=false;return {art:entry.art,release(){if(released)return;released=true;if(--entry.users===0){entry.art.dispose();pool.delete(index);}}};
}
export function quietLuxurySleeve(index:QuietLuxuryVariant,clock?:{value:number}){
 const lease=retainQuietLuxuryArt(index),m=animatedSleeve(index,lease.art,clock??{value:0});
 m.onBeforeRender=()=>lease.art.paint(clock?.value??phase);
 m.addEventListener('dispose',lease.release);return m;
}
