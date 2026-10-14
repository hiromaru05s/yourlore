import * as THREE from 'three';
import {designs,ease,type Point} from './model';

// The grip is the pivot. No per-frame correction is allowed to pin the blade to the target.
export const GRIP=new THREE.Vector3(0,66,0);
export const CUT=new THREE.Vector3(123,-86,4);
export const EDGE_IN=new THREE.Vector3(26,-102,4);
export const EDGE_OUT=new THREE.Vector3(199,-49,4);
export const planes=[
 {x:1.02,y:-.15,z:-.67,direction:1,power:.88},
 {x:.34,y:-.48,z:.03,direction:1,power:.84},
 {x:-.50,y:.48,z:-1.30,direction:1,power:.88},
] as const;
export function swingAngle(v:number,t:number){
 const dt=t-designs[v].hit;
 if(dt<-300)return -1.64-.16*ease(-650,-320,dt);
 if(dt<0){const p=(dt+300)/300;return -1.8+1.8*Math.pow(p,2.35);}
 if(dt<36)return 0; // Only the weapon freezes for two frames; the impact and soul continue.
 const p=Math.min(1,(dt-36)/360);return 2.48*(1-Math.pow(1-p,2.05))-.09*ease(460,720,dt);
}
export function rotation(v:number,t:number){const p=planes[v];return new THREE.Euler(p.x,p.y,p.z+swingAngle(v,t)*p.direction,'XYZ');}
export function frame(v:number,t:number,target:Point,scale:number,reduced=false){
 const p=planes[v],s=scale*p.power,hit=designs[v].hit;
 const contact=new THREE.Euler(p.x,p.y,p.z,'XYZ');
 const arm=CUT.clone().sub(GRIP).applyEuler(contact).multiplyScalar(s);
 const pivot=new THREE.Vector3(target.x-arm.x,target.y-arm.y,-arm.z);
 const rot=reduced?contact:rotation(v,t);
 // A small withdrawal happens only after the blade has completed its arc.
 const withdraw=ease(hit+450,hit+900,t);pivot.x+=p.direction*withdraw*15*scale;pivot.y+=withdraw*12*scale;pivot.z-=withdraw*24*scale;
 const origin=pivot.clone().sub(GRIP.clone().applyEuler(rot).multiplyScalar(s));
 return {pivot,origin,rot,scale:s};
}
export function bladePoint(v:number,t:number,target:Point,scale:number,local=CUT){const f=frame(v,t,target,scale);return local.clone().applyEuler(f.rot).multiplyScalar(f.scale).add(f.origin);}
export function cutDirection(v:number){const h=designs[v].hit;const a=bladePoint(v,h-2,{x:0,y:0},1),b=bladePoint(v,h,{x:0,y:0},1);return Math.atan2(b.y-a.y,b.x-a.x);}
