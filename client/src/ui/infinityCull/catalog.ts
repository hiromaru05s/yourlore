export const DURATION=3600;
export type Options={ms:number;amount:number;side:number;dark:boolean;reduced:boolean};
export type Point={x:number;y:number;w?:number;h?:number};
export type Layout={source:Point;rift:Point;width:number;height:number};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const phase=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
export const ease=(v:number)=>v*v*(3-2*v);
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function timing(i:number,n:number){const q=i/Math.max(1,n-1);return{form:220+q*1020,depart:740+q*1020,arrive:1840+q*1020};}
