import {sleeveArt,animatedSleeve} from './art';
let art:ReturnType<typeof sleeveArt>|undefined,users=0;
export function retainCofferArt(){
 art??=sleeveArt();users++;let released=false;
 return {art,release(){if(released)return;released=true;if(--users===0){art?.dispose();art=undefined;}}};
}
export function cofferSleeve(clock?:{value:number}){
 const lease=retainCofferArt(),m=animatedSleeve(lease.art);
 m.onBeforeRender=()=>lease.art.paint(clock?.value??(matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.floor(performance.now()/33.333)/30));
 m.addEventListener('dispose',lease.release);return m;
}
