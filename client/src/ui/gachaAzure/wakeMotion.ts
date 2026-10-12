import {ease,flightPoint} from './kinematics';
/** Emission is evaluated at the historical birth pose, never at a future position. */
export function wakeSample(t:number,u:number,variant:number){
 const history=Math.max(.24,t-u*[.16,.18,.15][variant]);
 const previous=flightPoint(Math.max(.24,history-.0001),variant),current=flightPoint(history,variant);
 const speed=Math.hypot(current.x-previous.x,current.y-previous.y,current.z-previous.z)/(.0001*9.4);
 const origin=flightPoint(.24,variant);
 const travel=Math.hypot(current.x-origin.x,current.y-origin.y,current.z-origin.z);
 // The small shelf pull has no wake. Flight emission needs visible travel and speed.
 const birth=history>.24&&history<.65?ease(.15,2.0,speed)*ease(.015,.15,travel):0;
 // Old moving samples remain briefly after braking, while the stationary head emits nothing.
 const emission=birth*(1-ease(.64,.70,t));
 return {history,speed,travel,emission};
}
