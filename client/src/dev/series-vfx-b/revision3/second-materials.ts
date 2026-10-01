import type {Surface} from './surface';
import {drawArticulated} from './articulated-materials';
/** Registered roots, fossil joints and foreleg-anchored predator anatomy. */
export function drawSecond(s:Surface,family:string,id:string,variant:number,p:number){drawArticulated(s,family,id,variant,p);}
