import {sleeveArt,animatedSleeve} from './art';
let art:ReturnType<typeof sleeveArt>|undefined,users=0;
export function retainElfweaveArt(){
 art??=sleeveArt();users++;let released=false;
 return {art,release(){if(released)return;released=true;if(--users===0){art?.dispose();art=undefined;}}};
}
export function elfweaveSleeve(clock?:{value:number}){
 const lease=retainElfweaveArt(),phase=clock??{value:0};
 const m=animatedSleeve(lease.art,phase);
 m.onBeforeRender=()=>{if(!clock)phase.value=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.floor(performance.now()/33.333)/30;lease.art.draw(phase.value);};
 m.addEventListener('dispose',lease.release);return m;
}
