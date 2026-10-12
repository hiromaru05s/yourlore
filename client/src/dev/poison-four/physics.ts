import {ease,clamp} from './catalog';
export const CARD_WIDTH=144,CARD_LENGTH=224,CONTACT_MS=640;
/** Card normal is +Y; its complete XZ face, never its short edge, meets Y=0. */
export function cardHeight(ms:number,reduced=false){const u=clamp(ms/CONTACT_MS);return reduced?0:62*(1-u*u);}
/** Free fall in the plane normal, no screen-space vertical displacement. */
export function dropHeight(ms:number,start:number,duration:number,height:number){const u=clamp((ms-start)/duration);return height*(1-u*u);}
export function envelope(ms:number,start=660,peak=1100,end=2450){return ease(start,peak,ms)*(1-ease(1770,end,ms));}
export const planeNormal=[0,1,0] as const;
