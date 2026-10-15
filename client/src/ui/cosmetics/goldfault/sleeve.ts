import {sleeveArt,animatedSleeve} from './art';
let art:ReturnType<typeof sleeveArt>|undefined,users=0;
export function retainGoldfaultArt(){
 art??=sleeveArt(2);users++;let released=false;
 return {art,release(){if(released)return;released=true;if(--users===0){art?.dispose();art=undefined;}}};
}
export function goldfaultSleeve(clock?:{value:number}){
 const lease=retainGoldfaultArt(),phase=clock??{value:0};
 const m=animatedSleeve(2,lease.art,phase);
 if(!clock)m.onBeforeRender=()=>{phase.value=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.floor(performance.now()/33.333)/30;};
 m.addEventListener('dispose',lease.release);return m;
}
