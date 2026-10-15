export type P={x:number;y:number;z:number};
export type Anchor={x:number;y:number;w?:number;h?:number};
export type MotionScene={original:Anchor;destination:Anchor;scale:number;self?:boolean};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
export const LAUNCH=680,HIT=1580,END=2700;
export function radius(a:Anchor,z:number){return Math.min(a.w??112*z,a.h??112*z)*.52}
export function trajectory(s:MotionScene,v:number,t:number):P{
 const u=clamp((t-LAUNCH)/(HIT-LAUNCH)),q=v===0?Math.pow(u,.7):v===3?ease(u):u;
 const p={x:s.original.x+(s.destination.x-s.original.x)*q,y:s.original.y+(s.destination.y-s.original.y)*q,z:12+Math.sin(q*Math.PI)*36*s.scale};
 if(v===1)p.x-=Math.sin(Math.PI*q)*100*s.scale;
 if(v===3)p.x+=Math.sin(q*Math.PI*2)*36*s.scale;
 return p;
}
export function facing(s:MotionScene,v:number,t:number){const p=trajectory(s,v,t),q=trajectory(s,v,Math.min(HIT,t+3)),r=trajectory(s,v,Math.max(LAUNCH,t-3));return Math.atan2(q.y-r.y,q.x-r.x)||Math.atan2(s.destination.y-p.y,s.destination.x-p.x)}
