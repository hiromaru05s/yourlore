import type {Surface} from './surface';
import {drawArticulated} from './articulated-materials';
/** Shoulder-to-hem cloth, bound paper and vessel-local liquid/fruit/straw. */
export function drawThird(s:Surface,family:string,id:string,variant:number,p:number){drawArticulated(s,family,id,variant,p);}
