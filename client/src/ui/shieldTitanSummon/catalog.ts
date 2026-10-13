export const DURATION=3000;
// User-approved R4-05. Keep the selected geometry, optics and clock together.
export const VARIANT=0;
export const CONTACT=1410;
export const designs=[{name:'均衡の水晶',hit:CONTACT,alpha:.83,edge:.40,facet:.42,shadow:.44}] as const;
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function ease(a:number,b:number,t:number){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
export function lift(v:number,t:number){const hit=designs[v].hit;if(t>=hit+180)return 0;return .24*(1-ease(420,hit,t))+(t>=hit?.012*Math.sin(ease(hit,hit+180,t)*Math.PI):0);}
