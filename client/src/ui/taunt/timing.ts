import type {GameEvent} from "../../shared/types";
export const DURATION=1000;
export const SELECTED_SHIELD=2; // 03 黒金の王盾
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export const pulse=(a:number,b:number,c:number,d:number,t:number)=>ease(a,b,t)*(1-ease(c,d,t));
/** A deterministic clock: the pre-roll never contains or guesses the result. */
export function pose(_variant:number,ms:number,reduced=false){
 const t=Math.max(0,Math.min(DURATION,ms)),active=ms>0&&ms<DURATION;
 const strength=active?pulse(0,150,830,1000,t):0;
 if(reduced)return {t,strength,lift:0,advance:0,scale:1,tilt:0};
 const lift=3*pulse(120,330,690,950,t);
 return {t,strength,lift,advance:0,scale:1,tilt:0};
}

/** The engine declares an attack before its dice resolution. Preplay only its own taunt. */
export function tauntRollIndex(events:readonly GameEvent[],attackIndex:number){
 const attack=events[attackIndex];if(attack?.type!=='attack')return -1;
 for(let i=attackIndex+1;i<events.length;i++){
  const event=events[i];if(event.type==='attack')break;
  if(event.type==='dice'&&event.taunt?.attackerUid===attack.uid)return i;
 }
 return -1;
}
